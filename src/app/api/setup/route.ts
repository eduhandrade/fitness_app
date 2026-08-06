import { NextResponse } from "next/server";
import { seedAccount } from "@/lib/setup";

/**
 * Plain-URL variant of /setup — same recovery tool, reachable without
 * loading the page UI. No secret required in the request itself: this only
 * ever touches the one account defined by SEED_USER_EMAIL/PASSWORD, which
 * only the person controlling the deployment's env vars can set. It cannot
 * create or affect any other account.
 */
export async function GET() {
  const result = await seedAccount();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
