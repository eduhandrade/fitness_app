import type { StravaStreamSet } from "@/lib/strava";

export type Split = { km: number; distanceM: number; seconds: number };

/** Per-km splits derived from Strava's distance/time streams. Handles a
 * final partial km and samples where multiple km thresholds are crossed
 * between two points. */
export function computeKmSplits(streams: StravaStreamSet): Split[] {
  const distance = streams.distance?.data;
  const time = streams.time?.data;
  if (!distance || !time || distance.length < 2 || distance.length !== time.length) {
    return [];
  }

  const splits: Split[] = [];
  let threshold = 1000;
  let lastTime = time[0];
  let lastDistance = distance[0];

  for (let i = 1; i < distance.length; i++) {
    while (distance[i] >= threshold) {
      const prevDist = distance[i - 1];
      const prevTime = time[i - 1];
      const distDelta = distance[i] - prevDist;
      const frac = distDelta > 0 ? (threshold - prevDist) / distDelta : 0;
      const tAtThreshold = prevTime + frac * (time[i] - prevTime);
      splits.push({
        km: splits.length + 1,
        distanceM: threshold - lastDistance,
        seconds: tAtThreshold - lastTime,
      });
      lastTime = tAtThreshold;
      lastDistance = threshold;
      threshold += 1000;
    }
  }

  const totalDistance = distance[distance.length - 1];
  const totalTime = time[time.length - 1];
  const remaining = totalDistance - lastDistance;
  if (remaining > 20) {
    splits.push({
      km: splits.length + 1,
      distanceM: remaining,
      seconds: totalTime - lastTime,
    });
  }

  return splits;
}

export type TimeSeriesPoint = { t: number; speedKmh?: number; heartrate?: number };

/** Downsamples time/velocity/heartrate streams into chart-ready points. */
export function buildTimeSeriesPoints(
  streams: StravaStreamSet,
  maxPoints = 120
): TimeSeriesPoint[] {
  const time = streams.time?.data;
  if (!time || time.length === 0) return [];

  const velocity = streams.velocity_smooth?.data;
  const heartrate = streams.heartrate?.data;
  const step = Math.max(1, Math.floor(time.length / maxPoints));

  const points: TimeSeriesPoint[] = [];
  for (let i = 0; i < time.length; i += step) {
    points.push({
      t: time[i],
      speedKmh: velocity ? Math.round(velocity[i] * 3.6 * 10) / 10 : undefined,
      heartrate: heartrate ? Math.round(heartrate[i]) : undefined,
    });
  }
  return points;
}
