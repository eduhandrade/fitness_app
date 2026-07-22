import { Sport } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { formatUtcDate, daysAgo } from "@/lib/date";
import { weeklyVolumeBySport } from "@/lib/aggregate";
import { SPORT_META } from "@/lib/sport-meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyVolumeChart } from "@/components/charts/weekly-volume-chart";
import { TrendLineChart, type TrendPoint } from "@/components/charts/trend-line-chart";

const WEEKS = 12;
const PACE_POINTS = 15;

function paceSeries(
  activities: { startDate: Date; avgSpeedMs: number | null }[],
  transform: (speedMs: number) => number
): TrendPoint[] {
  return activities
    .filter((a) => a.avgSpeedMs)
    .slice(0, PACE_POINTS)
    .reverse()
    .map((a) => ({
      x: formatUtcDate(a.startDate),
      y: Math.round(transform(a.avgSpeedMs!) * 100) / 100,
    }));
}

export default async function ProgressPage() {
  const userId = await requireUserId();

  const [volumeActivities, runActivities, rideActivities, swimActivities, weightMetrics] =
    await Promise.all([
      prisma.activity.findMany({
        where: { userId, startDate: { gte: daysAgo(WEEKS * 7) } },
        select: { sport: true, startDate: true, movingTimeSec: true },
      }),
      prisma.activity.findMany({
        where: { userId, sport: Sport.RUN, avgSpeedMs: { not: null } },
        orderBy: { startDate: "desc" },
        take: PACE_POINTS,
        select: { startDate: true, avgSpeedMs: true },
      }),
      prisma.activity.findMany({
        where: { userId, sport: Sport.RIDE, avgSpeedMs: { not: null } },
        orderBy: { startDate: "desc" },
        take: PACE_POINTS,
        select: { startDate: true, avgSpeedMs: true },
      }),
      prisma.activity.findMany({
        where: { userId, sport: Sport.SWIM, avgSpeedMs: { not: null } },
        orderBy: { startDate: "desc" },
        take: PACE_POINTS,
        select: { startDate: true, avgSpeedMs: true },
      }),
      prisma.bodyMetric.findMany({
        where: { userId },
        orderBy: { date: "asc" },
        take: 90,
        select: { date: true, weightKg: true },
      }),
    ]);

  const weeklyVolume = weeklyVolumeBySport(volumeActivities, WEEKS);
  const runPace = paceSeries(runActivities, (s) => 1000 / s / 60);
  const rideSpeed = paceSeries(rideActivities, (s) => s * 3.6);
  const swimPace = paceSeries(swimActivities, (s) => 100 / s / 60);
  const weightTrend: TrendPoint[] = weightMetrics.map((m) => ({
    x: formatUtcDate(m.date),
    y: Math.round(m.weightKg * 10) / 10,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Progress</h1>

      <Card>
        <CardHeader>
          <CardTitle>Weekly training volume</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyVolumeChart data={weeklyVolume} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weight trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendLineChart data={weightTrend} unit="kg" />
        </CardContent>
      </Card>

      {runPace.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Run pace (min/km, lower is faster)</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLineChart
              data={runPace}
              color={SPORT_META.RUN.color}
              unit="min/km"
            />
          </CardContent>
        </Card>
      )}

      {rideSpeed.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Ride speed (km/h)</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLineChart
              data={rideSpeed}
              color={SPORT_META.RIDE.color}
              unit="km/h"
            />
          </CardContent>
        </Card>
      )}

      {swimPace.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Swim pace (min/100m, lower is faster)</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLineChart
              data={swimPace}
              color={SPORT_META.SWIM.color}
              unit="min/100m"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
