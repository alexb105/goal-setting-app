"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Target, Calendar, Repeat, CheckCircle2, User, LogOut, Settings, Brain, X, Compass, Mail, Lock, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
  requiresAuth?: boolean
}

const navItems: NavItem[] = [
  { href: "/", icon: Target, label: "Goals" },
  { href: "/goal-map", icon: Compass, label: "Map" },
  { href: "/milestones", icon: Calendar, label: "Milestones" },
  { href: "/recurring-tasks", icon: Repeat, label: "Recurring" },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { user, signOut, signInWithEmail, signUpWithEmail } = useAuth()
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setError(null)
    setSuccess(null)
    setAuthMode("signin")
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const { error } = await signInWithEmail(email, password)
      if (error) {
        setError(error.message)
        setIsSubmitting(false)
      } else {
        window.location.reload()
      }
    } catch {
      setError("An unexpected error occurred")
      setIsSubmitting(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const { error } = await signUpWithEmail(email, password)
      if (error) {
        setError(error.message)
      } else {
        localStorage.setItem("goalritual-pending-auth", "true")
        setSuccess("Check your email for a confirmation link!")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseMenu = () => {
    setShowAccountMenu(false)
    resetForm()
  }

  return (
    <>
      {/* Account Menu Overlay */}
      {showAccountMenu && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={handleCloseMenu}
        />
      )}
      
      {/* Account Menu Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 md:hidden glass-strong rounded-t-3xl border-t border-border transition-transform duration-300 ease-out safe-area-bottom",
          showAccountMenu ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Account</h3>
            <button
              onClick={handleCloseMenu}
              className="p-2 rounded-full hover:bg-muted active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Signed in</p>
                </div>
              </div>
              
              <Link 
                href="/goal-map" 
                onClick={handleCloseMenu}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-muted active:scale-[0.98] transition-all"
              >
                <Compass className="w-5 h-5 text-indigo-600" />
                <span className="font-medium">Goal Map</span>
              </Link>
              
              <Link 
                href="/ai-guidance" 
                onClick={handleCloseMenu}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-muted active:scale-[0.98] transition-all"
              >
                <Brain className="w-5 h-5 text-purple-600" />
                <span className="font-medium">AI Guidance</span>
              </Link>
              
              <button
                onClick={() => {
                  handleCloseMenu()
                  signOut()
                }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 w-full active:scale-[0.98] transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Auth mode tabs */}
              <div className="flex rounded-lg bg-muted p-1">
                <button
                  onClick={() => setAuthMode("signin")}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
                    authMode === "signin" ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthMode("signup")}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
                    authMode === "signup" ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={authMode === "signin" ? handleSignIn : handleSignUp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mobile-email" className="text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="mobile-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mobile-password" className="text-sm">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="mobile-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                  {authMode === "signup" && (
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {authMode === "signin" ? "Signing in..." : "Creating account..."}
                    </>
                  ) : (
                    authMode === "signin" ? "Sign In" : "Create Account"
                  )}
                </Button>
              </form>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-center text-xs text-muted-foreground">
                Your data is stored locally and synced when signed in.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-30 md:hidden glass-strong border-t border-border safe-area-bottom transition-transform duration-300",
        showAccountMenu && "translate-y-full"
      )}>
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all active:scale-95",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                    isActive && "bg-primary/10"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-transform",
                      isActive && "scale-110"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium mt-0.5 transition-colors",
                    isActive && "font-semibold"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
          
          {/* Account/Profile Button */}
          <button
            onClick={() => setShowAccountMenu(true)}
            className="flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all active:scale-95 text-muted-foreground hover:text-foreground"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors">
              {user ? (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <span className="text-[10px] font-medium mt-0.5">
              Account
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
