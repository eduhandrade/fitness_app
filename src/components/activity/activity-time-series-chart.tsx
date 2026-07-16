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
import type { TimeSeriesPoint } from "@/lib/activity-streams";

export function ActivityTimeSeriesChart({ data }: { data: TimeSeriesPoint[] }) {
  if (data.length === 0) return null;
  const hasHr = data.some((d) => d.heartrate != null);
  const hasSpeed = data.some((d) => d.speedKmh != null);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#232b25" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="t"
            stroke="#8a968c"
            tick={{ fill: "#8a968c", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#232b25" }}
            tickFormatter={(v) => formatDuration(Number(v))}
            minTickGap={32}
          />
          {hasSpeed && (
            <YAxis
              yAxisId="speed"
              stroke="#3ea86b"
              tick={{ fill: "#8a968c", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
          )}
          {hasHr && (
            <YAxis
              yAxisId="hr"
              orientation="right"
              stroke="#d55181"
              tick={{ fill: "#8a968c", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
          )}
          <Tooltip
            cursor={{ stroke: "#232b25", strokeWidth: 1 }}
            contentStyle={{
              background: "#121613",
              border: "1px solid #232b25",
              borderRadius: 10,
              fontSize: 12,
              color: "#e9ede9",
            }}
            labelStyle={{ color: "#8a968c" }}
            labelFormatter={(v) => formatDuration(Number(v))}
            formatter={(value, name) => {
              if (name === "Speed") return [`${Number(value).toFixed(1)} km/h`, name];
              if (name === "Heart rate") return [`${Math.round(Number(value))} bpm`, name];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#8a968c" }} />
          {hasSpeed && (
            <Line
              yAxisId="speed"
              type="monotone"
              dataKey="speedKmh"
              name="Speed"
              stroke="#3ea86b"
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
              stroke="#d55181"
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
