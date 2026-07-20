import { prisma } from "@/lib/prisma";
import { Sport } from "@/generated/prisma/enums";
import {
  formatPaceMinPerKm,
  formatPacePer100m,
  formatSpeedKmh,
} from "@/lib/format";
import type { RecentSportSummary, RecentTrainingSummary } from "./types";

const WINDOW_DAYS = 90;

function paceLabelForSport(sport: Sport, avgSpeedMs: number): string | null {
  if (sport === Sport.RUN) return formatPaceMinPerKm(avgSpeedMs);
  if (sport === Sport.RIDE) return formatSpeedKmh(avgSpeedMs);
  if (sport === Sport.SWIM) return formatPacePer100m(avgSpeedMs);
  return null;
}

/** Summarizes the athlete's last 3 months of synced activity, per sport, to
 * ground plan generation in demonstrated fitness rather than just a chosen
 * level. Reads the app's own Activity table (already mirrors Strava via
 * sync) rather than calling Strava live, so it works even if Strava isn't
 * connected right now and doesn't add an extra API round-trip to plan
 * creation. */
export async function getRecentTrainingSummary(
  userId: string
): Promise<RecentTrainingSummary> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);
  const activities = await prisma.activity.findMany({
    where: {
      userId,
      startDate: { gte: since },
      sport: { in: [Sport.RUN, Sport.RIDE, Sport.SWIM, Sport.STRENGTH] },
    },
    select: { sport: true, movingTimeSec: true, avgSpeedMs: true, avgHeartrate: true },
  });

  const bySport = new Map<Sport, typeof activities>();
  for (const a of activities) {
    const list = bySport.get(a.sport) ?? [];
    list.push(a);
    bySport.set(a.sport, list);
  }

  const weeks = WINDOW_DAYS / 7;
  const sports: RecentSportSummary[] = [];

  for (const [sport, list] of bySport) {
    const totalMinutes = list.reduce((sum, a) => sum + a.movingTimeSec / 60, 0);

    const withSpeed = list.filter((a): a is typeof a & { avgSpeedMs: number } => !!a.avgSpeedMs);
    const avgSpeedMs =
      withSpeed.length > 0
        ? withSpeed.reduce((sum, a) => sum + a.avgSpeedMs, 0) / withSpeed.length
        : null;

    const withHr = list.filter((a): a is typeof a & { avgHeartrate: number } => !!a.avgHeartrate);
    const avgHeartrate =
      withHr.length > 0
        ? Math.round(withHr.reduce((sum, a) => sum + a.avgHeartrate, 0) / withHr.length)
        : null;

    sports.push({
      sport,
      sessionCount: list.length,
      avgWeeklyMinutes: Math.round(totalMinutes / weeks),
      avgPaceLabel: avgSpeedMs ? paceLabelForSport(sport, avgSpeedMs) : null,
      avgHeartrate,
    });
  }

  sports.sort((a, b) => b.avgWeeklyMinutes - a.avgWeeklyMinutes);

  return { sports, windowDays: WINDOW_DAYS };
}
