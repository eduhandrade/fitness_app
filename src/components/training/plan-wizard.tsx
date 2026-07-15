"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createTrainingPlan } from "@/app/(app)/training-plan/actions";
import { Sport, AthleteLevel, RaceDistance } from "@/generated/prisma/enums";

const SPORT_OPTIONS: { value: Sport; label: string }[] = [
  { value: Sport.SWIM, label: "Swim" },
  { value: Sport.RIDE, label: "Ride" },
  { value: Sport.RUN, label: "Run" },
  { value: Sport.STRENGTH, label: "Strength" },
];

const LEVEL_OPTIONS: { value: AthleteLevel; label: string }[] = [
  { value: AthleteLevel.BEGINNER, label: "Beginner" },
  { value: AthleteLevel.INTERMEDIATE, label: "Intermediate" },
  { value: AthleteLevel.ADVANCED, label: "Advanced" },
  { value: AthleteLevel.PROFESSIONAL, label: "Professional" },
];

const RACE_OPTIONS: { value: RaceDistance; label: string }[] = [
  { value: RaceDistance.NONE, label: "No race yet — general training" },
  { value: RaceDistance.SPRINT, label: "Sprint triathlon" },
  { value: RaceDistance.OLYMPIC, label: "Olympic triathlon" },
  { value: RaceDistance.HALF_IRON, label: "Half-Iron (70.3)" },
  { value: RaceDistance.IRON, label: "Full Iron" },
];

function todayLocalISODate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function PlanWizard() {
  const router = useRouter();
  const [name, setName] = useState("My training plan");
  const [sports, setSports] = useState<Sport[]>([Sport.SWIM, Sport.RIDE, Sport.RUN]);
  const [level, setLevel] = useState<AthleteLevel>(AthleteLevel.INTERMEDIATE);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [minutesPerDay, setMinutesPerDay] = useState(60);
  const [raceDistance, setRaceDistance] = useState<RaceDistance>(RaceDistance.NONE);
  const [raceDate, setRaceDate] = useState("");
  const [startDate, setStartDate] = useState(todayLocalISODate());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleSport(sport: Sport) {
    setSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  }

  function handleSubmit() {
    setError(null);
    if (sports.length === 0) {
      setError("Pick at least one discipline.");
      return;
    }
    if (raceDistance !== RaceDistance.NONE && !raceDate) {
      setError("Add a race date, or choose “no race yet”.");
      return;
    }

    startTransition(async () => {
      try {
        await createTrainingPlan({
          name: name.trim() || "My training plan",
          sports,
          level,
          daysPerWeek,
          minutesPerDay,
          raceDistance,
          raceDate: raceDistance !== RaceDistance.NONE ? raceDate : undefined,
          startDate,
        });
        router.refresh();
      } catch {
        setError("Could not generate the plan. Try again.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground-muted">Plan name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground-muted">Disciplines</label>
        <div className="flex flex-wrap gap-1.5">
          {SPORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleSport(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                sports.includes(opt.value)
                  ? "border-primary bg-primary-muted text-primary-strong"
                  : "border-border text-foreground-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground-muted">Level</label>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as AthleteLevel)}
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground-muted">Days / week</label>
          <input
            type="number"
            min={1}
            max={7}
            value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground-muted">Minutes / day</label>
          <input
            type="number"
            min={15}
            max={240}
            step={5}
            value={minutesPerDay}
            onChange={(e) => setMinutesPerDay(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground-muted">Race goal</label>
        <select
          value={raceDistance}
          onChange={(e) => setRaceDistance(e.target.value as RaceDistance)}
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {RACE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {raceDistance !== RaceDistance.NONE && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground-muted">Race date</label>
          <input
            type="date"
            value={raceDate}
            min={startDate}
            onChange={(e) => setRaceDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground-muted">Start date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="button" onClick={handleSubmit} disabled={isPending} className="w-full">
        {isPending ? "Generating…" : "Generate plan"}
      </Button>
    </div>
  );
}
