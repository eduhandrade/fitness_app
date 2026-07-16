import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { buildStravaAuthorizeUrl } from "@/lib/strava";

export async function GET() {
  await requireUserId();
  return NextResponse.redirect(buildStravaAuthorizeUrl());
}
