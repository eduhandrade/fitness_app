"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { signup, type SignupState } from "@/app/signup/actions";

const initialState: SignupState = {};

export function SignupForm({ defaultInviteCode }: { defaultInviteCode?: string }) {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-medium text-foreground-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-medium text-foreground-muted">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="inviteCode" className="text-xs font-medium text-foreground-muted">
          Código de convite
        </label>
        <input
          id="inviteCode"
          name="inviteCode"
          type="text"
          required
          autoComplete="off"
          defaultValue={defaultInviteCode}
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Criando conta…" : "Criar conta"}
      </Button>
    </form>
  );
}
