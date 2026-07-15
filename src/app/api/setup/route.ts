import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * One-time bootstrap endpoint: creates/updates the single app account from
 * SEED_USER_EMAIL/PASSWORD/NAME, for when running `prisma db seed` from a
 * terminal isn't practical (e.g. setting the app up from a phone). Gated by
 * TOKEN_ENCRYPTION_KEY as a shared secret since that's already configured.
 * Safe to leave in place — it's idempotent and does nothing without the key.
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.TOKEN_ENCRYPTION_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  const name = process.env.SEED_USER_NAME ?? "Athlete";

  if (!email || !password) {
    return NextResponse.json(
      { error: "SEED_USER_EMAIL and SEED_USER_PASSWORD are not set." },
      { status: 500 }
    );
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

  return NextResponse.json({ ok: true, message: `Seeded user ${user.email}` });
}
