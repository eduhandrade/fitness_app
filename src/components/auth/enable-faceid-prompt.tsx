"use client";

import { useEffect, useState } from "react";
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startRegistration,
} from "@simplewebauthn/browser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
} from "@/components/auth/passkey-actions";
import {
  dismissFaceIdPromptLocally,
  isFaceIdEnabledLocally,
  isFaceIdPromptDismissed,
  markFaceIdEnabledLocally,
} from "@/lib/faceid-local";

function guessDeviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "Face ID (iPhone)";
  if (/iPad/.test(ua)) return "Face ID (iPad)";
  if (/Android/.test(ua)) return "Biometria (Android)";
  if (/Mac/.test(ua)) return "Touch ID (Mac)";
  return "Este dispositivo";
}

/**
 * Shown right after logging in with a password, on the one device that
 * just proved it's really the account owner — the moment enabling Face ID
 * is most useful, instead of leaving it buried in Settings for someone to
 * stumble on later.
 */
export function EnableFaceIdPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isFaceIdEnabledLocally() || isFaceIdPromptDismissed()) return;
    let cancelled = false;
    (async () => {
      const ok = browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
      if (!cancelled && ok) setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const options = await getPasskeyRegistrationOptions();
      const response = await startRegistration({ optionsJSON: options });
      const result = await verifyPasskeyRegistration(response, guessDeviceLabel());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      markFaceIdEnabledLocally();
      setDone(true);
      setTimeout(() => setVisible(false), 1500);
    } catch {
      setError("Não foi possível ativar agora. Você pode tentar de novo em Settings.");
    } finally {
      setBusy(false);
    }
  }

  function handleDismiss() {
    dismissFaceIdPromptLocally();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <Card className="border-primary/40 bg-primary-muted">
      <CardContent className="space-y-3 pt-4">
        {done ? (
          <p className="text-sm font-medium text-primary-strong">
            Face ID ativado! Da próxima vez você entra com um toque.
          </p>
        ) : (
          <>
            <p className="text-sm text-foreground">
              Ativar Face ID neste dispositivo para entrar mais rápido da
              próxima vez, sem digitar senha?
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" disabled={busy} onClick={handleEnable}>
                {busy ? "Ativando…" : "Ativar Face ID"}
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={handleDismiss}>
                Agora não
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
