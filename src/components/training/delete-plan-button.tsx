"use client";

import { useTransition } from "react";
import { deleteTrainingPlan } from "@/app/(app)/training-plan/actions";
import { TrashIcon } from "@/components/icons";

export function DeleteTrainingPlanButton({
  planId,
  planName,
}: {
  planId: string;
  planName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${planName}"? This can't be undone.`)) return;
    startTransition(() => deleteTrainingPlan(planId));
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
