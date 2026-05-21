"use client"

import { useState } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { InventorySummary } from "@/components/inventory-summary"
import { ForecastInsights } from "@/components/forecast-insights"
import { ForecastChart } from "@/components/forecast-chart"
import { StockAlerts } from "@/components/stock-alerts"
import { Package } from "lucide-react"
import { ActivityLog } from "@/components/activity-log"

export default function Page() {
  const [selectedProduct, setSelectedProduct] = useState("Bananas")

  return (
    <div className="min-h-screen bg-background">

      {/* Main Content */}
      <div className="mx-auto flex h-[calc(100vh-120px)] max-w-[2000px] flex-col p-6">
        <div className="grid h-full gap-3 lg:grid-cols-12">
          {/* Left Column */}
          <div className="flex flex-col gap-3 lg:col-span-3">
            <InventorySummary selectedProduct={selectedProduct} onProductChange={setSelectedProduct} />
            <ForecastInsights selectedProduct={selectedProduct} />
            <ActivityLog selectedProduct={selectedProduct} />
          </div>

          {/* Center Column */}
          <div className="flex h-full flex-col gap-3 lg:col-span-6">
            <div className="flex-shrink-0">
              <ForecastChart selectedProduct={selectedProduct} />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ChatInterface currentProduct={selectedProduct} />
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-3">
            <StockAlerts />
          </div>
        </div>
      </div>
    </div>
  )
}
