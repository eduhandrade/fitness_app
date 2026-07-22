import { formatDuration } from "@/lib/format";
import type { Split } from "@/lib/activity-streams";

function formatSplitPace(seconds: number, distanceM: number): string {
  if (distanceM <= 0) return "—";
  const secPerKm = seconds / (distanceM / 1000);
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${String(sec).padStart(2, "0")}/km`;
}

export function SplitsTable({ splits }: { splits: Split[] }) {
  if (splits.length === 0) return null;

  const paces = splits.map((s) => s.seconds / (s.distanceM / 1000));
  const fastest = Math.min(...paces);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-hover text-left text-[12px] text-foreground-muted">
            <th className="px-3 py-2 font-medium">Km</th>
            <th className="px-3 py-2 font-medium">Pace</th>
            <th className="px-3 py-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {splits.map((s, i) => (
            <tr key={s.km}>
              <td className="px-3 py-2 text-foreground-muted">
                {s.distanceM >= 950 ? s.km : `${s.km} (${(s.distanceM / 1000).toFixed(2)})`}
              </td>
              <td
                className={`px-3 py-2 font-medium ${
                  paces[i] === fastest ? "text-primary-strong" : "text-foreground"
                }`}
              >
                {formatSplitPace(s.seconds, s.distanceM)}
              </td>
              <td className="px-3 py-2 text-foreground-muted">
                {formatDuration(Math.round(s.seconds))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
