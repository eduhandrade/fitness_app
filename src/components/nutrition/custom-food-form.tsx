"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { createCustomFood } from "@/app/(app)/nutrition/actions";
import type { NutritionBasis } from "@/generated/prisma/enums";

const fieldClass =
  "w-full min-w-0 rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary";

export function CustomFoodForm({
  onCreated,
  onCancel,
}: {
  onCreated?: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [basis, setBasis] = useState<NutritionBasis>("PER_UNIT");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createCustomFood({
          name: name.trim(),
          brand: brand.trim() || null,
          basis,
          calories: Number(calories) || 0,
          proteinG: Number(proteinG) || 0,
          carbsG: Number(carbsG) || 0,
          fatG: Number(fatG) || 0,
        });
        onCreated?.();
      } catch {
        setError("Couldn't save this food. Try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="customName" className="text-xs font-medium text-foreground-muted">
          Name
        </label>
        <input
          id="customName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ovo cozido"
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="customBrand" className="text-xs font-medium text-foreground-muted">
          Brand (optional)
        </label>
        <input
          id="customBrand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-foreground-muted">Measured by</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setBasis("PER_UNIT")}
            aria-pressed={basis === "PER_UNIT"}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              basis === "PER_UNIT"
                ? "border-primary bg-primary-muted text-primary-strong"
                : "border-border bg-surface-hover text-foreground-muted"
            }`}
          >
            Per unit
          </button>
          <button
            type="button"
            onClick={() => setBasis("PER_100G")}
            aria-pressed={basis === "PER_100G"}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              basis === "PER_100G"
                ? "border-primary bg-primary-muted text-primary-strong"
                : "border-border bg-surface-hover text-foreground-muted"
            }`}
          >
            Per 100g
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="customCalories" className="text-xs font-medium text-foreground-muted">
            Calories {basis === "PER_UNIT" ? "per unit" : "per 100g"}
          </label>
          <input
            id="customCalories"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="customProtein" className="text-xs font-medium text-foreground-muted">
            Protein (g)
          </label>
          <input
            id="customProtein"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={proteinG}
            onChange={(e) => setProteinG(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="customCarbs" className="text-xs font-medium text-foreground-muted">
            Carbs (g)
          </label>
          <input
            id="customCarbs"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={carbsG}
            onChange={(e) => setCarbsG(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="customFat" className="text-xs font-medium text-foreground-muted">
            Fat (g)
          </label>
          <input
            id="customFat"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={fatG}
            onChange={(e) => setFatG(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save food"}
        </Button>
        <Button type="button" variant="ghost" disabled={isPending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
