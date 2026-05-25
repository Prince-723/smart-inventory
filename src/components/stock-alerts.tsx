"use client"

import { AlertTriangle, TrendingDown, Package, Clock, Plus, CheckCircle, Trash2, X, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useToast } from "@/components/ui/use-toast"

interface Product {
  id: number
  name: string
}

export function StockAlerts() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Form Fields
  const [alertType, setAlertType] = useState("")
  const [message, setMessage] = useState("")
  const [severity, setSeverity] = useState("warning")
  const [productId, setProductId] = useState("")

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.map((a: any) => ({
          id: a.id,
          product: a.product_name || a.type, // Fallback to Alert Type/Title if no product linked
          type: a.type,
          message: a.message,
          severity: a.severity,
          isCustom: !a.product_id, // If no product, it's a manager custom alert
          icon: a.severity === 'urgent' ? AlertTriangle : a.severity === 'warning' ? AlertCircle : Package
        })))
      }
    } catch (e) {
      console.error("Failed to fetch alerts", e)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (e) {
      console.error("Failed to fetch products", e)
    }
  }

  useEffect(() => {
    fetchAlerts()
    fetchProducts()
  }, [])

  // Complete / Dismiss Alert handler
  const handleComplete = async (alertId: number, alertName: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast({
          title: "Alert Completed",
          description: `"${alertName}" successfully cleared from board.`,
        })
        fetchAlerts()
      } else {
        throw new Error("Failed to clear alert")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: error.message || "Could not dismiss alert."
      })
    }
  }

  // Create alert handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    if (!alertType.trim() || !message.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter both an alert title and details."
      })
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: alertType.trim(),
          message: message.trim(),
          severity,
          product_id: productId || null
        })
      })

      if (res.ok) {
        toast({
          title: "Alert Added",
          description: "Your custom manager task/alert is now live.",
        })
        setIsOpen(false)
        setAlertType("")
        setMessage("")
        setSeverity("warning")
        setProductId("")
        fetchAlerts()
      } else {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to create alert")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "Failed to create custom alert."
      })
    } finally {
      setSubmitting(false)
    }
  }

  const severityStyles = {
    urgent: "border-red-500/20 bg-red-500/5 hover:bg-red-500/10",
    warning: "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10",
    info: "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10",
  }
  const iconStyles = {
    urgent: "text-red-500",
    warning: "text-amber-500",
    info: "text-blue-500",
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border bg-card p-5 relative">
      
      {/* Header section */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">Manager Alerts</h3>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-wide">
            {alerts.length} Active
          </span>
        </div>
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          variant="outline"
          className="h-7 px-2.5 gap-1 text-[11px] font-bold hover:bg-primary hover:text-primary-foreground border-border/60 transition-all cursor-pointer"
        >
          <Plus className="h-3 w-3" /> Add Alert
        </Button>
      </div>

      {/* Alerts list */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-muted-foreground font-semibold text-center py-6">Loading alerts board...</p>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground/60 select-none">
            <CheckCircle className="h-8 w-8 stroke-[1.2] text-primary/70 mb-2 animate-pulse" />
            <p className="text-sm font-bold text-foreground/90">All Clear</p>
            <p className="text-xs max-w-[160px] mt-1 leading-normal font-semibold">No issues or custom manager tasks active.</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const Icon = alert.icon

            return (
              <div
                key={alert.id}
                className={`rounded-lg border p-3 transition-all duration-300 relative group overflow-hidden ${
                  severityStyles[alert.severity as keyof typeof severityStyles] || severityStyles.info
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex-shrink-0 ${iconStyles[alert.severity as keyof typeof iconStyles]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 pr-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-foreground uppercase tracking-wide">{alert.product}</p>
                      {alert.isCustom && (
                        <span className="text-[9px] bg-primary/10 text-primary font-bold px-1 rounded-sm uppercase tracking-wider scale-[0.9]">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground leading-relaxed">{alert.message}</p>
                  </div>
                </div>

                {/* Satisfying Hover-Complete Trigger Button */}
                <button
                  onClick={() => handleComplete(alert.id, alert.product)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-background/80 text-muted-foreground hover:text-emerald-500 border border-transparent hover:border-emerald-500/20 cursor-pointer shadow-sm"
                  title="Mark Completed / Dismiss Alert"
                >
                  <CheckCircle className="h-4.5 w-4.5" />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Custom Dialog Overlay Portal (Beautiful Glassmorphic Dialog) */}
      {isOpen && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm bg-card border border-border/80 shadow-2xl relative p-5 animate-scaleUp">
            
            {/* Close trigger */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h4 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" /> Create Alert / Duty Notice
            </h4>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Type / Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Alert Type / Title</label>
                <Input
                  placeholder="e.g. Assigned Duty, Shelf Alert..."
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  className="h-8 bg-background/50 text-xs"
                  required
                />
              </div>

              {/* Details Message */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Alert Details</label>
                <textarea
                  placeholder="Describe the operational notice or task..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>

              {/* Severity Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Severity Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['info', 'warning', 'urgent'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSeverity(lvl)}
                      className={`h-7 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                        severity === lvl 
                          ? lvl === 'urgent' 
                            ? 'bg-red-500/25 border-red-500/50 text-red-400' 
                            : lvl === 'warning' 
                              ? 'bg-amber-500/25 border-amber-500/50 text-amber-400' 
                              : 'bg-blue-500/25 border-blue-500/50 text-blue-400'
                          : 'bg-background/20 border-border/50 text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Product Association */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Linked Product (Optional)</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">General Notice (No product link)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground tracking-wide cursor-pointer shadow-md"
              >
                {submitting ? "Publishing Notice..." : "Mount Operational Alert"}
              </Button>
            </form>
          </Card>
        </div>
      )}

    </Card>
  )
}
