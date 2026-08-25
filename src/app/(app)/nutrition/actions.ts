"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toUtcDateOnly } from "@/lib/date";
import { ActivityLevel, FoodUnit, MealType } from "@/generated/prisma/enums";
import { ageFromDateOfBirth, calculateBmr, calculateTdee } from "@/lib/nutrition/bmr";
import {
  calculateDailyCalorieTarget,
  calculateTargetDate,
  MAX_WEEKLY_RATE_KG,
} from "@/lib/nutrition/goal";
import { calculateNutrients, resolveGrams } from "@/lib/nutrition/units";
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

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  await requireUserId();
  if (!query.trim()) return [];
  try {
    return await searchOpenFoodFacts(query);
  } catch {
    throw new Error("Couldn't reach the food database — try again.");
  }
}

const logFoodEntrySchema = z.object({
  date: z.string().min(1),
  meal: z.nativeEnum(MealType),
  quantity: z.coerce.number().positive(),
  unit: z.nativeEnum(FoodUnit),
  name: z.string().min(1),
  brand: z.string().nullable(),
  caloriesPer100g: z.coerce.number().nonnegative(),
  proteinPer100g: z.coerce.number().nonnegative(),
  carbsPer100g: z.coerce.number().nonnegative(),
  fatPer100g: z.coerce.number().nonnegative(),
  sourceCode: z.string().nullable(),
});

export type LogFoodEntryInput = z.infer<typeof logFoodEntrySchema>;

export async function logFoodEntry(input: LogFoodEntryInput): Promise<void> {
  const userId = await requireUserId();
  const parsed = logFoodEntrySchema.parse(input);

  const grams = resolveGrams(parsed.quantity, parsed.unit);
  const nutrients = calculateNutrients({
    grams,
    per100g: {
      calories: parsed.caloriesPer100g,
      proteinG: parsed.proteinPer100g,
      carbsG: parsed.carbsPer100g,
      fatG: parsed.fatPer100g,
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
