"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowDownRight, ArrowUpRight, Package, TrendingUp, Inbox } from "lucide-react"
import { useEffect, useState } from "react"

interface ActivityLogProps {
  selectedProduct: string
}

export function ActivityLog({ selectedProduct }: ActivityLogProps) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const res = await fetch('/api/transactions')
        if (res.ok) {
          const data = await res.json()
          setActivities(data.map((t: any) => ({
            date: new Date(t.timestamp).toLocaleDateString(),
            type: t.type === 'INBOUND' ? 'reorder' : 'sale',
            amount: t.quantity,
            description: t.description || (t.type === 'INBOUND' ? 'Restock' : 'Sale'),
            productName: t.product_name
          })))
        }
      } catch (e) {
        console.error("Failed to fetch transactions", e)
      } finally {
        setLoading(false)
      }
    }
    fetchTransactions()
  }, [selectedProduct])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "sale":
        return <ArrowDownRight className="h-4 w-4 text-red-500" />
      case "reorder":
        return <ArrowUpRight className="h-4 w-4 text-emerald-500" />
      case "adjustment":
        return <Package className="h-4 w-4 text-amber-500" />
      case "forecast":
        return <TrendingUp className="h-4 w-4 text-blue-500" />
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "sale":
        return "text-red-500"
      case "reorder":
        return "text-emerald-500"
      case "adjustment":
        return "text-amber-500"
      case "forecast":
        return "text-blue-500"
      default:
        return "text-muted-foreground"
    }
  }

  const filteredActivities = activities.filter(a => a.productName === selectedProduct)

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Activity Log</h2>
        <p className="text-xs text-muted-foreground">Recent transactions for {selectedProduct}</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-3">
          {loading ? (
            <p className="text-xs text-muted-foreground font-semibold text-center py-6">Loading activity log...</p>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground/60 select-none">
              <Inbox className="h-6 w-6 stroke-[1.5] mb-2" />
              <p className="text-xs font-semibold">No recent activity</p>
            </div>
          ) : (
            filteredActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-md border border-border/50 bg-background/50 p-3 transition-colors hover:bg-accent/50"
              >
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-background">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{activity.description}</p>
                    {activity.amount > 0 && (
                      <span className={`text-sm font-semibold ${getActivityColor(activity.type)}`}>
                        {(activity.type === "reorder" || (activity.type === "adjustment" && activity.amount > 0)) ? "+" : ""}
                        {activity.amount !== 0 && activity.amount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.date}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
