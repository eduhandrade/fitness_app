import type { MuscleGroup } from "@/lib/gym/muscle-groups";

/** Simplified front/back body silhouettes with highlighted regions for the
 * muscle groups worked in a session — same idea as Strava's strength
 * training body map, hand-rolled as inline SVG shapes (rects/ellipses, not
 * anatomically precise paths) rather than a diagram library, matching this
 * app's existing style of small self-contained SVG components (route-map,
 * elevation-strip). */

type ShapeKind = "rect" | "ellipse";
type Shape = {
  id: string;
  kind: ShapeKind;
  // rect
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rx?: number;
  // ellipse
  cx?: number;
  cy?: number;
  ry?: number;
};

const FRONT_SHAPES: Shape[] = [
  { id: "chest", kind: "rect", x: 34, y: 40, width: 32, height: 26, rx: 8 },
  { id: "abs", kind: "rect", x: 35, y: 68, width: 30, height: 32, rx: 6 },
  { id: "shoulderLeft", kind: "ellipse", cx: 24, cy: 44, rx: 8, ry: 9 },
  { id: "shoulderRight", kind: "ellipse", cx: 76, cy: 44, rx: 8, ry: 9 },
  { id: "upperArmLeft", kind: "rect", x: 14, y: 54, width: 12, height: 32, rx: 6 },
  { id: "upperArmRight", kind: "rect", x: 74, y: 54, width: 12, height: 32, rx: 6 },
  { id: "thighLeft", kind: "rect", x: 34, y: 102, width: 15, height: 48, rx: 7 },
  { id: "thighRight", kind: "rect", x: 51, y: 102, width: 15, height: 48, rx: 7 },
];

const FRONT_OUTLINE_ONLY: Shape[] = [
  { id: "forearmLeft", kind: "rect", x: 13, y: 86, width: 10, height: 30, rx: 5 },
  { id: "forearmRight", kind: "rect", x: 77, y: 86, width: 10, height: 30, rx: 5 },
  { id: "shinLeft", kind: "rect", x: 35, y: 152, width: 12, height: 45, rx: 6 },
  { id: "shinRight", kind: "rect", x: 53, y: 152, width: 12, height: 45, rx: 6 },
];

const BACK_SHAPES: Shape[] = [
  { id: "traps", kind: "rect", x: 40, y: 38, width: 20, height: 12, rx: 5 },
  { id: "lats", kind: "rect", x: 34, y: 48, width: 32, height: 30, rx: 8 },
  { id: "shoulderLeft", kind: "ellipse", cx: 24, cy: 44, rx: 8, ry: 9 },
  { id: "shoulderRight", kind: "ellipse", cx: 76, cy: 44, rx: 8, ry: 9 },
  { id: "upperArmLeft", kind: "rect", x: 14, y: 54, width: 12, height: 32, rx: 6 },
  { id: "upperArmRight", kind: "rect", x: 74, y: 54, width: 12, height: 32, rx: 6 },
  { id: "glutes", kind: "rect", x: 36, y: 100, width: 28, height: 16, rx: 8 },
  { id: "hamstringLeft", kind: "rect", x: 34, y: 118, width: 15, height: 32, rx: 7 },
  { id: "hamstringRight", kind: "rect", x: 51, y: 118, width: 15, height: 32, rx: 7 },
  { id: "calfLeft", kind: "rect", x: 35, y: 152, width: 12, height: 45, rx: 6 },
  { id: "calfRight", kind: "rect", x: 53, y: 152, width: 12, height: 45, rx: 6 },
];

const BACK_OUTLINE_ONLY: Shape[] = [
  { id: "forearmLeft", kind: "rect", x: 13, y: 86, width: 10, height: 30, rx: 5 },
  { id: "forearmRight", kind: "rect", x: 77, y: 86, width: 10, height: 30, rx: 5 },
];

const OLYMPIC_FULL_BODY = {
  front: ["chest", "abs", "thighLeft", "thighRight", "shoulderLeft", "shoulderRight"],
  back: ["traps", "lats", "glutes", "hamstringLeft", "hamstringRight", "shoulderLeft", "shoulderRight"],
};

const GROUP_TO_SHAPES: Record<MuscleGroup, { front: string[]; back: string[] }> = {
  chest: { front: ["chest"], back: [] },
  back: { front: [], back: ["traps", "lats"] },
  legs: { front: ["thighLeft", "thighRight"], back: [] },
  posterior: { front: [], back: ["glutes", "hamstringLeft", "hamstringRight"] },
  shoulders: { front: ["shoulderLeft", "shoulderRight"], back: ["shoulderLeft", "shoulderRight"] },
  biceps: { front: ["upperArmLeft", "upperArmRight"], back: [] },
  triceps: { front: [], back: ["upperArmLeft", "upperArmRight"] },
  calves: { front: [], back: ["calfLeft", "calfRight"] },
  core: { front: ["abs"], back: [] },
  cardio: { front: [], back: [] },
  olympic: OLYMPIC_FULL_BODY,
  fullBody: OLYMPIC_FULL_BODY,
};

function renderShape(shape: Shape, highlighted: boolean) {
  const fill = highlighted ? "var(--primary)" : "none";
  const stroke = highlighted ? "var(--primary)" : "var(--border)";
  const commonProps = { fill, stroke, strokeWidth: 1.5, opacity: highlighted ? 0.85 : 1 };
  if (shape.kind === "ellipse") {
    return (
      <ellipse
        key={shape.id}
        cx={shape.cx}
        cy={shape.cy}
        rx={shape.rx}
        ry={shape.ry}
        {...commonProps}
      />
    );
  }
  return (
    <rect
      key={shape.id}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rx={shape.rx}
      {...commonProps}
    />
  );
}

function BodySilhouette({
  shapes,
  outlineOnly,
  highlightedIds,
  label,
}: {
  shapes: Shape[];
  outlineOnly: Shape[];
  highlightedIds: Set<string>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 220" width={100} height={220}>
        <circle cx={50} cy={16} r={13} fill="none" stroke="var(--border)" strokeWidth={1.5} />
        <rect x={44} y={26} width={12} height={10} rx={3} fill="none" stroke="var(--border)" strokeWidth={1.5} />
        {outlineOnly.map((s) => renderShape(s, false))}
        {shapes.map((s) => renderShape(s, highlightedIds.has(s.id)))}
      </svg>
      <span className="text-[11px] text-foreground-muted">{label}</span>
    </div>
  );
}

export function MuscleGroupDiagram({ groups }: { groups: MuscleGroup[] }) {
  const frontHighlighted = new Set<string>();
  const backHighlighted = new Set<string>();
  for (const group of groups) {
    const mapping = GROUP_TO_SHAPES[group];
    for (const id of mapping.front) frontHighlighted.add(id);
    for (const id of mapping.back) backHighlighted.add(id);
  }

  if (frontHighlighted.size === 0 && backHighlighted.size === 0) return null;

  return (
    <div className="flex justify-center gap-6">
      <BodySilhouette
        shapes={FRONT_SHAPES}
        outlineOnly={FRONT_OUTLINE_ONLY}
        highlightedIds={frontHighlighted}
        label="Frente"
      />
      <BodySilhouette
        shapes={BACK_SHAPES}
        outlineOnly={BACK_OUTLINE_ONLY}
        highlightedIds={backHighlighted}
        label="Costas"
      />
    </div>
  );
}
