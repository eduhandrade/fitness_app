"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/components/theme/theme-provider";
import { CHART_COLORS } from "@/lib/theme-colors";

export type DualTrendPoint = { x: string; actual: number | null; planned: number };

const SERIES_LABEL: Record<"actual" | "planned", string> = {
  actual: "Actual",
  planned: "Planned",
};

export function WeightGoalChart({
  data,
  unit,
  yDomain,
}: {
  data: DualTrendPoint[];
  unit: string;
  yDomain?: [number | "auto", number | "auto"];
}) {
  const { theme } = useTheme();
  const c = CHART_COLORS[theme];

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
          <CartesianGrid stroke={c.grid} strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="x"
            stroke={c.axis}
            tick={{ fill: c.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: c.grid }}
            minTickGap={24}
          />
          <YAxis
            stroke={c.axis}
            tick={{ fill: c.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={36}
            domain={yDomain ?? ["auto", "auto"]}
          />
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
            formatter={(value, name) => [
              value == null ? "—" : `${value} ${unit}`,
              SERIES_LABEL[name as "actual" | "planned"] ?? String(name),
            ]}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: c.axis, fontSize: 12 }}>
                {SERIES_LABEL[value as "actual" | "planned"] ?? value}
              </span>
            )}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="planned"
            name="planned"
            stroke={c.axis}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="actual"
            stroke={c.primary}
            strokeWidth={2}
            connectNulls
            dot={{ r: 3, fill: c.primary, strokeWidth: 2, stroke: c.tooltipBg }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: c.tooltipBg }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
