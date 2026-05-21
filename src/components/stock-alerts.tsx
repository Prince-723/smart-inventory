"use client"

import { AlertTriangle, TrendingDown, Package, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useEffect, useState } from "react"

export function StockAlerts() {
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/alerts')
        if (res.ok) {
          const data = await res.json()
          setAlerts(data.map((a: any) => ({
            id: a.id,
            product: a.product_name, // Should add this to seeded data
            type: a.type,
            message: a.message,
            currentStock: 0, // Need to join with products potentially, or omit
            severity: a.severity,
            icon: a.severity === 'urgent' ? AlertTriangle : Package // Simplistic icon mapping
          })))
        }
      } catch (e) {
        console.error("Failed to fetch alerts", e)
      }
    }
    fetchAlerts()
  }, [])

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Stock Alerts</h3>
        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
          {alerts.length} Active
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {alerts.map((alert) => {
          const Icon = alert.icon
          const severityStyles = {
            urgent: "border-red-500/20 bg-red-500/5",
            warning: "border-amber-500/20 bg-amber-500/5",
            info: "border-blue-500/20 bg-blue-500/5",
          }
          const iconStyles = {
            urgent: "text-red-500",
            warning: "text-amber-500",
            info: "text-blue-500",
          }

          return (
            <div
              key={alert.id}
              className={`rounded-lg border p-3 transition-colors hover:bg-accent/50 ${severityStyles[alert.severity as keyof typeof severityStyles]
                }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 ${iconStyles[alert.severity as keyof typeof iconStyles]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{alert.product}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{alert.message}</p>
                  {alert.threshold && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Current:</span>
                      <span className="font-medium text-foreground">{alert.currentStock}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">Target:</span>
                      <span className="font-medium text-foreground">{alert.threshold}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button className="mt-4 w-full rounded-lg border border-border bg-background/50 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        View All Alerts
      </button>
    </Card>
  )
}
