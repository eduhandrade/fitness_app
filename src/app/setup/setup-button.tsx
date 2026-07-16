"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { runSetup, type SetupState } from "./actions";

const initialState: SetupState = {};

export function SetupButton() {
  const [state, formAction, pending] = useActionState(runSetup, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Criando…" : "Criar minha conta"}
      </Button>
      {state.message && <p className="text-sm text-primary-strong">{state.message}</p>}
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
