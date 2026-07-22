"use client";

import { useTransition } from "react";
import Link from "next/link";
import { setActiveGymPlan, deleteGymPlan } from "@/app/(app)/gym/actions";
import { PencilIcon, TrashIcon } from "@/components/icons";

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
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => setActiveGymPlan(planId))}
          className="text-xs font-medium text-primary-strong disabled:opacity-50"
        >
          Set active
        </button>
        <Link
          href={`/gym/plan/${planId}/edit`}
          aria-label="Edit plan"
          className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-hover hover:text-primary-strong"
        >
          <PencilIcon className="h-4 w-4" />
        </Link>
        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          aria-label="Delete plan"
          className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-hover hover:text-danger disabled:opacity-50"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
