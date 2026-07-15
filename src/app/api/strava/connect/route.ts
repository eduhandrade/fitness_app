import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { buildStravaAuthorizeUrl } from "@/lib/strava";

export async function GET() {
  await requireUserId();

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("strava_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(buildStravaAuthorizeUrl(state));
}
