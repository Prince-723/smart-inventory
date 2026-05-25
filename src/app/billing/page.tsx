"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ReceiptModal, Receipt, ReceiptItem } from "@/components/receipt-modal"
import { 
  Receipt as ReceiptIcon, 
  Plus, 
  Trash2, 
  CreditCard, 
  History, 
  Search, 
  ShoppingCart, 
  AlertCircle,
  Clock
} from "lucide-react"

interface Product {
  id: number
  name: string
  category: string
  stock_level: number
  reorder_point: number
  price: string
}

interface CartItem {
  product: Product
  quantity: number
}

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  
  // Cart Builder State
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [quantityInput, setQuantityInput] = useState<number>(1)
  
  // Checkout & Receipt Modal State
  const [checkoutReceipt, setCheckoutReceipt] = useState<Receipt | null>(null)
  const [submittingCheckout, setSubmittingCheckout] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Search Filters
  const [historySearch, setHistorySearch] = useState("")

  // Format currency in Indian Rupees with Lakh commas
  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Fetch products and billing history
  const fetchData = async () => {
    try {
      setLoadingProducts(true)
      const prodRes = await fetch("/api/products")
      if (prodRes.ok) {
        const prodData = await prodRes.json()
        setProducts(prodData)
        if (prodData.length > 0) {
          setSelectedProductId(prodData[0].id.toString())
        }
      }
    } catch (err) {
      console.error("Failed to load products:", err)
    } finally {
      setLoadingProducts(false)
    }

    try {
      setLoadingHistory(true)
      const billingRes = await fetch("/api/billing")
      if (billingRes.ok) {
        const billingData = await billingRes.json()
        setReceipts(billingData)
      }
    } catch (err) {
      console.error("Failed to load billing history:", err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddToCart = () => {
    if (!selectedProductId) return
    const prod = products.find(p => p.id.toString() === selectedProductId)
    if (!prod) return

    if (quantityInput <= 0) {
      setErrorMessage("Quantity must be greater than zero")
      return
    }

    // Check stock level limit
    const existingCartItem = cart.find(item => item.product.id === prod.id)
    const existingQty = existingCartItem ? existingCartItem.quantity : 0
    const totalRequestedQty = existingQty + quantityInput

    if (prod.stock_level < totalRequestedQty) {
      setErrorMessage(`Insufficient stock for "${prod.name}" (Requested: ${totalRequestedQty}, Available: ${prod.stock_level})`)
      return
    }

    setErrorMessage(null)

    if (existingCartItem) {
      setCart(cart.map(item => 
        item.product.id === prod.id 
          ? { ...item, quantity: totalRequestedQty } 
          : item
      ))
    } else {
      setCart([...cart, { product: prod, quantity: quantityInput }])
    }

    setQuantityInput(1)
  }

  const handleRemoveFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId))
  }

  const handleClearCart = () => {
    setCart([])
    setErrorMessage(null)
  }

  // Calculate pricing
  const subtotalNet = cart.reduce((acc, item) => acc + (Number(item.product.price) * item.quantity), 0)
  const gstNet = subtotalNet * 0.18
  const grandTotalNet = subtotalNet + gstNet

  const handleCheckout = async () => {
    if (cart.length === 0) return
    
    try {
      setSubmittingCheckout(true)
      setErrorMessage(null)
      
      const payload = {
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        }))
      }

      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Checkout transaction failed")
      }

      // Open printable receipt modal
      setCheckoutReceipt(data.receipt)
      
      // Clean Cart & refresh data (syncs stock levels)
      handleClearCart()
      await fetchData()
      
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during checkout")
    } finally {
      setSubmittingCheckout(false)
    }
  }

  // Filtered receipts list
  const filteredReceipts = receipts.filter(r => 
    r.receipt_number.toLowerCase().includes(historySearch.toLowerCase())
  )

  const selectedProduct = products.find(p => p.id.toString() === selectedProductId)

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background p-6">
      <div className="mx-auto max-w-[2000px] flex flex-col gap-6">
        
        {/* Header Title */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <ReceiptIcon className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent uppercase">
              Smart POS Billing System
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-semibold">
            Build customer baskets, process transactions in real-time, and generate tax receipts.
          </p>
        </div>

        {/* Dynamic Warning Alert Banner */}
        {errorMessage && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">Operational Alert:</span> {errorMessage}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDE: Cart Builder (Invoice Creator) - 7 cols */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <Card className="p-6 border-border flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Sale Basket Builder</h2>
                </div>
                <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
                  {cart.length} item(s) in cart
                </Badge>
              </div>

              {/* Basket Add Controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-muted/20 border border-border/40 p-4 rounded-xl">
                {/* Select Product */}
                <div className="md:col-span-6 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Select Product</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={loadingProducts}
                  >
                    {loadingProducts ? (
                      <option>Loading Products...</option>
                    ) : products.length === 0 ? (
                      <option>No Products Available</option>
                    ) : (
                      products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - ({formatRupees(Number(p.price))})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Enter Quantity */}
                <div className="md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Add Action Trigger */}
                <div className="md:col-span-3">
                  <Button 
                    onClick={handleAddToCart}
                    disabled={products.length === 0}
                    className="w-full gap-1.5 cursor-pointer bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Real-time Selected Product Stock Info */}
              {selectedProduct && (
                <div className="flex justify-between items-center bg-muted/40 border border-border/40 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground">
                  <span>
                    Category: <span className="text-foreground font-bold">{selectedProduct.category}</span>
                  </span>
                  <span>
                    Available Stock:{" "}
                    <span className={`font-black ${selectedProduct.stock_level <= selectedProduct.reorder_point ? "text-destructive" : "text-emerald-500"}`}>
                      {selectedProduct.stock_level} units
                    </span>
                  </span>
                </div>
              )}

              {/* Cart Table List */}
              <div className="border border-border/40 rounded-xl overflow-hidden min-h-[220px]">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold">
                      <th className="p-3">Product description</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Subtotal</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-muted-foreground font-medium">
                          Basket is empty. Select a product and add quantity to start building a receipt!
                        </td>
                      </tr>
                    ) : (
                      cart.map((item) => (
                        <tr key={item.product.id} className="border-b border-border/30 hover:bg-muted/10">
                          <td className="p-3 font-semibold text-foreground">{item.product.name}</td>
                          <td className="p-3 text-right font-bold text-foreground">{item.quantity}</td>
                          <td className="p-3 text-right font-semibold text-muted-foreground">{formatRupees(Number(item.product.price))}</td>
                          <td className="p-3 text-right font-bold text-primary">{formatRupees(Number(item.product.price) * item.quantity)}</td>
                          <td className="p-3 text-center">
                            <Button
                              onClick={() => handleRemoveFromCart(item.product.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Checkout Calculations Details */}
              {cart.length > 0 && (
                <div className="flex flex-col gap-4 border-t border-border/40 pt-6 mt-4">
                  <div className="flex flex-col gap-2 items-end text-xs">
                    <div className="flex justify-between w-64 text-muted-foreground">
                      <span>Subtotal (Net)</span>
                      <span className="font-semibold">{formatRupees(subtotalNet)}</span>
                    </div>
                    <div className="flex justify-between w-64 text-muted-foreground">
                      <span>Tax (GST 18%)</span>
                      <span className="font-semibold">{formatRupees(gstNet)}</span>
                    </div>
                    <div className="flex justify-between w-64 text-sm font-bold text-foreground pt-2 border-t border-border/40 mt-1">
                      <span>Grand Total</span>
                      <span className="text-primary font-black text-base">{formatRupees(grandTotalNet)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end mt-2">
                    <Button 
                      onClick={handleClearCart}
                      variant="outline"
                      className="cursor-pointer"
                    >
                      Clear Basket
                    </Button>
                    <Button 
                      onClick={handleCheckout}
                      disabled={submittingCheckout}
                      className="gap-2 cursor-pointer bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-6"
                    >
                      <CreditCard className="h-4 w-4" />
                      {submittingCheckout ? "Checking out..." : "Checkout & Print Receipt"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT SIDE: Past Receipts Logs & Histories - 5 cols */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Card className="p-6 border-border flex flex-col gap-6 min-h-[580px]">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Invoicing Log History</h2>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search past receipt number..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* List of past receipts */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[460px]">
                {loadingHistory ? (
                  <p className="text-center text-xs text-muted-foreground py-12 font-medium">Loading history...</p>
                ) : filteredReceipts.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-12 font-medium">No past invoice receipts found.</p>
                ) : (
                  filteredReceipts.map((r) => (
                    <div 
                      key={r.id}
                      className="flex justify-between items-center border border-border/40 hover:border-primary/30 bg-muted/10 hover:bg-muted/30 p-3.5 rounded-xl transition-all duration-200"
                    >
                      <div className="flex flex-col gap-1 select-none">
                        <span className="text-xs font-extrabold text-foreground tracking-tight">{r.receipt_number}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(r.created_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                          <span>•</span>
                          <span>{r.items.length} item(s)</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-primary">{formatRupees(r.total_amount)}</span>
                        <Button
                          onClick={() => setCheckoutReceipt(r)}
                          variant="outline"
                          size="sm"
                          className="h-8 text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-foreground border-primary/20 hover:border-primary transition-all duration-200 cursor-pointer"
                        >
                          View / Print
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

        </div>

      </div>

      {/* Pop-up Interactive Printable Invoice Modal Overlay */}
      <ReceiptModal 
        receipt={checkoutReceipt} 
        onClose={() => setCheckoutReceipt(null)} 
      />
    </div>
  )
}
