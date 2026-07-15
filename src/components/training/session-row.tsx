"use client";

import { useTransition } from "react";
import { Sport } from "@/generated/prisma/enums";
import { SPORT_META } from "@/lib/sport-meta";
import { toggleSessionComplete } from "@/app/(app)/training-plan/actions";

export type SessionRowData = {
  id: string;
  sport: Sport;
  sessionType: string;
  durationMin: number;
  targetIntensity: string | null;
  description: string;
  completed: boolean;
};

export type SessionWithDate = SessionRowData & { date: Date };

export function SessionRow({ session }: { session: SessionRowData }) {
  const [isPending, startTransition] = useTransition();
  const meta = SPORT_META[session.sport];

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(() => toggleSessionComplete(session.id, !session.completed))
        }
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          session.completed
            ? "border-primary bg-primary text-background"
            : "border-border"
        }`}
        aria-label={session.completed ? "Mark incomplete" : "Mark complete"}
      >
        {session.completed && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-2.5 w-2.5">
            <path d="M4 12l5 5L20 6" />
          </svg>
        )}
      </button>
      <div className={session.completed ? "opacity-50" : ""}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
          <p className="text-xs font-medium text-foreground">
            {meta.label} · {session.sessionType.toLowerCase()} · {session.durationMin} min
          </p>
        </div>
        <p className="mt-0.5 text-xs text-foreground-muted">{session.description}</p>
      </div>
    </div>
  );
}
