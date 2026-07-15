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
import type { WeeklyVolumePoint } from "@/lib/aggregate";

const SPORTS_IN_CHART: Sport[] = [Sport.RUN, Sport.RIDE, Sport.SWIM, Sport.STRENGTH];

export function WeeklyVolumeChart({ data }: { data: WeeklyVolumePoint[] }) {
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
          <CartesianGrid stroke="#232b25" vertical={false} />
          <XAxis
            dataKey="week"
            stroke="#8a968c"
            tick={{ fill: "#8a968c", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#232b25" }}
            minTickGap={16}
          />
          <YAxis
            stroke="#8a968c"
            tick={{ fill: "#8a968c", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={36}
            label={{
              value: "min",
              angle: -90,
              position: "insideLeft",
              fill: "#8a968c",
              fontSize: 11,
            }}
          />
          <Tooltip
            cursor={{ fill: "#182019" }}
            contentStyle={{
              background: "#121613",
              border: "1px solid #232b25",
              borderRadius: 10,
              fontSize: 12,
              color: "#e9ede9",
            }}
            labelStyle={{ color: "#8a968c" }}
            formatter={(value, name) => [
              `${Math.round(Number(value))} min`,
              SPORT_META[name as Sport]?.label ?? String(name),
            ]}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: "#8a968c", fontSize: 12 }}>
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
