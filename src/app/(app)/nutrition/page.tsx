import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { formatUtcDate, toUtcDateOnly } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateMacroTargets, plannedWeightOnDate, type MacroTargets } from "@/lib/nutrition/goal";
import { WeightGoalForm } from "@/components/nutrition/weight-goal-form";
import { WeightGoalProgress } from "@/components/nutrition/weight-goal-progress";
import { NutritionProfileForm } from "@/components/nutrition/nutrition-profile-form";
import { FoodDiary } from "@/components/nutrition/food-diary";
import type { RecentFoodOption } from "@/components/nutrition/recent-foods-panel";
import type { DualTrendPoint } from "@/components/charts/weight-goal-chart";
import type { MealType } from "@/generated/prisma/enums";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

export default async function NutritionPage() {
  const userId = await requireUserId();

  const todayUtc = toUtcDateOnly(new Date().toISOString().slice(0, 10));

  const [goal, profile, todayEntries, customFoods, savedMeals, recentByMealEntries] =
    await Promise.all([
      prisma.weightGoal.findFirst({ where: { userId, status: "ACTIVE" } }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.foodEntry.findMany({
        where: { userId, date: todayUtc },
        orderBy: { createdAt: "asc" },
      }),
      prisma.customFood.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.savedMeal.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      Promise.all(
        MEAL_TYPES.map((meal) =>
          prisma.foodEntry.findMany({
            where: { userId, meal },
            orderBy: { createdAt: "desc" },
            distinct: ["name"],
            take: 6,
          })
        )
      ),
    ]);

  const totalCaloriesToday = todayEntries.reduce((sum, e) => sum + e.calories, 0);

  const recentByMeal = Object.fromEntries(
    MEAL_TYPES.map((meal, i) => [
      meal,
      recentByMealEntries[i].map(
        (e): RecentFoodOption => ({
          id: e.id,
          name: e.name,
          brand: e.brand,
          quantity: e.quantity,
          unit: e.unit,
          calories: e.calories,
        })
      ),
    ])
  ) as Record<MealType, RecentFoodOption[]>;

  const savedMealsForUi = savedMeals.map((sm) => ({
    id: sm.id,
    name: sm.name,
    totalCalories: sm.items.reduce((sum, i) => sum + i.calories, 0),
    itemCount: sm.items.length,
  }));

  const chartData: DualTrendPoint[] = [];
  let remainingKg = 0;
  let macroTargets: MacroTargets | null = null;
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
    macroTargets = calculateMacroTargets({
      dailyCalorieTarget: goal.dailyCalorieTarget,
      weightKg: latestWeight,
    });
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
        <CardContent>
          <FoodDiary
            entries={todayEntries.map((e) => ({
              id: e.id,
              meal: e.meal,
              name: e.name,
              brand: e.brand,
              quantity: e.quantity,
              unit: e.unit,
              calories: e.calories,
              proteinG: e.proteinG,
              carbsG: e.carbsG,
              fatG: e.fatG,
            }))}
            customFoods={customFoods}
            savedMeals={savedMealsForUi}
            recentByMeal={recentByMeal}
            macroTargets={macroTargets}
          />
        </CardContent>
      </Card>
    </div>
  );
}
