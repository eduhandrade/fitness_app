"use client";

import { useState, useTransition } from "react";
import { Sport } from "@/generated/prisma/enums";
import { SPORT_META } from "@/lib/sport-meta";
import { toIsoDateOnly } from "@/lib/date";
import {
  toggleSessionComplete,
  updateSessionDate,
} from "@/app/(app)/training-plan/actions";

export type SessionRowData = {
  id: string;
  sport: Sport;
  sessionType: string;
  durationMin: number;
  targetIntensity: string | null;
  description: string;
  completed: boolean;
  date: Date;
  weekStartDate: Date;
};

export type SessionWithDate = SessionRowData;

export function SessionRow({ session }: { session: SessionRowData }) {
  const [isPending, startTransition] = useTransition();
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState(toIsoDateOnly(session.date));
  const meta = SPORT_META[session.sport];

  const weekMinDate = toIsoDateOnly(session.weekStartDate);
  const weekMaxDate = toIsoDateOnly(
    new Date(session.weekStartDate.getTime() + 6 * 86_400_000)
  );

  function handleDateSave() {
    startTransition(async () => {
      await updateSessionDate(session.id, dateValue);
      setIsEditingDate(false);
    });
  }

  return (
    <div className="space-y-1.5 py-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(() => toggleSessionComplete(session.id, !session.completed))
        }
        className={`flex w-full items-center justify-between gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${
          session.completed
            ? "border-primary bg-primary-muted"
            : "border-border bg-surface-hover active:bg-surface"
        }`}
      >
        <span className="flex items-center gap-2.5">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
              session.completed
                ? "border-primary bg-primary text-on-primary"
                : "border-foreground-muted"
            }`}
            aria-hidden="true"
          >
            {session.completed && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3.5 w-3.5">
                <path d="M4 12l5 5L20 6" />
              </svg>
            )}
          </span>
          <span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
              <span
                className={`text-xs font-medium ${
                  session.completed ? "text-foreground-muted line-through" : "text-foreground"
                }`}
              >
                {meta.label} · {session.sessionType.toLowerCase()} · {session.durationMin} min
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-foreground-muted">
              {session.description}
            </span>
          </span>
        </span>
        <span
          className={`shrink-0 text-[12px] font-medium ${
            session.completed ? "text-primary-strong" : "text-foreground-muted"
          }`}
        >
          {session.completed ? "Done" : "Mark done"}
        </span>
      </button>

      <div className="pl-1">
        {isEditingDate ? (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateValue}
              min={weekMinDate}
              max={weekMaxDate}
              onChange={(e) => setDateValue(e.target.value)}
              className="rounded-lg border border-border bg-surface-hover px-2 py-1 text-xs outline-none focus:border-primary"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={handleDateSave}
              className="text-[12px] font-medium text-primary-strong disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDateValue(toIsoDateOnly(session.date));
                setIsEditingDate(false);
              }}
              className="text-[12px] font-medium text-foreground-muted"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingDate(true)}
            className="text-[12px] font-medium text-foreground-muted hover:text-primary-strong"
          >
            Change date
          </button>
        )}
      </div>
    </div>
  );
}
