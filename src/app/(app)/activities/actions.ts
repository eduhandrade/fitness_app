"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getValidStravaAccessToken } from "@/lib/strava-connection";
import { buildActivityFitFile } from "@/lib/fit/build-fit";
import { buildStrengthActivityFitFile } from "@/lib/fit/build-strength-fit";
import type { TrainerStreamSample } from "@/lib/trainer/types";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const REQUIRED_SCOPE = "activity:write";

// Uploadable from this page: a bike trainer ride (has a recorded stream) or
// a logged gym session (has per-set exercise logs) — anything else (Strava
// imports, plain manual entries with no structured data) has nothing to
// build a FIT file from.
const UPLOADABLE_WHERE = {
  OR: [{ source: "TRAINER" as const }, { source: "MANUAL" as const, sport: "STRENGTH" as const }],
};

export type SendToStravaResult =
  | { status: "uploaded"; uploadId: string }
  | { status: "needs_reconnect" };

export async function sendActivityToStrava(
  activityId: string
): Promise<SendToStravaResult> {
  const userId = await requireUserId();

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, userId, ...UPLOADABLE_WHERE },
    include: {
      streamSet: true,
      exerciseLogs: {
        include: { exercise: { select: { name: true, order: true } } },
      },
    },
  });
  if (!activity) throw new Error("Activity not found.");
  if (activity.stravaId) throw new Error("Activity was already sent to Strava.");

  const connection = await prisma.stravaConnection.findUnique({
    where: { userId },
  });
  if (!connection || !connection.scope.split(",").includes(REQUIRED_SCOPE)) {
    return { status: "needs_reconnect" };
  }

  const accessToken = await getValidStravaAccessToken(userId);
  if (!accessToken) return { status: "needs_reconnect" };

  let fitBytes: Uint8Array;
  let isTrainerRide = false;

  if (activity.source === "TRAINER") {
    if (!activity.streamSet) throw new Error("Activity has no recorded stream data.");
    isTrainerRide = true;
    fitBytes = buildActivityFitFile(
      {
        startDate: activity.startDate,
        movingTimeSec: activity.movingTimeSec,
        distanceM: activity.distanceM,
        elevationGainM: activity.elevationGainM,
        avgWatts: activity.avgWatts,
        maxWatts: activity.maxWatts,
        normalizedPower: activity.normalizedPower,
        avgHeartrate: activity.avgHeartrate,
        maxHeartrate: activity.maxHeartrate,
        avgCadence: activity.avgCadence,
        maxCadence: activity.maxCadence,
      },
      activity.streamSet.samples as TrainerStreamSample[]
    );
  } else {
    if (activity.exerciseLogs.length === 0) throw new Error("Activity has no logged sets.");
    const orderedSets = [...activity.exerciseLogs].sort(
      (a, b) => a.exercise.order - b.exercise.order || a.setNumber - b.setNumber
    );
    fitBytes = buildStrengthActivityFitFile(
      { startDate: activity.startDate, movingTimeSec: activity.movingTimeSec },
      orderedSets.map((log) => ({
        exerciseName: log.exercise.name,
        reps: log.reps,
        weightKg: log.weightKg,
      }))
    );
  }

  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(fitBytes)]), `${activity.id}.fit`);
  form.set("data_type", "fit");
  form.set("name", activity.name);
  form.set("trainer", isTrainerRide ? "1" : "0");
  form.set("external_id", `trivo-${activity.id}`);

  const res = await fetch(`${STRAVA_API_BASE}/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Strava upload failed: ${res.status} ${await res.text()}`);
  }
  const upload: { id: number } = await res.json();

  return { status: "uploaded", uploadId: String(upload.id) };
}

const uploadStatusSchema = z.object({
  id: z.number(),
  activity_id: z.number().nullable().optional(),
  status: z.string(),
  error: z.string().nullable().optional(),
});

export type CheckUploadStatusResult =
  | { status: "pending" }
  | { status: "done"; stravaActivityId: string }
  | { status: "error"; error: string };

export async function checkStravaUploadStatus(
  activityId: string,
  uploadId: string
): Promise<CheckUploadStatusResult> {
  const userId = await requireUserId();

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, userId, ...UPLOADABLE_WHERE },
  });
  if (!activity) throw new Error("Activity not found.");

  const accessToken = await getValidStravaAccessToken(userId);
  if (!accessToken) throw new Error("Strava is not connected.");

  const res = await fetch(`${STRAVA_API_BASE}/uploads/${uploadId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Strava upload status check failed: ${res.status} ${await res.text()}`);
  }
  const upload = uploadStatusSchema.parse(await res.json());

  if (upload.error) {
    return { status: "error", error: upload.error };
  }
  if (upload.activity_id) {
    await prisma.activity.update({
      where: { id: activity.id },
      data: { stravaId: String(upload.activity_id) },
    });
    revalidatePath(`/activities/${activity.id}`);
    return { status: "done", stravaActivityId: String(upload.activity_id) };
  }
  return { status: "pending" };
}
