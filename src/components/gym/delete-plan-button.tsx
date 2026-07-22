"use client";

import { useTransition } from "react";
import { deleteGymPlan } from "@/app/(app)/gym/actions";
import { TrashIcon } from "@/components/icons";

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
      aria-label="Delete plan"
      className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-hover hover:text-danger disabled:opacity-50"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  );
}
