"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { logWeight, type LogWeightState } from "@/app/(app)/body/actions";

const initialState: LogWeightState = {};

function todayLocalISODate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function WeightForm() {
  const [state, formAction, pending] = useActionState(logWeight, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {/* Its own full-width row, not sharing a grid column — iOS Safari's
          native date input enforces an internal minimum width that ignores
          CSS width/min-width once the column is narrower than that, so a
          shared column isn't reliably wide enough regardless of CSS. */}
      <div className="space-y-1.5">
        <label htmlFor="date" className="text-xs font-medium text-foreground-muted">
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={todayLocalISODate()}
          max={todayLocalISODate()}
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="weightKg" className="text-xs font-medium text-foreground-muted">
            Weight (kg)
          </label>
          <input
            id="weightKg"
            name="weightKg"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="400"
            required
            placeholder="72.4"
            className="w-full min-w-0 rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="bodyFatPct" className="text-xs font-medium text-foreground-muted">
            Body fat % (optional)
          </label>
          <input
            id="bodyFatPct"
            name="bodyFatPct"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="100"
            placeholder="—"
            className="w-full min-w-0 rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-primary-strong">Saved.</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Log weight"}
      </Button>
    </form>
  );
}
