import { decodePolyline } from "@/lib/polyline";

const WIDTH = 320;
const HEIGHT = 200;
const PADDING = 12;

export function RouteMap({ polyline }: { polyline: string }) {
  const points = decodePolyline(polyline);
  if (points.length < 2) return null;

  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Equirectangular projection, corrected for latitude so the route isn't
  // horizontally stretched/squashed near the poles.
  const avgLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const lngScale = Math.cos(avgLatRad);

  const spanX = (maxLng - minLng) * lngScale || 1e-6;
  const spanY = maxLat - minLat || 1e-6;
  const availW = WIDTH - PADDING * 2;
  const availH = HEIGHT - PADDING * 2;
  const scale = Math.min(availW / spanX, availH / spanY);

  const drawWidth = spanX * scale;
  const drawHeight = spanY * scale;
  const offsetX = PADDING + (availW - drawWidth) / 2;
  const offsetY = PADDING + (availH - drawHeight) / 2;

  const path = points
    .map(([lat, lng], i) => {
      const x = offsetX + (lng - minLng) * lngScale * scale;
      const y = offsetY + (maxLat - lat) * scale;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const [startX, startY] = [
    offsetX + (points[0][1] - minLng) * lngScale * scale,
    offsetY + (maxLat - points[0][0]) * scale,
  ];
  const last = points[points.length - 1];
  const [endX, endY] = [
    offsetX + (last[1] - minLng) * lngScale * scale,
    offsetY + (maxLat - last[0]) * scale,
  ];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full rounded-xl border border-border bg-surface-hover"
      role="img"
      aria-label="Route map"
    >
      <path d={path} fill="none" stroke="#3ea86b" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={startX} cy={startY} r={4} fill="#3ea86b" />
      <circle cx={endX} cy={endY} r={4} fill="#e9ede9" stroke="#3ea86b" strokeWidth={1.5} />
    </svg>
  );
}
