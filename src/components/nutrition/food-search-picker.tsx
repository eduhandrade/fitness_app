"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/icons";
import { searchFoods, logFoodEntry, type LocalFoodResult } from "@/app/(app)/nutrition/actions";
import { UNIT_LABELS, calculateNutrientsForEntry } from "@/lib/nutrition/units";
import type { FoodSearchResult } from "@/lib/nutrition/open-food-facts";
import type { MealType } from "@/generated/prisma/enums";
import type { SelectableFood } from "@/lib/nutrition/types";

const fieldClass =
  "w-full min-w-0 rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary";

function localFoodPreview(food: LocalFoodResult): string {
  const { nutrients } = calculateNutrientsForEntry({
    quantity: food.defaultQuantity,
    unit: food.defaultUnit,
    basis: food.basis,
    perBasis: {
      calories: food.calories,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
    },
  });
  return `${Math.round(nutrients.calories)} cal, ${food.defaultQuantity} ${UNIT_LABELS[food.defaultUnit]}`;
}

/** Searches the app's own curated Food catalog first — always available,
 * shown with its everyday default serving and (when `meal`/`date` are
 * given) an instant one-tap "+" that logs that serving directly, no form —
 * and Open Food Facts second, as a supplementary, tap-to-confirm-quantity
 * source. Without `meal`/`date` (the saved-meal builder), every result
 * — local or online — is tap-to-pick only, since there's nothing to log
 * to yet. */
export function FoodSearchPicker({
  meal,
  date,
  onPick,
  onLogged,
}: {
  meal?: MealType;
  date?: string;
  onPick: (food: SelectableFood) => void;
  onLogged?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [local, setLocal] = useState<LocalFoodResult[]>([]);
  const [online, setOnline] = useState<FoodSearchResult[]>([]);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loggingId, setLoggingId] = useState<string | null>(null);

  const canQuickAdd = Boolean(meal && date);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await searchFoods(query);
      setLocal(result.local);
      setOnline(result.online);
      setOnlineError(result.onlineError);
      setSearched(true);
    });
  }

  function pickLocal(food: LocalFoodResult) {
    onPick({
      source: "local",
      code: food.id,
      name: food.name,
      brand: food.brand,
      basis: food.basis,
      caloriesPerBasis: food.calories,
      proteinPerBasis: food.proteinG,
      carbsPerBasis: food.carbsG,
      fatPerBasis: food.fatG,
    });
  }

  function pickOnline(result: FoodSearchResult) {
    onPick({
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

  function handleQuickAdd(food: LocalFoodResult) {
    if (!meal || !date) return;
    setLoggingId(food.id);
    startTransition(async () => {
      try {
        await logFoodEntry({
          date,
          meal,
          quantity: food.defaultQuantity,
          unit: food.defaultUnit,
          name: food.name,
          brand: food.brand,
          basis: food.basis,
          caloriesPerBasis: food.calories,
          proteinPerBasis: food.proteinG,
          carbsPerBasis: food.carbsG,
          fatPerBasis: food.fatG,
          sourceCode: food.id,
        });
        onLogged?.();
      } finally {
        setLoggingId(null);
      }
    });
  }

  const nothingFound = searched && local.length === 0 && online.length === 0;

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          id="foodSearch"
          type="text"
          aria-label="Search food"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a food, e.g. banana"
          className={fieldClass}
        />
        <Button type="submit" disabled={isPending || !query.trim()}>
          {isPending ? "…" : "Search"}
        </Button>
      </form>

      {nothingFound && onlineError && <p className="text-sm text-danger">{onlineError}</p>}
      {nothingFound && !onlineError && (
        <p className="text-sm text-foreground-muted">No results. Try a different search.</p>
      )}

      {local.length > 0 && (
        <ul className="divide-y divide-border">
          {local.map((food) => (
            <li key={food.id} className="flex items-center justify-between py-2">
              <button type="button" onClick={() => pickLocal(food)} className="flex-1 text-left">
                <p className="text-sm text-foreground">{food.name}</p>
                <p className="text-xs text-foreground-muted">
                  {localFoodPreview(food)}
                  {food.brand ? ` · ${food.brand}` : ""}
                </p>
              </button>
              {canQuickAdd && (
                <button
                  type="button"
                  aria-label={`Log ${food.name}`}
                  disabled={isPending}
                  onClick={() => handleQuickAdd(food)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-surface-hover disabled:opacity-50"
                >
                  {loggingId === food.id ? "…" : <PlusIcon className="h-4 w-4" />}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {online.length > 0 && (
        <div className="space-y-1">
          {local.length > 0 && (
            <p className="text-xs font-medium text-foreground-muted">Resultados online</p>
          )}
          <ul className="divide-y divide-border">
            {online.map((result) => (
              <li key={result.code}>
                <button
                  type="button"
                  onClick={() => pickOnline(result)}
                  className="flex w-full items-center justify-between py-2 text-left hover:bg-surface-hover"
                >
                  <div>
                    <p className="text-sm text-foreground">{result.name}</p>
                    {result.brand && (
                      <p className="text-xs text-foreground-muted">{result.brand}</p>
                    )}
                  </div>
                  <span className="text-xs text-foreground-muted">
                    {Math.round(result.caloriesPer100g)} kcal/100g
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {local.length > 0 && onlineError && (
        <p className="text-xs text-foreground-muted">Busca online indisponível no momento.</p>
      )}
    </div>
  );
}
