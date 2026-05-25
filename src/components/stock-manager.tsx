"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Minus, Trash2, Settings, AlertTriangle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Product {
  id: number
  name: string
  stock_level: number
  reorder_point: number
  price: string
}

interface StockManagerProps {
  currentProduct?: Product
  onSuccess: (newProductName?: string) => void
  products: Product[]
  mode?: "adjust" | "add" | "remove"
  children?: React.ReactNode
}

export function StockManager({ currentProduct, onSuccess, products, mode = "adjust", children }: StockManagerProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>(mode)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Reset tab active state whenever modal opens or mode changes
  useEffect(() => {
    if (open) {
      setActiveTab(mode || (currentProduct ? "adjust" : "add"))
    }
  }, [open, mode, currentProduct])

  // Adjust Stock Form State
  const [adjustType, setAdjustType] = useState<"INBOUND" | "OUTBOUND">("INBOUND")
  const [adjustQty, setAdjustQty] = useState("")
  const [adjustDesc, setAdjustDesc] = useState("")

  // Add Product Form State
  const [addName, setAddName] = useState("")
  const [addCategory, setAddCategory] = useState("")
  const [addPrice, setAddPrice] = useState("")
  const [addReorderPoint, setAddReorderPoint] = useState("50")
  const [addInitialStock, setAddInitialStock] = useState("0")

  // Reset forms
  const resetAdjustForm = () => {
    setAdjustQty("")
    setAdjustDesc("")
    setAdjustType("INBOUND")
  }

  const resetAddForm = () => {
    setAddName("")
    setAddCategory("")
    setAddPrice("")
    setAddReorderPoint("50")
    setAddInitialStock("0")
  }

  // Adjust Stock Submit
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProduct) return

    if (!adjustQty || isNaN(Number(adjustQty)) || Number(adjustQty) <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a positive number.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: currentProduct.id,
          type: adjustType,
          quantity: Number(adjustQty),
          description: adjustDesc || (adjustType === "INBOUND" ? "Supplier Restock" : "Manual Adjustment"),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update stock")

      toast({
        title: "Stock Updated Successfully",
        description: `Successfully logged transaction and updated stock level for ${currentProduct.name}.`,
      })
      resetAdjustForm()
      setOpen(false)
      onSuccess(currentProduct.name) // Trigger dashboard refetch
    } catch (err: any) {
      toast({
        title: "Stock Update Failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Add Product Submit
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addName.trim() || !addCategory.trim() || !addPrice || !addReorderPoint) {
      toast({
        title: "Missing Fields",
        description: "Please fill out all required fields.",
        variant: "destructive",
      })
      return
    }

    const priceNum = Number(addPrice)
    const reorderNum = Number(addReorderPoint)
    const stockNum = Number(addInitialStock || 0)

    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: "Invalid Price",
        description: "Price must be a positive number.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          category: addCategory.trim(),
          price: priceNum,
          reorder_point: reorderNum,
          initial_stock: stockNum,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create product")

      toast({
        title: "Product Created",
        description: `Successfully added "${addName}" to your inventory.`,
      })
      resetAddForm()
      setOpen(false)
      onSuccess(data.product.name) // Trigger dashboard refetch
    } catch (err: any) {
      toast({
        title: "Creation Failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Remove Product Submit
  const handleRemoveProduct = async () => {
    if (!currentProduct) return

    setLoading(true)
    try {
      const res = await fetch(`/api/products/${currentProduct.id}`, {
        method: "DELETE",
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete product")

      toast({
        title: "Product Removed",
        description: `Successfully removed "${currentProduct.name}" from your catalog.`,
      })
      
      setOpen(false)
      
      // Determine what product to switch to (anything that is NOT deleted)
      const nextProduct = products.find(p => p.id !== currentProduct.id)
      onSuccess(nextProduct ? nextProduct.name : undefined) // Trigger dashboard refetch
    } catch (err: any) {
      toast({
        title: "Deletion Failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full gap-2 border-primary/20 hover:border-primary hover:bg-primary/10 mt-4">
            <Settings className="h-4 w-4" />
            Manage Stock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Inventory Control Center</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2 w-full">
          {currentProduct ? (
            <TabsList className="grid w-full grid-cols-3 bg-muted">
              <TabsTrigger value="adjust">Adjust Stock</TabsTrigger>
              <TabsTrigger value="add">New Product</TabsTrigger>
              <TabsTrigger value="remove" className="text-destructive data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">Remove</TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="grid w-full grid-cols-1 bg-muted">
              <TabsTrigger value="add">New Product</TabsTrigger>
            </TabsList>
          )}

          {/* Adjust Stock */}
          {currentProduct && (
            <TabsContent value="adjust" className="space-y-4 pt-4">
              <form onSubmit={handleAdjustStock} className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Adjusting Stock for:</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{currentProduct.name} <span className="text-xs font-normal text-muted-foreground">({currentProduct.stock_level} units currently in stock)</span></p>
                </div>

                <div className="space-y-2">
                  <Label>Operation Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={adjustType === "INBOUND" ? "default" : "outline"}
                      className="gap-2"
                      onClick={() => setAdjustType("INBOUND")}
                    >
                      <Plus className="h-4 w-4" /> Add Stock
                    </Button>
                    <Button
                      type="button"
                      variant={adjustType === "OUTBOUND" ? "destructive" : "outline"}
                      className="gap-2"
                      onClick={() => setAdjustType("OUTBOUND")}
                    >
                      <Minus className="h-4 w-4" /> Deduct Stock
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjust-qty">Quantity</Label>
                  <Input
                    id="adjust-qty"
                    type="number"
                    placeholder="e.g. 50"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    min="1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjust-desc">Reason / Description</Label>
                  <Input
                    id="adjust-desc"
                    type="text"
                    placeholder="e.g. Supplier Shipment, Spillage correction"
                    value={adjustDesc}
                    onChange={(e) => setAdjustDesc(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full gap-2 mt-2" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : adjustType === "INBOUND" ? (
                    <Plus className="h-4 w-4" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                  {adjustType === "INBOUND" ? "Confirm Restock" : "Confirm Deduction"}
                </Button>
              </form>
            </TabsContent>
          )}

          {/* Add Product */}
          <TabsContent value="add" className="space-y-4 pt-4">
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Product Name *</Label>
                <Input
                  id="add-name"
                  type="text"
                  placeholder="e.g. Blueberries"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-category">Category *</Label>
                <Input
                  id="add-category"
                  type="text"
                  placeholder="e.g. Produce, Dairy, Bakery"
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-price">Price (₹) *</Label>
                  <Input
                    id="add-price"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 299.00"
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                    required
                  />
                </div>


                <div className="space-y-2">
                  <Label htmlFor="add-reorder">Reorder Threshold *</Label>
                  <Input
                    id="add-reorder"
                    type="number"
                    placeholder="e.g. 50"
                    value={addReorderPoint}
                    onChange={(e) => setAddReorderPoint(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-initial">Initial Stock Level</Label>
                <Input
                  id="add-initial"
                  type="number"
                  placeholder="e.g. 100"
                  value={addInitialStock}
                  onChange={(e) => setAddInitialStock(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full gap-2 mt-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Product to Catalog
              </Button>
            </form>
          </TabsContent>

          {/* Remove Product */}
          {currentProduct && (
            <TabsContent value="remove" className="space-y-4 pt-4">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
                <AlertTriangle className="h-10 w-10 text-destructive mx-auto animate-bounce mb-3" />
                <h3 className="text-lg font-bold text-destructive">Irreversible Action</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  You are about to delete **{currentProduct.name}** and all its historical records (sales history, predictive forecasts, and stock alerts) forever.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={handleRemoveProduct}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Yes, Delete {currentProduct.name}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancel & Go Back
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
