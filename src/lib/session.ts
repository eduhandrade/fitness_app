import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "trivo_session";
const SESSION_TTL_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function resolveSession(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { userId: true, expiresAt: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.userId;
}

/** Every (app) page/action/route calls this — throws (redirects) if unauthenticated. */
export const requireUserId = cache(async (): Promise<string> => {
  const userId = await resolveSession();
  if (!userId) redirect("/login");
  return userId;
});

/** Non-throwing variant for /login and /signup, which must not redirect-loop. */
export const getOptionalUserId = cache(async (): Promise<string | null> => {
  return resolveSession();
});

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Strava's OAuth redirect lands back on /api/strava/callback via a
    // cross-site top-level GET — a Strict cookie would not be sent on that
    // navigation and would silently break "Connect Strava".
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
}
