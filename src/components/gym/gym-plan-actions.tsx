"use client";

import { useTransition } from "react";
import { setActiveGymPlan, deleteGymPlan } from "@/app/(app)/gym/actions";

export function GymPlanActions({
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
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground">{planName}</span>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => setActiveGymPlan(planId))}
          className="text-xs font-medium text-primary-strong disabled:opacity-50"
        >
          Set active
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          className="text-xs font-medium text-foreground-muted hover:text-danger disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
