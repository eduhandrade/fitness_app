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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        <div key={ex.id} className="rounded-2xl border border-border p-3 space-y-2">
          <p className="text-sm font-medium">{ex.name}</p>
          <div className="space-y-1.5">
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
