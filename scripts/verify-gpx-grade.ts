/** Sanity check for GPX parsing + the grade-simulation engine, using a
 * synthetic route (no real hardware, no network needed) rather than a real
 * GPX file, so the expected shape (climb then descent) is known exactly.
 * Run with `npx tsx scripts/verify-gpx-grade.ts`. */
import { parseGpx, hasElevationData } from "../src/lib/trainer/gpx";
import {
  buildRouteProfile,
  computeElevationGainM,
  gradeAtDistance,
  positionAtDistance,
  lapCount,
  routeTotalDistanceM,
} from "../src/lib/trainer/route-profile";

let failures = 0;

function assert(condition: boolean, label: string, detail?: string) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!condition) failures++;
}

function assertClose(actual: number, expected: number, tolerance: number, label: string) {
  const pass = Math.abs(actual - expected) <= tolerance;
  assert(pass, label, `expected ~${expected} ± ${tolerance}, got ${actual.toFixed(2)}`);
}

// Synthetic route: latitude steps north at a fixed longitude, elevation
// climbs 0m -> 100m over the first 10 points, then descends back to 0m
// over the next 10 — a simple, exactly-known triangular profile.
function buildSyntheticGpx(includeElevation: boolean): string {
  const trkpts: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const lat = (37 + i * 0.0001).toFixed(6);
    const lon = "-122.000000";
    const ele = i <= 10 ? i * 10 : (20 - i) * 10;
    trkpts.push(
      includeElevation
        ? `<trkpt lat="${lat}" lon="${lon}"><ele>${ele}</ele></trkpt>`
        : `<trkpt lat="${lat}" lon="${lon}"></trkpt>`
    );
  }
  return `<?xml version="1.0"?><gpx><trk><trkseg>${trkpts.join("")}</trkseg></trk></gpx>`;
}

// --- Parsing + profile building on a route with elevation ---
{
  const gpxText = buildSyntheticGpx(true);
  const points = parseGpx(gpxText);
  assert(points.length === 21, "parseGpx: extracts all 21 track points");
  assert(hasElevationData(points), "hasElevationData: true when every point has <ele>");

  const profile = buildRouteProfile(points);
  assert(profile.length > 0, "buildRouteProfile: produces a non-empty profile");

  let monotonic = true;
  for (let i = 1; i < profile.length; i++) {
    if (profile[i].cumulativeDistanceM < profile[i - 1].cumulativeDistanceM) monotonic = false;
  }
  assert(monotonic, "buildRouteProfile: cumulativeDistanceM is monotonically increasing");

  const totalDistanceM = routeTotalDistanceM(profile);
  assert(totalDistanceM > 0, "routeTotalDistanceM: positive for a real route");

  assertClose(
    computeElevationGainM(profile),
    100,
    20,
    "computeElevationGainM: ~100m of climb on the triangular profile"
  );

  const firstHalf = profile.filter((p) => p.cumulativeDistanceM < totalDistanceM / 2);
  const secondHalf = profile.filter((p) => p.cumulativeDistanceM >= totalDistanceM / 2);
  const avg = (pts: typeof profile) => pts.reduce((s, p) => s + p.gradePct, 0) / pts.length;
  assert(avg(firstHalf) > 0, "gradePct: positive on average during the climb half");
  assert(avg(secondHalf) < 0, "gradePct: negative on average during the descent half");

  // Looping: distance just past the end should read identically to the
  // same offset from the start (confirmed behavior: loop, don't flatten).
  const smallOffset = 15;
  const gradeNearStart = gradeAtDistance(profile, smallOffset);
  const gradeAfterOneLap = gradeAtDistance(profile, totalDistanceM + smallOffset);
  assert(
    gradeNearStart === gradeAfterOneLap,
    "gradeAtDistance: wraps past the route end (loop), matching the start"
  );

  const posNearStart = positionAtDistance(profile, smallOffset);
  const posAfterOneLap = positionAtDistance(profile, totalDistanceM + smallOffset);
  assert(
    JSON.stringify(posNearStart) === JSON.stringify(posAfterOneLap),
    "positionAtDistance: wraps past the route end (loop), matching the start"
  );

  assert(lapCount(profile, smallOffset) === 0, "lapCount: 0 within the first lap");
  assert(
    lapCount(profile, totalDistanceM + smallOffset) === 1,
    "lapCount: 1 just after completing the first lap"
  );
  assert(
    lapCount(profile, 2 * totalDistanceM + smallOffset) === 2,
    "lapCount: 2 just after completing the second lap"
  );
}

// --- No elevation data anywhere: should degrade to a flat (0%) profile ---
{
  const gpxText = buildSyntheticGpx(false);
  const points = parseGpx(gpxText);
  assert(!hasElevationData(points), "hasElevationData: false when no point has <ele>");

  const profile = buildRouteProfile(points);
  const allFlat = profile.every((p) => p.gradePct === 0);
  assert(allFlat, "buildRouteProfile: every grade is 0 when the GPX has no elevation at all");
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
