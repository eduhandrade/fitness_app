"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { Sex } from "@/generated/prisma/enums";

export async function disconnectStrava(): Promise<void> {
  const userId = await requireUserId();
  await prisma.stravaConnection.deleteMany({ where: { userId } });
  revalidatePath("/settings");
}

const profileSchema = z.object({
  heightCm: z.coerce.number().positive().max(300).optional(),
  dateOfBirth: z.string().optional(),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

export type ProfileState = { error?: string; success?: boolean };

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const userId = await requireUserId();

  const heightRaw = formData.get("heightCm");
  const dobRaw = formData.get("dateOfBirth");
  const sexRaw = formData.get("sex");

  const parsed = profileSchema.safeParse({
    heightCm: heightRaw ? heightRaw : undefined,
    dateOfBirth: dobRaw ? dobRaw : undefined,
    sex: sexRaw ? sexRaw : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid profile data." };
  }

  await prisma.profile.upsert({
    where: { userId },
    update: {
      heightCm: parsed.data.heightCm,
      dateOfBirth: parsed.data.dateOfBirth
        ? new Date(`${parsed.data.dateOfBirth}T00:00:00.000Z`)
        : undefined,
      sex: parsed.data.sex ? (Sex[parsed.data.sex] as Sex) : undefined,
    },
    create: {
      userId,
      heightCm: parsed.data.heightCm,
      dateOfBirth: parsed.data.dateOfBirth
        ? new Date(`${parsed.data.dateOfBirth}T00:00:00.000Z`)
        : undefined,
      sex: parsed.data.sex ? (Sex[parsed.data.sex] as Sex) : undefined,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}
