"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { Sport, AthleteLevel, RaceDistance } from "@/generated/prisma/enums";
import { generatePlan, weekStartDate } from "@/lib/training/generatePlan";
import { toUtcDateOnly } from "@/lib/date";

const wizardSchema = z.object({
  name: z.string().min(1).max(80),
  sports: z.array(z.nativeEnum(Sport)).min(1),
  level: z.nativeEnum(AthleteLevel),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  minutesPerDay: z.coerce.number().int().min(15).max(240),
  raceDistance: z.nativeEnum(RaceDistance),
  raceDate: z.string().optional(),
  startDate: z.string(),
});

export type CreateTrainingPlanInput = z.infer<typeof wizardSchema>;

export async function createTrainingPlan(input: CreateTrainingPlanInput) {
  const userId = await requireUserId();
  const parsed = wizardSchema.parse(input);

  const raceDate =
    parsed.raceDistance !== RaceDistance.NONE && parsed.raceDate
      ? toUtcDateOnly(parsed.raceDate)
      : null;
  const startDate = toUtcDateOnly(parsed.startDate);

  const { weeks, planStartDate } = generatePlan({
    sports: parsed.sports,
    level: parsed.level,
    daysPerWeek: parsed.daysPerWeek,
    minutesPerDay: parsed.minutesPerDay,
    raceDistance: parsed.raceDistance,
    raceDate,
    startDate,
  });

  await prisma.$transaction(async (tx) => {
    await tx.trainingPlan.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "ARCHIVED" },
    });

    await tx.trainingPlan.create({
      data: {
        userId,
        name: parsed.name,
        sports: parsed.sports,
        level: parsed.level,
        daysPerWeek: parsed.daysPerWeek,
        minutesPerDay: parsed.minutesPerDay,
        raceDistance: parsed.raceDistance,
        raceDate,
        startDate: planStartDate,
        status: "ACTIVE",
        weeks: {
          create: weeks.map((week) => ({
            weekNumber: week.weekNumber,
            startDate: weekStartDate(planStartDate, week.weekNumber),
            phase: week.phase,
            targetVolumeMin: week.targetVolumeMin,
            sessions: {
              create: week.sessions.map((session) => ({
                date: new Date(
                  weekStartDate(planStartDate, week.weekNumber).getTime() +
                    session.dayOffset * 86_400_000
                ),
                sport: session.sport,
                sessionType: session.sessionType,
                durationMin: session.durationMin,
                targetIntensity: session.targetIntensity,
                description: session.description,
              })),
            },
          })),
        },
      },
    });
  });

  revalidatePath("/training-plan");
  revalidatePath("/");
}

export async function toggleSessionComplete(
  sessionId: string,
  completed: boolean
): Promise<void> {
  const userId = await requireUserId();
  await prisma.trainingSession.updateMany({
    where: { id: sessionId, week: { plan: { userId } } },
    data: { completed },
  });
  revalidatePath("/training-plan");
  revalidatePath("/");
}

export async function archiveTrainingPlan(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.trainingPlan.updateMany({
    where: { id, userId },
    data: { status: "ARCHIVED" },
  });
  revalidatePath("/training-plan");
}
