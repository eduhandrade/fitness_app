import { AthleteLevel, SessionType, Sport, TrainingPhase } from "@/generated/prisma/enums";
import { describeSession, INTENSITY_BY_TYPE } from "./sessionTemplates";
import type { GeneratedSession } from "./types";

/** Training weekdays to use for a given number of sessions/week (0=Mon..6=Sun), key days on weekends. */
const DAY_PATTERNS: Record<number, number[]> = {
  1: [5],
  2: [3, 5],
  3: [1, 3, 5],
  4: [1, 3, 5, 6],
  5: [0, 1, 3, 5, 6],
  6: [0, 1, 2, 3, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

const ENDURANCE_PRIORITY: Sport[] = [Sport.RIDE, Sport.RUN, Sport.SWIM];

function strengthSlotsFor(level: AthleteLevel, available: number): number {
  const desired = level === "PROFESSIONAL" ? 3 : 2;
  return Math.min(desired, Math.max(0, available - 1));
}

type RawSession = { sport: Sport; type: SessionType; dayOffset: number; weight: number };

/** Relative "raw weight" per session type, used to split the week's minute budget proportionally. */
const TYPE_WEIGHT: Record<SessionType, number> = {
  EASY: 0.8,
  LONG: 1.3,
  TEMPO: 0.9,
  INTERVAL: 0.85,
  TECHNIQUE: 0.7,
  BRICK: 1.5,
  STRENGTH: 0.55,
  REST: 0,
};

export function allocateWeek({
  daysPerWeek,
  minutesPerDay,
  sports,
  level,
  phase,
  weekNumber,
  targetVolumeMin,
}: {
  daysPerWeek: number;
  minutesPerDay: number;
  sports: Sport[];
  level: AthleteLevel;
  phase: TrainingPhase;
  weekNumber: number;
  targetVolumeMin: number;
}): GeneratedSession[] {
  const clampedDays = Math.max(1, Math.min(7, daysPerWeek));
  const trainingDayOffsets = DAY_PATTERNS[clampedDays];
  const endurance = ENDURANCE_PRIORITY.filter((s) => sports.includes(s));
  const includeStrength = sports.includes(Sport.STRENGTH);

  const strengthCount = includeStrength
    ? strengthSlotsFor(level, trainingDayOffsets.length)
    : 0;
  const enduranceSlotCount = trainingDayOffsets.length - strengthCount;

  // Assign strength to the earliest slots, endurance sports round-robin the rest.
  const strengthDays = trainingDayOffsets.slice(0, strengthCount);
  const enduranceDays = trainingDayOffsets.slice(strengthCount);

  const raw: RawSession[] = [];

  strengthDays.forEach((dayOffset) => {
    raw.push({ sport: Sport.STRENGTH, type: SessionType.STRENGTH, dayOffset, weight: TYPE_WEIGHT.STRENGTH });
  });

  if (endurance.length > 0) {
    for (let i = 0; i < enduranceSlotCount; i++) {
      const sport = endurance[i % endurance.length];
      const dayOffset = enduranceDays[i];
      raw.push({ sport, type: SessionType.EASY, dayOffset, weight: TYPE_WEIGHT.EASY });
    }
  }

  assignSessionTypes(raw, phase, weekNumber, endurance);

  // Convert the week's flagship endurance day into a brick when both ride+run are present.
  if (
    (phase === TrainingPhase.BUILD || phase === TrainingPhase.PEAK) &&
    endurance.includes(Sport.RIDE) &&
    endurance.includes(Sport.RUN)
  ) {
    const longIndex = raw.findIndex((s) => s.type === SessionType.LONG);
    if (longIndex !== -1) {
      raw[longIndex] = {
        ...raw[longIndex],
        sport: Sport.BRICK,
        type: SessionType.BRICK,
        weight: TYPE_WEIGHT.BRICK,
      };
    }
  }

  if (raw.length === 0) {
    return [];
  }

  const rawTotal = raw.reduce((sum, s) => sum + s.weight * minutesPerDay, 0);
  const scale = rawTotal > 0 ? targetVolumeMin / rawTotal : 1;

  return raw
    .sort((a, b) => a.dayOffset - b.dayOffset)
    .map((s) => ({
      dayOffset: s.dayOffset,
      sport: s.sport,
      sessionType: s.type,
      durationMin: Math.max(15, Math.round((s.weight * minutesPerDay * scale) / 5) * 5),
      targetIntensity: INTENSITY_BY_TYPE[s.type],
      description: describeSession(s.sport, s.type, level),
    }));
}

/** Mutates `raw` in place, upgrading some EASY slots to LONG/TEMPO/INTERVAL/TECHNIQUE per phase. */
function assignSessionTypes(
  raw: RawSession[],
  phase: TrainingPhase,
  weekNumber: number,
  endurance: Sport[]
) {
  if (phase === TrainingPhase.RECOVERY) {
    return; // everything stays EASY on a cutback week
  }

  for (const sport of endurance) {
    const sportSessions = raw.filter((s) => s.sport === sport);
    if (sportSessions.length === 0) continue;

    // The latest day in the week for this sport becomes its long/key session.
    const longest = sportSessions.reduce((a, b) => (a.dayOffset > b.dayOffset ? a : b));
    if (phase !== TrainingPhase.TAPER) {
      longest.type = SessionType.LONG;
      longest.weight = TYPE_WEIGHT.LONG;
    } else {
      longest.type = SessionType.TEMPO;
      longest.weight = TYPE_WEIGHT.TEMPO;
    }

    if (phase === TrainingPhase.BASE && sport === Sport.SWIM) {
      const other = sportSessions.find((s) => s !== longest);
      if (other) {
        other.type = SessionType.TECHNIQUE;
        other.weight = TYPE_WEIGHT.TECHNIQUE;
      }
    }

    if (phase === TrainingPhase.BUILD || phase === TrainingPhase.PEAK) {
      const other = sportSessions.find((s) => s !== longest);
      if (other) {
        const hard = weekNumber % 2 === 0 ? SessionType.TEMPO : SessionType.INTERVAL;
        other.type = hard;
        other.weight = TYPE_WEIGHT[hard];
      }
    }
  }
}
