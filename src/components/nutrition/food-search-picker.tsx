"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/icons";
import {
  searchLocalFoods,
  searchOnlineFoods,
  logFoodEntry,
  type LocalFoodResult,
} from "@/app/(app)/nutrition/actions";
import { UNIT_LABELS, calculateNutrientsForEntry } from "@/lib/nutrition/units";
import type { FoodSearchResult } from "@/lib/nutrition/open-food-facts";
import type { MealType } from "@/generated/prisma/enums";
import type { SelectableFood } from "@/lib/nutrition/types";

const fieldClass =
  "w-full min-w-0 rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary";

const LOCAL_SEARCH_DEBOUNCE_MS = 250;

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

/** Searches the app's own curated Food catalog live, as the user types
 * (debounced, no button, no network call — true autocomplete) — shown with
 * its everyday default serving and, when `meal`/`date` are given, an
 * instant one-tap "+" that logs that serving directly, no form. Open Food
 * Facts is a separate, explicit "Buscar online" action instead of being
 * bundled into every keystroke: it's a live external call, meaningfully
 * slower and not always reachable, and firing it automatically on every
 * keystroke would make the whole search feel exactly as slow as it is —
 * this way the fast local path never waits on it. Without `meal`/`date`
 * (the saved-meal builder), every result — local or online — is
 * tap-to-pick only, since there's nothing to log to yet. */
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
  const [localSearched, setLocalSearched] = useState(false);
  const [online, setOnline] = useState<FoodSearchResult[] | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [isLocalPending, startLocalTransition] = useTransition();
  const [isOnlinePending, startOnlineTransition] = useTransition();
  const [loggingId, setLoggingId] = useState<string | null>(null);

  const canQuickAdd = Boolean(meal && date);

  // Live autocomplete: debounced so it doesn't fire a query on every single
  // keystroke, but never requires an explicit search action. The empty-query
  // reset and clearing stale online results both happen synchronously in
  // handleQueryChange (the actual event handler) rather than here, since
  // deriving state changes from a prop/state change inside an effect body
  // is exactly the cascading-render pattern React (and this lint config)
  // wants avoided — only the genuinely async, debounced fetch belongs here.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      startLocalTransition(async () => {
        setLocal(await searchLocalFoods(trimmed));
        setLocalSearched(true);
      });
    }, LOCAL_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, startLocalTransition]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setOnline(null);
    setOnlineError(null);
    if (!value.trim()) {
      setLocal([]);
      setLocalSearched(false);
    }
  }

  function handleOnlineSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    startOnlineTransition(async () => {
      const result = await searchOnlineFoods(trimmed);
      if (result.ok) {
        setOnline(result.results);
        setOnlineError(null);
      } else {
        setOnline([]);
        setOnlineError(result.error);
      }
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
    startLocalTransition(async () => {
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

  return (
    <div className="space-y-3">
      <form onSubmit={handleOnlineSearch} className="flex gap-2">
        <input
          id="foodSearch"
          type="text"
          aria-label="Search food"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search a food, e.g. banana"
          className={fieldClass}
        />
        <Button type="submit" disabled={isOnlinePending || !query.trim()}>
          {isOnlinePending ? "…" : "Buscar online"}
        </Button>
      </form>

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
                  disabled={isLocalPending}
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

      {localSearched && local.length === 0 && online === null && (
        <p className="text-sm text-foreground-muted">
          Nada encontrado na nossa base — toque em &quot;Buscar online&quot; para tentar o Open
          Food Facts.
        </p>
      )}

      {online !== null && (
        <div className="space-y-1">
          {local.length > 0 && (
            <p className="text-xs font-medium text-foreground-muted">Resultados online</p>
          )}
          {onlineError ? (
            <p className="text-sm text-danger">{onlineError}</p>
          ) : online.length === 0 ? (
            <p className="text-sm text-foreground-muted">Nenhum resultado online.</p>
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
}
