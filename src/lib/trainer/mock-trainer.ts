import type { IndoorBikeSample, TrainerConnection } from "./types";

const SAMPLE_INTERVAL_MS = 1000;
const BASE_POWER_W = 150;
const GRADE_POWER_FACTOR_W = 22;
const CADENCE_BASE_RPM = 85;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Simulated trainer for demoing/testing the whole ride flow without real
 * Bluetooth hardware. Reacts believably to `setSimulationGrade`: power
 * scales with the commanded grade (plus noise), and speed derives from a
 * simplified power/grade relationship — not real physics, just enough to
 * make the recorded ride data look plausible on a chart. */
export class MockTrainerConnection implements TrainerConnection {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private sampleCallbacks = new Set<(sample: IndoorBikeSample) => void>();
  private disconnectCallbacks = new Set<() => void>();
  private currentGradePct = 0;
  private elapsedSec = 0;
  private totalDistanceM = 0;

  async connect(): Promise<void> {
    // Always "succeeds" instantly — no real device to pair with.
  }

  async requestControl(): Promise<void> {}

  async startOrResume(): Promise<void> {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), SAMPLE_INTERVAL_MS);
  }

  async setSimulationGrade(gradePct: number): Promise<void> {
    this.currentGradePct = gradePct;
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async disconnect(): Promise<void> {
    await this.stop();
  }

  onSample(cb: (sample: IndoorBikeSample) => void): () => void {
    this.sampleCallbacks.add(cb);
    return () => this.sampleCallbacks.delete(cb);
  }

  onDisconnected(cb: () => void): () => void {
    this.disconnectCallbacks.add(cb);
    return () => this.disconnectCallbacks.delete(cb);
  }

  private tick() {
    this.elapsedSec += 1;

    const cadenceRpm = clamp(CADENCE_BASE_RPM + (Math.random() - 0.5) * 6, 60, 100);
    const powerW = Math.max(
      30,
      BASE_POWER_W + this.currentGradePct * GRADE_POWER_FACTOR_W + (Math.random() - 0.5) * 20
    );
    const gradeResistance = 1 + Math.max(-0.5, this.currentGradePct) * 0.08;
    const speedMs = clamp(powerW / (14 * gradeResistance), 1, 15);
    this.totalDistanceM += speedMs * (SAMPLE_INTERVAL_MS / 1000);

    const sample: IndoorBikeSample = {
      instSpeedMs: speedMs,
      instCadenceRpm: cadenceRpm,
      instPowerW: Math.round(powerW),
      totalDistanceM: Math.round(this.totalDistanceM),
      elapsedTimeSec: this.elapsedSec,
    };
    for (const cb of this.sampleCallbacks) cb(sample);
  }
}
