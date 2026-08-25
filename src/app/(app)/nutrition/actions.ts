"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toUtcDateOnly } from "@/lib/date";
import { ActivityLevel, FoodUnit, MealType, NutritionBasis } from "@/generated/prisma/enums";
import { ageFromDateOfBirth, calculateBmr, calculateTdee } from "@/lib/nutrition/bmr";
import {
  calculateDailyCalorieTarget,
  calculateTargetDate,
  MAX_WEEKLY_RATE_KG,
} from "@/lib/nutrition/goal";
import { calculateNutrientsForEntry } from "@/lib/nutrition/units";
import { normalizeSearchText } from "@/lib/nutrition/search-text";
import {
  searchFoods as searchOpenFoodFacts,
  type FoodSearchResult,
} from "@/lib/nutrition/open-food-facts";

const activityLevelSchema = z.object({
  activityLevel: z.nativeEnum(ActivityLevel),
});

export type NutritionProfileState = { error?: string; success?: boolean };

export async function saveNutritionProfile(
  _prevState: NutritionProfileState,
  formData: FormData
): Promise<NutritionProfileState> {
  const userId = await requireUserId();

  const parsed = activityLevelSchema.safeParse({
    activityLevel: formData.get("activityLevel"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid activity level." };
  }

  await prisma.profile.upsert({
    where: { userId },
    update: { activityLevel: parsed.data.activityLevel },
    create: { userId, activityLevel: parsed.data.activityLevel },
  });

  revalidatePath("/nutrition");
  return { success: true };
}

const weightGoalSchema = z.object({
  goalWeightKg: z.coerce.number().positive().max(400),
  weeklyRateKg: z.coerce.number().min(-MAX_WEEKLY_RATE_KG).max(MAX_WEEKLY_RATE_KG),
});

export type WeightGoalState = { error?: string; success?: boolean };

export async function createWeightGoal(
  _prevState: WeightGoalState,
  formData: FormData
): Promise<WeightGoalState> {
  const userId = await requireUserId();

  const parsed = weightGoalSchema.safeParse({
    goalWeightKg: formData.get("goalWeightKg"),
    weeklyRateKg: formData.get("weeklyRateKg"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid goal." };
  }
  if (parsed.data.weeklyRateKg === 0) {
    return { error: "Weekly rate can't be zero — pick a direction to lose or gain." };
  }

  const [profile, latestWeight] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.bodyMetric.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
      select: { weightKg: true },
    }),
  ]);

  if (!profile?.heightCm || !profile?.dateOfBirth || !latestWeight) {
    return {
      error:
        "Complete your height and date of birth in Profile, and log a current weight in Body, before setting a goal.",
    };
  }

  const startDate = toUtcDateOnly(new Date().toISOString().slice(0, 10));
  const startWeightKg = latestWeight.weightKg;
  const age = ageFromDateOfBirth(profile.dateOfBirth, startDate);
  const bmr = calculateBmr({
    weightKg: startWeightKg,
    heightCm: profile.heightCm,
    age,
    sex: profile.sex,
  });
  const tdee = calculateTdee(bmr, profile.activityLevel);
  const dailyCalorieTarget = calculateDailyCalorieTarget({
    tdee,
    weeklyRateKg: parsed.data.weeklyRateKg,
    sex: profile.sex,
  });
  const targetDate = calculateTargetDate({
    startDate,
    startWeightKg,
    goalWeightKg: parsed.data.goalWeightKg,
    weeklyRateKg: parsed.data.weeklyRateKg,
  });

  await prisma.$transaction(async (tx) => {
    await tx.weightGoal.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "ARCHIVED" },
    });
    await tx.weightGoal.create({
      data: {
        userId,
        startDate,
        startWeightKg,
        goalWeightKg: parsed.data.goalWeightKg,
        weeklyRateKg: parsed.data.weeklyRateKg,
        targetDate,
        dailyCalorieTarget,
        status: "ACTIVE",
      },
    });
  });

  revalidatePath("/nutrition");
  revalidatePath("/body");
  return { success: true };
}

export async function endWeightGoal(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.weightGoal.updateMany({
    where: { id, userId },
    data: { status: "ARCHIVED" },
  });
  revalidatePath("/nutrition");
  revalidatePath("/body");
}

export type LocalFoodResult = {
  id: string;
  name: string;
  brand: string | null;
  basis: NutritionBasis;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  defaultQuantity: number;
  defaultUnit: FoodUnit;
};

export type SearchFoodsResult = {
  local: LocalFoodResult[];
  online: FoodSearchResult[];
  onlineError: string | null;
};

/** Searches the app's own curated Food catalog first (fast, reliable, not
 * dependent on any external network call) and Open Food Facts second, as a
 * supplementary source. Returns a result value rather than throwing — this
 * Next.js version strips a thrown error's message down to a generic "Server
 * Components render" digest once built for production, so a friendly
 * message here would never actually reach the client outside of local dev. */
export async function searchFoods(query: string): Promise<SearchFoodsResult> {
  await requireUserId();
  const trimmed = query.trim();
  if (!trimmed) return { local: [], online: [], onlineError: null };

  const searchName = normalizeSearchText(trimmed);
  const local = await prisma.food.findMany({
    where: { searchName: { contains: searchName } },
    orderBy: { name: "asc" },
    take: 20,
  });

  let online: FoodSearchResult[] = [];
  let onlineError: string | null = null;
  try {
    online = await searchOpenFoodFacts(trimmed);
  } catch {
    onlineError = "Couldn't reach the food database — try again.";
  }

  return {
    local: local.map((food) => ({
      id: food.id,
      name: food.name,
      brand: food.brand,
      basis: food.basis,
      calories: food.calories,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
      defaultQuantity: food.defaultQuantity,
      defaultUnit: food.defaultUnit,
    })),
    online,
    onlineError,
  };
}

const logFoodEntrySchema = z.object({
  date: z.string().min(1),
  meal: z.nativeEnum(MealType),
  quantity: z.coerce.number().positive(),
  unit: z.nativeEnum(FoodUnit),
  name: z.string().min(1),
  brand: z.string().nullable(),
  basis: z.nativeEnum(NutritionBasis),
  caloriesPerBasis: z.coerce.number().nonnegative(),
  proteinPerBasis: z.coerce.number().nonnegative(),
  carbsPerBasis: z.coerce.number().nonnegative(),
  fatPerBasis: z.coerce.number().nonnegative(),
  sourceCode: z.string().nullable(),
});

export type LogFoodEntryInput = z.infer<typeof logFoodEntrySchema>;

export async function logFoodEntry(input: LogFoodEntryInput): Promise<void> {
  const userId = await requireUserId();
  const parsed = logFoodEntrySchema.parse(input);

  const { grams, nutrients } = calculateNutrientsForEntry({
    quantity: parsed.quantity,
    unit: parsed.unit,
    basis: parsed.basis,
    perBasis: {
      calories: parsed.caloriesPerBasis,
      proteinG: parsed.proteinPerBasis,
      carbsG: parsed.carbsPerBasis,
      fatG: parsed.fatPerBasis,
    },
  });

  await prisma.foodEntry.create({
    data: {
      userId,
      date: toUtcDateOnly(parsed.date),
      meal: parsed.meal,
      name: parsed.name,
      brand: parsed.brand,
      quantity: parsed.quantity,
      unit: parsed.unit,
      grams,
      calories: nutrients.calories,
      proteinG: nutrients.proteinG,
      carbsG: nutrients.carbsG,
      fatG: nutrients.fatG,
      sourceCode: parsed.sourceCode,
    },
  });

  revalidatePath("/nutrition");
  revalidatePath("/body");
}

export async function deleteFoodEntry(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.foodEntry.delete({ where: { id, userId } });
  revalidatePath("/nutrition");
  revalidatePath("/body");
}

/** Re-logs a previously logged entry as-is (same quantity/unit/nutrition)
 * into today (or another date) under a chosen meal — the "Recentes"
 * one-tap flow. No re-fetch from Open Food Facts or recomputation: the
 * source entry's values are already fully resolved. */
export async function logRecentFood(
  sourceEntryId: string,
  date: string,
  meal: MealType
): Promise<void> {
  const userId = await requireUserId();
  const source = await prisma.foodEntry.findFirst({ where: { id: sourceEntryId, userId } });
  if (!source) throw new Error("Entry not found.");

  await prisma.foodEntry.create({
    data: {
      userId,
      date: toUtcDateOnly(date),
      meal,
      name: source.name,
      brand: source.brand,
      quantity: source.quantity,
      unit: source.unit,
      grams: source.grams,
      calories: source.calories,
      proteinG: source.proteinG,
      carbsG: source.carbsG,
      fatG: source.fatG,
      sourceCode: source.sourceCode,
    },
  });

  revalidatePath("/nutrition");
  revalidatePath("/body");
}

const customFoodSchema = z.object({
  name: z.string().min(1).max(100),
  brand: z.string().max(100).nullable(),
  basis: z.nativeEnum(NutritionBasis),
  calories: z.coerce.number().nonnegative(),
  proteinG: z.coerce.number().nonnegative(),
  carbsG: z.coerce.number().nonnegative(),
  fatG: z.coerce.number().nonnegative(),
});

export type CreateCustomFoodInput = z.infer<typeof customFoodSchema>;

export async function createCustomFood(input: CreateCustomFoodInput): Promise<void> {
  const userId = await requireUserId();
  const parsed = customFoodSchema.parse(input);
  await prisma.customFood.create({ data: { userId, ...parsed } });
  revalidatePath("/nutrition");
}

export async function deleteCustomFood(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.customFood.delete({ where: { id, userId } });
  revalidatePath("/nutrition");
}

const savedMealItemSchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable(),
  quantity: z.coerce.number().positive(),
  unit: z.nativeEnum(FoodUnit),
  grams: z.coerce.number().nullable(),
  calories: z.coerce.number().nonnegative(),
  proteinG: z.coerce.number().nonnegative(),
  carbsG: z.coerce.number().nonnegative(),
  fatG: z.coerce.number().nonnegative(),
  sourceCode: z.string().nullable(),
});

const createSavedMealSchema = z.object({
  name: z.string().min(1).max(100),
  items: z.array(savedMealItemSchema).min(1),
});

export type CreateSavedMealInput = z.infer<typeof createSavedMealSchema>;

/** A saved meal is a fixed combo, not a live formula — each item stores
 * already-resolved final values (same shape as FoodEntry), computed once
 * at save time via the same calculateNutrientsForEntry path as logging a
 * single food. Logging it later is a pure clone (see logSavedMeal below),
 * so a saved meal's totals never silently change if the source food's data
 * changes later. */
export async function createSavedMeal(input: CreateSavedMealInput): Promise<void> {
  const userId = await requireUserId();
  const parsed = createSavedMealSchema.parse(input);

  await prisma.savedMeal.create({
    data: {
      userId,
      name: parsed.name,
      items: { create: parsed.items },
    },
  });

  revalidatePath("/nutrition");
}

export async function logSavedMeal(
  savedMealId: string,
  date: string,
  meal: MealType
): Promise<void> {
  const userId = await requireUserId();
  const savedMeal = await prisma.savedMeal.findFirst({
    where: { id: savedMealId, userId },
    include: { items: true },
  });
  if (!savedMeal) throw new Error("Saved meal not found.");

  const dateUtc = toUtcDateOnly(date);
  await prisma.foodEntry.createMany({
    data: savedMeal.items.map((item) => ({
      userId,
      date: dateUtc,
      meal,
      name: item.name,
      brand: item.brand,
      quantity: item.quantity,
      unit: item.unit,
      grams: item.grams,
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      sourceCode: item.sourceCode,
    })),
  });

  revalidatePath("/nutrition");
  revalidatePath("/body");
}

export async function deleteSavedMeal(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.savedMeal.delete({ where: { id, userId } });
  revalidatePath("/nutrition");
}
