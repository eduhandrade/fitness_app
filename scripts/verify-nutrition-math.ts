/** Sanity check for the calorie-deficit and unit-conversion math — no
 * network, no DB, every value hand-computed. Run with
 * `npx tsx scripts/verify-nutrition-math.ts`. */
import { ageFromDateOfBirth, calculateBmr, calculateTdee } from "../src/lib/nutrition/bmr";
import {
  calculateDailyCalorieTarget,
  calculateTargetDate,
  dailyDeficitFromWeeklyRate,
  plannedWeightOnDate,
  MAX_WEEKLY_RATE_KG,
} from "../src/lib/nutrition/goal";
import { calculateNutrients, resolveGrams } from "../src/lib/nutrition/units";

let failures = 0;

function assert(condition: boolean, label: string, detail?: string) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!condition) failures++;
}

function assertClose(actual: number, expected: number, tolerance: number, label: string) {
  const pass = Math.abs(actual - expected) <= tolerance;
  assert(pass, label, `expected ~${expected} ± ${tolerance}, got ${actual.toFixed(2)}`);
}

// --- ageFromDateOfBirth ---
{
  const asOf = new Date("2026-08-25T00:00:00.000Z");
  assert(
    ageFromDateOfBirth(new Date("1987-09-15T00:00:00.000Z"), asOf) === 38,
    "ageFromDateOfBirth: birthday not yet reached this year rounds down"
  );
  assert(
    ageFromDateOfBirth(new Date("1987-08-25T00:00:00.000Z"), asOf) === 39,
    "ageFromDateOfBirth: birthday exactly today counts as reached"
  );
  assert(
    ageFromDateOfBirth(new Date("1987-01-01T00:00:00.000Z"), asOf) === 39,
    "ageFromDateOfBirth: birthday earlier in the year counts as reached"
  );
}

// --- calculateBmr: known Mifflin-St Jeor values ---
{
  // 80kg, 180cm, 38yo male: 10*80 + 6.25*180 - 5*38 + 5 = 800+1125-190+5 = 1740
  const male = calculateBmr({ weightKg: 80, heightCm: 180, age: 38, sex: "MALE" });
  assertClose(male, 1740, 0.01, "calculateBmr: matches hand-computed value for MALE");

  // Same inputs, female constant: 800+1125-190-161 = 1574
  const female = calculateBmr({ weightKg: 80, heightCm: 180, age: 38, sex: "FEMALE" });
  assertClose(female, 1574, 0.01, "calculateBmr: matches hand-computed value for FEMALE");

  // Unset sex averages the male/female constants exactly.
  const unknown = calculateBmr({ weightKg: 80, heightCm: 180, age: 38, sex: null });
  assertClose(unknown, (male + female) / 2, 0.01, "calculateBmr: null sex averages MALE/FEMALE");
}

// --- calculateTdee: activity multipliers ---
{
  const bmr = 1740;
  assertClose(calculateTdee(bmr, "SEDENTARY"), bmr * 1.2, 0.01, "calculateTdee: SEDENTARY ×1.2");
  assertClose(calculateTdee(bmr, "LIGHT"), bmr * 1.375, 0.01, "calculateTdee: LIGHT ×1.375");
  assertClose(calculateTdee(bmr, "MODERATE"), bmr * 1.55, 0.01, "calculateTdee: MODERATE ×1.55");
  assertClose(calculateTdee(bmr, "ACTIVE"), bmr * 1.725, 0.01, "calculateTdee: ACTIVE ×1.725");
  assertClose(
    calculateTdee(bmr, "VERY_ACTIVE"),
    bmr * 1.9,
    0.01,
    "calculateTdee: VERY_ACTIVE ×1.9"
  );
  assert(
    calculateTdee(bmr, null) === calculateTdee(bmr, "SEDENTARY"),
    "calculateTdee: null activity level falls back to SEDENTARY (most conservative)"
  );
}

// --- dailyDeficitFromWeeklyRate ---
{
  // -0.5 kg/week: -0.5 * 7700 / 7 = -550 kcal/day
  assertClose(
    dailyDeficitFromWeeklyRate(-0.5),
    -550,
    0.01,
    "dailyDeficitFromWeeklyRate: -0.5kg/week -> -550 kcal/day"
  );
  assert(
    dailyDeficitFromWeeklyRate(0.5) === -dailyDeficitFromWeeklyRate(-0.5),
    "dailyDeficitFromWeeklyRate: sign flips correctly for a gain vs. a loss"
  );
}

// --- calculateDailyCalorieTarget: floor clamp ---
{
  // A huge deficit request should clamp to the floor, not go below it.
  const targetFemale = calculateDailyCalorieTarget({
    tdee: 1600,
    weeklyRateKg: -1,
    sex: "FEMALE",
  });
  assert(targetFemale === 1200, "calculateDailyCalorieTarget: clamps to 1200 floor for FEMALE");

  const targetMale = calculateDailyCalorieTarget({ tdee: 1800, weeklyRateKg: -1, sex: "MALE" });
  assert(targetMale === 1500, "calculateDailyCalorieTarget: clamps to 1500 floor for MALE");

  // A modest deficit well above the floor should NOT be clamped.
  const targetModest = calculateDailyCalorieTarget({
    tdee: 2500,
    weeklyRateKg: -0.5,
    sex: "MALE",
  });
  assertClose(
    targetModest,
    2500 - 550,
    1,
    "calculateDailyCalorieTarget: unclamped when well above the floor"
  );

  assert(
    MAX_WEEKLY_RATE_KG === 1,
    "MAX_WEEKLY_RATE_KG: matches the documented ±1kg/week safety cap"
  );
}

// --- calculateTargetDate + plannedWeightOnDate: round-number case ---
{
  const startDate = new Date("2026-01-01T00:00:00.000Z");
  const startWeightKg = 85;
  const goalWeightKg = 80; // 5kg to lose
  const weeklyRateKg = -0.5; // 10 weeks

  const targetDate = calculateTargetDate({ startDate, startWeightKg, goalWeightKg, weeklyRateKg });
  const expectedTargetDate = new Date("2026-03-12T00:00:00.000Z"); // +70 days
  assert(
    Math.abs(targetDate.getTime() - expectedTargetDate.getTime()) < 1000,
    "calculateTargetDate: 5kg at 0.5kg/week -> 10 weeks (70 days) later"
  );

  const atStart = plannedWeightOnDate({
    startDate,
    startWeightKg,
    goalWeightKg,
    targetDate,
    onDate: startDate,
  });
  assert(atStart === startWeightKg, "plannedWeightOnDate: at start date equals start weight");

  const atTarget = plannedWeightOnDate({
    startDate,
    startWeightKg,
    goalWeightKg,
    targetDate,
    onDate: targetDate,
  });
  assertClose(atTarget, goalWeightKg, 0.01, "plannedWeightOnDate: at target date equals goal weight");

  const midpoint = new Date((startDate.getTime() + targetDate.getTime()) / 2);
  const atMidpoint = plannedWeightOnDate({
    startDate,
    startWeightKg,
    goalWeightKg,
    targetDate,
    onDate: midpoint,
  });
  assertClose(
    atMidpoint,
    (startWeightKg + goalWeightKg) / 2,
    0.01,
    "plannedWeightOnDate: linear interpolation at the midpoint"
  );

  const pastTarget = plannedWeightOnDate({
    startDate,
    startWeightKg,
    goalWeightKg,
    targetDate,
    onDate: new Date(targetDate.getTime() + 30 * 24 * 60 * 60 * 1000),
  });
  assert(
    pastTarget === goalWeightKg,
    "plannedWeightOnDate: clamps to goal weight past the target date, no extrapolation"
  );
}

// --- resolveGrams: unit conversion ---
{
  assert(resolveGrams(150, "GRAM") === 150, "resolveGrams: GRAM is a passthrough");
  assert(resolveGrams(0.5, "KILOGRAM") === 500, "resolveGrams: KILOGRAM -> grams ×1000");
  assert(resolveGrams(1, "CUP") === 240, "resolveGrams: 1 CUP -> 240g (water-like density)");
  assert(resolveGrams(2, "TABLESPOON") === 30, "resolveGrams: 2 TABLESPOON -> 30g");
  assert(resolveGrams(3, "TEASPOON") === 15, "resolveGrams: 3 TEASPOON -> 15g");
}

// --- calculateNutrients: per-100g scaling ---
{
  const result = calculateNutrients({
    grams: 50,
    per100g: { calories: 200, proteinG: 10, carbsG: 20, fatG: 5 },
  });
  assertClose(result.calories, 100, 0.01, "calculateNutrients: 50g of 200kcal/100g -> 100kcal");
  assertClose(result.proteinG, 5, 0.01, "calculateNutrients: protein scales the same way");
  assertClose(result.carbsG, 10, 0.01, "calculateNutrients: carbs scales the same way");
  assertClose(result.fatG, 2.5, 0.01, "calculateNutrients: fat scales the same way");
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
