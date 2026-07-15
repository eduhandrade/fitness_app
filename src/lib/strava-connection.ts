import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { refreshStravaToken } from "@/lib/strava";

const EXPIRY_BUFFER_MS = 5 * 60_000;

export async function getValidStravaAccessToken(
  userId: string
): Promise<string | null> {
  const connection = await prisma.stravaConnection.findUnique({
    where: { userId },
  });
  if (!connection) return null;

  if (connection.expiresAt.getTime() - EXPIRY_BUFFER_MS > Date.now()) {
    return decryptSecret(connection.accessTokenEnc);
  }

  const refreshed = await refreshStravaToken(
    decryptSecret(connection.refreshTokenEnc)
  );

  await prisma.stravaConnection.update({
    where: { userId },
    data: {
      accessTokenEnc: encryptSecret(refreshed.access_token),
      refreshTokenEnc: encryptSecret(refreshed.refresh_token),
      expiresAt: new Date(refreshed.expires_at * 1000),
    },
  });

  return refreshed.access_token;
}
