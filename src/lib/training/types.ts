import type {
  AthleteLevel,
  RaceDistance,
  Sport,
  SessionType,
  TrainingPhase,
} from "@/generated/prisma/enums";

export type RecentSportSummary = {
  sport: Sport;
  sessionCount: number;
  avgWeeklyMinutes: number;
  avgPaceLabel: string | null;
  avgHeartrate: number | null;
};

export type RecentTrainingSummary = {
  sports: RecentSportSummary[];
  windowDays: number;
};

export type GeneratePlanInput = {
  sports: Sport[];
  level: AthleteLevel;
  /** Weekday indices the athlete wants to train, 0=Monday..6=Sunday. */
  trainingDays: number[];
  minMinutesPerSession: number;
  raceDistance: RaceDistance;
  raceDate: Date | null;
  startDate: Date;
  recentTraining?: RecentTrainingSummary | null;
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
