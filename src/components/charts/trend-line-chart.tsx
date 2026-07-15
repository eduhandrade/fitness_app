"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type TrendPoint = { x: string; y: number };

export function TrendLineChart({
  data,
  color,
  unit,
  yDomain,
}: {
  data: TrendPoint[];
  color: string;
  unit: string;
  yDomain?: [number | "auto", number | "auto"];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-foreground-muted">
        No data yet.
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            stroke="#232b25"
            strokeDasharray="0"
            vertical={false}
          />
          <XAxis
            dataKey="x"
            stroke="#8a968c"
            tick={{ fill: "#8a968c", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#232b25" }}
            minTickGap={24}
          />
          <YAxis
            stroke="#8a968c"
            tick={{ fill: "#8a968c", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={36}
            domain={yDomain ?? ["auto", "auto"]}
          />
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
            formatter={(value) => [`${value} ${unit}`, undefined]}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 2, stroke: "#121613" }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#121613" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
