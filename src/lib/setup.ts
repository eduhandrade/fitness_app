import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Creates/updates the single app account from SEED_USER_EMAIL/PASSWORD/NAME.
 * Shared by /setup (a one-tap page) and /api/setup (a plain URL) — both exist
 * because running `prisma db seed` from a terminal isn't always practical
 * (e.g. setting the app up from a phone with no computer handy).
 */
export async function seedAccount(): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  const name = process.env.SEED_USER_NAME ?? "Athlete";

  if (!email || !password) {
    return { ok: false, error: "SEED_USER_EMAIL and SEED_USER_PASSWORD are not set." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name },
    create: {
      email,
      passwordHash,
      name,
      profile: { create: {} },
    },
  });

  return { ok: true, message: `Seeded user ${user.email}` };
}
