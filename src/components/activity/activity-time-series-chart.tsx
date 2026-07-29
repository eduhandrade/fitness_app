"use client";

import {
  Line,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatDuration } from "@/lib/format";
import { useTheme } from "@/components/theme/theme-provider";
import { CHART_COLORS } from "@/lib/theme-colors";
import type { TimeSeriesPoint } from "@/lib/activity-streams";

const HEART_RATE_COLOR = "#d55181";

export function ActivityTimeSeriesChart({ data }: { data: TimeSeriesPoint[] }) {
  const { theme } = useTheme();
  const c = CHART_COLORS[theme];

  if (data.length === 0) return null;
  const hasHr = data.some((d) => d.heartrate != null);
  const hasWatts = data.some((d) => d.watts != null);
  // Power is the more meaningful primary line for a trainer ride; only
  // fall back to speed when there's no power data, to avoid cramming a
  // third line onto a phone-width chart (cadence, when present, stays in
  // the stat tiles instead).
  const hasSpeed = !hasWatts && data.some((d) => d.speedKmh != null);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="t"
            stroke={c.axis}
            tick={{ fill: c.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: c.grid }}
            tickFormatter={(v) => formatDuration(Number(v))}
            minTickGap={32}
          />
          {(hasWatts || hasSpeed) && (
            <YAxis
              yAxisId="primary"
              stroke={c.primary}
              tick={{ fill: c.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
          )}
          {hasHr && (
            <YAxis
              yAxisId="hr"
              orientation="right"
              stroke={HEART_RATE_COLOR}
              tick={{ fill: c.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
          )}
          <Tooltip
            cursor={{ stroke: c.grid, strokeWidth: 1 }}
            contentStyle={{
              background: c.tooltipBg,
              border: `1px solid ${c.tooltipBorder}`,
              borderRadius: 10,
              fontSize: 12,
              color: c.tooltipText,
            }}
            labelStyle={{ color: c.axis }}
            labelFormatter={(v) => formatDuration(Number(v))}
            formatter={(value, name) => {
              if (name === "Power") return [`${Math.round(Number(value))} W`, name];
              if (name === "Speed") return [`${Number(value).toFixed(1)} km/h`, name];
              if (name === "Heart rate") return [`${Math.round(Number(value))} bpm`, name];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: c.axis }} />
          {hasWatts && (
            <Line
              yAxisId="primary"
              type="monotone"
              dataKey="watts"
              name="Power"
              stroke={c.primary}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
          {hasSpeed && (
            <Line
              yAxisId="primary"
              type="monotone"
              dataKey="speedKmh"
              name="Speed"
              stroke={c.primary}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
          {hasHr && (
            <Line
              yAxisId="hr"
              type="monotone"
              dataKey="heartrate"
              name="Heart rate"
              stroke={HEART_RATE_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
