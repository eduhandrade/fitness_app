import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { formatUtcDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeightForm } from "@/components/body/weight-form";
import { WeightHistoryTable } from "@/components/body/weight-history-table";
import { TrendLineChart, type TrendPoint } from "@/components/charts/trend-line-chart";

export default async function BodyPage() {
  const userId = await requireUserId();

  const metrics = await prisma.bodyMetric.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 90,
  });

  const chronological = [...metrics].reverse();
  const chartData: TrendPoint[] = chronological.map((m) => ({
    x: formatUtcDate(m.date),
    y: Math.round(m.weightKg * 10) / 10,
  }));

  const latest = metrics[0];
  const previous = metrics[1];
  const delta = latest && previous ? latest.weightKg - previous.weightKg : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Body</h1>

      <Card>
        <CardHeader className="flex flex-row items-baseline justify-between">
          <CardTitle>Weight trend</CardTitle>
          {latest && (
            <span className="text-sm text-foreground">
              {latest.weightKg} kg
              {delta != null && (
                <span
                  className={`ml-1.5 text-xs ${
                    delta === 0
                      ? "text-foreground-muted"
                      : delta < 0
                        ? "text-primary-strong"
                        : "text-foreground-muted"
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {Math.round(delta * 10) / 10} kg
                </span>
              )}
            </span>
          )}
        </CardHeader>
        <CardContent>
          <TrendLineChart data={chartData} color="#4fd689" unit="kg" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log today</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightHistoryTable
            entries={metrics.map((m) => ({
              id: m.id,
              date: formatUtcDate(m.date, "long"),
              weightKg: m.weightKg,
              bodyFatPct: m.bodyFatPct,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
