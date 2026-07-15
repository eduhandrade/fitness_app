"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { WeekCard, type WeekCardData } from "./week-card";
import { MonthCalendar } from "./month-calendar";

type Mode = "list" | "calendar";

export function PlanScheduleView({ weeks }: { weeks: WeekCardData[] }) {
  const [mode, setMode] = useState<Mode>("list");
  const allSessions = useMemo(() => weeks.flatMap((w) => w.sessions), [weeks]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {(["list", "calendar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
              mode === m
                ? "border-primary bg-primary-muted text-primary-strong"
                : "border-border text-foreground-muted"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "list" ? (
        <div className="space-y-3">
          {weeks.map((week) => (
            <WeekCard key={week.id} week={week} />
          ))}
        </div>
      ) : (
        <Card>
          <div className="p-4">
            <MonthCalendar sessions={allSessions} />
          </div>
        </Card>
      )}
    </div>
  );
}
