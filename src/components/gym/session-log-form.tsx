"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logGymSession } from "@/app/(app)/gym/actions";

type ExerciseInput = {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeightKg: number | null;
};

type SetDraft = { reps: string; weightKg: string };

export function SessionLogForm({
  dayId,
  exercises,
}: {
  dayId: string;
  exercises: ExerciseInput[];
}) {
  const router = useRouter();
  const [sets, setSets] = useState<Record<string, SetDraft[]>>(() =>
    Object.fromEntries(
      exercises.map((ex) => [
        ex.id,
        Array.from({ length: ex.targetSets }, () => ({
          reps: String(ex.targetReps),
          weightKg: ex.targetWeightKg != null ? String(ex.targetWeightKg) : "",
        })),
      ])
    )
  );
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(exercises.map((ex) => [ex.id, false]))
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleDone(exerciseId: string) {
    setDone((prev) => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  }

  function updateSet(exerciseId: string, index: number, patch: Partial<SetDraft>) {
    setSets((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function addSet(exerciseId: string) {
    setSets((prev) => {
      const existing = prev[exerciseId];
      const last = existing[existing.length - 1];
      return {
        ...prev,
        [exerciseId]: [...existing, { ...last }],
      };
    });
  }

  function removeSet(exerciseId: string, index: number) {
    setSets((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].filter((_, i) => i !== index),
    }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await logGymSession({
          dayId,
          entries: exercises.map((ex) => ({
            exerciseId: ex.id,
            sets: sets[ex.id].map((s) => ({
              reps: Number(s.reps) || 0,
              weightKg: Number(s.weightKg) || 0,
            })),
          })),
        });
        router.push("/gym");
      } catch {
        setError("Could not save the session. Try again.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {exercises.map((ex) => (
        <div
          key={ex.id}
          className={`rounded-2xl border p-3 space-y-2 ${
            done[ex.id] ? "border-primary/40" : "border-border"
          }`}
        >
          <button
            type="button"
            onClick={() => toggleDone(ex.id)}
            className={`flex w-full items-center justify-between gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${
              done[ex.id]
                ? "border-primary bg-primary-muted"
                : "border-border bg-surface-hover active:bg-surface"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  done[ex.id]
                    ? "border-primary bg-primary text-on-primary"
                    : "border-foreground-muted"
                }`}
                aria-hidden="true"
              >
                {done[ex.id] && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3.5 w-3.5">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                )}
              </span>
              <span className={`text-sm font-medium ${done[ex.id] ? "text-foreground-muted line-through" : ""}`}>
                {ex.name}
              </span>
            </span>
            <span
              className={`shrink-0 text-[12px] font-medium ${
                done[ex.id] ? "text-primary-strong" : "text-foreground-muted"
              }`}
            >
              {done[ex.id] ? "Done" : "Mark done"}
            </span>
          </button>
          <div className={`space-y-1.5 ${done[ex.id] ? "opacity-50" : ""}`}>
            {sets[ex.id].map((set, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="w-5 shrink-0 text-xs text-foreground-muted">
                  {index + 1}
                </span>
                <input
                  type="number"
                  min={0}
                  value={set.reps}
                  onChange={(e) => updateSet(ex.id, index, { reps: e.target.value })}
                  placeholder="Reps"
                  className="w-full rounded-lg border border-border bg-surface-hover px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={set.weightKg}
                  onChange={(e) => updateSet(ex.id, index, { weightKg: e.target.value })}
                  placeholder="kg"
                  className="w-full rounded-lg border border-border bg-surface-hover px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
                {sets[ex.id].length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(ex.id, index)}
                    className="shrink-0 text-xs text-foreground-muted hover:text-danger"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addSet(ex.id)}
            className="text-xs font-medium text-primary-strong"
          >
            + Add set
          </button>
        </div>
      ))}

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="button" onClick={handleSubmit} disabled={isPending} className="w-full">
        {isPending ? "Saving…" : "Save session"}
      </Button>
    </div>
  );
}
