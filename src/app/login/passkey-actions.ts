"use server";

import { cookies } from "next/headers";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { getRpConfig } from "@/lib/webauthn";
import { createSession } from "@/lib/session";

const CHALLENGE_COOKIE = "passkey_auth_challenge";
const CHALLENGE_TTL_SEC = 300;

/**
 * No allowCredentials — this is a "usernameless" ceremony. The device's own
 * passkey UI (Face ID sheet) shows the user which of their registered
 * credentials to use, so there's no email field to fill in before this.
 */
export async function getPasskeyAuthOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const { rpID } = await getRpConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
  });

  (await cookies()).set(CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CHALLENGE_TTL_SEC,
  });

  return options;
}

export type PasskeyAuthResult = { ok: true } | { ok: false; error: string };

export async function verifyPasskeyAuth(
  response: AuthenticationResponseJSON
): Promise<PasskeyAuthResult> {
  const store = await cookies();
  const expectedChallenge = store.get(CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) {
    return { ok: false, error: "Sessão expirada. Tente novamente." };
  }

  const passkey = await prisma.passkey.findUnique({ where: { credentialId: response.id } });
  if (!passkey) {
    return { ok: false, error: "Face ID não reconhecido. Use email e senha." };
  }

  const { rpID, origin } = await getRpConfig();

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
        transports: passkey.transports
          ? (passkey.transports.split(",") as AuthenticatorTransportFuture[])
          : undefined,
      },
    });
  } catch {
    return { ok: false, error: "Falha na verificação. Tente novamente." };
  }

  store.delete(CHALLENGE_COOKIE);

  if (!verification.verified) {
    return { ok: false, error: "Falha na verificação. Tente novamente." };
  }

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
  });

  await createSession(passkey.userId);
  return { ok: true };
}
