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

/** One parsed "Indoor Bike Data" FTMS notification. Fields are only present
 * when the trainer's flags bitmask marks them as included. */
export type IndoorBikeSample = {
  instSpeedMs?: number;
  avgSpeedMs?: number;
  instCadenceRpm?: number;
  avgCadenceRpm?: number;
  totalDistanceM?: number;
  instPowerW?: number;
  avgPowerW?: number;
  heartrateBpm?: number;
  elapsedTimeSec?: number;
};

export type TrainerConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "riding"
  | "reconnecting"
  | "error"
  | "disconnected";

/** Satisfied by both the real Web Bluetooth/FTMS implementation and the
 * mock trainer, so ride UI code never needs to know which one it's driving. */
export interface TrainerConnection {
  connect(): Promise<void>;
  requestControl(): Promise<void>;
  startOrResume(): Promise<void>;
  setSimulationGrade(gradePct: number): Promise<void>;
  stop(): Promise<void>;
  disconnect(): Promise<void>;
  /** Returns an unsubscribe function. */
  onSample(cb: (sample: IndoorBikeSample) => void): () => void;
  /** Returns an unsubscribe function. */
  onDisconnected(cb: () => void): () => void;
}

export interface HeartRateConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Returns an unsubscribe function. */
  onSample(cb: (bpm: number) => void): () => void;
}
