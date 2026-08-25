"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@/components/icons";
import { FoodSearchPicker } from "@/components/nutrition/food-search-picker";
import { FoodQuantityForm } from "@/components/nutrition/food-quantity-form";
import { createSavedMeal, type CreateSavedMealInput } from "@/app/(app)/nutrition/actions";
import { calculateNutrientsForEntry, UNIT_LABELS } from "@/lib/nutrition/units";
import type { FoodSearchResult } from "@/lib/nutrition/open-food-facts";
import type { FoodUnit } from "@/generated/prisma/enums";
import type { SelectableFood } from "@/lib/nutrition/types";

const fieldClass =
  "w-full min-w-0 rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary";

type DraftItem = CreateSavedMealInput["items"][number];

/** Builds a saved meal by adding several items to a client-side draft list
 * (reusing the same search + quantity-confirm flow as logging a single
 * food), then names and saves the combo in one go. Deliberately doesn't
 * share AddFoodEntry's component directly — this flow has no date/meal
 * and adds to a draft instead of logging immediately. */
export function CreateSavedMealForm({
  onCreated,
  onCancel,
}: {
  onCreated?: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [picking, setPicking] = useState<SelectableFood | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function pickOffResult(result: FoodSearchResult) {
    setPicking({
      source: "off",
      code: result.code,
      name: result.name,
      brand: result.brand,
      basis: "PER_100G",
      caloriesPerBasis: result.caloriesPer100g,
      proteinPerBasis: result.proteinPer100g,
      carbsPerBasis: result.carbsPer100g,
      fatPerBasis: result.fatPer100g,
    });
  }

  function handleAddItem({ quantity, unit }: { quantity: number; unit: FoodUnit }) {
    if (!picking) return;
    const { grams, nutrients } = calculateNutrientsForEntry({
      quantity,
      unit,
      basis: picking.basis,
      perBasis: {
        calories: picking.caloriesPerBasis,
        proteinG: picking.proteinPerBasis,
        carbsG: picking.carbsPerBasis,
        fatG: picking.fatPerBasis,
      },
    });
    setItems((prev) => [
      ...prev,
      {
        name: picking.name,
        brand: picking.brand,
        quantity,
        unit,
        grams,
        calories: nutrients.calories,
        proteinG: nutrients.proteinG,
        carbsG: nutrients.carbsG,
        fatG: nutrients.fatG,
        sourceCode: picking.code,
      },
    ]);
    setPicking(null);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (!name.trim()) {
      setError("Enter a name for this meal.");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one item.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createSavedMeal({ name: name.trim(), items });
        onCreated?.();
      } catch {
        setError("Couldn't save this meal. Try again.");
      }
    });
  }

  if (picking) {
    return (
      <FoodQuantityForm
        food={picking}
        showDate={false}
        confirmLabel="Add to meal"
        onConfirm={handleAddItem}
        onCancel={() => setPicking(null)}
      />
    );
  }

  const totalCalories = items.reduce((sum, i) => sum + i.calories, 0);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="savedMealName" className="text-xs font-medium text-foreground-muted">
          Meal name
        </label>
        <input
          id="savedMealName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Arroz, feijão, legumes e frango"
          className={fieldClass}
        />
      </div>

      {items.length > 0 && (
        <ul className="divide-y divide-border">
          {items.map((item, index) => (
            <li key={index} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-foreground">{item.name}</p>
                <p className="text-xs text-foreground-muted">
                  {item.quantity} {UNIT_LABELS[item.unit]} · {Math.round(item.calories)} kcal
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                onClick={() => removeItem(index)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-hover hover:text-danger"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
          <li className="py-2 text-xs text-foreground-muted">
            Total: {Math.round(totalCalories)} kcal
          </li>
        </ul>
      )}

      <FoodSearchPicker onPick={pickOffResult} />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" disabled={isPending || items.length === 0} onClick={handleSave}>
          {isPending ? "Saving…" : "Save meal"}
        </Button>
        <Button type="button" variant="ghost" disabled={isPending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
