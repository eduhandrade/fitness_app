"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const exerciseSchema = z.object({
  name: z.string().min(1).max(100),
  targetSets: z.coerce.number().int().min(1).max(20),
  targetReps: z.coerce.number().int().min(1).max(100),
  targetWeightKg: z.coerce.number().min(0).max(500).optional(),
  notes: z.string().max(300).optional(),
});

const daySchema = z.object({
  name: z.string().min(1).max(60),
  exercises: z.array(exerciseSchema).min(1),
});

const planSchema = z.object({
  name: z.string().min(1).max(80),
  days: z.array(daySchema).min(1),
});

export type CreateGymPlanInput = z.infer<typeof planSchema>;

export async function createGymPlan(input: CreateGymPlanInput) {
  const userId = await requireUserId();
  const parsed = planSchema.parse(input);

  await prisma.$transaction(
    async (tx) => {
      await tx.gymPlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      await tx.gymPlan.create({
        data: {
          userId,
          name: parsed.name,
          isActive: true,
          days: {
            create: parsed.days.map((day, dayIndex) => ({
              name: day.name,
              order: dayIndex,
              exercises: {
                create: day.exercises.map((ex, exIndex) => ({
                  name: ex.name,
                  targetSets: ex.targetSets,
                  targetReps: ex.targetReps,
                  targetWeightKg: ex.targetWeightKg,
                  notes: ex.notes,
                  order: exIndex,
                })),
              },
            })),
          },
        },
      });
    },
    // Generous timeout: a cold Neon connection + several nested inserts can
    // easily exceed Prisma's 5s interactive-transaction default (P2028).
    { maxWait: 10_000, timeout: 30_000 }
  );

  revalidatePath("/gym");
}

export async function deleteGymPlan(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.gymPlan.delete({ where: { id, userId } });
  revalidatePath("/gym");
}

export async function setActiveGymPlan(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.$transaction(
    [
      prisma.gymPlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }),
      prisma.gymPlan.update({
        where: { id, userId },
        data: { isActive: true },
      }),
    ],
    { maxWait: 10_000, timeout: 30_000 }
  );
  revalidatePath("/gym");
}

const loggedSetSchema = z.object({
  reps: z.coerce.number().int().min(0).max(100),
  weightKg: z.coerce.number().min(0).max(500),
});

const logSessionSchema = z.object({
  dayId: z.string().min(1),
  entries: z.array(
    z.object({
      exerciseId: z.string().min(1),
      sets: z.array(loggedSetSchema).min(1),
    })
  ),
});

export type LogGymSessionInput = z.infer<typeof logSessionSchema>;

export async function logGymSession(input: LogGymSessionInput) {
  const userId = await requireUserId();
  const parsed = logSessionSchema.parse(input);

  const day = await prisma.gymPlanDay.findFirstOrThrow({
    where: { id: parsed.dayId, plan: { userId } },
  });

  await prisma.activity.create({
    data: {
      userId,
      source: "MANUAL",
      sport: "STRENGTH",
      name: day.name,
      startDate: new Date(),
      movingTimeSec: 0,
      elapsedTimeSec: 0,
      exerciseLogs: {
        create: parsed.entries.flatMap((entry) =>
          entry.sets.map((set, index) => ({
            exerciseId: entry.exerciseId,
            setNumber: index + 1,
            reps: set.reps,
            weightKg: set.weightKg,
          }))
        ),
      },
    },
  });

  revalidatePath("/gym");
  revalidatePath("/activities");
}
