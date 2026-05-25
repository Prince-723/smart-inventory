"use client"

import { X, Printer, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface ReceiptItem {
  id?: number
  product_name: string
  quantity: number
  price: number
}

export interface Receipt {
  id: number
  receipt_number: string
  total_amount: number
  created_at: string
  items: ReceiptItem[]
}

interface ReceiptModalProps {
  receipt: Receipt | null
  onClose: () => void
}

export function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  if (!receipt) return null

  // Format currency in Indian Rupees with Lakh commas
  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const subtotal = receipt.total_amount / 1.18
  const gst = receipt.total_amount - subtotal

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Print styles to ensure only the receipt container is printed on a clean white page */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Main Card Container */}
      <div 
        id="printable-receipt"
        className="relative w-full max-w-lg rounded-xl border border-border bg-card text-card-foreground shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in duration-200"
      >
        {/* Close Button - hidden during printing */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 print:hidden cursor-pointer"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>

        {/* Success Header Indicator - hidden during printing */}
        <div className="flex flex-col items-center text-center pb-4 mb-6 border-b border-border/60 print:hidden">
          <div className="rounded-full bg-emerald-500/10 p-2 mb-2">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Sale Completed Successfully</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Stock has been decremented and receipt generated.</p>
        </div>

        {/* Corporate Receipt Invoice Layout */}
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-primary bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent uppercase">
                Smart Inventory AI
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 print:text-black">Automated Retail Intelligence Suite</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary border border-primary/20 rounded print:border-black print:text-black uppercase">
                Receipt / Invoice
              </span>
            </div>
          </div>

          {/* Invoice Details Grid */}
          <div className="grid grid-cols-2 gap-4 pb-4 mb-6 border-b border-border/40 text-xs">
            <div>
              <p className="text-muted-foreground font-medium print:text-gray-500">Invoice Number</p>
              <p className="font-bold text-foreground print:text-black">{receipt.receipt_number}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground font-medium print:text-gray-500">Billing Date</p>
              <p className="font-bold text-foreground print:text-black">
                {new Date(receipt.created_at).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 print:text-gray-600">Items Purchased</h3>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/40 pb-2 text-muted-foreground font-semibold print:text-black">
                  <th className="py-2">Item Description</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-border/20 print:border-gray-200">
                    <td className="py-2.5 font-medium text-foreground print:text-black">{item.product_name}</td>
                    <td className="py-2.5 text-right text-muted-foreground print:text-black font-semibold">{item.quantity}</td>
                    <td className="py-2.5 text-right text-muted-foreground print:text-black font-semibold">{formatRupees(item.price)}</td>
                    <td className="py-2.5 text-right text-foreground font-bold print:text-black">{formatRupees(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Totals Section */}
          <div className="flex flex-col items-end gap-1.5 pt-4 border-t border-border/60 text-xs">
            <div className="flex justify-between w-64 text-muted-foreground print:text-black">
              <span>Subtotal (Net Amount)</span>
              <span>{formatRupees(subtotal)}</span>
            </div>
            <div className="flex justify-between w-64 text-muted-foreground print:text-black">
              <span>GST Tax (18%)</span>
              <span>{formatRupees(gst)}</span>
            </div>
            <div className="flex justify-between w-64 text-sm font-bold text-foreground print:text-black pt-2 border-t border-border/40 mt-1">
              <span>Grand Total</span>
              <span className="text-primary font-black print:text-black">{formatRupees(receipt.total_amount)}</span>
            </div>
          </div>

          {/* Terms and Message Footer */}
          <div className="text-center text-[10px] text-muted-foreground print:text-black mt-8 pt-4 border-t border-dashed border-border/40">
            <p className="font-semibold">This is a system generated electronic invoice.</p>
            <p className="mt-0.5">Thank you for visiting! For questions or support, email help@smartinventory.ai</p>
          </div>
        </div>

        {/* Action Triggers Footer - hidden during printing */}
        <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-border/40 print:hidden">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="cursor-pointer"
          >
            Close Receipt
          </Button>
          <Button 
            onClick={handlePrint}
            className="gap-2 cursor-pointer bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
        </div>
      </div>
    </div>
  )
}
