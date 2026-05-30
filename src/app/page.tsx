"use client"

import { useState } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { InventorySummary } from "@/components/inventory-summary"
import { ForecastInsights } from "@/components/forecast-insights"
import { ForecastChart } from "@/components/forecast-chart"
import { StockAlerts } from "@/components/stock-alerts"
import { ActivityLog } from "@/components/activity-log"

export default function Page() {
  const [selectedProduct, setSelectedProduct] = useState("Bananas")
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleProductsLoaded = (names: string[]) => {
    if (names.length > 0) {
      if (selectedProduct === "Bananas" || !names.includes(selectedProduct)) {
        setSelectedProduct(names[0])
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] h-auto max-w-[2000px] flex-col p-4 md:p-6 pb-12">
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column (Inventory Metrics & Analytics) */}
          <div className="flex flex-col gap-4 lg:col-span-3">
            <InventorySummary 
              key={`summary-${refreshTrigger}`}
              selectedProduct={selectedProduct} 
              onProductChange={setSelectedProduct} 
              onProductsLoaded={handleProductsLoaded}
            />
            <ForecastInsights 
              key={`insights-${refreshTrigger}`}
              selectedProduct={selectedProduct} 
            />
            <ActivityLog 
              key={`log-${refreshTrigger}`}
              selectedProduct={selectedProduct} 
            />
          </div>

          {/* Center Column (Demand Forecast Chart & AI Assistant) */}
          <div className="flex flex-col gap-4 lg:col-span-6">
            <div>
              <ForecastChart 
                key={`chart-${refreshTrigger}`}
                selectedProduct={selectedProduct} 
              />
            </div>
            <div>
              <ChatInterface 
                key={`chat-${refreshTrigger}`}
                currentProduct={selectedProduct} 
              />
            </div>
          </div>

          {/* Right Column (Alerts Board) */}
          <div className="flex flex-col gap-4 lg:col-span-3">
            <StockAlerts key={`alerts-${refreshTrigger}`} />
          </div>
          
        </div>
      </div>
    </div>
  )
}
