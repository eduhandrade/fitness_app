"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function disconnectStrava(): Promise<void> {
  const userId = await requireUserId();
  await prisma.stravaConnection.deleteMany({ where: { userId } });
  revalidatePath("/settings");
}
