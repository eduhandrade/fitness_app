import type { ActivityLevel, Sex } from "@/generated/prisma/enums";

/** Whole years between a date of birth and a reference date (defaults to now). */
export function ageFromDateOfBirth(dateOfBirth: Date, asOf: Date = new Date()): number {
  let age = asOf.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    asOf.getUTCMonth() > dateOfBirth.getUTCMonth() ||
    (asOf.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      asOf.getUTCDate() >= dateOfBirth.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** Mifflin-St Jeor additive constant per sex — the term added after the
 * shared 10×kg + 6.25×cm − 5×age portion of the formula. Sex is optional in
 * this app's Profile, so an unset/OTHER value averages the male and female
 * constants (5 and −161 → −78) rather than guessing — a documented
 * approximation, not a precise third case. */
const SEX_CONSTANT: Record<Sex, number> = {
  MALE: 5,
  FEMALE: -161,
  OTHER: (5 + -161) / 2,
};
const UNKNOWN_SEX_CONSTANT = (SEX_CONSTANT.MALE + SEX_CONSTANT.FEMALE) / 2;

/** Basal Metabolic Rate via Mifflin-St Jeor — the formula in current
 * general use (including by MyFitnessPal, per public documentation),
 * superseding the older Harris-Benedict equation. */
export function calculateBmr(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex | null;
}): number {
  const constant = params.sex ? SEX_CONSTANT[params.sex] : UNKNOWN_SEX_CONSTANT;
  return 10 * params.weightKg + 6.25 * params.heightCm - 5 * params.age + constant;
}

/** Standard activity-multiplier tiers (Mifflin-St Jeor / Harris-Benedict
 * convention). Falls back to SEDENTARY — the most conservative choice,
 * yielding the lowest calorie target — when unset. */
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

export function calculateTdee(bmr: number, activityLevel: ActivityLevel | null): number {
  const multiplier = activityLevel
    ? ACTIVITY_MULTIPLIERS[activityLevel]
    : ACTIVITY_MULTIPLIERS.SEDENTARY;
  return bmr * multiplier;
}
