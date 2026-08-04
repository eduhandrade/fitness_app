/** Recognizes the muscle group / exercise category a gym exercise targets,
 * purely from its free-text name — there's no separate "category" field on
 * `GymExercise`, so every plan built here (in Portuguese or English) needs
 * to be classified by keyword matching. Used both for the small badge shown
 * next to each exercise in the app, and to tag `SET` messages in the FIT
 * file uploaded to Strava (`fitCategory` is Garmin's `exercise_category`
 * enum — the same vocabulary Garmin devices use, which is what lets Strava
 * and other FIT consumers recognize the exercise as structured data instead
 * of an opaque blob). Category-level only (not the much longer tail of
 * per-category named variants) — enough for real recognition without an
 * unmaintainable exercise database. */

export type MuscleGroup =
  | "chest"
  | "back"
  | "legs"
  | "posterior"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "calves"
  | "core"
  | "cardio"
  | "olympic"
  | "fullBody";

export type ExerciseClassification = {
  group: MuscleGroup;
  label: string;
  /** Garmin FIT `exercise_category` enum value, for the SET messages in a
   * Strava FIT upload. */
  fitCategory: number;
};

const GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Peito",
  back: "Costas",
  legs: "Pernas",
  posterior: "Posterior/Glúteos",
  shoulders: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  calves: "Panturrilha",
  core: "Abdômen/Core",
  cardio: "Cardio",
  olympic: "Levantamento olímpico",
  fullBody: "Corpo todo",
};

// FIT exerciseCategory enum values (Garmin global profile) — see
// src/lib/fit/build-strength-fit.ts for where these get encoded.
const FIT_CATEGORY_BENCH_PRESS = 0;
const FIT_CATEGORY_CALF_RAISE = 1;
const FIT_CATEGORY_CARDIO = 2;
const FIT_CATEGORY_CORE = 5;
const FIT_CATEGORY_CRUNCH = 6;
const FIT_CATEGORY_CURL = 7;
const FIT_CATEGORY_DEADLIFT = 8;
const FIT_CATEGORY_FLYE = 9;
const FIT_CATEGORY_HIP_RAISE = 10;
const FIT_CATEGORY_LATERAL_RAISE = 14;
const FIT_CATEGORY_LEG_CURL = 15;
const FIT_CATEGORY_LUNGE = 17;
const FIT_CATEGORY_OLYMPIC_LIFT = 18;
const FIT_CATEGORY_PLANK = 19;
const FIT_CATEGORY_PULL_UP = 21;
const FIT_CATEGORY_PUSH_UP = 22;
const FIT_CATEGORY_ROW = 23;
const FIT_CATEGORY_SHOULDER_PRESS = 24;
const FIT_CATEGORY_SHRUG = 26;
const FIT_CATEGORY_SIT_UP = 27;
const FIT_CATEGORY_SQUAT = 28;
const FIT_CATEGORY_TOTAL_BODY = 29;
const FIT_CATEGORY_TRICEPS_EXTENSION = 30;

type Rule = { keywords: string[]; group: MuscleGroup; fitCategory: number };

// Checked in order — first match wins, so more specific keywords (e.g.
// "stiff") are listed before generic ones (e.g. "perna") that would
// otherwise swallow them into the wrong category.
const RULES: Rule[] = [
  // Chest
  { keywords: ["supino"], group: "chest", fitCategory: FIT_CATEGORY_BENCH_PRESS },
  { keywords: ["crucifixo", "voador", "peck deck", "crossover", "cross over"], group: "chest", fitCategory: FIT_CATEGORY_FLYE },
  { keywords: ["flexao de braco", "flexao"], group: "chest", fitCategory: FIT_CATEGORY_PUSH_UP },
  { keywords: ["bench press", "chest press", "peito"], group: "chest", fitCategory: FIT_CATEGORY_BENCH_PRESS },

  // Back
  { keywords: ["remada"], group: "back", fitCategory: FIT_CATEGORY_ROW },
  { keywords: ["barra fixa", "pull up", "pullup", "pulldown", "puxada", "puxador"], group: "back", fitCategory: FIT_CATEGORY_PULL_UP },
  { keywords: ["row", "costas"], group: "back", fitCategory: FIT_CATEGORY_ROW },

  // Posterior chain / glutes / hamstrings (before generic "perna")
  { keywords: ["stiff", "levantamento terra", "terra romeno", "deadlift"], group: "posterior", fitCategory: FIT_CATEGORY_DEADLIFT },
  { keywords: ["cadeira flexora", "flexora", "mesa flexora", "leg curl"], group: "posterior", fitCategory: FIT_CATEGORY_LEG_CURL },
  { keywords: ["elevacao pelvica", "hip thrust", "gluteo", "gluteos"], group: "posterior", fitCategory: FIT_CATEGORY_HIP_RAISE },

  // Legs / quads
  { keywords: ["agachamento", "squat", "leg press", "cadeira extensora", "extensora"], group: "legs", fitCategory: FIT_CATEGORY_SQUAT },
  { keywords: ["afundo", "passada", "avanco", "lunge", "bulgaro"], group: "legs", fitCategory: FIT_CATEGORY_LUNGE },
  { keywords: ["perna"], group: "legs", fitCategory: FIT_CATEGORY_SQUAT },

  // Shoulders
  { keywords: ["elevacao lateral"], group: "shoulders", fitCategory: FIT_CATEGORY_LATERAL_RAISE },
  { keywords: ["encolhimento", "shrug"], group: "shoulders", fitCategory: FIT_CATEGORY_SHRUG },
  { keywords: ["desenvolvimento", "arnold press", "shoulder press", "ombro"], group: "shoulders", fitCategory: FIT_CATEGORY_SHOULDER_PRESS },

  // Arms
  { keywords: ["rosca", "curl", "biceps"], group: "biceps", fitCategory: FIT_CATEGORY_CURL },
  { keywords: ["triceps", "mergulho", "testa", "frances"], group: "triceps", fitCategory: FIT_CATEGORY_TRICEPS_EXTENSION },

  // Calves
  { keywords: ["panturrilha", "gemeos", "calf"], group: "calves", fitCategory: FIT_CATEGORY_CALF_RAISE },

  // Core
  { keywords: ["prancha", "plank"], group: "core", fitCategory: FIT_CATEGORY_PLANK },
  { keywords: ["abdominal supra", "supra", "crunch"], group: "core", fitCategory: FIT_CATEGORY_CRUNCH },
  { keywords: ["abdominal infra", "infra", "sit up", "situp"], group: "core", fitCategory: FIT_CATEGORY_SIT_UP },
  { keywords: ["abdominal", "abdomen", "core"], group: "core", fitCategory: FIT_CATEGORY_CORE },

  // Cardio / olympic / full body
  { keywords: ["esteira", "bicicleta ergometrica", "eliptico", "cardio", "corrida"], group: "cardio", fitCategory: FIT_CATEGORY_CARDIO },
  { keywords: ["clean", "snatch", "arranco", "arremesso", "olimpico"], group: "olympic", fitCategory: FIT_CATEGORY_OLYMPIC_LIFT },
  { keywords: ["corpo todo", "full body", "burpee", "kettlebell swing"], group: "fullBody", fitCategory: FIT_CATEGORY_TOTAL_BODY },
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Classifies a free-text exercise name into a muscle group, or `null` when
 * nothing recognizable matches (an unusual/custom exercise name). */
export function classifyExercise(name: string): ExerciseClassification | null {
  const normalized = normalize(name);
  for (const rule of RULES) {
    if (rule.keywords.some((k) => normalized.includes(k))) {
      return { group: rule.group, label: GROUP_LABELS[rule.group], fitCategory: rule.fitCategory };
    }
  }
  return null;
}
