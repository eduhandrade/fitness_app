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
import { Card, CardContent } from "@/components/ui/card";

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
      <p className="text-[11px] text-foreground-muted">{label}</p>
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
      label: activity.sport === Sport.RIDE ? "Avg speed" : "Avg pace",
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
  if (activity.avgCadence) {
    stats.push({ label: "Avg cadence", value: `${Math.round(activity.avgCadence)} rpm` });
  }
  if (activity.calories) {
    stats.push({ label: "Calories", value: `${Math.round(activity.calories)} kcal` });
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
            · {activity.source === "STRAVA" ? "Synced from Strava" : "Manual entry"}
          </span>
        </div>
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
    </div>
  );
}
