"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { DateSelectField } from "@/components/ui/date-select-field";
import { UNIT_LABELS, resolveGrams } from "@/lib/nutrition/units";
import { searchFoods, logFoodEntry } from "@/app/(app)/nutrition/actions";
import type { FoodSearchResult } from "@/lib/nutrition/open-food-facts";
import type { FoodUnit, MealType } from "@/generated/prisma/enums";

const CURRENT_YEAR = new Date().getUTCFullYear();

function todayLocalISODate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

const UNIT_OPTIONS: FoodUnit[] = ["GRAM", "KILOGRAM", "CUP", "TABLESPOON", "TEASPOON"];
const VOLUME_UNITS: FoodUnit[] = ["CUP", "TABLESPOON", "TEASPOON"];
const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
  { value: "SNACK", label: "Snack" },
];

const fieldClass =
  "w-full min-w-0 rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary";

export function AddFoodEntry() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState<FoodUnit>("GRAM");
  const [meal, setMeal] = useState<MealType>("BREAKFAST");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const found = await searchFoods(query);
        setResults(found);
        setSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed.");
      }
    });
  }

  function handleLog(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;

    const date = String(new FormData(e.currentTarget).get("date") ?? "");
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await logFoodEntry({
          date,
          meal,
          quantity: qty,
          unit,
          name: selected.name,
          brand: selected.brand,
          caloriesPer100g: selected.caloriesPer100g,
          proteinPer100g: selected.proteinPer100g,
          carbsPer100g: selected.carbsPer100g,
          fatPer100g: selected.fatPer100g,
          sourceCode: selected.code,
        });
        setSelected(null);
        setResults([]);
        setSearched(false);
        setQuery("");
        setQuantity("100");
        setUnit("GRAM");
      } catch {
        setError("Couldn't log this entry. Try again.");
      }
    });
  }

  if (selected) {
    const grams = resolveGrams(Number(quantity) || 0, unit);
    const isVolumeUnit = VOLUME_UNITS.includes(unit);

    return (
      <form onSubmit={handleLog} className="space-y-3">
        <div>
          <p className="text-sm text-foreground">{selected.name}</p>
          {selected.brand && (
            <p className="text-xs text-foreground-muted">{selected.brand}</p>
          )}
          <p className="text-xs text-foreground-muted">
            {Math.round(selected.caloriesPer100g)} kcal / 100g
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
              step="0.1"
              min="0.1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="min-w-0 space-y-1.5">
            <label htmlFor="unit" className="text-xs font-medium text-foreground-muted">
              Unit
            </label>
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
          </div>
        </div>

        <p className="text-xs text-foreground-muted">
          ≈ {Math.round(grams)}g
          {isVolumeUnit
            ? " (assumes water-like density — adjust the quantity if this food is denser or lighter)"
            : ""}
        </p>

        <div className="space-y-1.5">
          <label htmlFor="meal" className="text-xs font-medium text-foreground-muted">
            Meal
          </label>
          <select
            id="meal"
            value={meal}
            onChange={(e) => setMeal(e.target.value as MealType)}
            className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {MEAL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

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

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Logging…" : "Log food"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => setSelected(null)}
          >
            Back to search
          </Button>
        </div>
      </form>
    );
  }

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

      {error && <p className="text-sm text-danger">{error}</p>}

      {searched && results.length === 0 && !error && (
        <p className="text-sm text-foreground-muted">No results. Try a different search.</p>
      )}

      {results.length > 0 && (
        <ul className="divide-y divide-border">
          {results.map((result) => (
            <li key={result.code}>
              <button
                type="button"
                onClick={() => setSelected(result)}
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
  );
}
