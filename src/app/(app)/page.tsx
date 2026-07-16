import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { daysAgo, formatUtcDate } from "@/lib/date";
import { formatDistanceKm, formatDuration } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SportBadge } from "@/components/sport-badge";
import { SessionRow } from "@/components/training/session-row";
import { TrendLineChart, type TrendPoint } from "@/components/charts/trend-line-chart";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const now = daysAgo(0);
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  weekStart.setUTCHours(0, 0, 0, 0);

  const [plan, recentWeight, recentActivities] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId, status: "ACTIVE" },
      include: {
        weeks: {
          where: { startDate: { lte: now } },
          orderBy: { weekNumber: "desc" },
          take: 1,
          include: { sessions: { orderBy: { date: "asc" } } },
        },
      },
    }),
    prisma.bodyMetric.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 14,
    }),
    prisma.activity.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
      take: 5,
    }),
  ]);

  const currentWeek = plan?.weeks[0];
  const latestWeight = recentWeight[0];
  const previousWeight = recentWeight[1];
  const weightDelta =
    latestWeight && previousWeight ? latestWeight.weightKg - previousWeight.weightKg : null;
  const weightTrend: TrendPoint[] = [...recentWeight]
    .reverse()
    .map((m) => ({ x: formatUtcDate(m.date), y: Math.round(m.weightKg * 10) / 10 }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Home</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>This week</CardTitle>
          <Link href="/training-plan" className="text-xs font-medium text-primary-strong">
            View plan →
          </Link>
        </CardHeader>
        <CardContent>
          {!currentWeek ? (
            <div className="space-y-2">
              <p className="text-sm text-foreground-muted">
                No active training plan yet.
              </p>
              <Link href="/training-plan">
                <Button className="px-3 py-1.5 text-xs">Build a plan</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {currentWeek.sessions
                .filter((s) => s.date >= weekStart)
                .map((s) => (
                  <SessionRow
                    key={s.id}
                    session={{
                      id: s.id,
                      sport: s.sport,
                      sessionType: s.sessionType,
                      durationMin: s.durationMin,
                      targetIntensity: s.targetIntensity,
                      description: s.description,
                      completed: s.completed,
                      date: s.date,
                      weekStartDate: currentWeek.startDate,
                    }}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-baseline justify-between">
          <CardTitle>Weight</CardTitle>
          <Link href="/body" className="text-xs font-medium text-primary-strong">
            Log today →
          </Link>
        </CardHeader>
        <CardContent>
          {latestWeight ? (
            <>
              <p className="text-sm text-foreground">
                {latestWeight.weightKg} kg
                {weightDelta != null && (
                  <span className="ml-1.5 text-xs text-foreground-muted">
                    ({weightDelta > 0 ? "+" : ""}
                    {Math.round(weightDelta * 10) / 10} kg)
                  </span>
                )}
              </p>
              <TrendLineChart data={weightTrend} color="#4fd689" unit="kg" />
            </>
          ) : (
            <p className="text-sm text-foreground-muted">No weight logged yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent activity</CardTitle>
          <Link href="/activities" className="text-xs font-medium text-primary-strong">
            View all →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentActivities.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-foreground-muted">
              No activities yet — connect Strava in Settings.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivities.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/activities/${a.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-hover"
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
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
