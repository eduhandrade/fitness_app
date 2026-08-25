import type { FoodUnit } from "@/generated/prisma/enums";

export const UNIT_LABELS: Record<FoodUnit, string> = {
  GRAM: "g",
  KILOGRAM: "kg",
  CUP: "cup",
  TABLESPOON: "tbsp",
  TEASPOON: "tsp",
};

/** Millilitres per volume unit — standard US customary measures. */
const ML_PER_VOLUME_UNIT: Record<"CUP" | "TABLESPOON" | "TEASPOON", number> = {
  CUP: 240,
  TABLESPOON: 15,
  TEASPOON: 5,
};

/** Resolves a quantity + unit into grams. Grams and kilograms are exact —
 * no assumption needed. Cup/tablespoon/teaspoon assume water-like density
 * (1 g/mL), because Open Food Facts has no structured per-food density
 * field to convert precisely — a documented approximation, not a bug. The
 * UI shows this resolved gram figure so the user can see and, if a food is
 * notably denser or lighter than water, override it directly. */
export function resolveGrams(quantity: number, unit: FoodUnit): number {
  switch (unit) {
    case "GRAM":
      return quantity;
    case "KILOGRAM":
      return quantity * 1000;
    case "CUP":
    case "TABLESPOON":
    case "TEASPOON":
      return quantity * ML_PER_VOLUME_UNIT[unit];
  }
}

export type NutrientTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/** Scales a food's per-100g nutrient values to a resolved gram quantity. */
export function calculateNutrients(params: {
  grams: number;
  per100g: NutrientTotals;
}): NutrientTotals {
  const factor = params.grams / 100;
  return {
    calories: params.per100g.calories * factor,
    proteinG: params.per100g.proteinG * factor,
    carbsG: params.per100g.carbsG * factor,
    fatG: params.per100g.fatG * factor,
  };
}
