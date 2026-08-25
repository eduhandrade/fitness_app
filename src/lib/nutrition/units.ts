import type { FoodUnit, NutritionBasis } from "@/generated/prisma/enums";

export const UNIT_LABELS: Record<FoodUnit, string> = {
  GRAM: "g",
  KILOGRAM: "kg",
  CUP: "cup",
  TABLESPOON: "tbsp",
  TEASPOON: "tsp",
  UNIT: "un",
};

/** Millilitres per volume unit — standard US customary measures. */
const ML_PER_VOLUME_UNIT: Record<"CUP" | "TABLESPOON" | "TEASPOON", number> = {
  CUP: 240,
  TABLESPOON: 15,
  TEASPOON: 5,
};

/** Resolves a weight/volume quantity + unit into grams. Grams and
 * kilograms are exact — no assumption needed. Cup/tablespoon/teaspoon
 * assume water-like density (1 g/mL), because Open Food Facts has no
 * structured per-food density field to convert precisely — a documented
 * approximation, not a bug. The UI shows this resolved gram figure so the
 * user can see and, if a food is notably denser or lighter than water,
 * override it directly. Only valid for PER_100G-basis foods — UNIT has no
 * gram equivalent at all (that's the whole point of it), so passing it
 * here is a caller error. */
export function resolveGrams(quantity: number, unit: Exclude<FoodUnit, "UNIT">): number {
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

/** Resolves a logged quantity into final grams + nutrient totals, aware of
 * which basis the food's nutrition data is defined against. PER_100G foods
 * (every Open Food Facts result, and custom foods created that way) scale
 * from `resolveGrams` + `calculateNutrients` as before. PER_UNIT foods (an
 * egg, a slice of cheese — anything not practical to weigh) have no gram
 * equivalent at all: `perBasis` already means "per 1 unit", so the final
 * totals are just perBasis × quantity, and `grams` is null since none was
 * ever computed. */
export function calculateNutrientsForEntry(params: {
  quantity: number;
  unit: FoodUnit;
  basis: NutritionBasis;
  perBasis: NutrientTotals;
}): { grams: number | null; nutrients: NutrientTotals } {
  if (params.basis === "PER_UNIT") {
    const factor = params.quantity;
    return {
      grams: null,
      nutrients: {
        calories: params.perBasis.calories * factor,
        proteinG: params.perBasis.proteinG * factor,
        carbsG: params.perBasis.carbsG * factor,
        fatG: params.perBasis.fatG * factor,
      },
    };
  }

  const grams = resolveGrams(params.quantity, params.unit as Exclude<FoodUnit, "UNIT">);
  return { grams, nutrients: calculateNutrients({ grams, per100g: params.perBasis }) };
}
