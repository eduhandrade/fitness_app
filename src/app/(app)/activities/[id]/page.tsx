import { notFound } from "next/navigation";
import { Sport } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { formatUtcDate } from "@/lib/date";
import {
  formatDistanceKm,
  formatDuration,
  formatPaceMinPerKm,
  formatPacePer100m,
  formatSpeedKmh,
} from "@/lib/format";
import { SportBadge } from "@/components/sport-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getValidStravaAccessToken } from "@/lib/strava-connection";
import { fetchActivityStreams } from "@/lib/strava";
import {
  computeKmSplits,
  buildTimeSeriesPoints,
  trainerSamplesToStreamSeries,
  type StreamSeries,
} from "@/lib/activity-streams";
import type { TrainerStreamSample } from "@/lib/trainer/types";
import { RouteMap } from "@/components/activity/route-map";
import { SplitsTable } from "@/components/activity/splits-table";
import { ActivityTimeSeriesChart } from "@/components/activity/activity-time-series-chart";
import { SendToStravaButton } from "@/components/activity/send-to-strava-button";
import { ExerciseBreakdown } from "@/components/gym/exercise-breakdown";
import { MuscleGroupDiagram } from "@/components/gym/muscle-group-diagram";
import { classifyExercise, type MuscleGroup } from "@/lib/gym/muscle-groups";

function paceLabel(sport: Sport, avgSpeedMs: number | null): string | null {
  if (!avgSpeedMs) return null;
  if (sport === Sport.RUN) return formatPaceMinPerKm(avgSpeedMs);
  if (sport === Sport.RIDE) return formatSpeedKmh(avgSpeedMs);
  if (sport === Sport.SWIM) return formatPacePer100m(avgSpeedMs);
  return formatSpeedKmh(avgSpeedMs);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-hover p-3">
      <p className="text-[12px] text-foreground-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;

  const activity = await prisma.activity.findFirst({
    where: { id, userId },
  });

  if (!activity) notFound();

  let streams: StreamSeries | null = null;
  if (activity.source === "STRAVA" && activity.stravaId) {
    try {
      const accessToken = await getValidStravaAccessToken(userId);
      if (accessToken) {
        streams = await fetchActivityStreams(accessToken, activity.stravaId);
      }
    } catch {
      streams = null;
    }
  } else if (activity.source === "TRAINER") {
    const streamSet = await prisma.activityStreamSet.findUnique({
      where: { activityId: activity.id },
    });
    if (streamSet) {
      streams = trainerSamplesToStreamSeries(streamSet.samples as TrainerStreamSample[]);
    }
  }
  const splits = streams ? computeKmSplits(streams) : [];
  const chartPoints = streams ? buildTimeSeriesPoints(streams) : [];

  let exerciseBreakdown: { exerciseId: string; name: string; sets: { setNumber: number; reps: number; weightKg: number }[] }[] = [];
  let muscleGroupsWorked: MuscleGroup[] = [];
  let totalSets = 0;
  let totalReps = 0;
  let totalVolumeKg = 0;

  if (activity.source === "MANUAL" && activity.sport === "STRENGTH") {
    const logs = await prisma.exerciseLog.findMany({
      where: { activityId: activity.id },
      include: { exercise: { select: { id: true, name: true, order: true } } },
      orderBy: [{ exercise: { order: "asc" } }, { setNumber: "asc" }],
    });

    const byExercise = new Map<string, { name: string; order: number; sets: { setNumber: number; reps: number; weightKg: number }[] }>();
    const groupsSeen = new Set<MuscleGroup>();
    for (const log of logs) {
      totalSets += 1;
      totalReps += log.reps;
      totalVolumeKg += log.reps * log.weightKg;

      if (!byExercise.has(log.exerciseId)) {
        byExercise.set(log.exerciseId, { name: log.exercise.name, order: log.exercise.order, sets: [] });
      }
      byExercise.get(log.exerciseId)!.sets.push({
        setNumber: log.setNumber,
        reps: log.reps,
        weightKg: log.weightKg,
      });

      const classification = classifyExercise(log.exercise.name);
      if (classification) groupsSeen.add(classification.group);
    }

    exerciseBreakdown = [...byExercise.entries()]
      .sort((a, b) => a[1].order - b[1].order)
      .map(([exerciseId, data]) => ({ exerciseId, name: data.name, sets: data.sets }));
    muscleGroupsWorked = [...groupsSeen];
  }

  const pace = paceLabel(activity.sport, activity.avgSpeedMs);
  const stats: { label: string; value: string }[] = [];

  if (activity.distanceM > 0) {
    stats.push({ label: "Distance", value: formatDistanceKm(activity.distanceM) });
  }
  stats.push({ label: "Moving time", value: formatDuration(activity.movingTimeSec) });
  if (activity.elapsedTimeSec !== activity.movingTimeSec) {
    stats.push({ label: "Elapsed time", value: formatDuration(activity.elapsedTimeSec) });
  }
  if (pace) {
    stats.push({
      label:
        activity.sport === Sport.RIDE || activity.sport === Sport.BIKE_TRAINER
          ? "Avg speed"
          : "Avg pace",
      value: pace,
    });
  }
  if (activity.elevationGainM > 0) {
    stats.push({ label: "Elevation gain", value: `${Math.round(activity.elevationGainM)} m` });
  }
  if (activity.avgHeartrate) {
    stats.push({ label: "Avg heart rate", value: `${Math.round(activity.avgHeartrate)} bpm` });
  }
  if (activity.maxHeartrate) {
    stats.push({ label: "Max heart rate", value: `${Math.round(activity.maxHeartrate)} bpm` });
  }
  if (activity.avgWatts) {
    stats.push({ label: "Avg power", value: `${Math.round(activity.avgWatts)} W` });
  }
  if (activity.maxWatts) {
    stats.push({ label: "Max power", value: `${Math.round(activity.maxWatts)} W` });
  }
  if (activity.normalizedPower) {
    stats.push({ label: "Normalized power", value: `${Math.round(activity.normalizedPower)} W` });
  }
  if (activity.avgCadence) {
    stats.push({ label: "Avg cadence", value: `${Math.round(activity.avgCadence)} rpm` });
  }
  if (activity.maxCadence) {
    stats.push({ label: "Max cadence", value: `${Math.round(activity.maxCadence)} rpm` });
  }
  if (activity.calories) {
    stats.push({ label: "Calories", value: `${Math.round(activity.calories)} kcal` });
  }
  if (totalSets > 0) {
    stats.push({ label: "Total sets", value: `${totalSets}` });
    stats.push({ label: "Total reps", value: `${totalReps}` });
    if (totalVolumeKg > 0) {
      stats.push({ label: "Total volume", value: `${Math.round(totalVolumeKg)} kg` });
    }
  }
  if (activity.relativeEffort) {
    stats.push({ label: "Relative effort", value: `${Math.round(activity.relativeEffort)}` });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{activity.name}</h1>
        <div className="mt-1.5 flex items-center gap-2">
          <SportBadge sport={activity.sport} />
          <span className="text-xs text-foreground-muted">
            {formatUtcDate(activity.startDate, "long")}
          </span>
          <span className="text-xs text-foreground-muted">
            ·{" "}
            {activity.source === "STRAVA"
              ? "Synced from Strava"
              : activity.source === "TRAINER"
                ? "Bike trainer ride"
                : "Manual entry"}
          </span>
        </div>
        {(activity.source === "TRAINER" ||
          (activity.source === "MANUAL" && activity.sport === "STRENGTH")) && (
          <div className="mt-3">
            <SendToStravaButton
              activityId={activity.id}
              alreadySentStravaId={activity.stravaId}
            />
          </div>
        )}
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-2 pt-4">
          {stats.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} />
          ))}
        </CardContent>
      </Card>

      {stats.length === 0 && (
        <p className="text-sm text-foreground-muted">
          No additional metrics available for this activity.
        </p>
      )}

      {muscleGroupsWorked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Muscle groups worked</CardTitle>
          </CardHeader>
          <CardContent>
            <MuscleGroupDiagram groups={muscleGroupsWorked} />
          </CardContent>
        </Card>
      )}

      {exerciseBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Exercises</CardTitle>
          </CardHeader>
          <CardContent>
            <ExerciseBreakdown entries={exerciseBreakdown} />
          </CardContent>
        </Card>
      )}

      {activity.mapPolyline && (
        <Card>
          <CardHeader>
            <CardTitle>Route</CardTitle>
          </CardHeader>
          <CardContent>
            <RouteMap polyline={activity.mapPolyline} />
          </CardContent>
        </Card>
      )}

      {chartPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {chartPoints.some((p) => p.watts != null) ? "Power & heart rate" : "Pace & heart rate"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeSeriesChart data={chartPoints} />
          </CardContent>
        </Card>
      )}

      {splits.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Splits</CardTitle>
          </CardHeader>
          <CardContent>
            <SplitsTable splits={splits} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
