import { prisma } from "@/lib/prisma";

/**
 * This is a single-user app with no login — every request acts as the one
 * seeded account (see prisma/seed.ts). That account's id never changes, so
 * it's cached at module scope rather than re-queried on every single page
 * load — every route was paying for this as an extra serialized DB
 * round-trip before its own (already-parallelized) data queries could even
 * start.
 */
let cachedUserId: string | null = null;

export async function requireUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const user = await prisma.user.findFirstOrThrow();
  cachedUserId = user.id;
  return cachedUserId;
}
