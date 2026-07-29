"use client";

import { useTransition } from "react";
import { deleteTrainerRide } from "@/app/(app)/bike-trainer/actions";
import { TrashIcon } from "@/components/icons";

export function DeleteRideButton({
  activityId,
  rideName,
}: {
  activityId: string;
  rideName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${rideName}"? This can't be undone.`)) return;
    startTransition(() => deleteTrainerRide(activityId));
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleDelete}
      aria-label="Delete ride"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-hover hover:text-danger disabled:opacity-50"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  );
}
