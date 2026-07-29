import type { HeartRateConnection } from "./types";

const SAMPLE_INTERVAL_MS = 1000;
const MIN_BPM = 100;
const MAX_BPM = 175;

/** Simulated HR strap — a wandering signal independent of the mock trainer,
 * matching how a real chest strap is a fully separate BLE peripheral. */
export class MockHeartRateConnection implements HeartRateConnection {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private sampleCallbacks = new Set<(bpm: number) => void>();
  private bpm = 130;

  async connect(): Promise<void> {
    this.intervalId = setInterval(() => this.tick(), SAMPLE_INTERVAL_MS);
  }

  async disconnect(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  onSample(cb: (bpm: number) => void): () => void {
    this.sampleCallbacks.add(cb);
    return () => this.sampleCallbacks.delete(cb);
  }

  private tick() {
    this.bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, this.bpm + (Math.random() - 0.45) * 4));
    const rounded = Math.round(this.bpm);
    for (const cb of this.sampleCallbacks) cb(rounded);
  }
}
