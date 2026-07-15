import { Sport } from "@/generated/prisma/enums";
import { SPORT_META } from "@/lib/sport-meta";

export function SportBadge({ sport }: { sport: Sport }) {
  const meta = SPORT_META[sport];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground-muted">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: meta.color }}
      />
      {meta.label}
    </span>
  );
}
