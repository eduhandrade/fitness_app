"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toUtcDateOnly } from "@/lib/date";

const logWeightSchema = z.object({
  date: z.string().min(1),
  weightKg: z.coerce.number().positive().max(400),
  bodyFatPct: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type LogWeightState = { error?: string; success?: boolean };

export async function logWeight(
  _prevState: LogWeightState,
  formData: FormData
): Promise<LogWeightState> {
  const userId = await requireUserId();

  const bodyFatRaw = formData.get("bodyFatPct");
  const notesRaw = formData.get("notes");

  const parsed = logWeightSchema.safeParse({
    date: formData.get("date"),
    weightKg: formData.get("weightKg"),
    bodyFatPct: bodyFatRaw ? bodyFatRaw : undefined,
    notes: notesRaw ? notesRaw : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid entry." };
  }

  const date = toUtcDateOnly(parsed.data.date);

  await prisma.bodyMetric.upsert({
    where: { userId_date: { userId, date } },
    update: {
      weightKg: parsed.data.weightKg,
      bodyFatPct: parsed.data.bodyFatPct,
      notes: parsed.data.notes,
    },
    create: {
      userId,
      date,
      weightKg: parsed.data.weightKg,
      bodyFatPct: parsed.data.bodyFatPct,
      notes: parsed.data.notes,
    },
  });

  revalidatePath("/body");
  revalidatePath("/progress");
  revalidatePath("/");
  return { success: true };
}

export async function deleteBodyMetric(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.bodyMetric.delete({ where: { id, userId } });
  revalidatePath("/body");
  revalidatePath("/progress");
  revalidatePath("/");
}
