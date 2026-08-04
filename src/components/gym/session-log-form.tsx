"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logGymSession } from "@/app/(app)/gym/actions";
import { classifyExercise } from "@/lib/gym/muscle-groups";

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
  // Per-set completion, independent of any other set in the exercise — the
  // exercise-level toggle below is derived from these (all done ⇔ exercise
  // done) rather than tracked separately, so the two checkboxes can never
  // disagree with each other.
  const [setsDone, setSetsDone] = useState<Record<string, boolean[]>>(() =>
    Object.fromEntries(exercises.map((ex) => [ex.id, Array(ex.targetSets).fill(false)]))
  );
  const [durationMin, setDurationMin] = useState("45");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleExerciseDone(exerciseId: string) {
    setSetsDone((prev) => {
      const current = prev[exerciseId];
      const allDone = current.every(Boolean);
      return { ...prev, [exerciseId]: current.map(() => !allDone) };
    });
  }

  function toggleSetDone(exerciseId: string, index: number) {
    setSetsDone((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((d, i) => (i === index ? !d : d)),
    }));
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
    setSetsDone((prev) => ({ ...prev, [exerciseId]: [...prev[exerciseId], false] }));
  }

  function removeSet(exerciseId: string, index: number) {
    setSets((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].filter((_, i) => i !== index),
    }));
    setSetsDone((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].filter((_, i) => i !== index),
    }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const { activityId } = await logGymSession({
          dayId,
          movingTimeSec: Math.max(0, Math.round(Number(durationMin) * 60)) || undefined,
          entries: exercises.map((ex) => ({
            exerciseId: ex.id,
            sets: sets[ex.id].map((s) => ({
              reps: Number(s.reps) || 0,
              weightKg: Number(s.weightKg) || 0,
            })),
          })),
        });
        router.push(`/activities/${activityId}`);
      } catch {
        setError("Could not save the session. Try again.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {exercises.map((ex) => {
        const exerciseDone = setsDone[ex.id].every(Boolean);
        const classification = classifyExercise(ex.name);
        return (
          <div
            key={ex.id}
            className={`rounded-2xl border p-3 space-y-2 ${
              exerciseDone ? "border-primary/40" : "border-border"
            }`}
          >
            <button
              type="button"
              onClick={() => toggleExerciseDone(ex.id)}
              className={`flex w-full items-center justify-between gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                exerciseDone
                  ? "border-primary bg-primary-muted"
                  : "border-border bg-surface-hover active:bg-surface"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    exerciseDone
                      ? "border-primary bg-primary text-on-primary"
                      : "border-foreground-muted"
                  }`}
                  aria-hidden="true"
                >
                  {exerciseDone && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3.5 w-3.5">
                      <path d="M4 12l5 5L20 6" />
                    </svg>
                  )}
                </span>
                <span className="flex flex-col">
                  <span className={`text-sm font-medium ${exerciseDone ? "text-foreground-muted line-through" : ""}`}>
                    {ex.name}
                  </span>
                  {classification && (
                    <span className="text-[11px] text-foreground-muted">{classification.label}</span>
                  )}
                </span>
              </span>
              <span
                className={`shrink-0 text-[12px] font-medium ${
                  exerciseDone ? "text-primary-strong" : "text-foreground-muted"
                }`}
              >
                {exerciseDone ? "Done" : "Mark done"}
              </span>
            </button>
            <div className="space-y-1.5">
              {sets[ex.id].map((set, index) => {
                const setDone = setsDone[ex.id][index];
                return (
                  <div key={index} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleSetDone(ex.id, index)}
                      aria-label={`Mark set ${index + 1} done`}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        setDone
                          ? "border-primary bg-primary text-on-primary"
                          : "border-foreground-muted"
                      }`}
                    >
                      {setDone && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3 w-3">
                          <path d="M4 12l5 5L20 6" />
                        </svg>
                      )}
                    </button>
                    <span className="w-4 shrink-0 text-xs text-foreground-muted">
                      {index + 1}
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={set.reps}
                      onChange={(e) => updateSet(ex.id, index, { reps: e.target.value })}
                      placeholder="Reps"
                      className={`w-full rounded-lg border border-border bg-surface-hover px-2 py-1.5 text-xs outline-none focus:border-primary ${setDone ? "opacity-50" : ""}`}
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={set.weightKg}
                      onChange={(e) => updateSet(ex.id, index, { weightKg: e.target.value })}
                      placeholder="kg"
                      className={`w-full rounded-lg border border-border bg-surface-hover px-2 py-1.5 text-xs outline-none focus:border-primary ${setDone ? "opacity-50" : ""}`}
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
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => addSet(ex.id)}
              className="text-xs font-medium text-primary-strong"
            >
              + Add set
            </button>
          </div>
        );
      })}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground-muted">Session duration (min)</label>
        <input
          type="number"
          min={0}
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="button" onClick={handleSubmit} disabled={isPending} className="w-full">
        {isPending ? "Saving…" : "Save session"}
      </Button>
    </div>
  );
}
