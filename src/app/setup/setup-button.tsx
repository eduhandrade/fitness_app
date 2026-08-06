"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { runSetup, type SetupState } from "./actions";

const initialState: SetupState = {};

export function SetupButton() {
  const [state, formAction, pending] = useActionState(runSetup, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Configurando…" : "Criar / redefinir minha conta"}
      </Button>
      {state.message && (
        <div className="space-y-2">
          <p className="text-sm text-primary-strong">{state.message}</p>
          <Link href="/login">
            <Button type="button" variant="secondary" className="w-full">
              Ir para o login
            </Button>
          </Link>
        </div>
      )}
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
