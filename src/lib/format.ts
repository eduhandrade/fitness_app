export function formatDistanceKm(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** min/km pace from an average speed in m/s. */
export function formatPaceMinPerKm(avgSpeedMs: number): string {
  if (!avgSpeedMs) return "—";
  const secPerKm = 1000 / avgSpeedMs;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${String(sec).padStart(2, "0")}/km`;
}

export function formatSpeedKmh(avgSpeedMs: number): string {
  if (!avgSpeedMs) return "—";
  return `${(avgSpeedMs * 3.6).toFixed(1)} km/h`;
}

/** min/100m pace, typical for swim. */
export function formatPacePer100m(avgSpeedMs: number): string {
  if (!avgSpeedMs) return "—";
  const secPer100m = 100 / avgSpeedMs;
  const min = Math.floor(secPer100m / 60);
  const sec = Math.round(secPer100m % 60);
  return `${min}:${String(sec).padStart(2, "0")}/100m`;
}
