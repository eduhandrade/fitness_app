"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createGymPlan } from "@/app/(app)/gym/actions";

type ExerciseDraft = {
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeightKg: string;
};

type DayDraft = {
  name: string;
  exercises: ExerciseDraft[];
};

function emptyExercise(): ExerciseDraft {
  return { name: "", targetSets: 3, targetReps: 10, targetWeightKg: "" };
}

function emptyDay(name: string): DayDraft {
  return { name, exercises: [emptyExercise()] };
}

export function PlanBuilder() {
  const router = useRouter();
  const [planName, setPlanName] = useState("");
  const [days, setDays] = useState<DayDraft[]>([emptyDay("Day 1")]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateDay(dayIndex: number, patch: Partial<DayDraft>) {
    setDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, ...patch } : d))
    );
  }

  function updateExercise(
    dayIndex: number,
    exIndex: number,
    patch: Partial<ExerciseDraft>
  ) {
    setDays((prev) =>
      prev.map((d, i) =>
        i !== dayIndex
          ? d
          : {
              ...d,
              exercises: d.exercises.map((e, j) =>
                j === exIndex ? { ...e, ...patch } : e
              ),
            }
      )
    );
  }

  function addExercise(dayIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, exercises: [...d.exercises, emptyExercise()] } : d
      )
    );
  }

  function removeExercise(dayIndex: number, exIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIndex) }
          : d
      )
    );
  }

  function addDay() {
    setDays((prev) => [...prev, emptyDay(`Day ${prev.length + 1}`)]);
  }

  function removeDay(dayIndex: number) {
    setDays((prev) => prev.filter((_, i) => i !== dayIndex));
  }

  function handleSave() {
    setError(null);
    if (!planName.trim()) {
      setError("Give your plan a name.");
      return;
    }
    for (const day of days) {
      if (!day.name.trim()) {
        setError("Every day needs a name.");
        return;
      }
      for (const ex of day.exercises) {
        if (!ex.name.trim()) {
          setError("Every exercise needs a name.");
          return;
        }
      }
    }

    startTransition(async () => {
      try {
        await createGymPlan({
          name: planName.trim(),
          days: days.map((d) => ({
            name: d.name.trim(),
            exercises: d.exercises.map((e) => ({
              name: e.name.trim(),
              targetSets: e.targetSets,
              targetReps: e.targetReps,
              targetWeightKg: e.targetWeightKg ? Number(e.targetWeightKg) : undefined,
            })),
          })),
        });
        router.push("/gym");
      } catch {
        setError("Could not save the plan. Try again.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground-muted">Plan name</label>
        <input
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder="Off-season strength"
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      {days.map((day, dayIndex) => (
        <div key={dayIndex} className="rounded-2xl border border-border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={day.name}
              onChange={(e) => updateDay(dayIndex, { name: e.target.value })}
              className="flex-1 rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm font-medium outline-none focus:border-primary"
            />
            {days.length > 1 && (
              <button
                type="button"
                onClick={() => removeDay(dayIndex)}
                className="text-xs text-foreground-muted hover:text-danger"
              >
                Remove day
              </button>
            )}
          </div>

          <div className="space-y-2">
            {day.exercises.map((ex, exIndex) => (
              <div key={exIndex} className="grid grid-cols-12 gap-1.5 items-center">
                <input
                  value={ex.name}
                  onChange={(e) =>
                    updateExercise(dayIndex, exIndex, { name: e.target.value })
                  }
                  placeholder="Exercise name"
                  className="col-span-6 rounded-lg border border-border bg-surface-hover px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
                <input
                  type="number"
                  min={1}
                  value={ex.targetSets}
                  onChange={(e) =>
                    updateExercise(dayIndex, exIndex, {
                      targetSets: Number(e.target.value),
                    })
                  }
                  placeholder="Sets"
                  className="col-span-2 rounded-lg border border-border bg-surface-hover px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
                <input
                  type="number"
                  min={1}
                  value={ex.targetReps}
                  onChange={(e) =>
                    updateExercise(dayIndex, exIndex, {
                      targetReps: Number(e.target.value),
                    })
                  }
                  placeholder="Reps"
                  className="col-span-2 rounded-lg border border-border bg-surface-hover px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
                <input
                  type="number"
                  min={0}
                  value={ex.targetWeightKg}
                  onChange={(e) =>
                    updateExercise(dayIndex, exIndex, {
                      targetWeightKg: e.target.value,
                    })
                  }
                  placeholder="kg"
                  className="col-span-2 rounded-lg border border-border bg-surface-hover px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
                {day.exercises.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExercise(dayIndex, exIndex)}
                    className="col-span-12 text-left text-[11px] text-foreground-muted hover:text-danger"
                  >
                    Remove exercise
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addExercise(dayIndex)}
            className="text-xs font-medium text-primary-strong"
          >
            + Add exercise
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addDay}
        className="text-xs font-medium text-primary-strong"
      >
        + Add day
      </button>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="button" onClick={handleSave} disabled={isPending} className="w-full">
        {isPending ? "Saving…" : "Save plan"}
      </Button>
    </div>
  );
}
