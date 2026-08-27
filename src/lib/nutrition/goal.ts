import type { Sex } from "@/generated/prisma/enums";

/** Standard energy-density approximation: ~7700 kcal per kg of body fat. */
const KCAL_PER_KG_BODY_FAT = 7700;

/** Safety cap on the requested weekly rate of change, in either direction
 * (kg). ~1 kg/week (≈2.2 lb/week) is a commonly-cited safe upper bound for
 * sustained weight loss; MyFitnessPal itself defaults new users to a much
 * more conservative 0.5 lb/week (≈0.23 kg/week). Enforced in the zod schema
 * that validates goal-creation input, not just here. */
export const MAX_WEEKLY_RATE_KG = 1.0;

/** MyFitnessPal's own daily-calorie floor, per public documentation — never
 * suggest fewer calories than this regardless of how aggressive the
 * requested deficit is. Unknown/unspecified sex uses the more conservative
 * (higher) floor. */
const CALORIE_FLOOR: Record<Sex, number> = {
  MALE: 1500,
  FEMALE: 1200,
  OTHER: 1200,
};
const UNKNOWN_SEX_FLOOR = 1200;

/** Daily calorie deficit (negative) or surplus (positive) implied by a
 * target weekly rate of change. */
export function dailyDeficitFromWeeklyRate(weeklyRateKg: number): number {
  return (weeklyRateKg * KCAL_PER_KG_BODY_FAT) / 7;
}

export function calculateDailyCalorieTarget(params: {
  tdee: number;
  weeklyRateKg: number;
  sex: Sex | null;
}): number {
  const target = params.tdee + dailyDeficitFromWeeklyRate(params.weeklyRateKg);
  const floor = params.sex ? CALORIE_FLOOR[params.sex] : UNKNOWN_SEX_FLOOR;
  return Math.round(Math.max(target, floor));
}

/** Protein set within the 1.6–2.2 g/kg range the ISSN recommends for
 * athletes in a calorie deficit (to preserve lean mass under a shortfall);
 * fat set at a floor for hormonal/essential-fatty-acid needs. Carbs fill
 * whatever calories remain — appropriate here since this app's users are
 * training athletes for whom carb availability matters for performance,
 * not just a number to minimize. */
const PROTEIN_G_PER_KG = 1.8;
const FAT_G_PER_KG = 0.8;
const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_FAT = 9;

export type MacroTargets = {
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/** Daily macro targets to pair with `calculateDailyCalorieTarget`. Protein
 * and fat are set per kg of bodyweight; carbs are whatever's left of the
 * calorie target once protein and fat are accounted for, so the three
 * always sum to the daily calorie target exactly. Clamped to zero rather
 * than negative carbs, for the edge case of a high bodyweight combined
 * with a very low (floor-clamped) calorie target. */
export function calculateMacroTargets(params: {
  dailyCalorieTarget: number;
  weightKg: number;
}): MacroTargets {
  const proteinG = Math.round(PROTEIN_G_PER_KG * params.weightKg);
  const fatG = Math.round(FAT_G_PER_KG * params.weightKg);
  const proteinCalories = proteinG * KCAL_PER_G_PROTEIN;
  const fatCalories = fatG * KCAL_PER_G_FAT;
  const remainingCalories = Math.max(
    0,
    params.dailyCalorieTarget - proteinCalories - fatCalories
  );
  const carbsG = Math.round(remainingCalories / KCAL_PER_G_CARB);
  return { proteinG, carbsG, fatG };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The date a goal is projected to be reached at the requested weekly rate,
 * computed once at goal creation and stored — not recomputed live, so it
 * doesn't drift as time passes (mirrors how a TrainingPlan's own dates are
 * fixed once the plan exists). */
export function calculateTargetDate(params: {
  startDate: Date;
  startWeightKg: number;
  goalWeightKg: number;
  weeklyRateKg: number;
}): Date {
  const totalChangeKg = Math.abs(params.goalWeightKg - params.startWeightKg);
  const weeks = totalChangeKg / Math.abs(params.weeklyRateKg);
  return new Date(params.startDate.getTime() + weeks * 7 * MS_PER_DAY);
}

/** A point on the goal's straight-line planned trajectory, used to build
 * the "planned" series of the actual-vs-planned progress chart. Clamped to
 * the goal weight past the target date rather than continuing to
 * extrapolate. */
export function plannedWeightOnDate(params: {
  startDate: Date;
  startWeightKg: number;
  goalWeightKg: number;
  targetDate: Date;
  onDate: Date;
}): number {
  const totalMs = params.targetDate.getTime() - params.startDate.getTime();
  if (totalMs <= 0) return params.goalWeightKg;

  const elapsedMs = params.onDate.getTime() - params.startDate.getTime();
  const fraction = Math.min(Math.max(elapsedMs / totalMs, 0), 1);
  return params.startWeightKg + (params.goalWeightKg - params.startWeightKg) * fraction;
}
