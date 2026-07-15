import { addDays, startOfWeek } from "date-fns";
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
  const maxWeeklyMinutes = input.daysPerWeek * input.minutesPerDay;

  const weeks: GeneratedWeek[] = phases.map((phase, index) => {
    const weekNumber = index + 1;
    const targetVolumeMin = targetVolumeForWeek(maxWeeklyMinutes, phase);
    const sessions = allocateWeek({
      daysPerWeek: input.daysPerWeek,
      minutesPerDay: input.minutesPerDay,
      sports: input.sports,
      level: input.level,
      phase,
      weekNumber,
      targetVolumeMin,
    });

    return { weekNumber, phase, targetVolumeMin, sessions };
  });

  return { totalWeeks, weeks, planStartDate };
}

export function weekStartDate(planStartDate: Date, weekNumber: number): Date {
  return addDays(planStartDate, (weekNumber - 1) * 7);
}
