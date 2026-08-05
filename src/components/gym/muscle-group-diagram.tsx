import type { MuscleGroup } from "@/lib/gym/muscle-groups";
import { FRONT_REGIONS, BACK_REGIONS, type MuscleRegion } from "./muscle-group-regions";

/** Front/back body silhouettes highlighting the muscle groups worked in a
 * session — same idea as Strava's strength-training muscle map. Every
 * region in {@link FRONT_REGIONS}/{@link BACK_REGIONS} is always drawn (so
 * the figure reads as a full anatomical chart, matching the reference
 * images this was traced from); only the fill color changes between the
 * neutral tone and the highlight color depending on whether that region's
 * muscle group was worked. */

const NEUTRAL_FILL = "var(--surface-hover)";
const NEUTRAL_STROKE = "var(--border)";
const HIGHLIGHT_FILL = "var(--primary)";
const HIGHLIGHT_STROKE = "var(--primary-strong)";

const HEAD_D = "M502,2 C536,2 570,36 570,90 C570,144 536,178 502,178 C468,178 434,144 434,90 C434,36 468,2 502,2 Z";
const NECK_D = "M460,175 C460,195 470,212 480,230 L520,230 C530,212 540,195 540,175 Z";
const HAND_L_D = "M268,766 C280,766 290,782 290,800 C290,818 280,834 268,834 C256,834 246,818 246,800 C246,782 256,766 268,766 Z";
const HAND_R_D = "M756,766 C768,766 778,782 778,800 C778,818 768,834 756,834 C744,834 734,818 734,800 C734,782 744,766 756,766 Z";

/** Broad, multi-region lifts (a clean/snatch, a burpee) don't map to one
 * specific muscle group — highlight the major groups they actually recruit
 * instead of showing nothing. */
const BROAD_GROUPS: MuscleGroup[] = ["chest", "core", "legs", "shoulders", "back", "posterior"];

function resolveHighlighted(groups: MuscleGroup[]): Set<MuscleGroup> {
  const set = new Set(groups);
  if (groups.includes("olympic") || groups.includes("fullBody")) {
    for (const g of BROAD_GROUPS) set.add(g);
  }
  return set;
}

function Silhouette({
  regions,
  highlighted,
  label,
}: {
  regions: MuscleRegion[];
  highlighted: Set<MuscleGroup>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 1024 1536" width={128} height={192}>
        {regions.map((r, i) => {
          const worked = r.group !== "forearm" && highlighted.has(r.group);
          return (
            <path
              key={i}
              d={r.d}
              fill={worked ? HIGHLIGHT_FILL : NEUTRAL_FILL}
              stroke={worked ? HIGHLIGHT_STROKE : NEUTRAL_STROKE}
              strokeWidth={3}
              opacity={worked ? 0.9 : 1}
            />
          );
        })}
        <path d={NECK_D} fill={NEUTRAL_FILL} stroke={NEUTRAL_STROKE} strokeWidth={3} />
        <path d={HEAD_D} fill={NEUTRAL_FILL} stroke={NEUTRAL_STROKE} strokeWidth={3} />
        <path d={HAND_L_D} fill={NEUTRAL_FILL} stroke={NEUTRAL_STROKE} strokeWidth={3} />
        <path d={HAND_R_D} fill={NEUTRAL_FILL} stroke={NEUTRAL_STROKE} strokeWidth={3} />
      </svg>
      <span className="text-[11px] text-foreground-muted">{label}</span>
    </div>
  );
}

export function MuscleGroupDiagram({ groups }: { groups: MuscleGroup[] }) {
  const highlighted = resolveHighlighted(groups);
  const hasAnyHighlight =
    [...FRONT_REGIONS, ...BACK_REGIONS].some((r) => r.group !== "forearm" && highlighted.has(r.group));
  if (!hasAnyHighlight) return null;

  return (
    <div className="flex justify-center gap-8">
      <Silhouette regions={FRONT_REGIONS} highlighted={highlighted} label="Frente" />
      <Silhouette regions={BACK_REGIONS} highlighted={highlighted} label="Costas" />
    </div>
  );
}
