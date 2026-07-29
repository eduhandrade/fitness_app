import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { exchangeStravaCode } from "@/lib/strava";
import { encryptSecret } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const userId = await requireUserId();

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  // Strava's redirect includes the scope it actually granted (separate from
  // the token-exchange response) — persisting that real value, rather than
  // the literal we requested, matters once features gate on scope contents
  // (e.g. "activity:write" for uploads): a user who never approved the
  // wider scope must see a clean "reconnect" prompt, not a silent failure.
  const grantedScope = req.nextUrl.searchParams.get("scope");

  const settingsUrl = new URL("/settings", req.nextUrl.origin);

  if (error) {
    settingsUrl.searchParams.set("strava_error", error);
    return NextResponse.redirect(settingsUrl);
  }

  if (!code) {
    settingsUrl.searchParams.set("strava_error", "missing_code");
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
      scope: grantedScope ?? "",
    },
    create: {
      userId,
      athleteId: String(token.athlete?.id ?? ""),
      accessTokenEnc: encryptSecret(token.access_token),
      refreshTokenEnc: encryptSecret(token.refresh_token),
      expiresAt: new Date(token.expires_at * 1000),
      scope: grantedScope ?? "",
    },
  });

  settingsUrl.searchParams.set("strava_connected", "1");
  return NextResponse.redirect(settingsUrl);
}
