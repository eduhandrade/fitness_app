"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useWebBluetoothAvailable } from "@/lib/trainer/use-web-bluetooth-available";
import { BleTrainerConnection } from "@/lib/trainer/ble-trainer";
import { BleHeartRateConnection } from "@/lib/trainer/ble-heart-rate";
import { MockTrainerConnection } from "@/lib/trainer/mock-trainer";
import { MockHeartRateConnection } from "@/lib/trainer/mock-heart-rate";
import { parseGpx, hasElevationData } from "@/lib/trainer/gpx";
import {
  buildRouteProfile,
  gradeAtDistance,
  lapCount,
  positionAtDistance,
  type RoutePoint,
} from "@/lib/trainer/route-profile";
import { computeNormalizedPower } from "@/lib/trainer/normalized-power";
import { saveTrainerRide } from "@/app/(app)/bike-trainer/actions";
import { ElevationStrip } from "./elevation-strip";
import type {
  TrainerConnection,
  HeartRateConnection,
  IndoorBikeSample,
  TrainerStreamSample,
} from "@/lib/trainer/types";

type Phase = "idle" | "connecting" | "ready" | "riding" | "finished";
type ConnectionMode = "ble" | "demo";

const SIM_PUSH_INTERVAL_MS = 2000;
const GRADE_CHANGE_THRESHOLD_PCT = 0.2;

type LiveStats = {
  watts: number | null;
  cadenceRpm: number | null;
  speedMs: number | null;
  heartrateBpm: number | null;
  distanceM: number;
  elapsedSec: number;
  gradePct: number;
  lap: number;
};

const INITIAL_LIVE_STATS: LiveStats = {
  watts: null,
  cadenceRpm: null,
  speedMs: null,
  heartrateBpm: null,
  distanceM: 0,
  elapsedSec: 0,
  gradePct: 0,
  lap: 0,
};

type RideSummary = {
  movingTimeSec: number;
  distanceM: number;
  elevationGainM: number;
  avgWatts?: number;
  maxWatts?: number;
  normalizedPower?: number;
  avgCadence?: number;
  maxCadence?: number;
  avgHeartrate?: number;
  maxHeartrate?: number;
  avgSpeedMs?: number;
};

function average(values: number[]): number | undefined {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : undefined;
}

function sumPositiveDeltas(values: number[]): number {
  let gain = 0;
  for (let i = 1; i < values.length; i++) {
    const delta = values[i] - values[i - 1];
    if (delta > 0) gain += delta;
  }
  return gain;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-hover p-3">
      <p className="text-[12px] text-foreground-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function RideSession() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hrConnected, setHrConnected] = useState(false);
  const [routeFileName, setRouteFileName] = useState<string | null>(null);
  const [routeWarning, setRouteWarning] = useState<string | null>(null);
  const [disconnectedMidRide, setDisconnectedMidRide] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rideName, setRideName] = useState("Bike trainer ride");
  const [rideNotes, setRideNotes] = useState("");
  const [liveStats, setLiveStats] = useState<LiveStats>(INITIAL_LIVE_STATS);
  const [summary, setSummary] = useState<RideSummary | null>(null);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("demo");
  // Mirrors routeProfileRef for rendering — refs can't be read during render
  // (React won't re-render when only a ref changes), so anything the JSX
  // below needs to react to (showing the grade/lap tiles, the elevation
  // strip) reads this state instead, while the long-lived onSample/interval
  // callbacks below read the ref for stale-closure-free imperative access.
  const [routeProfile, setRouteProfileState] = useState<RoutePoint[] | null>(null);

  const trainerRef = useRef<TrainerConnection | null>(null);
  const hrRef = useRef<HeartRateConnection | null>(null);
  const routeProfileRef = useRef<RoutePoint[] | null>(null);
  const samplesRef = useRef<TrainerStreamSample[]>([]);
  const lastSentGradeRef = useRef<number | null>(null);
  const simPushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startWallClockRef = useRef<number>(0);
  const distanceFallbackRef = useRef(0);
  const latestDistanceRef = useRef(0);
  const latestHrRef = useRef<number | null>(null);
  const isRidingRef = useRef(false);

  const bluetoothAvailable = useWebBluetoothAvailable();

  const pushSimulationIfNeeded = useCallback(() => {
    if (!routeProfileRef.current || !trainerRef.current) return;
    const grade = gradeAtDistance(routeProfileRef.current, latestDistanceRef.current);
    if (
      lastSentGradeRef.current === null ||
      Math.abs(grade - lastSentGradeRef.current) > GRADE_CHANGE_THRESHOLD_PCT
    ) {
      lastSentGradeRef.current = grade;
      trainerRef.current.setSimulationGrade(grade).catch(() => {
        // Best-effort — the next tick will retry with the latest grade.
      });
    }
  }, []);

  const handleSample = useCallback((sample: IndoorBikeSample) => {
    const riding = isRidingRef.current;
    let distanceM = latestDistanceRef.current;
    let gradePct = 0;
    let lap = 0;

    if (riding) {
      if (sample.totalDistanceM != null) {
        distanceM = sample.totalDistanceM;
      } else {
        distanceFallbackRef.current += sample.instSpeedMs ?? 0;
        distanceM = distanceFallbackRef.current;
      }
      latestDistanceRef.current = distanceM;

      let elevationM: number | undefined;
      let lat: number | undefined;
      let lng: number | undefined;
      if (routeProfileRef.current) {
        gradePct = gradeAtDistance(routeProfileRef.current, distanceM);
        lap = lapCount(routeProfileRef.current, distanceM);
        const position = positionAtDistance(routeProfileRef.current, distanceM);
        elevationM = position?.elevationM;
        lat = position?.lat;
        lng = position?.lng;
      }

      samplesRef.current.push({
        t: samplesRef.current.length,
        watts: sample.instPowerW,
        cadenceRpm: sample.instCadenceRpm,
        heartrateBpm: sample.heartrateBpm ?? latestHrRef.current ?? undefined,
        speedMs: sample.instSpeedMs,
        distanceM,
        gradePct: routeProfileRef.current ? gradePct : undefined,
        elevationM,
        lat,
        lng,
      });
    }

    setLiveStats({
      watts: sample.instPowerW ?? null,
      cadenceRpm: sample.instCadenceRpm ?? null,
      speedMs: sample.instSpeedMs ?? null,
      heartrateBpm: (sample.heartrateBpm ?? latestHrRef.current) ?? null,
      distanceM: riding ? distanceM : 0,
      elapsedSec: riding ? samplesRef.current.length : 0,
      gradePct: riding ? gradePct : 0,
      lap: riding ? lap : 0,
    });
  }, []);

  const handleHrSample = useCallback((bpm: number) => {
    latestHrRef.current = bpm;
    setLiveStats((prev) => ({ ...prev, heartrateBpm: bpm }));
  }, []);

  const handleTrainerDisconnected = useCallback(() => {
    if (!isRidingRef.current) return;
    setDisconnectedMidRide(true);
    if (simPushIntervalRef.current) {
      clearInterval(simPushIntervalRef.current);
      simPushIntervalRef.current = null;
    }
  }, []);

  function attachTrainer(trainer: TrainerConnection) {
    trainer.onSample(handleSample);
    trainer.onDisconnected(handleTrainerDisconnected);
    trainerRef.current = trainer;
  }

  async function handleConnect(mode: ConnectionMode) {
    setError(null);
    setPhase("connecting");
    try {
      const trainer: TrainerConnection = mode === "ble" ? new BleTrainerConnection() : new MockTrainerConnection();
      await trainer.connect();
      await trainer.requestControl();
      attachTrainer(trainer);
      setConnectionMode(mode);
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to the trainer.");
      setPhase("idle");
    }
  }

  async function handlePairHeartRate() {
    setError(null);
    try {
      const hr: HeartRateConnection =
        connectionMode === "demo" ? new MockHeartRateConnection() : new BleHeartRateConnection();
      await hr.connect();
      hr.onSample(handleHrSample);
      hrRef.current = hr;
      setHrConnected(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to the heart rate monitor.");
    }
  }

  async function handleReconnect() {
    setError(null);
    try {
      const trainer: TrainerConnection =
        connectionMode === "demo" ? new MockTrainerConnection() : new BleTrainerConnection();
      await trainer.connect();
      await trainer.requestControl();
      await trainer.startOrResume();
      attachTrainer(trainer);
      setDisconnectedMidRide(false);
      if (routeProfileRef.current) {
        simPushIntervalRef.current = setInterval(pushSimulationIfNeeded, SIM_PUSH_INTERVAL_MS);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reconnect to the trainer.");
    }
  }

  async function handleGpxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const points = parseGpx(text);
      if (points.length < 2) {
        setError("Could not read any track points from that GPX file.");
        return;
      }
      const profile = buildRouteProfile(points);
      routeProfileRef.current = profile;
      setRouteProfileState(profile);
      setRouteFileName(file.name);
      setRouteWarning(
        hasElevationData(points)
          ? null
          : "This route has no elevation data — riding at flat (0%) grade."
      );
      setRideName(file.name.replace(/\.gpx$/i, ""));
    } catch {
      setError("Could not read that GPX file.");
    }
  }

  function handleRemoveRoute() {
    routeProfileRef.current = null;
    setRouteProfileState(null);
    setRouteFileName(null);
    setRouteWarning(null);
  }

  async function handleStartRide() {
    setError(null);
    try {
      await trainerRef.current!.startOrResume();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the ride.");
      return;
    }
    isRidingRef.current = true;
    startWallClockRef.current = Date.now();
    distanceFallbackRef.current = 0;
    latestDistanceRef.current = 0;
    lastSentGradeRef.current = null;
    samplesRef.current = [];
    setPhase("riding");

    if (routeProfileRef.current) {
      pushSimulationIfNeeded();
      simPushIntervalRef.current = setInterval(pushSimulationIfNeeded, SIM_PUSH_INTERVAL_MS);
    }
  }

  function computeSummary(): RideSummary {
    const samples = samplesRef.current;
    const watts = samples.map((s) => s.watts).filter((v): v is number => v != null);
    const cadence = samples.map((s) => s.cadenceRpm).filter((v): v is number => v != null);
    const hr = samples.map((s) => s.heartrateBpm).filter((v): v is number => v != null);
    const speed = samples.map((s) => s.speedMs).filter((v): v is number => v != null);
    const elevations = samples.map((s) => s.elevationM).filter((v): v is number => v != null);
    const lastSample = samples[samples.length - 1];

    return {
      movingTimeSec: samples.length,
      distanceM: lastSample?.distanceM ?? 0,
      elevationGainM: sumPositiveDeltas(elevations),
      avgWatts: average(watts),
      maxWatts: watts.length ? Math.max(...watts) : undefined,
      normalizedPower: computeNormalizedPower(watts) ?? undefined,
      avgCadence: average(cadence),
      maxCadence: cadence.length ? Math.max(...cadence) : undefined,
      avgHeartrate: average(hr),
      maxHeartrate: hr.length ? Math.max(...hr) : undefined,
      avgSpeedMs: average(speed),
    };
  }

  async function handleFinishRide() {
    if (!confirm("Finish this ride?")) return;
    isRidingRef.current = false;
    if (simPushIntervalRef.current) {
      clearInterval(simPushIntervalRef.current);
      simPushIntervalRef.current = null;
    }
    try {
      await trainerRef.current?.stop();
    } catch {
      // Ending the ride regardless of whether the stop command lands.
    }
    await trainerRef.current?.disconnect();
    await hrRef.current?.disconnect();

    setSummary(computeSummary());
    setPhase("finished");
  }

  async function handleSave() {
    if (!summary) return;
    setIsSaving(true);
    setError(null);
    try {
      const { activityId } = await saveTrainerRide({
        name: rideName.trim() || "Bike trainer ride",
        startDate: new Date(startWallClockRef.current),
        movingTimeSec: summary.movingTimeSec,
        elapsedTimeSec: summary.movingTimeSec,
        distanceM: summary.distanceM,
        elevationGainM: summary.elevationGainM,
        avgWatts: summary.avgWatts,
        maxWatts: summary.maxWatts,
        normalizedPower: summary.normalizedPower,
        avgCadence: summary.avgCadence,
        maxCadence: summary.maxCadence,
        avgHeartrate: summary.avgHeartrate,
        maxHeartrate: summary.maxHeartrate,
        avgSpeedMs: summary.avgSpeedMs,
        notes: rideNotes.trim() || undefined,
        samples: samplesRef.current,
      });
      router.push(`/activities/${activityId}`);
    } catch {
      setError("Could not save the ride. Try again.");
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-danger">{error}</p>}

      {phase === "idle" && (
        <div className="space-y-4">
          {!bluetoothAvailable && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
              <p className="text-sm font-semibold text-warning">INDISPONÍVEL NO IOS</p>
              <p className="mt-1 text-xs text-foreground-muted">
                O Web Bluetooth não é suportado no Safari/iOS — é uma limitação da
                Apple, sem solução possível no navegador. Abra esta página no Chrome
                do seu tablet Android pra conectar o rolo de treino por Bluetooth.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground-muted">Route (optional)</label>
            {routeFileName ? (
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface-hover px-3 py-2">
                <span className="truncate text-sm text-foreground">{routeFileName}</span>
                <button
                  type="button"
                  onClick={handleRemoveRoute}
                  className="shrink-0 text-xs font-medium text-foreground-muted hover:text-danger"
                >
                  Remove
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept=".gpx"
                onChange={handleGpxUpload}
                className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm text-foreground-muted file:mr-3 file:rounded-full file:border-0 file:bg-primary-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-strong"
              />
            )}
            {routeWarning && <p className="text-xs text-warning">{routeWarning}</p>}
          </div>

          <div className="space-y-2">
            {bluetoothAvailable && (
              <Button className="w-full" onClick={() => handleConnect("ble")}>
                Connect via Bluetooth
              </Button>
            )}
            <Button variant="secondary" className="w-full" onClick={() => handleConnect("demo")}>
              Try demo mode (no trainer needed)
            </Button>
          </div>
        </div>
      )}

      {phase === "connecting" && (
        <p className="text-sm text-foreground-muted">Connecting…</p>
      )}

      {phase === "ready" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/40 bg-primary-muted p-3 text-sm text-primary-strong">
            Trainer connected{connectionMode === "demo" ? " (demo mode)" : ""}.
          </div>

          {routeFileName && (
            <p className="text-sm text-foreground-muted">Route loaded: {routeFileName}</p>
          )}

          {hrConnected ? (
            <p className="text-sm text-foreground-muted">Heart rate monitor connected.</p>
          ) : (
            <Button variant="secondary" className="w-full" onClick={handlePairHeartRate}>
              Pair heart rate monitor (optional)
            </Button>
          )}

          <Button className="w-full" onClick={handleStartRide}>
            Start ride
          </Button>
        </div>
      )}

      {phase === "riding" && (
        <div className="space-y-4">
          {disconnectedMidRide && (
            <div className="space-y-2 rounded-xl border border-danger/40 bg-danger/10 p-3">
              <p className="text-sm text-danger">Lost connection to the trainer.</p>
              <Button variant="secondary" className="w-full" onClick={handleReconnect}>
                Reconnect
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Tile label="Power" value={liveStats.watts != null ? `${liveStats.watts} W` : "—"} />
            <Tile label="Cadence" value={liveStats.cadenceRpm != null ? `${Math.round(liveStats.cadenceRpm)} rpm` : "—"} />
            <Tile
              label="Speed"
              value={liveStats.speedMs != null ? `${(liveStats.speedMs * 3.6).toFixed(1)} km/h` : "—"}
            />
            <Tile label="Heart rate" value={liveStats.heartrateBpm != null ? `${liveStats.heartrateBpm} bpm` : "—"} />
            <Tile label="Distance" value={`${(liveStats.distanceM / 1000).toFixed(2)} km`} />
            <Tile label="Elapsed" value={formatDuration(liveStats.elapsedSec)} />
            {routeProfile && (
              <>
                <Tile label="Grade" value={`${liveStats.gradePct.toFixed(1)}%`} />
                <Tile label="Lap" value={`${liveStats.lap + 1}`} />
              </>
            )}
          </div>

          {routeProfile && (
            <ElevationStrip profile={routeProfile} distanceM={liveStats.distanceM} />
          )}

          <Button variant="danger" className="w-full" onClick={handleFinishRide}>
            Finish ride
          </Button>
        </div>
      )}

      {phase === "finished" && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Tile label="Distance" value={`${(summary.distanceM / 1000).toFixed(2)} km`} />
            <Tile label="Duration" value={formatDuration(summary.movingTimeSec)} />
            {summary.avgWatts != null && (
              <Tile label="Avg power" value={`${Math.round(summary.avgWatts)} W`} />
            )}
            {summary.normalizedPower != null && (
              <Tile label="Normalized power" value={`${summary.normalizedPower} W`} />
            )}
            {summary.avgHeartrate != null && (
              <Tile label="Avg heart rate" value={`${Math.round(summary.avgHeartrate)} bpm`} />
            )}
            {summary.elevationGainM > 0 && (
              <Tile label="Elevation gain" value={`${Math.round(summary.elevationGainM)} m`} />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground-muted">Name</label>
            <input
              value={rideName}
              onChange={(e) => setRideName(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground-muted">Notes (optional)</label>
            <textarea
              value={rideNotes}
              onChange={(e) => setRideNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save ride"}
          </Button>
        </div>
      )}
    </div>
  );
}
