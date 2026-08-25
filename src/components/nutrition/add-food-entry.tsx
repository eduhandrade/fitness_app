"use client";

import { useState, useTransition } from "react";
import { FoodSearchPicker } from "@/components/nutrition/food-search-picker";
import { FoodQuantityForm } from "@/components/nutrition/food-quantity-form";
import { CustomFoodsPicker, type CustomFoodOption } from "@/components/nutrition/custom-foods-picker";
import { RecentFoodsPanel, type RecentFoodOption } from "@/components/nutrition/recent-foods-panel";
import { SavedMealsPanel, type SavedMealOption } from "@/components/nutrition/saved-meals-panel";
import { logFoodEntry } from "@/app/(app)/nutrition/actions";
import type { FoodSearchResult } from "@/lib/nutrition/open-food-facts";
import type { FoodUnit, MealType } from "@/generated/prisma/enums";
import type { SelectableFood } from "@/lib/nutrition/types";

type Tab = "search" | "recent" | "saved" | "custom";

const TABS: { value: Tab; label: string }[] = [
  { value: "search", label: "Buscar" },
  { value: "recent", label: "Recentes" },
  { value: "saved", label: "Minhas Refeições" },
  { value: "custom", label: "Meus Alimentos" },
];

function todayLocalISODate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/** Scoped to a single meal — rendered inline under that meal's "+" in
 * FoodDiary. A 4-way switcher (Buscar/Recentes/Minhas Refeições/Meus
 * Alimentos) replaces the old single search box + meal dropdown. */
export function AddFoodEntry({
  meal,
  customFoods,
  savedMeals,
  recentFoods,
  onLogged,
}: {
  meal: MealType;
  customFoods: CustomFoodOption[];
  savedMeals: SavedMealOption[];
  recentFoods: RecentFoodOption[];
  onLogged?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("search");
  const [selected, setSelected] = useState<SelectableFood | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function pickOffResult(result: FoodSearchResult) {
    setSelected({
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

  function pickCustomFood(food: CustomFoodOption) {
    setSelected({
      source: "custom",
      code: null,
      name: food.name,
      brand: food.brand,
      basis: food.basis,
      caloriesPerBasis: food.calories,
      proteinPerBasis: food.proteinG,
      carbsPerBasis: food.carbsG,
      fatPerBasis: food.fatG,
    });
  }

  function handleConfirm({
    quantity,
    unit,
    date,
  }: {
    quantity: number;
    unit: FoodUnit;
    date: string;
  }) {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      try {
        await logFoodEntry({
          date,
          meal,
          quantity,
          unit,
          name: selected.name,
          brand: selected.brand,
          basis: selected.basis,
          caloriesPerBasis: selected.caloriesPerBasis,
          proteinPerBasis: selected.proteinPerBasis,
          carbsPerBasis: selected.carbsPerBasis,
          fatPerBasis: selected.fatPerBasis,
          sourceCode: selected.code,
        });
        setSelected(null);
        onLogged?.();
      } catch {
        setError("Couldn't log this entry. Try again.");
      }
    });
  }

  if (selected) {
    return (
      <div className="space-y-2">
        <FoodQuantityForm
          food={selected}
          confirmLabel="Log food"
          pending={isPending}
          onConfirm={handleConfirm}
          onCancel={() => setSelected(null)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  const date = todayLocalISODate();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              tab === t.value
                ? "border-primary bg-primary-muted text-primary-strong"
                : "border-border bg-surface-hover text-foreground-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "search" && <FoodSearchPicker onPick={pickOffResult} />}
      {tab === "recent" && (
        <RecentFoodsPanel items={recentFoods} meal={meal} date={date} onLogged={onLogged} />
      )}
      {tab === "saved" && (
        <SavedMealsPanel items={savedMeals} meal={meal} date={date} onLogged={onLogged} />
      )}
      {tab === "custom" && <CustomFoodsPicker items={customFoods} onPick={pickCustomFood} />}
    </div>
  );
}
