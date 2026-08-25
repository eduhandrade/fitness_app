import type { NutritionBasis } from "@/generated/prisma/enums";

/** A food the user has picked but not yet confirmed a quantity for — either
 * an Open Food Facts search result (always PER_100G) or one of the user's
 * own CustomFood entries (either basis). */
export type SelectableFood = {
  source: "off" | "custom";
  code: string | null;
  name: string;
  brand: string | null;
  basis: NutritionBasis;
  caloriesPerBasis: number;
  proteinPerBasis: number;
  carbsPerBasis: number;
  fatPerBasis: number;
};
