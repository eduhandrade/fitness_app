"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { DateSelectField } from "@/components/ui/date-select-field";
import { UNIT_LABELS, resolveGrams } from "@/lib/nutrition/units";
import type { FoodUnit } from "@/generated/prisma/enums";
import type { SelectableFood } from "@/lib/nutrition/types";

const CURRENT_YEAR = new Date().getUTCFullYear();

function todayLocalISODate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

const UNIT_OPTIONS: FoodUnit[] = ["GRAM", "KILOGRAM", "CUP", "TABLESPOON", "TEASPOON"];
const VOLUME_UNITS: FoodUnit[] = ["CUP", "TABLESPOON", "TEASPOON"];

const fieldClass =
  "w-full min-w-0 rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary";

/** Quantity + unit confirm step, shared by the single-food add flow and the
 * saved-meal builder. Basis-aware: PER_UNIT foods collapse the unit
 * selector to just "un" (quantity means "how many"), since they have no
 * gram equivalent at all. `showDate` controls whether a date picker is
 * rendered — the saved-meal builder doesn't need one (a saved meal isn't
 * logged for a date, only its later use is). */
export function FoodQuantityForm({
  food,
  showDate = true,
  confirmLabel = "Add",
  pending = false,
  onConfirm,
  onCancel,
}: {
  food: SelectableFood;
  showDate?: boolean;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: (params: { quantity: number; unit: FoodUnit; date: string }) => void;
  onCancel: () => void;
}) {
  const isPerUnit = food.basis === "PER_UNIT";
  const [quantity, setQuantity] = useState(isPerUnit ? "1" : "100");
  const [unit, setUnit] = useState<FoodUnit>(isPerUnit ? "UNIT" : "GRAM");
  const [error, setError] = useState<string | null>(null);

  const grams = !isPerUnit
    ? resolveGrams(Number(quantity) || 0, unit as Exclude<FoodUnit, "UNIT">)
    : null;
  const isVolumeUnit = !isPerUnit && VOLUME_UNITS.includes(unit);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }
    const date = showDate
      ? String(new FormData(e.currentTarget).get("date") ?? "")
      : todayLocalISODate();
    if (showDate && !date) {
      setError("Pick a date.");
      return;
    }
    setError(null);
    onConfirm({ quantity: qty, unit, date });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <p className="text-sm text-foreground">{food.name}</p>
        {food.brand && <p className="text-xs text-foreground-muted">{food.brand}</p>}
        <p className="text-xs text-foreground-muted">
          {Math.round(food.caloriesPerBasis)} kcal / {isPerUnit ? "unit" : "100g"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="quantity" className="text-xs font-medium text-foreground-muted">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            inputMode="decimal"
            step={isPerUnit ? "1" : "0.1"}
            min={isPerUnit ? "1" : "0.1"}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="unit" className="text-xs font-medium text-foreground-muted">
            Unit
          </label>
          {isPerUnit ? (
            <input disabled value={UNIT_LABELS.UNIT} className={fieldClass} />
          ) : (
            <select
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as FoodUnit)}
              className={fieldClass}
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {grams !== null && (
        <p className="text-xs text-foreground-muted">
          ≈ {Math.round(grams)}g
          {isVolumeUnit
            ? " (assumes water-like density — adjust the quantity if this food is denser or lighter)"
            : ""}
        </p>
      )}

      {showDate && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-foreground-muted">Date</span>
          <DateSelectField
            id="date"
            name="date"
            defaultValue={todayLocalISODate()}
            minYear={CURRENT_YEAR - 1}
            maxYear={CURRENT_YEAR}
          />
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "…" : confirmLabel}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
          Back
        </Button>
      </div>
    </form>
  );
}
