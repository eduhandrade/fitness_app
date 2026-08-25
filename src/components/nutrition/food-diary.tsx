"use client";

import { useState, useTransition } from "react";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { deleteFoodEntry } from "@/app/(app)/nutrition/actions";
import { UNIT_LABELS } from "@/lib/nutrition/units";
import { AddFoodEntry } from "@/components/nutrition/add-food-entry";
import type { CustomFoodOption } from "@/components/nutrition/custom-foods-picker";
import type { SavedMealOption } from "@/components/nutrition/saved-meals-panel";
import type { RecentFoodOption } from "@/components/nutrition/recent-foods-panel";
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

export function FoodDiary({
  entries,
  customFoods,
  savedMeals,
  recentByMeal,
}: {
  entries: FoodEntryItem[];
  customFoods: CustomFoodOption[];
  savedMeals: SavedMealOption[];
  recentByMeal: Record<MealType, RecentFoodOption[]>;
}) {
  const [isPending, startTransition] = useTransition();
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>(null);

  return (
    <div className="space-y-4">
      {MEAL_ORDER.map(({ value, label }) => {
        const items = entries.filter((e) => e.meal === value);
        const subtotal = items.reduce((sum, e) => sum + e.calories, 0);
        const isExpanded = expandedMeal === value;

        return (
          <div key={value}>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-foreground">{label}</h3>
                <button
                  type="button"
                  aria-label={`Add to ${label}`}
                  aria-pressed={isExpanded}
                  onClick={() => setExpandedMeal(isExpanded ? null : value)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                    isExpanded
                      ? "border-primary bg-primary-muted text-primary-strong"
                      : "border-border text-foreground-muted hover:bg-surface-hover"
                  }`}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              {items.length > 0 && (
                <span className="text-xs text-foreground-muted">
                  {Math.round(subtotal)} kcal
                </span>
              )}
            </div>

            {isExpanded && (
              <div className="mb-3 rounded-xl border border-border p-3">
                <AddFoodEntry
                  meal={value}
                  customFoods={customFoods}
                  savedMeals={savedMeals}
                  recentFoods={recentByMeal[value] ?? []}
                  onLogged={() => setExpandedMeal(null)}
                />
              </div>
            )}

            {items.length > 0 ? (
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
            ) : (
              !isExpanded && (
                <p className="text-xs text-foreground-muted">Nothing logged yet.</p>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
