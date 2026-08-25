"use client";

import { useTransition } from "react";
import { TrashIcon } from "@/components/icons";
import { deleteFoodEntry } from "@/app/(app)/nutrition/actions";
import { UNIT_LABELS } from "@/lib/nutrition/units";
import type { FoodUnit, MealType } from "@/generated/prisma/enums";

export type FoodEntryItem = {
  id: string;
  meal: MealType;
  name: string;
  brand: string | null;
  quantity: number;
  unit: FoodUnit;
  calories: number;
};

const MEAL_ORDER: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Snack" },
];

export function FoodDiary({ entries }: { entries: FoodEntryItem[] }) {
  const [isPending, startTransition] = useTransition();

  if (entries.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        No food logged today yet — search above to add your first entry.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {MEAL_ORDER.map(({ value, label }) => {
        const items = entries.filter((e) => e.meal === value);
        if (items.length === 0) return null;
        const subtotal = items.reduce((sum, e) => sum + e.calories, 0);

        return (
          <div key={value}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <h3 className="text-sm font-medium text-foreground">{label}</h3>
              <span className="text-xs text-foreground-muted">
                {Math.round(subtotal)} kcal
              </span>
            </div>
            <ul className="divide-y divide-border">
              {items.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm text-foreground">{entry.name}</p>
                    <p className="text-xs text-foreground-muted">
                      {entry.quantity} {UNIT_LABELS[entry.unit]} ·{" "}
                      {Math.round(entry.calories)} kcal
                      {entry.brand ? ` · ${entry.brand}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete entry"
                    disabled={isPending}
                    onClick={() => startTransition(() => deleteFoodEntry(entry.id))}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-hover hover:text-danger disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
