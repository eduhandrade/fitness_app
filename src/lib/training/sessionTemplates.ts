import { AthleteLevel, SessionType, Sport } from "@/generated/prisma/enums";

export const INTENSITY_BY_TYPE: Record<SessionType, string> = {
  EASY: "Zone 1-2 · conversational",
  TEMPO: "Zone 3 · comfortably hard",
  INTERVAL: "Zone 4-5 · hard efforts",
  LONG: "Zone 2 · steady aerobic",
  TECHNIQUE: "Zone 1 · drills & form",
  BRICK: "Zone 2-3 · race-pace transitions",
  STRENGTH: "RPE 7-8",
  REST: "Recovery",
};

const INTERVAL_STRUCTURE: Record<AthleteLevel, string> = {
  BEGINNER: "4 x 2 min hard, 2 min easy recovery",
  INTERMEDIATE: "5 x 3 min hard, 2 min easy recovery",
  ADVANCED: "6 x 4 min hard, 90s easy recovery",
  PROFESSIONAL: "8 x 4 min hard, 60s easy recovery",
};

const TEMPO_STRUCTURE: Record<AthleteLevel, string> = {
  BEGINNER: "15 min continuous at a comfortably hard effort",
  INTERMEDIATE: "20 min continuous at a comfortably hard effort",
  ADVANCED: "2 x 15 min at threshold, 3 min easy between",
  PROFESSIONAL: "3 x 15 min at threshold, 3 min easy between",
};

const SPORT_LABEL: Record<Sport, string> = {
  RUN: "run",
  RIDE: "ride",
  SWIM: "swim",
  STRENGTH: "strength session",
  BRICK: "brick (ride + run)",
  OTHER: "session",
};

export function describeSession(
  sport: Sport,
  type: SessionType,
  level: AthleteLevel
): string {
  const label = SPORT_LABEL[sport];

  switch (type) {
    case "EASY":
      return `Easy ${label} at a conversational pace — this builds aerobic base without adding fatigue.`;
    case "LONG":
      return `Long steady ${label}, the week's key aerobic-endurance session. Keep the effort controlled throughout.`;
    case "TECHNIQUE":
      return sport === "SWIM"
        ? "Technique-focused swim: drills for catch, rotation, and breathing, plus easy aerobic sets."
        : `Technique-focused ${label}: light effort, prioritize form and cadence over speed.`;
    case "TEMPO":
      return `Tempo ${label}: warm up easy, then ${TEMPO_STRUCTURE[level]}, cool down easy.`;
    case "INTERVAL":
      return `Interval ${label}: warm up easy, then ${INTERVAL_STRUCTURE[level]}, cool down easy.`;
    case "BRICK":
      return "Brick session: ride at a steady effort, then transition straight into a short run off the bike to train the run-off-bike feel.";
    case "STRENGTH":
      return level === "BEGINNER" || level === "INTERMEDIATE"
        ? "Full-body strength: compound lifts + core, focused on durability and injury prevention."
        : "Strength: compound lifts with progressive overload, plus sport-specific stability work.";
    case "REST":
      return "Rest day — full recovery.";
  }
}
