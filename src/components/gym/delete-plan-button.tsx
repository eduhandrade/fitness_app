"use client";

import { useTransition } from "react";
import { deleteGymPlan } from "@/app/(app)/gym/actions";

export function DeletePlanButton({
  planId,
  planName,
}: {
  planId: string;
  planName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${planName}"? This can't be undone.`)) return;
    startTransition(() => deleteGymPlan(planId));
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleDelete}
      className="text-xs font-medium text-foreground-muted hover:text-danger disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
