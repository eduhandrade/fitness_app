"use server";

import { seedAccount } from "@/lib/setup";

export type SetupState = { message?: string; error?: string };

export async function runSetup(): Promise<SetupState> {
  const result = await seedAccount();
  return result.ok ? { message: result.message } : { error: result.error };
}
