"use client";

import { useTransition } from "react";
import { deleteBodyMetric } from "@/app/(app)/body/actions";

export type WeightEntry = {
  id: string;
  date: string;
  weightKg: number;
  bodyFatPct: number | null;
};

export function WeightHistoryTable({ entries }: { entries: WeightEntry[] }) {
  const [isPending, startTransition] = useTransition();

  if (entries.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        No entries yet — log your weight above to start tracking.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center justify-between py-2.5">
          <div>
            <p className="text-sm text-foreground">{entry.date}</p>
            <p className="text-xs text-foreground-muted">
              {entry.weightKg} kg
              {entry.bodyFatPct != null ? ` · ${entry.bodyFatPct}% BF` : ""}
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteBodyMetric(entry.id))}
            className="text-xs font-medium text-foreground-muted hover:text-danger disabled:opacity-50"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
