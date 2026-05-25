"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, Calendar, Target, AlertCircle, Package } from "lucide-react"
import { useEffect, useState } from "react"

interface ForecastInsightsProps {
  selectedProduct: string
}

export function ForecastInsights({ selectedProduct }: ForecastInsightsProps) {
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch('/api/insights')
        if (res.ok) {
          const data = await res.json()
          setInsights(data)
        }
      } catch (e) {
        console.error("Failed to fetch insights", e)
      } finally {
        setLoading(false)
      }
    }
    fetchInsights()
  }, [])

  const forecast = insights ? (insights[selectedProduct] || Object.values(insights)[0]) : null

  const getRiskMessage = (risk: string) => {
    switch (risk) {
      case "High":
        return "High Risk - Reorder recommended"
      case "Medium":
        return "Medium Risk - Monitor closely"
      default:
        return "Low Risk - Stock levels adequate"
    }
  }

  if (loading) {
    return <Card className="p-6 bg-card border-border">Loading insights...</Card>
  }

  if (!forecast) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Forecast Insights</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed font-semibold text-center py-6">
          No insights available. Add products to trigger forecasting models.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-primary/10 p-2">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Forecast Insights</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Period</span>
          </div>
          <span className="text-sm font-medium text-foreground">{forecast.period}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Expected Demand</span>
          </div>
          <span className="text-sm font-medium text-foreground">{forecast.expectedDemand}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Peak Date</span>
          </div>
          <span className="text-sm font-medium text-foreground">{forecast.peakDate}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Stock Coverage</span>
          </div>
          <span className="text-sm font-medium text-foreground">{forecast.stockCoverage}</span>
        </div>

        <div
          className={`mt-4 rounded-md border p-3 ${forecast.riskColor === "emerald"
              ? "border-emerald-500/30 bg-emerald-500/10"
              : forecast.riskColor === "amber"
                ? "border-amber-500/30 bg-amber-500/10"
                : "border-red-500/30 bg-red-500/10"
            }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle
              className={`h-4 w-4 ${forecast.riskColor === "emerald"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : forecast.riskColor === "amber"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400"
                }`}
            />
            <span
              className={`text-sm font-medium ${forecast.riskColor === "emerald"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : forecast.riskColor === "amber"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400"
                }`}
            >
              {getRiskMessage(forecast.risk)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
