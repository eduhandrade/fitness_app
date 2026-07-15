import { RaceDistance, TrainingPhase } from "@/generated/prisma/enums";

const MIN_WEEKS = 3;
const MAX_WEEKS = 24;
const DEFAULT_WEEKS_NO_RACE = 8;

const TAPER_WEEKS_BY_DISTANCE: Record<RaceDistance, number> = {
  SPRINT: 1,
  OLYMPIC: 1,
  HALF_IRON: 2,
  IRON: 3,
  NONE: 0,
};

const RECOVERY_WEEK_INTERVAL = 4;

/** How many weeks the plan should span, given an optional race date. */
export function computeTotalWeeks(
  startDate: Date,
  raceDate: Date | null
): number {
  if (!raceDate) return DEFAULT_WEEKS_NO_RACE;
  const msPerWeek = 7 * 86_400_000;
  const weeks = Math.round((raceDate.getTime() - startDate.getTime()) / msPerWeek);
  return Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, weeks));
}

/** Assigns a training phase to every week of the plan, oldest → race week, with periodic recovery weeks. */
export function computePhases(
  totalWeeks: number,
  raceDistance: RaceDistance
): TrainingPhase[] {
  const taperWeeks = raceDistance === RaceDistance.NONE
    ? 0
    : Math.min(TAPER_WEEKS_BY_DISTANCE[raceDistance], Math.floor(totalWeeks / 3));

  let remaining = totalWeeks - taperWeeks;
  const peakWeeks = remaining >= 6 ? 2 : remaining >= 3 ? 1 : 0;
  remaining -= peakWeeks;

  const buildWeeks = Math.round(remaining * 0.5);
  const baseWeeks = Math.max(0, remaining - buildWeeks);

  const phases: TrainingPhase[] = [
    ...Array(baseWeeks).fill(TrainingPhase.BASE),
    ...Array(buildWeeks).fill(TrainingPhase.BUILD),
    ...Array(peakWeeks).fill(TrainingPhase.PEAK),
    ...Array(taperWeeks).fill(TrainingPhase.TAPER),
  ];

  return phases.map((phase, index) => {
    const weekNumber = index + 1;
    const isCutback =
      weekNumber % RECOVERY_WEEK_INTERVAL === 0 &&
      (phase === TrainingPhase.BASE || phase === TrainingPhase.BUILD);
    return isCutback ? TrainingPhase.RECOVERY : phase;
  });
}

const PHASE_VOLUME_MULTIPLIER: Record<TrainingPhase, number> = {
  BASE: 0.7,
  BUILD: 0.9,
  PEAK: 1.0,
  TAPER: 0.55,
  RECOVERY: 0.65,
};

export function targetVolumeForWeek(
  maxWeeklyMinutes: number,
  phase: TrainingPhase
): number {
  return Math.round(maxWeeklyMinutes * PHASE_VOLUME_MULTIPLIER[phase]);
}
