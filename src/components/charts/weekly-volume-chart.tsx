"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Sport } from "@/generated/prisma/enums";
import { SPORT_META } from "@/lib/sport-meta";
import { useTheme } from "@/components/theme/theme-provider";
import { CHART_COLORS } from "@/lib/theme-colors";
import type { WeeklyVolumePoint } from "@/lib/aggregate";

const SPORTS_IN_CHART: Sport[] = [Sport.RUN, Sport.RIDE, Sport.SWIM, Sport.STRENGTH];

export function WeeklyVolumeChart({ data }: { data: WeeklyVolumePoint[] }) {
  const { theme } = useTheme();
  const c = CHART_COLORS[theme];

  const hasAnyData = data.some((point) =>
    SPORTS_IN_CHART.some((sport) => point[sport] > 0)
  );

  if (!hasAnyData) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-foreground-muted">
        No training data yet.
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} vertical={false} />
          <XAxis
            dataKey="week"
            stroke={c.axis}
            tick={{ fill: c.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: c.grid }}
            minTickGap={16}
          />
          <YAxis
            stroke={c.axis}
            tick={{ fill: c.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={36}
            label={{
              value: "min",
              angle: -90,
              position: "insideLeft",
              fill: c.axis,
              fontSize: 11,
            }}
          />
          <Tooltip
            cursor={{ fill: c.cursor }}
            contentStyle={{
              background: c.tooltipBg,
              border: `1px solid ${c.tooltipBorder}`,
              borderRadius: 10,
              fontSize: 12,
              color: c.tooltipText,
            }}
            labelStyle={{ color: c.axis }}
            formatter={(value, name) => [
              `${Math.round(Number(value))} min`,
              SPORT_META[name as Sport]?.label ?? String(name),
            ]}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: c.axis, fontSize: 12 }}>
                {SPORT_META[value as Sport]?.label ?? value}
              </span>
            )}
            iconType="circle"
            iconSize={8}
          />
          {SPORTS_IN_CHART.map((sport) => (
            <Bar
              key={sport}
              dataKey={sport}
              name={sport}
              stackId="volume"
              fill={SPORT_META[sport].color}
              radius={[2, 2, 0, 0]}
              maxBarSize={24}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
