"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StockManager } from "@/components/stock-manager"
import { 
  Package, 
  Search, 
  Plus, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  Trash2, 
  Settings, 
  Sparkles,
  ArrowRight
} from "lucide-react"

interface Product {
  id: number
  name: string
  category: string
  stock_level: number
  reorder_point: number
  price: string
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Fetch all products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products")
        if (res.ok) {
          const data = await res.json()
          setProducts(data)
        }
      } catch (err) {
        console.error("Failed to fetch products", err)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [refreshTrigger])

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  // Search Filter logic
  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase()
    return (
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    )
  })

  // Calculate Metrics
  const totalProducts = products.length
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock_level, 0)
  const totalValuation = products.reduce((sum, p) => sum + (p.stock_level * Number(p.price)), 0)
  const lowStockCount = products.filter(p => p.stock_level < p.reorder_point).length

  // Helper for Status
  const getRiskStatus = (product: Product) => {
    if (product.stock_level < product.reorder_point) {
      return { label: "High Risk", variant: "destructive" as const, color: "text-destructive" }
    } else if (product.stock_level < product.reorder_point * 2) {
      return { label: "Medium Risk", variant: "warning" as const, color: "text-warning" }
    } else {
      return { label: "Optimal", variant: "default" as const, color: "text-primary" }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[2000px] p-6 space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">
              Inventory Catalog
            </h1>
            <p className="text-muted-foreground mt-1">
              Add, update, or remove stock items. Review valuation metrics and reorder risk across your entire catalog.
            </p>
          </div>

          {/* Reusable StockManager pre-opened to "Add Product" */}
          <StockManager products={products} onSuccess={handleSuccess} mode="add">
            <Button className="gap-2 bg-primary hover:bg-primary/90 font-medium">
              <Plus className="h-4 w-4" />
              Add New Product
            </Button>
          </StockManager>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Valuation */}
          <Card className="p-5 border border-border/50 bg-card/40 backdrop-blur-md relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Inventory Value</span>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold text-foreground">
                ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-emerald-500 flex items-center gap-1 mt-1 font-medium">
                <TrendingDown className="h-3 w-3 rotate-180" /> Asset Value
              </span>
            </div>
          </Card>

          {/* Card 2: Stock Units */}
          <Card className="p-5 border border-border/50 bg-card/40 backdrop-blur-md relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Units in Stock</span>
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold text-foreground">{totalStockUnits.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground flex items-center mt-1">
                across {totalProducts} catalog entries
              </span>
            </div>
          </Card>

          {/* Card 3: Stockout Risk */}
          <Card className="p-5 border border-border/50 bg-card/40 backdrop-blur-md relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Low Stock Warnings</span>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold text-foreground">{lowStockCount}</span>
              <span className="text-xs text-amber-500 flex items-center gap-1 mt-1 font-medium">
                Below reorder threshold
              </span>
            </div>
          </Card>

          {/* Card 4: Categories count */}
          <Card className="p-5 border border-border/50 bg-card/40 backdrop-blur-md relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Active Categories</span>
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold text-foreground">
                {new Set(products.map(p => p.category)).size}
              </span>
              <span className="text-xs text-muted-foreground flex items-center mt-1">
                Distinct business groups
              </span>
            </div>
          </Card>
        </div>

        {/* Search and Table Section */}
        <Card className="border border-border/50 bg-card/30 backdrop-blur-md overflow-hidden">
          <div className="p-5 border-b border-border/50 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-border/50"
              />
            </div>
            
            <div className="text-xs text-muted-foreground font-medium">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading products catalog...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No products found matching your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-semibold text-foreground">Product Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Category</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Stock Level</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Price</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Reorder Pt.</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Valuation</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const status = getRiskStatus(product)
                    const val = product.stock_level * Number(product.price)
                    return (
                      <TableRow 
                        key={product.id} 
                        className="hover:bg-muted/10 transition-colors duration-150 group"
                      >
                        {/* Name */}
                        <TableCell className="font-bold text-foreground py-4">
                          {product.name}
                        </TableCell>
                        
                        {/* Category */}
                        <TableCell className="text-muted-foreground">{product.category}</TableCell>
                        
                        {/* Stock Level */}
                        <TableCell className="text-right font-medium text-foreground">
                          {product.stock_level.toLocaleString()}
                        </TableCell>
                        
                        {/* Price */}
                        <TableCell className="text-right text-muted-foreground font-mono">
                          ₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        
                        {/* Reorder Threshold */}
                        <TableCell className="text-right text-muted-foreground">
                          {product.reorder_point}
                        </TableCell>
                        
                        {/* Valuation */}
                        <TableCell className="text-right font-semibold text-foreground font-mono">
                          ₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        
                        {/* Status */}
                        <TableCell className="text-center">
                          <Badge variant={status.variant} className="font-semibold">
                            {status.label}
                          </Badge>
                        </TableCell>
                        
                        {/* Inline Operations Trigger */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Adjust stock modal button */}
                            <StockManager 
                              currentProduct={product} 
                              products={products} 
                              onSuccess={handleSuccess} 
                              mode="adjust"
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                title="Adjust Stock"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </StockManager>
                            
                            {/* Delete modal button */}
                            <StockManager 
                              currentProduct={product} 
                              products={products} 
                              onSuccess={handleSuccess} 
                              mode="remove"
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </StockManager>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
