import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUtcDate } from "@/lib/date";
import { SessionRow, type SessionWithDate } from "./session-row";

const PHASE_LABEL: Record<string, string> = {
  BASE: "Base",
  BUILD: "Build",
  PEAK: "Peak",
  TAPER: "Taper",
  RECOVERY: "Recovery",
};

export type WeekCardData = {
  id: string;
  weekNumber: number;
  phase: string;
  startDate: Date;
  targetVolumeMin: number;
  isCurrent: boolean;
  sessions: SessionWithDate[];
};

export function WeekCard({ week }: { week: WeekCardData }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(week.startDate.getTime() + i * 86_400_000);
    const sessions = week.sessions.filter(
      (s) => s.date.toISOString().slice(0, 10) === date.toISOString().slice(0, 10)
    );
    return { date, sessions };
  });

  return (
    <Card>
      <details open={week.isCurrent}>
        <summary className="cursor-pointer list-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Week {week.weekNumber} · {PHASE_LABEL[week.phase] ?? week.phase}
            </CardTitle>
            <span className="text-xs text-foreground-muted">
              {Math.round(week.targetVolumeMin / 6) / 10}h target
            </span>
          </CardHeader>
        </summary>
        <CardContent className="space-y-2 pt-0">
          {days.map(({ date, sessions }) => (
            <div key={date.toISOString()} className="border-t border-border pt-2 first:border-t-0 first:pt-0">
              <p className="text-[12px] font-medium uppercase tracking-wide text-foreground-muted">
                {formatUtcDate(date, "long")}
              </p>
              {sessions.length === 0 ? (
                <p className="py-1.5 text-xs text-foreground-muted">Rest</p>
              ) : (
                sessions.map((s) => <SessionRow key={s.id} session={s} />)
              )}
            </div>
          ))}
        </CardContent>
      </details>
    </Card>
  );
}
