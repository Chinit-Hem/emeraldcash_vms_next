/**
 * Recharts Area Chart Wrapper
 * 
 * Internal component that uses recharts directly.
 * This is dynamically imported with ssr: false to prevent hydration errors.
 * 
 * @module RechartsAreaChart
 */

"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BarDatum } from "@/lib/analytics";

type RechartsAreaChartProps = {
  data: BarDatum[];
  width?: number;
  height?: number;
};

export default function RechartsAreaChart({ data, width = 300, height = 300 }: RechartsAreaChartProps) {
  return (
    <ResponsiveContainer width={width} height={height} minWidth={0} minHeight={0}>
      <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 24, left: 10 }}>
        <defs>
          <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fontWeight: 500, fill: "#6b7280" }}
          stroke="#e5e7eb"
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
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke="#10b981" 
          fillOpacity={1} 
          fill="url(#colorVehicles)" 
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
