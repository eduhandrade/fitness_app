import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NutritionTeaserCard({
  caloriesToday,
  dailyCalorieTarget,
}: {
  caloriesToday: number;
  dailyCalorieTarget: number | null;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Nutrition</CardTitle>
        <Link href="/nutrition" className="text-xs font-medium text-primary-strong">
          View nutrition →
        </Link>
      </CardHeader>
      <CardContent>
        {dailyCalorieTarget ? (
          <p className="text-sm text-foreground">
            {Math.round(caloriesToday)} / {dailyCalorieTarget} kcal today
          </p>
        ) : (
          <p className="text-sm text-foreground-muted">Set a calorie goal to start tracking.</p>
        )}
      </CardContent>
    </Card>
  );
}
