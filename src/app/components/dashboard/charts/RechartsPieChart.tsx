/**
 * Recharts Pie Chart Wrapper
 * 
 * Internal component that uses recharts directly.
 * This is dynamically imported with ssr: false to prevent hydration errors.
 * 
 * @module RechartsPieChart
 */

"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PieDatum } from "@/lib/analytics";

type RechartsPieChartProps = {
  data: PieDatum[];
  width?: number;
  height?: number;
};

export default function RechartsPieChart({ data, width = 300, height = 300 }: RechartsPieChartProps) {
  return (
    <ResponsiveContainer width={width} height={height} minWidth={0} minHeight={0}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          stroke="#e5e7eb"
          strokeOpacity={0.5}
          strokeWidth={1}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: unknown) => [String(value), "Vehicles"]}
          contentStyle={{
            background: "rgba(255, 255, 255, 0.95)",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 10px 26px rgba(0, 0, 0, 0.1)",
            color: "#1f2937",
          }}
          labelStyle={{ color: "#6b7280", fontWeight: 600 }}
          itemStyle={{ color: "#1f2937" }}
        />
        <Legend 
          wrapperStyle={{ 
            color: "#6b7280", 
            fontSize: 12, 
            fontWeight: 500,
            paddingTop: "20px"
          }} 
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
