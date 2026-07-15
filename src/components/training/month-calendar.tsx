"use client";

import { useMemo, useState } from "react";
import { Sport } from "@/generated/prisma/enums";
import { SPORT_META } from "@/lib/sport-meta";
import { SessionRow, type SessionWithDate } from "./session-row";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const LEGEND_SPORTS: Sport[] = [Sport.RUN, Sport.RIDE, Sport.SWIM, Sport.STRENGTH];

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonthsUtc(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function addDaysUtc(date: Date, delta: number): Date {
  return new Date(date.getTime() + delta * 86_400_000);
}

export function MonthCalendar({ sessions }: { sessions: SessionWithDate[] }) {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }, []);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionWithDate[]>();
    for (const session of sessions) {
      const key = dateKey(session.date);
      const existing = map.get(key);
      if (existing) existing.push(session);
      else map.set(key, [session]);
    }
    return map;
  }, [sessions]);

  const initialMonth = useMemo(() => {
    if (sessionsByDay.has(dateKey(today))) return startOfMonthUtc(today);
    const firstSessionDate = sessions[0]?.date;
    return startOfMonthUtc(firstSessionDate ?? today);
  }, [sessionsByDay, sessions, today]);

  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [selectedKey, setSelectedKey] = useState<string | null>(
    sessionsByDay.has(dateKey(today)) ? dateKey(today) : null
  );

  const weeks = useMemo(() => {
    const firstOfMonth = viewMonth;
    const leadingBlank = (firstOfMonth.getUTCDay() + 6) % 7; // Monday-start offset
    const gridStart = addDaysUtc(firstOfMonth, -leadingBlank);

    return Array.from({ length: 6 }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_, dayIndex) => {
        const date = addDaysUtc(gridStart, weekIndex * 7 + dayIndex);
        return {
          date,
          key: dateKey(date),
          inMonth: date.getUTCMonth() === firstOfMonth.getUTCMonth(),
          isToday: date.getTime() === today.getTime(),
          sessions: sessionsByDay.get(dateKey(date)) ?? [],
        };
      })
    );
  }, [viewMonth, sessionsByDay, today]);

  const selectedSessions = selectedKey ? (sessionsByDay.get(selectedKey) ?? []) : [];
  const selectedLabel = selectedKey
    ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }).format(
        new Date(`${selectedKey}T00:00:00.000Z`)
      )
    : null;

  function selectDay(date: Date) {
    setSelectedKey(dateKey(date));
    if (date.getUTCMonth() !== viewMonth.getUTCMonth()) {
      setViewMonth(startOfMonthUtc(date));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonthsUtc(m, -1))}
          aria-label="Previous month"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground-muted hover:text-foreground"
        >
          ‹
        </button>
        <p className="text-sm font-medium text-foreground">{MONTH_LABEL_FORMAT.format(viewMonth)}</p>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonthsUtc(m, 1))}
          aria-label="Next month"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground-muted hover:text-foreground"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
            {label}
          </div>
        ))}
        {weeks.flat().map((day) => (
          <button
            key={day.key}
            type="button"
            onClick={() => selectDay(day.date)}
            className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-xs ${
              day.key === selectedKey
                ? "border-primary bg-primary-muted"
                : day.isToday
                  ? "border-foreground-muted"
                  : "border-transparent"
            } ${day.inMonth ? "text-foreground" : "text-foreground-muted opacity-40"} hover:border-primary`}
          >
            <span>{day.date.getUTCDate()}</span>
            <span className="flex gap-0.5">
              {day.sessions.slice(0, 3).map((s) => (
                <span
                  key={s.id}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: SPORT_META[s.sport].color }}
                />
              ))}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 px-0.5">
        {LEGEND_SPORTS.map((sport) => (
          <span key={sport} className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: SPORT_META[sport].color }} />
            {SPORT_META[sport].label}
          </span>
        ))}
      </div>

      <div className="border-t border-border pt-3">
        {!selectedKey ? (
          <p className="text-xs text-foreground-muted">Tap a day to see its session.</p>
        ) : (
          <>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              {selectedLabel}
            </p>
            {selectedSessions.length === 0 ? (
              <p className="text-xs text-foreground-muted">Rest</p>
            ) : (
              selectedSessions.map((s) => <SessionRow key={s.id} session={s} />)
            )}
          </>
        )}
      </div>
    </div>
  );
}
