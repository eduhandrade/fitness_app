export type GpxTrackPoint = {
  lat: number;
  lng: number;
  /** null when the point has no `<ele>` child at all. */
  eleM: number | null;
};

// Deliberately regex-based rather than DOMParser: this needs to run
// identically in the browser (real ride flow) and in Node (verification
// scripts), and every real-world GPX export (Garmin, Strava, RideWithGPS,
// Komoot) uses the non-self-closing `<trkpt ...>...</trkpt>` form with
// nested children, so that's the only shape supported here — matching this
// app's existing "hand-roll small parsers for the shape we actually see"
// style (see src/lib/polyline.ts).
const TRKPT_BLOCK_REGEX = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g;
const LAT_ATTR_REGEX = /\blat="(-?[\d.]+)"/;
const LON_ATTR_REGEX = /\blon="(-?[\d.]+)"/;
const ELE_REGEX = /<ele>\s*(-?[\d.]+)\s*<\/ele>/;

/** Parses a GPX file's track points. Ignores everything except lat/lon/ele —
 * no route/waypoint support, no namespaces to worry about. */
export function parseGpx(xmlText: string): GpxTrackPoint[] {
  const points: GpxTrackPoint[] = [];
  TRKPT_BLOCK_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TRKPT_BLOCK_REGEX.exec(xmlText)) !== null) {
    const [, attrs, inner] = match;
    const latMatch = LAT_ATTR_REGEX.exec(attrs);
    const lonMatch = LON_ATTR_REGEX.exec(attrs);
    if (!latMatch || !lonMatch) continue;

    const lat = Number(latMatch[1]);
    const lng = Number(lonMatch[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const eleMatch = ELE_REGEX.exec(inner);
    points.push({ lat, lng, eleM: eleMatch ? Number(eleMatch[1]) : null });
  }

  return points;
}

export function hasElevationData(points: GpxTrackPoint[]): boolean {
  return points.some((p) => p.eleM !== null);
}
