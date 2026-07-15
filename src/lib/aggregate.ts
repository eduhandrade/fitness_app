import { startOfWeek, subWeeks, format, isEqual } from "date-fns";
import { Sport } from "@/generated/prisma/enums";

export type WeeklyVolumePoint = {
  week: string;
} & Record<Sport, number>;

const ZERO_BY_SPORT: Record<Sport, number> = {
  RUN: 0,
  RIDE: 0,
  SWIM: 0,
  STRENGTH: 0,
  BRICK: 0,
  OTHER: 0,
};

/** Buckets activities into weekly training-minutes totals per sport, oldest → newest. */
export function weeklyVolumeBySport(
  activities: { sport: Sport; startDate: Date; movingTimeSec: number }[],
  weeks: number
): WeeklyVolumePoint[] {
  const now = new Date();
  const weekStarts: Date[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    weekStarts.push(startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }));
  }

  const buckets = new Map<number, WeeklyVolumePoint>();
  for (const ws of weekStarts) {
    buckets.set(ws.getTime(), { week: format(ws, "MMM d"), ...ZERO_BY_SPORT });
  }

  for (const activity of activities) {
    const bucketStart = startOfWeek(activity.startDate, { weekStartsOn: 1 });
    const point = buckets.get(bucketStart.getTime());
    if (!point) continue;
    point[activity.sport] += activity.movingTimeSec / 60;
  }

  return weekStarts.map((ws) => buckets.get(ws.getTime())!);
}

export function isSameWeek(a: Date, b: Date): boolean {
  return isEqual(
    startOfWeek(a, { weekStartsOn: 1 }),
    startOfWeek(b, { weekStartsOn: 1 })
  );
}
