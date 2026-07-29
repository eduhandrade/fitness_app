import type { TrainerStreamSample } from "@/lib/trainer/types";

/** Generic time-series shape both Strava's streams API and our own
 * persisted trainer-ride samples can satisfy — named distinctly from the
 * Prisma `ActivityStreamSet` model (which is the DB row, not this shape). */
export type StreamSeries = {
  time?: { data: number[] };
  distance?: { data: number[] };
  velocity_smooth?: { data: number[] };
  heartrate?: { data: number[] };
  watts?: { data: number[] };
  cadence?: { data: number[] };
};

export type Split = { km: number; distanceM: number; seconds: number };

/** Per-km splits derived from distance/time streams. Handles a final
 * partial km and samples where multiple km thresholds are crossed between
 * two points. */
export function computeKmSplits(streams: StreamSeries): Split[] {
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

export type TimeSeriesPoint = {
  t: number;
  speedKmh?: number;
  heartrate?: number;
  watts?: number;
  cadenceRpm?: number;
};

/** Downsamples time/velocity/heartrate/watts/cadence streams into
 * chart-ready points. */
export function buildTimeSeriesPoints(
  streams: StreamSeries,
  maxPoints = 120
): TimeSeriesPoint[] {
  const time = streams.time?.data;
  if (!time || time.length === 0) return [];

  const velocity = streams.velocity_smooth?.data;
  const heartrate = streams.heartrate?.data;
  const watts = streams.watts?.data;
  const cadence = streams.cadence?.data;
  const step = Math.max(1, Math.floor(time.length / maxPoints));

  const points: TimeSeriesPoint[] = [];
  for (let i = 0; i < time.length; i += step) {
    points.push({
      t: time[i],
      speedKmh: velocity ? Math.round(velocity[i] * 3.6 * 10) / 10 : undefined,
      heartrate: heartrate ? Math.round(heartrate[i]) : undefined,
      watts: watts ? Math.round(watts[i]) : undefined,
      cadenceRpm: cadence ? Math.round(cadence[i]) : undefined,
    });
  }
  return points;
}

function seriesIfAnyPresent(values: (number | undefined)[]): { data: number[] } | undefined {
  if (!values.some((v) => v != null)) return undefined;
  return { data: values.map((v) => v ?? 0) };
}

/** Adapts our own persisted trainer-ride samples into the same shape the
 * Strava-streams path already produces, so computeKmSplits/
 * buildTimeSeriesPoints and the chart/splits components need no
 * source-specific branching. */
export function trainerSamplesToStreamSeries(samples: TrainerStreamSample[]): StreamSeries {
  return {
    time: { data: samples.map((s) => s.t) },
    distance: seriesIfAnyPresent(samples.map((s) => s.distanceM)),
    velocity_smooth: seriesIfAnyPresent(samples.map((s) => s.speedMs)),
    heartrate: seriesIfAnyPresent(samples.map((s) => s.heartrateBpm)),
    watts: seriesIfAnyPresent(samples.map((s) => s.watts)),
    cadence: seriesIfAnyPresent(samples.map((s) => s.cadenceRpm)),
  };
}
