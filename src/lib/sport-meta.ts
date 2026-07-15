import { Sport } from "@/generated/prisma/enums";

export const SPORT_META: Record<Sport, { label: string; color: string }> = {
  RUN: { label: "Run", color: "#008300" },
  RIDE: { label: "Ride", color: "#d55181" },
  SWIM: { label: "Swim", color: "#3987e5" },
  STRENGTH: { label: "Strength", color: "#c98500" },
  BRICK: { label: "Brick", color: "#9085e9" },
  OTHER: { label: "Other", color: "#8a968c" },
};
