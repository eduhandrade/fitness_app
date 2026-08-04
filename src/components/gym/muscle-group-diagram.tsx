import type { MuscleGroup } from "@/lib/gym/muscle-groups";

/** Front/back body silhouettes highlighting the muscle groups worked in a
 * session — same idea as Strava's strength-training muscle map. Built as
 * one continuous neutral "body" silhouette (head, torso, arms, legs, all in
 * the same muted tone so it reads as a single human figure, not floating
 * pieces), with a colored region layered on top for each muscle group that
 * was actually worked — unworked groups simply show the plain body
 * underneath rather than an empty outline, which is what made the first
 * version look like disconnected blobs instead of a body. Hand-rolled
 * inline SVG (no diagram library), matching this app's existing small
 * self-contained SVG components (route-map, elevation-strip). */

const BODY_FILL = "var(--surface-hover)";
const BODY_STROKE = "var(--border)";
const HIGHLIGHT_FILL = "var(--primary)";

type RoundedRect = { x: number; y: number; width: number; height: number; rx: number };
type Ellipse = { cx: number; cy: number; rx: number; ry: number };

// Base silhouette pieces, shared by both views — a continuous figure (head,
// neck, torso, arms, legs) drawn in one neutral tone.
const HEAD: Ellipse = { cx: 60, cy: 18, rx: 14, ry: 15 };
const NECK: RoundedRect = { x: 52, y: 30, width: 16, height: 10, rx: 3 };
const TORSO_PATH =
  "M31,42 L89,42 C95,58 93,74 87,86 C91,96 91,106 87,117 L33,117 " +
  "C29,106 29,96 33,86 C27,74 25,58 31,42 Z";
const SHOULDER_L: Ellipse = { cx: 22, cy: 48, rx: 11, ry: 12 };
const SHOULDER_R: Ellipse = { cx: 98, cy: 48, rx: 11, ry: 12 };
const UPPER_ARM_L: RoundedRect = { x: 10, y: 58, width: 16, height: 38, rx: 8 };
const UPPER_ARM_R: RoundedRect = { x: 94, y: 58, width: 16, height: 38, rx: 8 };
const FOREARM_L: RoundedRect = { x: 11, y: 98, width: 13, height: 36, rx: 6 };
const FOREARM_R: RoundedRect = { x: 96, y: 98, width: 13, height: 36, rx: 6 };
const THIGH_L: RoundedRect = { x: 34, y: 118, width: 20, height: 58, rx: 10 };
const THIGH_R: RoundedRect = { x: 66, y: 118, width: 20, height: 58, rx: 10 };
const SHIN_L: RoundedRect = { x: 36, y: 178, width: 16, height: 54, rx: 8 };
const SHIN_R: RoundedRect = { x: 68, y: 178, width: 16, height: 54, rx: 8 };

// Highlight overlays, inset within the base silhouette pieces above.
const CHEST: RoundedRect = { x: 38, y: 46, width: 44, height: 26, rx: 10 };
const ABS: RoundedRect = { x: 42, y: 78, width: 36, height: 34, rx: 8 };
const TRAPS: RoundedRect = { x: 44, y: 34, width: 32, height: 12, rx: 5 };
const LATS: RoundedRect = { x: 36, y: 48, width: 48, height: 40, rx: 10 };
const GLUTES: RoundedRect = { x: 38, y: 112, width: 44, height: 18, rx: 9 };

function rect(r: RoundedRect, fill: string, opacity = 1) {
  return <rect x={r.x} y={r.y} width={r.width} height={r.height} rx={r.rx} fill={fill} opacity={opacity} />;
}

function ellipse(e: Ellipse, fill: string, opacity = 1) {
  return <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill={fill} opacity={opacity} />;
}

function BaseBody() {
  return (
    <g stroke={BODY_STROKE} strokeWidth={1.25}>
      {rect(SHIN_L, BODY_FILL)}
      {rect(SHIN_R, BODY_FILL)}
      {rect(THIGH_L, BODY_FILL)}
      {rect(THIGH_R, BODY_FILL)}
      {rect(FOREARM_L, BODY_FILL)}
      {rect(FOREARM_R, BODY_FILL)}
      <path d={TORSO_PATH} fill={BODY_FILL} />
      {ellipse(SHOULDER_L, BODY_FILL)}
      {ellipse(SHOULDER_R, BODY_FILL)}
      {rect(UPPER_ARM_L, BODY_FILL)}
      {rect(UPPER_ARM_R, BODY_FILL)}
      {rect(NECK, BODY_FILL)}
      {ellipse(HEAD, BODY_FILL)}
    </g>
  );
}

type GroupOverlay = { view: "front" | "back"; render: (opacity: number) => React.ReactNode };

const GROUP_OVERLAYS: Record<MuscleGroup, GroupOverlay[]> = {
  chest: [{ view: "front", render: (o) => rect(CHEST, HIGHLIGHT_FILL, o) }],
  back: [
    { view: "back", render: (o) => rect(TRAPS, HIGHLIGHT_FILL, o) },
    { view: "back", render: (o) => rect(LATS, HIGHLIGHT_FILL, o) },
  ],
  legs: [
    { view: "front", render: (o) => rect(THIGH_L, HIGHLIGHT_FILL, o) },
    { view: "front", render: (o) => rect(THIGH_R, HIGHLIGHT_FILL, o) },
  ],
  posterior: [
    { view: "back", render: (o) => rect(GLUTES, HIGHLIGHT_FILL, o) },
    { view: "back", render: (o) => rect(THIGH_L, HIGHLIGHT_FILL, o) },
    { view: "back", render: (o) => rect(THIGH_R, HIGHLIGHT_FILL, o) },
  ],
  shoulders: [
    { view: "front", render: (o) => ellipse(SHOULDER_L, HIGHLIGHT_FILL, o) },
    { view: "front", render: (o) => ellipse(SHOULDER_R, HIGHLIGHT_FILL, o) },
    { view: "back", render: (o) => ellipse(SHOULDER_L, HIGHLIGHT_FILL, o) },
    { view: "back", render: (o) => ellipse(SHOULDER_R, HIGHLIGHT_FILL, o) },
  ],
  biceps: [
    { view: "front", render: (o) => rect(UPPER_ARM_L, HIGHLIGHT_FILL, o) },
    { view: "front", render: (o) => rect(UPPER_ARM_R, HIGHLIGHT_FILL, o) },
  ],
  triceps: [
    { view: "back", render: (o) => rect(UPPER_ARM_L, HIGHLIGHT_FILL, o) },
    { view: "back", render: (o) => rect(UPPER_ARM_R, HIGHLIGHT_FILL, o) },
  ],
  calves: [
    { view: "back", render: (o) => rect(SHIN_L, HIGHLIGHT_FILL, o) },
    { view: "back", render: (o) => rect(SHIN_R, HIGHLIGHT_FILL, o) },
  ],
  core: [{ view: "front", render: (o) => rect(ABS, HIGHLIGHT_FILL, o) }],
  cardio: [],
  olympic: [
    { view: "front", render: (o) => rect(CHEST, HIGHLIGHT_FILL, o) },
    { view: "front", render: (o) => rect(ABS, HIGHLIGHT_FILL, o) },
    { view: "front", render: (o) => rect(THIGH_L, HIGHLIGHT_FILL, o) },
    { view: "front", render: (o) => rect(THIGH_R, HIGHLIGHT_FILL, o) },
    { view: "front", render: (o) => ellipse(SHOULDER_L, HIGHLIGHT_FILL, o) },
    { view: "front", render: (o) => ellipse(SHOULDER_R, HIGHLIGHT_FILL, o) },
    { view: "back", render: (o) => rect(TRAPS, HIGHLIGHT_FILL, o) },
    { view: "back", render: (o) => rect(LATS, HIGHLIGHT_FILL, o) },
    { view: "back", render: (o) => rect(GLUTES, HIGHLIGHT_FILL, o) },
  ],
  fullBody: [
    { view: "front", render: (o) => rect(CHEST, HIGHLIGHT_FILL, o) },
    { view: "front", render: (o) => rect(ABS, HIGHLIGHT_FILL, o) },
    { view: "front", render: (o) => rect(THIGH_L, HIGHLIGHT_FILL, o) },
    { view: "front", render: (o) => rect(THIGH_R, HIGHLIGHT_FILL, o) },
    { view: "back", render: (o) => rect(LATS, HIGHLIGHT_FILL, o) },
    { view: "back", render: (o) => rect(GLUTES, HIGHLIGHT_FILL, o) },
  ],
};

function Silhouette({ view, groups, label }: { view: "front" | "back"; groups: MuscleGroup[]; label: string }) {
  const overlays = groups.flatMap((g) => GROUP_OVERLAYS[g].filter((o) => o.view === view));
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 120 240" width={110} height={220}>
        <BaseBody />
        {overlays.map((o, i) => (
          <g key={i}>{o.render(0.85)}</g>
        ))}
      </svg>
      <span className="text-[11px] text-foreground-muted">{label}</span>
    </div>
  );
}

export function MuscleGroupDiagram({ groups }: { groups: MuscleGroup[] }) {
  const hasAnyOverlay = groups.some((g) => GROUP_OVERLAYS[g].length > 0);
  if (!hasAnyOverlay) return null;

  return (
    <div className="flex justify-center gap-8">
      <Silhouette view="front" groups={groups} label="Frente" />
      <Silhouette view="back" groups={groups} label="Costas" />
    </div>
  );
}
