"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getRpConfig } from "@/lib/webauthn";

const CHALLENGE_COOKIE = "passkey_reg_challenge";
const CHALLENGE_TTL_SEC = 300;

export async function getPasskeyRegistrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const userId = await requireUserId();
  const [user, existing] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.passkey.findMany({ where: { userId }, select: { credentialId: true, transports: true } }),
  ]);

  const { rpID, rpName } = await getRpConfig();

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({
      id: p.credentialId,
      transports: p.transports ? (p.transports.split(",") as AuthenticatorTransportFuture[]) : undefined,
    })),
    authenticatorSelection: {
      // Face ID / Touch ID / Windows Hello, not a USB security key.
      authenticatorAttachment: "platform",
      // Resident (discoverable) key — required so /login can authenticate
      // usernameless, without the user typing an email first.
      residentKey: "required",
      userVerification: "required",
    },
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

export type PasskeyRegisterResult = { ok: true } | { ok: false; error: string };

export async function verifyPasskeyRegistration(
  response: RegistrationResponseJSON,
  label: string
): Promise<PasskeyRegisterResult> {
  const userId = await requireUserId();
  const store = await cookies();
  const expectedChallenge = store.get(CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) {
    return { ok: false, error: "Sessão de registro expirada. Tente novamente." };
  }

  const { rpID, origin } = await getRpConfig();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch {
    return { ok: false, error: "Não foi possível registrar. Tente novamente." };
  }

  store.delete(CHALLENGE_COOKIE);

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: "Não foi possível registrar. Tente novamente." };
  }

  const { credential } = verification.registrationInfo;

  await prisma.passkey.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports?.join(",") ?? null,
      label: label || "Este dispositivo",
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function deletePasskey(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.passkey.deleteMany({ where: { id, userId } });
  revalidatePath("/settings");
}
