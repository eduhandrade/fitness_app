"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const exerciseSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(100),
  targetSets: z.coerce.number().int().min(1).max(20),
  targetReps: z.coerce.number().int().min(1).max(100),
  targetWeightKg: z.coerce.number().min(0).max(500).optional(),
  notes: z.string().max(300).optional(),
});

const daySchema = z.object({
  id: z.string().min(1).optional(),
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

export async function updateGymPlan(
  planId: string,
  input: CreateGymPlanInput
): Promise<void> {
  const userId = await requireUserId();
  const parsed = planSchema.parse(input);

  await prisma.$transaction(
    async (tx) => {
      const existing = await tx.gymPlan.findFirstOrThrow({
        where: { id: planId, userId },
        include: { days: { include: { exercises: true } } },
      });

      await tx.gymPlan.update({
        where: { id: planId },
        data: { name: parsed.name },
      });

      const keepDayIds = new Set(parsed.days.map((d) => d.id).filter(Boolean));
      const dayIdsToDelete = existing.days
        .filter((d) => !keepDayIds.has(d.id))
        .map((d) => d.id);
      if (dayIdsToDelete.length > 0) {
        await tx.gymPlanDay.deleteMany({ where: { id: { in: dayIdsToDelete } } });
      }

      for (const [dayIndex, day] of parsed.days.entries()) {
        const existingDay = existing.days.find((d) => d.id === day.id);

        const dayId = existingDay
          ? existingDay.id
          : (
              await tx.gymPlanDay.create({
                data: { planId, name: day.name, order: dayIndex },
              })
            ).id;

        if (existingDay) {
          await tx.gymPlanDay.update({
            where: { id: dayId },
            data: { name: day.name, order: dayIndex },
          });
        }

        const keepExerciseIds = new Set(
          day.exercises.map((e) => e.id).filter(Boolean)
        );
        const exerciseIdsToDelete = (existingDay?.exercises ?? [])
          .filter((e) => !keepExerciseIds.has(e.id))
          .map((e) => e.id);
        if (exerciseIdsToDelete.length > 0) {
          await tx.gymExercise.deleteMany({ where: { id: { in: exerciseIdsToDelete } } });
        }

        for (const [exIndex, ex] of day.exercises.entries()) {
          const existingExercise = existingDay?.exercises.find((e) => e.id === ex.id);
          const data = {
            name: ex.name,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            targetWeightKg: ex.targetWeightKg,
            notes: ex.notes,
            order: exIndex,
          };
          if (existingExercise) {
            await tx.gymExercise.update({ where: { id: existingExercise.id }, data });
          } else {
            await tx.gymExercise.create({ data: { ...data, dayId } });
          }
        }
      }
    },
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
  movingTimeSec: z.coerce.number().int().min(0).max(6 * 3600).optional(),
  entries: z.array(
    z.object({
      exerciseId: z.string().min(1),
      sets: z.array(loggedSetSchema).min(1),
    })
  ),
});

export type LogGymSessionInput = z.infer<typeof logSessionSchema>;

export async function logGymSession(
  input: LogGymSessionInput
): Promise<{ activityId: string }> {
  const userId = await requireUserId();
  const parsed = logSessionSchema.parse(input);

  const day = await prisma.gymPlanDay.findFirstOrThrow({
    where: { id: parsed.dayId, plan: { userId } },
  });

  const movingTimeSec = parsed.movingTimeSec ?? 0;

  const activity = await prisma.activity.create({
    data: {
      userId,
      source: "MANUAL",
      sport: "STRENGTH",
      name: day.name,
      startDate: new Date(),
      movingTimeSec,
      elapsedTimeSec: movingTimeSec,
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

  return { activityId: activity.id };
}
