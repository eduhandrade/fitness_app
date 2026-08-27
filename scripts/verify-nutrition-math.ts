/** Sanity check for the calorie-deficit and unit-conversion math — no
 * network, no DB, every value hand-computed. Run with
 * `npx tsx scripts/verify-nutrition-math.ts`. */
import { ageFromDateOfBirth, calculateBmr, calculateTdee } from "../src/lib/nutrition/bmr";
import {
  calculateDailyCalorieTarget,
  calculateMacroTargets,
  calculateTargetDate,
  dailyDeficitFromWeeklyRate,
  plannedWeightOnDate,
  MAX_WEEKLY_RATE_KG,
} from "../src/lib/nutrition/goal";
import {
  calculateNutrients,
  calculateNutrientsForEntry,
  resolveGrams,
} from "../src/lib/nutrition/units";
import { normalizeSearchText } from "../src/lib/nutrition/search-text";

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

// --- calculateNutrientsForEntry: basis-aware resolution ---
{
  // PER_100G basis delegates to resolveGrams + calculateNutrients as before.
  const per100g = calculateNutrientsForEntry({
    quantity: 150,
    unit: "GRAM",
    basis: "PER_100G",
    perBasis: { calories: 200, proteinG: 10, carbsG: 20, fatG: 5 },
  });
  assertClose(
    per100g.grams ?? NaN,
    150,
    0.01,
    "calculateNutrientsForEntry: PER_100G resolves grams from quantity+unit"
  );
  assertClose(
    per100g.nutrients.calories,
    300,
    0.01,
    "calculateNutrientsForEntry: PER_100G scales calories from grams"
  );

  // PER_UNIT basis has no gram equivalent at all — perBasis means "per 1
  // unit", so the final totals are just perBasis × quantity, and grams is
  // null since none was ever computed (e.g. an egg: 78 kcal/unit × 3 eggs).
  const perUnit = calculateNutrientsForEntry({
    quantity: 3,
    unit: "UNIT",
    basis: "PER_UNIT",
    perBasis: { calories: 78, proteinG: 6, carbsG: 0.6, fatG: 5 },
  });
  assert(
    perUnit.grams === null,
    "calculateNutrientsForEntry: PER_UNIT has no gram equivalent (grams is null)"
  );
  assertClose(
    perUnit.nutrients.calories,
    234,
    0.01,
    "calculateNutrientsForEntry: PER_UNIT scales calories by quantity (3 × 78kcal egg)"
  );
  assertClose(
    perUnit.nutrients.proteinG,
    18,
    0.01,
    "calculateNutrientsForEntry: PER_UNIT scales protein by quantity"
  );

  // A single unit is a pure passthrough of perBasis.
  const singleUnit = calculateNutrientsForEntry({
    quantity: 1,
    unit: "UNIT",
    basis: "PER_UNIT",
    perBasis: { calories: 78, proteinG: 6, carbsG: 0.6, fatG: 5 },
  });
  assertClose(
    singleUnit.nutrients.calories,
    78,
    0.01,
    "calculateNutrientsForEntry: PER_UNIT at quantity=1 passes perBasis through unchanged"
  );
}

// --- normalizeSearchText: accent-folding for the Food catalog's search ---
{
  assert(
    normalizeSearchText("Café com Leite") === "cafe com leite",
    "normalizeSearchText: strips accents and lowercases"
  );
  assert(
    normalizeSearchText("Café") === normalizeSearchText("cafe"),
    "normalizeSearchText: accented and unaccented queries match"
  );
  assert(normalizeSearchText("  Maçã  ") === "maca", "normalizeSearchText: trims and folds cedilla");
}

// --- calculateMacroTargets: protein/fat per kg, carbs fill the rest ---
{
  // 80kg, 2000 kcal target: protein 1.8*80=144g (576kcal), fat 0.8*80=64g
  // (576kcal), carbs get the remaining 848kcal / 4 = 212g. All three sum
  // back to exactly the calorie target.
  const targets = calculateMacroTargets({ dailyCalorieTarget: 2000, weightKg: 80 });
  assert(targets.proteinG === 144, "calculateMacroTargets: protein = 1.8g/kg");
  assert(targets.fatG === 64, "calculateMacroTargets: fat = 0.8g/kg");
  assert(targets.carbsG === 212, "calculateMacroTargets: carbs fill the remaining calories");
  const impliedCalories = targets.proteinG * 4 + targets.carbsG * 4 + targets.fatG * 9;
  assert(
    impliedCalories === 2000,
    "calculateMacroTargets: protein+carbs+fat calories sum back to the daily target"
  );

  // A high bodyweight combined with a floor-clamped low calorie target can
  // make protein+fat alone exceed the whole budget — carbs clamp to zero
  // rather than going negative.
  const clamped = calculateMacroTargets({ dailyCalorieTarget: 1200, weightKg: 120 });
  assert(clamped.carbsG === 0, "calculateMacroTargets: carbs clamp to 0, never negative");
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
