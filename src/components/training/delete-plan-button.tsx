"use client";

import { useTransition } from "react";
import { deleteTrainingPlan } from "@/app/(app)/training-plan/actions";

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
      className="text-xs font-medium text-foreground-muted hover:text-danger disabled:opacity-50"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
