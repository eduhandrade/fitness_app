import { NextResponse } from "next/server";
import { seedAccount } from "@/lib/setup";

/**
 * One-time bootstrap endpoint: creates/updates the single app account. No
 * secret required — this app has no login (by design, see README), and this
 * only ever touches the one account defined by SEED_USER_* env vars, which
 * only the account owner controls. Safe to leave in place; it's idempotent.
 */
export async function GET() {
  const result = await seedAccount();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
