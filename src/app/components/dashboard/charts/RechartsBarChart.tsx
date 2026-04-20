/**
 * Recharts Bar Chart Wrapper
 * 
 * Internal component that uses recharts directly.
 * This is dynamically imported with ssr: false to prevent hydration errors.
 * 
 * @module RechartsBarChart
 */

"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BarDatum } from "@/lib/analytics";

type RechartsBarChartProps = {
  data: BarDatum[];
  width?: number;
  height?: number;
};

function shortLabel(label: string, max = 10) {
  const raw = String(label || "");
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1)}…`;
}

export default function RechartsBarChart({ data, width = 300, height = 300 }: RechartsBarChartProps) {
  return (
    <ResponsiveContainer width={width} height={height} minWidth={0} minHeight={0}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 24, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          interval={0}
          tick={{ fontSize: 12, fontWeight: 500, fill: "#6b7280" }}
          stroke="#e5e7eb"
          tickFormatter={(v) => shortLabel(String(v), 10)}
        />
        <YAxis 
          allowDecimals={false} 
          tick={{ fontSize: 12, fontWeight: 500, fill: "#6b7280" }} 
          stroke="#e5e7eb" 
        />
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
        <Bar 
          dataKey="value" 
          fill="#10b981" 
          stroke="#059669" 
          strokeOpacity={0.5} 
          strokeWidth={1} 
          radius={[8, 8, 0, 0]} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
