"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, LogOut, User as UserIcon, Receipt, Menu, X } from "lucide-react"
import { useAuth } from "@/components/auth-wrapper"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function NavBar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

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

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-2">
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

        {/* Desktop Authenticated User Status & Logout */}
        {user ? (
          <div className="hidden md:flex items-center gap-4">
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

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden">
          <Button
            onClick={toggleMenu}
            variant="ghost"
            size="icon"
            className="text-foreground focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col p-6 space-y-6 md:hidden animate-in slide-in-from-top-4 duration-200 border-t border-border">
          <nav className="flex flex-col gap-3">
            <Link href="/" onClick={closeMenu}>
              <span className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${pathname === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </span>
            </Link>
            <Link href="/inventory" onClick={closeMenu}>
              <span className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${pathname === "/inventory" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Package className="h-5 w-5" />
                Manage Inventory
              </span>
            </Link>
            <Link href="/billing" onClick={closeMenu}>
              <span className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${pathname === "/billing" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Receipt className="h-5 w-5" />
                Receipt Billing
              </span>
            </Link>
          </nav>

          {user && (
            <div className="border-t border-border/50 pt-6 flex flex-col gap-4 mt-auto">
              <div className="flex items-center gap-3 bg-muted/40 border border-border/40 py-2.5 px-4 rounded-xl text-sm font-semibold text-foreground select-none">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20 text-primary">
                  <UserIcon className="h-4 w-4" />
                </div>
                <span className="truncate">{user.username}</span>
              </div>
              
              <Button
                onClick={() => {
                  logout()
                  closeMenu()
                }}
                variant="destructive"
                className="w-full gap-2 font-bold py-3 transition-colors text-sm cursor-pointer shadow-md"
              >
                <LogOut className="h-4 w-4" />
                Logout Account
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
