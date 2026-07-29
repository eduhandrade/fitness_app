import type { RoutePoint } from "@/lib/trainer/route-profile";

const WIDTH = 320;
const HEIGHT = 80;
const PADDING = 6;

/** Inline-SVG elevation profile with a moving position marker — same
 * "no map tiles, hand-rolled SVG" visual language as route-map.tsx. */
export function ElevationStrip({
  profile,
  distanceM,
}: {
  profile: RoutePoint[];
  distanceM: number;
}) {
  if (profile.length < 2) return null;

  const totalDistanceM = profile[profile.length - 1].cumulativeDistanceM;
  if (totalDistanceM === 0) return null;

  const elevations = profile.map((p) => p.elevationM);
  const minEle = Math.min(...elevations);
  const maxEle = Math.max(...elevations);
  const eleRange = Math.max(1, maxEle - minEle);

  const toXY = (p: RoutePoint) => {
    const x = PADDING + (p.cumulativeDistanceM / totalDistanceM) * (WIDTH - PADDING * 2);
    const y = HEIGHT - PADDING - ((p.elevationM - minEle) / eleRange) * (HEIGHT - PADDING * 2);
    return [x, y] as const;
  };

  const path = profile
    .map((p, i) => {
      const [x, y] = toXY(p);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const wrapped = ((distanceM % totalDistanceM) + totalDistanceM) % totalDistanceM;
  const nearest = profile.reduce((closest, p, i) =>
    Math.abs(p.cumulativeDistanceM - wrapped) < Math.abs(profile[closest].cumulativeDistanceM - wrapped)
      ? i
      : closest
  , 0);
  const [markerX, markerY] = toXY(profile[nearest]);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-20 w-full rounded-xl border border-border bg-surface-hover"
      role="img"
      aria-label="Route elevation profile"
    >
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={markerX} cy={markerY} r={4} fill="var(--foreground)" stroke="var(--primary)" strokeWidth={1.5} />
    </svg>
  );
}
