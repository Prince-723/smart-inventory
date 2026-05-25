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
      <div className="mx-auto flex h-[calc(100vh-120px)] max-w-[2000px] flex-col p-6">
        <div className="grid h-full gap-3 lg:grid-cols-12">
          
          {/* Left Column (Inventory Metrics & Analytics) */}
          <div className="flex flex-col gap-3 lg:col-span-3">
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
          <div className="flex h-full flex-col gap-3 lg:col-span-6">
            <div className="flex-shrink-0">
              <ForecastChart 
                key={`chart-${refreshTrigger}`}
                selectedProduct={selectedProduct} 
              />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <ChatInterface 
                key={`chat-${refreshTrigger}`}
                currentProduct={selectedProduct} 
              />
            </div>
          </div>

          {/* Right Column (Alerts Board) */}
          <div className="flex flex-col gap-3 lg:col-span-3 h-full overflow-hidden">
            <StockAlerts key={`alerts-${refreshTrigger}`} />
          </div>
          
        </div>
      </div>
    </div>
  )
}
