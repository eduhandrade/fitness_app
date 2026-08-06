"use client";

import { useEffect, useState, useTransition } from "react";
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startRegistration,
} from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@/components/icons";
import {
  deletePasskey,
  getPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
} from "@/components/auth/passkey-actions";

export type PasskeyEntry = { id: string; label: string; createdAt: string };

function guessDeviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "Face ID (iPhone)";
  if (/iPad/.test(ua)) return "Face ID (iPad)";
  if (/Android/.test(ua)) return "Biometria (Android)";
  if (/Mac/.test(ua)) return "Touch ID (Mac)";
  return "Este dispositivo";
}

export function PasskeyManager({ passkeys }: { passkeys: PasskeyEntry[] }) {
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
      if (!cancelled) setSupported(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdd() {
    setError(null);
    try {
      const options = await getPasskeyRegistrationOptions();
      const response = await startRegistration({ optionsJSON: options });
      const result = await verifyPasskeyRegistration(response, guessDeviceLabel());
      if (!result.ok) setError(result.error);
    } catch {
      setError("Não foi possível registrar. Tente novamente.");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground-muted">
        Registre Face ID (ou digital) neste dispositivo para entrar sem digitar senha.
      </p>

      {passkeys.length > 0 && (
        <ul className="divide-y divide-border">
          {passkeys.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-foreground">{p.label}</p>
                <p className="text-xs text-foreground-muted">Adicionado em {p.createdAt}</p>
              </div>
              <button
                type="button"
                aria-label="Remover"
                disabled={isPending}
                onClick={() => startTransition(() => deletePasskey(p.id))}
                className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-hover hover:text-danger disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {supported ? (
        <Button type="button" variant="secondary" onClick={handleAdd}>
          Adicionar Face ID neste dispositivo
        </Button>
      ) : (
        <p className="text-xs text-foreground-muted">
          Face ID/biometria não está disponível neste navegador ou dispositivo.
        </p>
      )}
    </div>
  );
}
