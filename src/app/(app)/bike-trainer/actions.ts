"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const trainerSampleSchema = z.object({
  t: z.coerce.number(),
  watts: z.coerce.number().optional(),
  cadenceRpm: z.coerce.number().optional(),
  heartrateBpm: z.coerce.number().optional(),
  speedMs: z.coerce.number().optional(),
  distanceM: z.coerce.number().optional(),
  gradePct: z.coerce.number().optional(),
  elevationM: z.coerce.number().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

const saveTrainerRideSchema = z.object({
  name: z.string().min(1).max(120),
  startDate: z.coerce.date(),
  movingTimeSec: z.coerce.number().int().min(1),
  elapsedTimeSec: z.coerce.number().int().min(1),
  distanceM: z.coerce.number().min(0),
  elevationGainM: z.coerce.number().min(0).default(0),
  avgWatts: z.coerce.number().min(0).optional(),
  maxWatts: z.coerce.number().min(0).optional(),
  normalizedPower: z.coerce.number().min(0).optional(),
  avgCadence: z.coerce.number().min(0).optional(),
  maxCadence: z.coerce.number().min(0).optional(),
  avgHeartrate: z.coerce.number().min(0).optional(),
  maxHeartrate: z.coerce.number().min(0).optional(),
  avgSpeedMs: z.coerce.number().min(0).optional(),
  notes: z.string().max(300).optional(),
  // ~5.5h at 1Hz — generous ceiling for a single ride's recorded samples.
  samples: z.array(trainerSampleSchema).min(1).max(20_000),
});

export type SaveTrainerRideInput = z.infer<typeof saveTrainerRideSchema>;

export async function saveTrainerRide(
  input: SaveTrainerRideInput
): Promise<{ activityId: string }> {
  const userId = await requireUserId();
  const parsed = saveTrainerRideSchema.parse(input);

  const activity = await prisma.activity.create({
    data: {
      userId,
      source: "TRAINER",
      sport: "BIKE_TRAINER",
      name: parsed.name,
      startDate: parsed.startDate,
      movingTimeSec: parsed.movingTimeSec,
      elapsedTimeSec: parsed.elapsedTimeSec,
      distanceM: parsed.distanceM,
      elevationGainM: parsed.elevationGainM,
      avgWatts: parsed.avgWatts,
      maxWatts: parsed.maxWatts,
      normalizedPower: parsed.normalizedPower,
      avgCadence: parsed.avgCadence,
      maxCadence: parsed.maxCadence,
      avgHeartrate: parsed.avgHeartrate,
      maxHeartrate: parsed.maxHeartrate,
      avgSpeedMs: parsed.avgSpeedMs,
      notes: parsed.notes,
      streamSet: {
        create: {
          sampleHz: 1,
          samples: parsed.samples,
        },
      },
    },
  });

  revalidatePath("/activities");
  revalidatePath("/bike-trainer");
  revalidatePath("/progress");
  revalidatePath("/");

  return { activityId: activity.id };
}

export async function deleteTrainerRide(activityId: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.activity.delete({
    where: { id: activityId, userId, source: "TRAINER" },
  });

  revalidatePath("/activities");
  revalidatePath("/bike-trainer");
  revalidatePath("/progress");
  revalidatePath("/");
}
