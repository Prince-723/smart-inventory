"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, LogOut, User as UserIcon, Receipt } from "lucide-react"
import { useAuth } from "@/components/auth-wrapper"
import { Button } from "@/components/ui/button"

export function NavBar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="mx-auto max-w-[2000px] flex h-16 items-center justify-between px-6">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Smart Inventory AI
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-2">
          <Link href="/">
            <span className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${pathname === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </span>
          </Link>
          <Link href="/inventory">
            <span className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${pathname === "/inventory" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Package className="h-4 w-4" />
              Manage Inventory
            </span>
          </Link>
          <Link href="/billing">
            <span className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${pathname === "/billing" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Receipt className="h-4 w-4" />
              Receipt Billing
            </span>
          </Link>
        </nav>

        {/* Authenticated User Status & Logout */}
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 bg-muted/40 border border-border/40 py-1.5 px-3 rounded-lg text-xs font-semibold text-foreground select-none">
              <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20 text-primary">
                <UserIcon className="h-3 w-3" />
              </div>
              <span className="max-w-[120px] truncate">{user.username}</span>
            </div>
            
            <Button
              onClick={logout}
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors font-semibold text-xs cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
          </div>
        ) : null}

      </div>
    </header>
  )
}
