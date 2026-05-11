"use client"

import { memo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface MemoizedChartProps {
  data: Array<{
    name: string
    value: number
    fill: string
  }>
}

export const MemoizedChart = memo<MemoizedChartProps>(({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 8, right: 12, left: -10, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border) / 0.36)" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted) / 0.1)" }}
          contentStyle={{
            backgroundColor: "hsl(var(--card) / 0.98)",
            border: "1px solid hsl(var(--border) / 0.72)",
            borderRadius: "14px",
            boxShadow: "0 16px 36px rgba(4, 9, 24, 0.22)",
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          itemStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Bar
          dataKey="value"
          radius={[10, 10, 4, 4]}
          maxBarSize={44}
          isAnimationActive
          animationDuration={240}
          animationEasing="ease-out"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
})

MemoizedChart.displayName = "MemoizedChart"
