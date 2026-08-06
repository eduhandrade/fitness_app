"use client";

import { useTransition } from "react";
import { logout } from "./actions";
import { LogoutIcon } from "@/components/icons";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="menuitem"
      disabled={isPending}
      onClick={() => startTransition(() => logout())}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-danger hover:bg-surface-hover disabled:opacity-50"
    >
      <LogoutIcon className="h-4 w-4" />
      {isPending ? "Saindo…" : "Sair"}
    </button>
  );
}
