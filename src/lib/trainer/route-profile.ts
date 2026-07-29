import type { GpxTrackPoint } from "./gpx";

export type RoutePoint = {
  cumulativeDistanceM: number;
  elevationM: number;
  gradePct: number;
  lat: number;
  lng: number;
};

const RESAMPLE_INTERVAL_M = 20;
/** Moving-average radius in resampled points either side — at a 20m
 * resample interval this smooths over a ~100m window, enough to keep raw
 * GPS elevation noise from making the trainer's resistance chatter. */
const GRADE_SMOOTHING_RADIUS = 2;
const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function movingAverage(values: number[], radius: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - radius);
    const end = Math.min(values.length - 1, i + radius);
    let sum = 0;
    for (let j = start; j <= end; j++) sum += values[j];
    return sum / (end - start + 1);
  });
}

/** Builds a distance-indexed, grade-smoothed route profile from raw GPX
 * points: cumulative distance via haversine, resampled onto fixed ~20m
 * intervals (linear interpolation of position + elevation), then a moving
 * average over the grade between resampled points. Points with no
 * elevation data are treated as flat (0m) — if *no* point in the whole
 * route has elevation, every resulting grade is 0 (the caller should warn
 * the rider once, not treat this as an error). */
export function buildRouteProfile(points: GpxTrackPoint[]): RoutePoint[] {
  if (points.length < 2) return [];

  const raw: { cumulativeDistanceM: number; elevationM: number; lat: number; lng: number }[] = [
    { cumulativeDistanceM: 0, elevationM: points[0].eleM ?? 0, lat: points[0].lat, lng: points[0].lng },
  ];
  let cumulative = 0;
  for (let i = 1; i < points.length; i++) {
    cumulative += haversineDistanceM(points[i - 1], points[i]);
    raw.push({
      cumulativeDistanceM: cumulative,
      elevationM: points[i].eleM ?? raw[i - 1].elevationM,
      lat: points[i].lat,
      lng: points[i].lng,
    });
  }

  const totalDistanceM = cumulative;
  if (totalDistanceM === 0) return [];

  const resampled: { cumulativeDistanceM: number; elevationM: number; lat: number; lng: number }[] =
    [];
  const numSamples = Math.max(2, Math.floor(totalDistanceM / RESAMPLE_INTERVAL_M) + 1);
  let rawIndex = 0;
  for (let i = 0; i < numSamples; i++) {
    const targetDist = Math.min(totalDistanceM, i * RESAMPLE_INTERVAL_M);
    while (rawIndex < raw.length - 2 && raw[rawIndex + 1].cumulativeDistanceM < targetDist) {
      rawIndex++;
    }
    const a = raw[rawIndex];
    const b = raw[Math.min(rawIndex + 1, raw.length - 1)];
    const segmentLen = b.cumulativeDistanceM - a.cumulativeDistanceM;
    const frac = segmentLen > 0 ? (targetDist - a.cumulativeDistanceM) / segmentLen : 0;
    resampled.push({
      cumulativeDistanceM: targetDist,
      elevationM: a.elevationM + (b.elevationM - a.elevationM) * frac,
      lat: a.lat + (b.lat - a.lat) * frac,
      lng: a.lng + (b.lng - a.lng) * frac,
    });
  }

  const rawGrades: number[] = [0];
  for (let i = 1; i < resampled.length; i++) {
    const dElev = resampled[i].elevationM - resampled[i - 1].elevationM;
    const dDist = resampled[i].cumulativeDistanceM - resampled[i - 1].cumulativeDistanceM;
    rawGrades.push(dDist > 0 ? (dElev / dDist) * 100 : 0);
  }
  const smoothedGrades = movingAverage(rawGrades, GRADE_SMOOTHING_RADIUS);

  return resampled.map((p, i) => ({
    cumulativeDistanceM: p.cumulativeDistanceM,
    elevationM: p.elevationM,
    gradePct: smoothedGrades[i],
    lat: p.lat,
    lng: p.lng,
  }));
}

export function routeTotalDistanceM(profile: RoutePoint[]): number {
  return profile.length === 0 ? 0 : profile[profile.length - 1].cumulativeDistanceM;
}

export function computeElevationGainM(profile: RoutePoint[]): number {
  let gain = 0;
  for (let i = 1; i < profile.length; i++) {
    const delta = profile[i].elevationM - profile[i - 1].elevationM;
    if (delta > 0) gain += delta;
  }
  return gain;
}

/** Wraps distance around the route length so a rider who finishes the
 * route keeps looping it indefinitely (confirmed with the user, rather
 * than holding flat or stopping). */
function wrapDistance(distanceM: number, totalDistanceM: number): number {
  return ((distanceM % totalDistanceM) + totalDistanceM) % totalDistanceM;
}

/** Largest index whose cumulativeDistanceM is <= the target distance. */
function findSegmentIndex(profile: RoutePoint[], distanceM: number): number {
  let lo = 0;
  let hi = profile.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (profile[mid].cumulativeDistanceM <= distanceM) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function gradeAtDistance(profile: RoutePoint[], cumulativeDistanceM: number): number {
  if (profile.length === 0) return 0;
  const totalDistanceM = routeTotalDistanceM(profile);
  if (totalDistanceM === 0) return profile[0].gradePct;
  const wrapped = wrapDistance(cumulativeDistanceM, totalDistanceM);
  return profile[findSegmentIndex(profile, wrapped)].gradePct;
}

export function positionAtDistance(
  profile: RoutePoint[],
  cumulativeDistanceM: number
): { lat: number; lng: number; elevationM: number } | null {
  if (profile.length === 0) return null;
  const totalDistanceM = routeTotalDistanceM(profile);
  const wrapped = totalDistanceM === 0 ? 0 : wrapDistance(cumulativeDistanceM, totalDistanceM);
  const p = profile[findSegmentIndex(profile, wrapped)];
  return { lat: p.lat, lng: p.lng, elevationM: p.elevationM };
}

/** How many full laps of the route have been completed at this cumulative
 * distance — drives the ride UI's lap counter. */
export function lapCount(profile: RoutePoint[], cumulativeDistanceM: number): number {
  const totalDistanceM = routeTotalDistanceM(profile);
  if (totalDistanceM === 0) return 0;
  return Math.floor(cumulativeDistanceM / totalDistanceM);
}
