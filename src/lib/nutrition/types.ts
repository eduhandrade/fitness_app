import type { NutritionBasis } from "@/generated/prisma/enums";

/** A food the user has picked but not yet confirmed a quantity for — an
 * Open Food Facts search result (always PER_100G), an entry from the app's
 * own curated Food catalog (either basis), or one of the user's own
 * CustomFood entries (either basis). */
export type SelectableFood = {
  source: "off" | "local" | "custom";
  code: string | null;
  name: string;
  brand: string | null;
  basis: NutritionBasis;
  caloriesPerBasis: number;
  proteinPerBasis: number;
  carbsPerBasis: number;
  fatPerBasis: number;
};
