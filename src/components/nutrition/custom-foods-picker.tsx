"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@/components/icons";
import { CustomFoodForm } from "@/components/nutrition/custom-food-form";
import { deleteCustomFood } from "@/app/(app)/nutrition/actions";
import type { NutritionBasis } from "@/generated/prisma/enums";

export type CustomFoodOption = {
  id: string;
  name: string;
  brand: string | null;
  basis: NutritionBasis;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export function CustomFoodsPicker({
  items,
  onPick,
}: {
  items: CustomFoodOption[];
  onPick: (food: CustomFoodOption) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (creating) {
    return (
      <CustomFoodForm onCreated={() => setCreating(false)} onCancel={() => setCreating(false)} />
    );
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant="ghost" onClick={() => setCreating(true)}>
        + Criar alimento
      </Button>

      {items.length === 0 ? (
        <p className="text-sm text-foreground-muted">Nenhum alimento cadastrado ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((food) => (
            <li key={food.id} className="flex items-center justify-between py-2">
              <button type="button" onClick={() => onPick(food)} className="flex-1 text-left">
                <p className="text-sm text-foreground">{food.name}</p>
                <p className="text-xs text-foreground-muted">
                  {Math.round(food.calories)} kcal / {food.basis === "PER_UNIT" ? "un" : "100g"}
                  {food.brand ? ` · ${food.brand}` : ""}
                </p>
              </button>
              <button
                type="button"
                aria-label={`Delete ${food.name}`}
                disabled={isPending}
                onClick={() => startTransition(() => deleteCustomFood(food.id))}
                className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-hover hover:text-danger disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
