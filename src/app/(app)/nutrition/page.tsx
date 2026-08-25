import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { formatUtcDate, toUtcDateOnly } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { plannedWeightOnDate } from "@/lib/nutrition/goal";
import { WeightGoalForm } from "@/components/nutrition/weight-goal-form";
import { WeightGoalProgress } from "@/components/nutrition/weight-goal-progress";
import { NutritionProfileForm } from "@/components/nutrition/nutrition-profile-form";
import { AddFoodEntry } from "@/components/nutrition/add-food-entry";
import { FoodDiary } from "@/components/nutrition/food-diary";
import type { DualTrendPoint } from "@/components/charts/weight-goal-chart";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default async function NutritionPage() {
  const userId = await requireUserId();

  const todayUtc = toUtcDateOnly(new Date().toISOString().slice(0, 10));

  const [goal, profile, todayEntries] = await Promise.all([
    prisma.weightGoal.findFirst({ where: { userId, status: "ACTIVE" } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.foodEntry.findMany({
      where: { userId, date: todayUtc },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totalCaloriesToday = todayEntries.reduce((sum, e) => sum + e.calories, 0);

  const chartData: DualTrendPoint[] = [];
  let remainingKg = 0;
  if (goal) {
    const bodyMetrics = await prisma.bodyMetric.findMany({
      where: { userId, date: { gte: goal.startDate } },
      orderBy: { date: "asc" },
    });
    const weightByDate = new Map(
      bodyMetrics.map((m) => [m.date.toISOString().slice(0, 10), m.weightKg])
    );

    const endDate = goal.targetDate < todayUtc ? goal.targetDate : todayUtc;

    for (
      let d = goal.startDate;
      d <= endDate;
      d = new Date(d.getTime() + MS_PER_DAY)
    ) {
      const key = d.toISOString().slice(0, 10);
      const planned = plannedWeightOnDate({
        startDate: goal.startDate,
        startWeightKg: goal.startWeightKg,
        goalWeightKg: goal.goalWeightKg,
        targetDate: goal.targetDate,
        onDate: d,
      });
      chartData.push({
        x: formatUtcDate(d),
        actual: weightByDate.get(key) ?? null,
        planned: Math.round(planned * 10) / 10,
      });
    }

    const latestWeight = bodyMetrics[bodyMetrics.length - 1]?.weightKg ?? goal.startWeightKg;
    remainingKg = goal.goalWeightKg - latestWeight;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Nutrition</h1>

      <Card>
        <CardHeader>
          <CardTitle>Calorie goal</CardTitle>
        </CardHeader>
        <CardContent>
          {goal ? (
            <WeightGoalProgress
              goal={{
                id: goal.id,
                goalWeightKg: goal.goalWeightKg,
                targetDateLabel: formatUtcDate(goal.targetDate, "long"),
                dailyCalorieTarget: goal.dailyCalorieTarget,
                weeklyRateKg: goal.weeklyRateKg,
                remainingKg,
              }}
              chartData={chartData}
            />
          ) : (
            <WeightGoalForm />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity level</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-foreground-muted">
            Used to estimate your daily calorie burn (TDEE) for the goal above.
          </p>
          <NutritionProfileForm activityLevel={profile?.activityLevel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-baseline justify-between">
          <CardTitle>Today&apos;s food</CardTitle>
          <span className="text-sm text-foreground">
            {Math.round(totalCaloriesToday)}
            {goal ? ` / ${goal.dailyCalorieTarget}` : ""} kcal
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddFoodEntry />
          <FoodDiary
            entries={todayEntries.map((e) => ({
              id: e.id,
              meal: e.meal,
              name: e.name,
              brand: e.brand,
              quantity: e.quantity,
              unit: e.unit,
              calories: e.calories,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
