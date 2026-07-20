import { addDays, startOfWeek } from "date-fns";
import { TrainingPhase } from "@/generated/prisma/enums";
import { computeTotalWeeks, computePhases, targetVolumeForWeek } from "./phases";
import { allocateWeek } from "./allocateWeek";
import type { GeneratePlanInput, GeneratedWeek } from "./types";

export function generatePlan(input: GeneratePlanInput): {
  totalWeeks: number;
  weeks: GeneratedWeek[];
  planStartDate: Date;
} {
  const planStartDate = startOfWeek(input.startDate, { weekStartsOn: 1 });
  const totalWeeks = computeTotalWeeks(planStartDate, input.raceDate);
  const phases = computePhases(totalWeeks, input.raceDistance);
  const desiredMaxWeeklyMinutes = input.trainingDays.length * input.minMinutesPerSession;

  // Ground week 1's volume in what the athlete has actually been doing
  // recently (per Strava), then ramp up to the desired volume across the
  // Base phase — instead of jumping straight to the full target, which
  // could badly overload someone whose recent training was much lighter.
  const recentWeeklyMinutes = input.recentTraining
    ? input.sports.reduce((sum, sport) => {
        const match = input.recentTraining!.sports.find((r) => r.sport === sport);
        return sum + (match?.avgWeeklyMinutes ?? 0);
      }, 0)
    : 0;
  const shouldRamp =
    recentWeeklyMinutes > 0 && recentWeeklyMinutes < desiredMaxWeeklyMinutes * 0.9;
  const baseWeekIndexes = phases
    .map((phase, index) => ({ phase, index }))
    .filter(({ phase }) => phase === TrainingPhase.BASE)
    .map(({ index }) => index);

  const weeks: GeneratedWeek[] = phases.map((phase, index) => {
    const weekNumber = index + 1;

    let maxWeeklyMinutesForWeek = desiredMaxWeeklyMinutes;
    if (shouldRamp && phase === TrainingPhase.BASE) {
      const posInBase = baseWeekIndexes.indexOf(index);
      const rampFraction =
        baseWeekIndexes.length <= 1 ? 1 : posInBase / (baseWeekIndexes.length - 1);
      maxWeeklyMinutesForWeek = Math.round(
        recentWeeklyMinutes + (desiredMaxWeeklyMinutes - recentWeeklyMinutes) * rampFraction
      );
    }

    const targetVolumeMin = targetVolumeForWeek(maxWeeklyMinutesForWeek, phase);
    const sessions = allocateWeek({
      trainingDays: input.trainingDays,
      minMinutesPerSession: input.minMinutesPerSession,
      sports: input.sports,
      level: input.level,
      phase,
      weekNumber,
      targetVolumeMin,
      recentTraining: input.recentTraining,
    });

    return { weekNumber, phase, targetVolumeMin, sessions };
  });

  return { totalWeeks, weeks, planStartDate };
}

export function weekStartDate(planStartDate: Date, weekNumber: number): Date {
  return addDays(planStartDate, (weekNumber - 1) * 7);
}
