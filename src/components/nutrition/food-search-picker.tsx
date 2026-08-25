"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { searchFoods } from "@/app/(app)/nutrition/actions";
import type { FoodSearchResult } from "@/lib/nutrition/open-food-facts";

const fieldClass =
  "w-full min-w-0 rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary";

export function FoodSearchPicker({ onPick }: { onPick: (result: FoodSearchResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await searchFoods(query);
      if (result.ok) {
        setError(null);
        setResults(result.results);
        setSearched(true);
      } else {
        setError(result.error);
        setResults([]);
      }
    });
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
                onClick={() => onPick(result)}
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
