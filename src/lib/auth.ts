import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "node:crypto";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hashing both sides before timingSafeEqual keeps the comparison constant
 * time and avoids its unequal-length throw — without it, an attacker could
 * infer the invite code's length from which branch runs.
 */
export function verifyInviteCode(submitted: string): boolean {
  const expected = process.env.SIGNUP_INVITE_CODE;
  if (!expected) return false;
  const a = createHash("sha256").update(submitted).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
