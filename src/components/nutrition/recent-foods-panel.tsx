"use client";

import { useTransition } from "react";
import { PlusIcon } from "@/components/icons";
import { logRecentFood } from "@/app/(app)/nutrition/actions";
import { UNIT_LABELS } from "@/lib/nutrition/units";
import type { FoodUnit, MealType } from "@/generated/prisma/enums";

export type RecentFoodOption = {
  id: string;
  name: string;
  brand: string | null;
  quantity: number;
  unit: FoodUnit;
  calories: number;
};

/** One-tap re-log: clones a previously logged entry's already-resolved
 * values into a new row for the given date/meal, with no intermediate
 * quantity form and no re-fetch from Open Food Facts. */
export function RecentFoodsPanel({
  items,
  meal,
  date,
  onLogged,
}: {
  items: RecentFoodOption[];
  meal: MealType;
  date: string;
  onLogged?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        Nada registrado ainda para esta refeição.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-foreground">{item.name}</p>
            <p className="text-xs text-foreground-muted">
              {item.quantity} {UNIT_LABELS[item.unit]} · {Math.round(item.calories)} kcal
              {item.brand ? ` · ${item.brand}` : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Log ${item.name}`}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await logRecentFood(item.id, date, meal);
                onLogged?.();
              })
            }
            className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-surface-hover disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
