"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyInviteCode } from "@/lib/auth";
import { createSession } from "@/lib/session";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
  inviteCode: z.string().min(1, "Código de convite é obrigatório."),
});

export type SignupState = { error?: string };

export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    inviteCode: formData.get("inviteCode"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (!verifyInviteCode(parsed.data.inviteCode)) {
    return { error: "Código de convite inválido." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "Já existe uma conta com este email." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  // A brand-new User row has no relation to any existing data — every
  // existing query in the app is already scoped by userId, so this account
  // is isolated from the owner's and every other account's data by
  // construction, nothing extra to build for that.
  const user = await prisma.user.create({
    data: { email: parsed.data.email, passwordHash, profile: { create: {} } },
  });

  await createSession(user.id);
  redirect("/");
}
