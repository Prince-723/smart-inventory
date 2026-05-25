"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, TrendingDown, AlertTriangle, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"
import { StockManager } from "./stock-manager"

interface InventorySummaryProps {
  selectedProduct: string
  onProductChange: (product: string) => void
  onProductsLoaded?: (productNames: string[]) => void
}

interface Product {
  id: number
  name: string
  stock_level: number
  reorder_point: number
  price: string
  risk?: "Low" | "Medium" | "High"
}

export function InventorySummary({ selectedProduct, onProductChange, onProductsLoaded }: InventorySummaryProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products')
        if (res.ok) {
          const data = await res.json()
          // Enrich data with risk level logic
          const enrichedData = data.map((p: Product) => ({
            ...p,
            stock: p.stock_level, // Map stock_level to stock for UI compatibility if needed
            change: "0 units, today", // Placeholder as API doesn't have daily change yet
            risk: p.stock_level < p.reorder_point ? "High" : p.stock_level < p.reorder_point * 2 ? "Medium" : "Low"
          }))
          setProducts(enrichedData)
          
          if (onProductsLoaded) {
            onProductsLoaded(enrichedData.map((p: Product) => p.name))
          }
        }
      } catch (error) {
        console.error("Failed to fetch products", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [refreshTrigger])

  const handleSuccess = (newProductName?: string) => {
    setRefreshTrigger(prev => prev + 1)
    if (newProductName) {
      onProductChange(newProductName)
    }
  }

  const inventory = products.find((p) => p.name === selectedProduct) || products[0]

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "High":
        return "destructive"
      case "Medium":
        return "warning"
      default:
        return "default"
    }
  }

  const getRiskIcon = (risk: string) => {
    return risk === "High" || risk === "Medium" ? AlertTriangle : Package
  }

  if (loading) {
    return <Card className="p-6 bg-card border-border">Loading inventory...</Card>
  }

  if (!inventory) {
    return (
      <Card className="p-6 bg-card border-border flex flex-col items-center justify-center text-center min-h-[300px] relative overflow-hidden">
        <div className="rounded-2xl bg-primary/10 p-4 mb-4 border border-primary/20">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-base font-bold text-foreground">Empty Catalog Slate</h3>
        <p className="text-xs text-muted-foreground max-w-[200px] mt-1 mb-4 leading-relaxed font-semibold">
          Your inventory block is clean. Add items to initialize analytics.
        </p>
        <StockManager 
          currentProduct={undefined} 
          onSuccess={handleSuccess} 
          products={[]} 
        />
      </Card>
    )
  }

  const RiskIcon = getRiskIcon(inventory.risk || "Low")

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-sm font-medium text-muted-foreground">Current Inventory</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="mt-1 h-auto p-0 text-2xl font-semibold text-foreground hover:bg-transparent hover:text-primary"
              >
                {inventory.name}
                <ChevronDown className="ml-2 h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {products.map((product) => (
                <DropdownMenuItem
                  key={product.id}
                  onClick={() => onProductChange(product.name)}
                  className={selectedProduct === product.name ? "bg-accent" : ""}
                >
                  <Package className="mr-2 h-4 w-4" />
                  {product.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="rounded-lg bg-primary/10 p-2">
          <Package className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Stock Level</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{inventory.stock_level.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">units available</p>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3">
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">No recent changes</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Stockout Risk</span>
          <Badge variant={getRiskColor(inventory.risk || "Low")} className="gap-1.5">
            <RiskIcon className="h-3 w-3" />
            {inventory.risk}
          </Badge>
        </div>

        <StockManager 
          currentProduct={inventory} 
          onSuccess={handleSuccess} 
          products={products} 
        />
      </div>
    </Card>
  )
}
