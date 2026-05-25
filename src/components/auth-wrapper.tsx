"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Package, 
  Lock, 
  User as UserIcon, 
  AlertCircle, 
  Sparkles, 
  LogIn, 
  UserPlus, 
  Loader2,
  Eye,
  EyeOff
} from "lucide-react"

interface User {
  id: number
  username: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (user: User) => void
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/session")
      if (res.ok) {
        const data = await res.json()
        if (data.authenticated) {
          setUser(data.user)
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error("Session verification failed", err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  const handleLoginState = (userData: User) => {
    setUser(userData)
    router.refresh()
  }

  const handleLogout = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" })
      if (res.ok) {
        setUser(null)
        setUsername("")
        setPassword("")
        setConfirmPassword("")
        setError(null)
        router.push("/")
      }
    } catch (err) {
      console.error("Logout failed", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (!username.trim() || !password) {
      setError("Please fill in all fields.")
      setSubmitting(false)
      return
    }

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.")
      setSubmitting(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      setSubmitting(false)
      return
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.")
      setSubmitting(false)
      return
    }

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register"
      const payload = { username: username.trim(), password }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.")
      }

      if (data.success) {
        handleLoginState(data.user)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleView = () => {
    setIsLogin(!isLogin)
    setError(null)
    setPassword("")
    setConfirmPassword("")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="rounded-2xl bg-card border border-border p-4 shadow-2xl relative">
            <Package className="h-10 w-10 text-primary animate-bounce" />
            <div className="absolute inset-0 rounded-2xl border border-primary/30 animate-ping opacity-75 pointer-events-none" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-semibold tracking-wide text-muted-foreground animate-pulse">
              Securing System Access...
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthContext.Provider value={{ user, loading, login: handleLoginState, logout: handleLogout, refresh: checkSession }}>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground relative overflow-hidden">
          
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
          
          <div className="w-full max-w-md z-10 transition-all duration-500 hover:scale-[1.01]">
            <Card className="border border-border/50 bg-card/45 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

              <CardHeader className="space-y-2 text-center pt-8">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-2 border border-primary/20 shadow-inner group">
                  <Package className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <CardTitle className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/75 bg-clip-text">
                  {isLogin ? "Welcome Back" : "Create Account"}
                </CardTitle>
                <CardDescription className="text-muted-foreground/80 font-medium">
                  {isLogin 
                    ? "Log in to access your personal AI inventory terminal" 
                    : "Register to initialize your blank secure database block"
                  }
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 px-6 pb-6">
                  {error && (
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive shadow-md animate-shake">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="font-bold text-xs">Access Error</AlertTitle>
                      <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Username Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Username</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Enter your username..."
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 bg-background/30 border-border/50 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all font-medium"
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 bg-background/30 border-border/50 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all font-medium"
                        required
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password (Register Only) */}
                  {!isLogin && (
                    <div className="space-y-2 animate-fadeIn">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Re-enter your password..."
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 bg-background/30 border-border/50 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all font-medium"
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col gap-4 px-6 pb-8">
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-lg shadow-primary/20 relative group overflow-hidden cursor-pointer"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isLogin ? "Verifying Credentials..." : "Creating Account Block..."}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 justify-center">
                        {isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        {isLogin ? "Sign In to Terminal" : "Register Credentials"}
                      </span>
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={toggleView}
                      className="text-xs font-semibold text-muted-foreground hover:text-primary hover:underline transition-colors focus:outline-none cursor-pointer"
                      disabled={submitting}
                    >
                      {isLogin 
                        ? "Need an account? Sign up now" 
                        : "Already registered? Sign in instead"
                      }
                    </button>
                  </div>
                </CardFooter>
              </form>
            </Card>

            <p className="text-center text-[10px] font-bold text-muted-foreground/45 mt-4 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Secure Cryptographic Control Panel
            </p>
          </div>
        </div>
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={{ user, loading, login: handleLoginState, logout: handleLogout, refresh: checkSession }}>
      {children}
    </AuthContext.Provider>
  )
}
