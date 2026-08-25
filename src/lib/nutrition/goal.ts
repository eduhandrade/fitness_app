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
