import { classifyExercise } from "@/lib/gym/muscle-groups";

export type LoggedSet = { setNumber: number; reps: number; weightKg: number };
export type ExerciseBreakdownEntry = {
  exerciseId: string;
  name: string;
  sets: LoggedSet[];
};

export function ExerciseBreakdown({ entries }: { entries: ExerciseBreakdownEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const classification = classifyExercise(entry.name);
        return (
          <div key={entry.exerciseId} className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border bg-surface-hover px-3 py-2">
              <span className="text-sm font-medium text-foreground">{entry.name}</span>
              {classification && (
                <span className="text-[11px] font-medium text-primary-strong">
                  {classification.label}
                </span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[12px] text-foreground-muted">
                  <th className="px-3 py-1.5 font-medium">Set</th>
                  <th className="px-3 py-1.5 font-medium">Reps</th>
                  <th className="px-3 py-1.5 font-medium">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entry.sets.map((set) => (
                  <tr key={set.setNumber}>
                    <td className="px-3 py-1.5 text-foreground-muted">{set.setNumber}</td>
                    <td className="px-3 py-1.5 text-foreground">{set.reps}</td>
                    <td className="px-3 py-1.5 text-foreground">
                      {set.weightKg > 0 ? `${set.weightKg} kg` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
