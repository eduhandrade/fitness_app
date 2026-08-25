"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { CreateSavedMealForm } from "@/components/nutrition/create-saved-meal-form";
import { logSavedMeal, deleteSavedMeal } from "@/app/(app)/nutrition/actions";
import type { MealType } from "@/generated/prisma/enums";

export type SavedMealOption = {
  id: string;
  name: string;
  totalCalories: number;
  itemCount: number;
};

export function SavedMealsPanel({
  items,
  meal,
  date,
  onLogged,
}: {
  items: SavedMealOption[];
  meal: MealType;
  date: string;
  onLogged?: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (creating) {
    return (
      <CreateSavedMealForm
        onCreated={() => setCreating(false)}
        onCancel={() => setCreating(false)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant="ghost" onClick={() => setCreating(true)}>
        + Criar refeição
      </Button>

      {items.length === 0 ? (
        <p className="text-sm text-foreground-muted">Nenhuma refeição salva ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((savedMeal) => (
            <li key={savedMeal.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-foreground">{savedMeal.name}</p>
                <p className="text-xs text-foreground-muted">
                  {savedMeal.itemCount} {savedMeal.itemCount === 1 ? "item" : "itens"} ·{" "}
                  {Math.round(savedMeal.totalCalories)} kcal
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Log ${savedMeal.name}`}
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await logSavedMeal(savedMeal.id, date, meal);
                      onLogged?.();
                    })
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-surface-hover disabled:opacity-50"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${savedMeal.name}`}
                  disabled={isPending}
                  onClick={() => startTransition(() => deleteSavedMeal(savedMeal.id))}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-hover hover:text-danger disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
