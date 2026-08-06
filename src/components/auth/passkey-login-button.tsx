"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
} from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { getPasskeyAuthOptions, verifyPasskeyAuth } from "@/app/login/passkey-actions";
import { clearFaceIdEnabledLocally, isFaceIdEnabledLocally } from "@/lib/faceid-local";

export function PasskeyLoginButton() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Gate on this device having actually completed registration before —
    // otherwise there's nothing to authenticate against, and calling
    // startAuthentication() with zero passkeys triggers the browser's
    // generic "no passkeys saved, scan a QR code or use a security key"
    // fallback sheet instead of a clean Face ID prompt.
    if (!isFaceIdEnabledLocally()) return;
    let cancelled = false;
    (async () => {
      const ok = browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
      if (!cancelled) setVisible(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClick() {
    setError(null);
    try {
      const options = await getPasskeyAuthOptions();
      const response = await startAuthentication({ optionsJSON: options });
      const result = await verifyPasskeyAuth(response);
      if (!result.ok) {
        // The passkey this device remembers no longer exists on the server
        // (e.g. removed from Settings) — stop offering it on future visits.
        clearFaceIdEnabledLocally();
        setError(result.error);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      // Includes the user cancelling the Face ID prompt — not an error worth
      // surfacing loudly, they can just use the password form instead.
      setError("Não foi possível usar Face ID agora.");
    }
  }

  if (!visible) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-foreground-muted">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={isPending}
        onClick={() => startTransition(handleClick)}
      >
        {isPending ? "Verificando…" : "Entrar com Face ID"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
