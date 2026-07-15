"use client";

import { useState } from "react";
import { TrendLineChart, type TrendPoint } from "@/components/charts/trend-line-chart";

export function ExerciseProgressPicker({
  series,
}: {
  series: Record<string, TrendPoint[]>;
}) {
  const names = Object.keys(series);
  const [selected, setSelected] = useState(names[0] ?? "");

  if (names.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        Log a gym session to start tracking exercise progress.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
      >
        {names.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <TrendLineChart data={series[selected] ?? []} color="#c98500" unit="kg" />
    </div>
  );
}
