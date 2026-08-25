"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { WeightGoalChart, type DualTrendPoint } from "@/components/charts/weight-goal-chart";
import { endWeightGoal } from "@/app/(app)/nutrition/actions";

export function WeightGoalProgress({
  goal,
  chartData,
}: {
  goal: {
    id: string;
    goalWeightKg: number;
    targetDateLabel: string;
    dailyCalorieTarget: number;
    weeklyRateKg: number;
    remainingKg: number;
  };
  chartData: DualTrendPoint[];
}) {
  const [isPending, startTransition] = useTransition();
  const direction = goal.weeklyRateKg < 0 ? "Losing" : "Gaining";

  return (
    <div className="space-y-3">
      <WeightGoalChart data={chartData} unit="kg" />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-foreground-muted">Goal</p>
          <p className="text-foreground">{goal.goalWeightKg} kg</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Target date</p>
          <p className="text-foreground">{goal.targetDateLabel}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Daily calorie target</p>
          <p className="text-foreground">{goal.dailyCalorieTarget} kcal</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Plan</p>
          <p className="text-foreground">
            {direction} {Math.abs(goal.remainingKg).toFixed(1)} kg to go
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={() => startTransition(() => endWeightGoal(goal.id))}
      >
        {isPending ? "Ending…" : "End goal"}
      </Button>
    </div>
  );
}
