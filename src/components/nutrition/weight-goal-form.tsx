"use client";

import { useState, type FormEvent } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createWeightGoal, type WeightGoalState } from "@/app/(app)/nutrition/actions";

const initialState: WeightGoalState = {};

type Direction = "lose" | "gain";

export function WeightGoalForm() {
  const [state, formAction, pending] = useActionState(createWeightGoal, initialState);
  const [direction, setDirection] = useState<Direction>("lose");

  // The form field the server action reads is the signed value
  // (negative = lose, positive = gain). Computing it here, from a plain
  // positive magnitude + a direction toggle, sidesteps iOS's decimal
  // keypad having no "−" key entirely — the server action's schema and
  // DB shape don't need to change at all.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const magnitudeInput = form.elements.namedItem("weeklyRateMagnitude") as HTMLInputElement;
    const signedInput = form.elements.namedItem("weeklyRateKg") as HTMLInputElement;
    const magnitude = Number(magnitudeInput.value) || 0;
    signedInput.value = String(direction === "lose" ? -magnitude : magnitude);
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-3">
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
        <span className="text-xs font-medium text-foreground-muted">Goal</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDirection("lose")}
            aria-pressed={direction === "lose"}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              direction === "lose"
                ? "border-primary bg-primary-muted text-primary-strong"
                : "border-border bg-surface-hover text-foreground-muted"
            }`}
          >
            Lose weight
          </button>
          <button
            type="button"
            onClick={() => setDirection("gain")}
            aria-pressed={direction === "gain"}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              direction === "gain"
                ? "border-primary bg-primary-muted text-primary-strong"
                : "border-border bg-surface-hover text-foreground-muted"
            }`}
          >
            Gain weight
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="weeklyRateMagnitude"
          className="text-xs font-medium text-foreground-muted"
        >
          Weekly rate (kg/week)
        </label>
        <input
          id="weeklyRateMagnitude"
          name="weeklyRateMagnitude"
          type="number"
          inputMode="decimal"
          step="0.05"
          min="0.05"
          max="1"
          required
          placeholder="0.3"
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <p className="text-xs text-foreground-muted">
          Recommended: 0.2–0.5 kg/week for loss. Capped at 1 kg/week.
        </p>
      </div>

      {/* Hidden signed field — the only one the server action reads. */}
      <input type="hidden" name="weeklyRateKg" />

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Setting goal…" : "Set goal"}
      </Button>
    </form>
  );
}
