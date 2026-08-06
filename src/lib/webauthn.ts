import { headers } from "next/headers";

/**
 * WebAuthn ties every credential to a specific rpID (domain) and origin
 * (full URL) — derived per-request from the Host header rather than a fixed
 * env var, so this works unchanged across localhost, Vercel preview URLs,
 * and the production domain. A passkey registered under one host won't
 * authenticate under another (by design — that's the security boundary),
 * so the practical implication is just "register Face ID again if you
 * switch domains."
 */
export async function getRpConfig(): Promise<{
  rpID: string;
  rpName: string;
  origin: string;
}> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const rpID = host.split(":")[0];
  const isLocal = rpID === "localhost" || rpID === "127.0.0.1";
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");

  return {
    rpID,
    rpName: "Trivo",
    origin: `${proto}://${host}`,
  };
}
