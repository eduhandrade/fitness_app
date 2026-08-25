"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  saveNutritionProfile,
  type NutritionProfileState,
} from "@/app/(app)/nutrition/actions";

const initialState: NutritionProfileState = {};

export function NutritionProfileForm({
  activityLevel,
}: {
  activityLevel?: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveNutritionProfile, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="activityLevel" className="text-xs font-medium text-foreground-muted">
          Activity level
        </label>
        <select
          id="activityLevel"
          name="activityLevel"
          defaultValue={activityLevel ?? ""}
          required
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Select…
          </option>
          <option value="SEDENTARY">Sedentary (little/no exercise)</option>
          <option value="LIGHT">Light (exercise 1-3 days/week)</option>
          <option value="MODERATE">Moderate (exercise 3-5 days/week)</option>
          <option value="ACTIVE">Active (hard exercise 6-7 days/week)</option>
          <option value="VERY_ACTIVE">Very active (hard exercise + physical job)</option>
        </select>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full" variant="secondary">
        {pending ? "Saving…" : "Save activity level"}
      </Button>
    </form>
  );
}
