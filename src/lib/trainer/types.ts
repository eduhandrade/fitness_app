/** One sample recorded during a bike trainer ride, roughly once per second.
 * Persisted as the `samples` JSON array on `ActivityStreamSet` — this type is
 * the app's own contract for that blob's shape (Postgres doesn't validate it,
 * same approach as the `mapPolyline` string already on `Activity`). */
export type TrainerStreamSample = {
  /** Seconds since the ride started. */
  t: number;
  watts?: number;
  cadenceRpm?: number;
  heartrateBpm?: number;
  speedMs?: number;
  /** Cumulative distance since ride start. */
  distanceM?: number;
  /** Grade being simulated at this point, if a route was loaded. */
  gradePct?: number;
  /** Interpolated from the loaded GPX route, if any. */
  elevationM?: number;
  lat?: number;
  lng?: number;
};
