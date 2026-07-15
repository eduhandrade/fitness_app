import type {
  AthleteLevel,
  RaceDistance,
  Sport,
  SessionType,
  TrainingPhase,
} from "@/generated/prisma/enums";

export type GeneratePlanInput = {
  sports: Sport[];
  level: AthleteLevel;
  daysPerWeek: number;
  minutesPerDay: number;
  raceDistance: RaceDistance;
  raceDate: Date | null;
  startDate: Date;
};

export type GeneratedSession = {
  dayOffset: number;
  sport: Sport;
  sessionType: SessionType;
  durationMin: number;
  targetIntensity: string;
  description: string;
};

export type GeneratedWeek = {
  weekNumber: number;
  phase: TrainingPhase;
  targetVolumeMin: number;
  sessions: GeneratedSession[];
};
