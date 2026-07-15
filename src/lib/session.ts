import { prisma } from "@/lib/prisma";

/**
 * This is a single-user app with no login — every request acts as the one
 * seeded account (see prisma/seed.ts).
 */
export async function requireUserId(): Promise<string> {
  const user = await prisma.user.findFirstOrThrow();
  return user.id;
}
