"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, ReferenceLine } from "recharts"
import { useEffect, useState } from "react"

interface ForecastChartProps {
  selectedProduct: string
}

export function ForecastChart({ selectedProduct }: ForecastChartProps) {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const [forecastRes, historyRes] = await Promise.all([
          fetch(`/api/forecasts?product=${encodeURIComponent(selectedProduct)}`),
          fetch(`/api/history?product=${encodeURIComponent(selectedProduct)}`)
        ])

        if (forecastRes.ok && historyRes.ok) {
          const forecasts = await forecastRes.json()
          const history = await historyRes.json()

          // Helper: Format date to YYYY-MM-DD for consistent keys
          const formatDate = (date: Date) => date.toISOString().split('T')[0]

          // Map to merge data
          const dataMap = new Map()

          // 1. Process History (All)
          history.forEach((h: any) => {
            const d = new Date(h.date)
            const dateStr = formatDate(d)

            dataMap.set(dateStr, {
              date: dateStr,
              historical: Number(h.total_sales),
              forecast: null,
              lower: null,
              upper: null
            })
          })

          // 2. Process Forecast (All)
          forecasts.forEach((f: any) => {
            const d = new Date(f.date)
            const dateStr = formatDate(d)

            const existing = dataMap.get(dateStr) || { date: dateStr, historical: null }

            dataMap.set(dateStr, {
              ...existing,
              forecast: Number(f.predicted_demand),
              lower: Number(f.lower_bound),
              upper: Number(f.upper_bound)
            })
          })

          // 3. Convert to array and sort
          const mergedData = Array.from(dataMap.values()).sort((a: any, b: any) =>
            a.date.localeCompare(b.date)
          )

          setData(mergedData)
        }
      } catch (e) {
        console.error("Failed to fetch chart data", e)
      }
    }
    fetchData()
  }, [selectedProduct])

  // Current Date String for Reference Line
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Demand Forecast</h2>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-cyan-500" />
            <span className="text-muted-foreground">Historical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Forecast</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-8 rounded-sm bg-violet-500/20" />
            <span className="text-muted-foreground">Confidence</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data.length > 0 ? data : []}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-cyan-500/30" />
          <XAxis
            dataKey="date"
            className="text-xs text-cyan-500"
            tick={{ fill: "#06b6d4", fontSize: 12 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            minTickGap={30}
          />
          <YAxis className="text-xs text-cyan-500" tick={{ fill: "#06b6d4", fontSize: 12 }} />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--foreground))",
            }}
          />
          <Area
            type="monotone"
            dataKey="upper"
            stackId="1"
            stroke="none"
            fill="#8b5cf6"
            fillOpacity={0.2}
          />
          <Area
            type="monotone"
            dataKey="lower"
            stackId="1"
            stroke="none"
            fill="hsl(var(--background))"
            fillOpacity={1}
          />
          <Line
            type="monotone"
            dataKey="historical"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={false}
            connectNulls={true}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            connectNulls={true}
          />
          <ReferenceLine
            x={todayStr}
            stroke="hsl(var(--foreground))"
            strokeDasharray="3 3"
            label={{ position: 'top', value: 'Today', fill: 'hsl(var(--foreground))', fontSize: 12 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  )
}
