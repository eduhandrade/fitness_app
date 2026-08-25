"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createWeightGoal, type WeightGoalState } from "@/app/(app)/nutrition/actions";

const initialState: WeightGoalState = {};

export function WeightGoalForm() {
  const [state, formAction, pending] = useActionState(createWeightGoal, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="goalWeightKg" className="text-xs font-medium text-foreground-muted">
          Goal weight (kg)
        </label>
        <input
          id="goalWeightKg"
          name="goalWeightKg"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="20"
          max="400"
          required
          placeholder="75.0"
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="weeklyRateKg" className="text-xs font-medium text-foreground-muted">
          Weekly rate (kg/week — negative to lose, positive to gain)
        </label>
        <input
          id="weeklyRateKg"
          name="weeklyRateKg"
          type="number"
          inputMode="decimal"
          step="0.05"
          min="-1"
          max="1"
          required
          placeholder="-0.3"
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <p className="text-xs text-foreground-muted">
          Recommended: −0.2 to −0.5 kg/week for loss. Capped at ±1 kg/week.
        </p>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Setting goal…" : "Set goal"}
      </Button>
    </form>
  );
}
