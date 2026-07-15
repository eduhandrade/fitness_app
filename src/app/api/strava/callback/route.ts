import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { exchangeStravaCode } from "@/lib/strava";
import { encryptSecret } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const userId = await requireUserId();

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const settingsUrl = new URL("/settings", req.nextUrl.origin);

  if (error) {
    settingsUrl.searchParams.set("strava_error", error);
    return NextResponse.redirect(settingsUrl);
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("strava_oauth_state")?.value;
  cookieStore.delete("strava_oauth_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    settingsUrl.searchParams.set("strava_error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const token = await exchangeStravaCode(code);

  await prisma.stravaConnection.upsert({
    where: { userId },
    update: {
      athleteId: String(token.athlete?.id ?? ""),
      accessTokenEnc: encryptSecret(token.access_token),
      refreshTokenEnc: encryptSecret(token.refresh_token),
      expiresAt: new Date(token.expires_at * 1000),
      scope: "read,activity:read_all,profile:read_all",
    },
    create: {
      userId,
      athleteId: String(token.athlete?.id ?? ""),
      accessTokenEnc: encryptSecret(token.access_token),
      refreshTokenEnc: encryptSecret(token.refresh_token),
      expiresAt: new Date(token.expires_at * 1000),
      scope: "read,activity:read_all,profile:read_all",
    },
  });

  settingsUrl.searchParams.set("strava_connected", "1");
  return NextResponse.redirect(settingsUrl);
}
