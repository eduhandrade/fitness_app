import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Recovery tool for the owner's own account: (re)sets the password on the
 * one account defined by SEED_USER_EMAIL/PASSWORD/NAME to match whatever
 * those env vars currently hold. Exists because if the owner ever forgets
 * their password or the DB row's hash falls out of sync with a changed env
 * var, there's no email-based "forgot password" flow in this app (no SMTP
 * configured) — this is the only recovery path, and it only ever touches
 * the one account defined by env vars that only the deploying owner
 * controls. Shared by /setup (a one-tap page) and /api/setup (a plain URL)
 * — both exist because running `prisma db seed` from a terminal isn't
 * always practical (e.g. recovering account access from a phone with no
 * computer handy).
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

  return { ok: true, message: `Conta ${user.email} pronta. Você já pode entrar em /login.` };
}
