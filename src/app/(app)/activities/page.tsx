import Link from "next/link";
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

const FILTERS: { value: Sport | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: Sport.RUN, label: "Run" },
  { value: Sport.RIDE, label: "Ride" },
  { value: Sport.SWIM, label: "Swim" },
  { value: Sport.STRENGTH, label: "Strength" },
];

function secondaryMetric(sport: Sport, avgSpeedMs: number | null) {
  if (!avgSpeedMs) return null;
  if (sport === Sport.RUN) return formatPaceMinPerKm(avgSpeedMs);
  if (sport === Sport.RIDE) return formatSpeedKmh(avgSpeedMs);
  if (sport === Sport.SWIM) return formatPacePer100m(avgSpeedMs);
  return null;
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const userId = await requireUserId();
  const { sport } = await searchParams;
  const sportFilter =
    sport && (Object.values(Sport) as string[]).includes(sport)
      ? (sport as Sport)
      : undefined;

  const activities = await prisma.activity.findMany({
    where: { userId, ...(sportFilter ? { sport: sportFilter } : {}) },
    orderBy: { startDate: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Activities</h1>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "ALL" ? "/activities" : `/activities?sport=${f.value}`}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
              (sportFilter ?? "ALL") === f.value
                ? "border-primary bg-primary-muted text-primary-strong"
                : "border-border text-foreground-muted"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="pt-4 text-sm text-foreground-muted">
            No activities yet. Connect Strava in Settings and sync to pull in
            your history.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {activities.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/activities/${a.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{a.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <SportBadge sport={a.sport} />
                        <span className="text-xs text-foreground-muted">
                          {formatUtcDate(a.startDate, "long")}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-foreground-muted">
                      {a.distanceM > 0 && <p>{formatDistanceKm(a.distanceM)}</p>}
                      <p>{formatDuration(a.movingTimeSec)}</p>
                      {secondaryMetric(a.sport, a.avgSpeedMs) && (
                        <p>{secondaryMetric(a.sport, a.avgSpeedMs)}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
