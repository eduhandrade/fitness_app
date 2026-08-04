/** Estimated calorie burn for a strength-training session, since this app
 * has no heart-rate data to work from for gym sessions (unlike Strava-synced
 * cardio activities, which arrive with their own calorie estimate already
 * computed). Uses the standard MET formula: kcal/min = MET × 3.5 ×
 * bodyWeightKg / 200. MET = 5.0 is the Compendium of Physical Activities'
 * value for general resistance training (code 02050, moderate-to-vigorous
 * effort, multiple exercises) — a reasonable single default since this app
 * doesn't distinguish exercise intensity. */
const RESISTANCE_TRAINING_MET = 5.0;

/** Used only when the user has no logged body weight yet — roughly the
 * global adult average, just enough to avoid a nonsensical calorie count. */
const DEFAULT_BODY_WEIGHT_KG = 75;

export function estimateStrengthCalories(
  durationMin: number,
  bodyWeightKg: number | null | undefined
): number {
  const weight = bodyWeightKg ?? DEFAULT_BODY_WEIGHT_KG;
  const kcalPerMin = (RESISTANCE_TRAINING_MET * 3.5 * weight) / 200;
  return Math.round(kcalPerMin * durationMin);
}
