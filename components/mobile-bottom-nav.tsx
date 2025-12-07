"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Target, Calendar, Repeat, CheckCircle2, User, LogOut, Settings, Brain, X, Compass } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-context"

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
  const { user, signOut } = useAuth()
  const [showAccountMenu, setShowAccountMenu] = useState(false)

  return (
    <>
      {/* Account Menu Overlay */}
      {showAccountMenu && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setShowAccountMenu(false)}
        />
      )}
      
      {/* Account Menu Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card rounded-t-3xl border-t border-border transition-transform duration-300 ease-out safe-area-bottom",
          showAccountMenu ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Account</h3>
            <button
              onClick={() => setShowAccountMenu(false)}
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
                onClick={() => setShowAccountMenu(false)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-muted active:scale-[0.98] transition-all"
              >
                <Compass className="w-5 h-5 text-indigo-600" />
                <span className="font-medium">Goal Map</span>
              </Link>
              
              <Link 
                href="/ai-guidance" 
                onClick={() => setShowAccountMenu(false)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-muted active:scale-[0.98] transition-all"
              >
                <Brain className="w-5 h-5 text-purple-600" />
                <span className="font-medium">AI Guidance</span>
              </Link>
              
              <button
                onClick={() => {
                  setShowAccountMenu(false)
                  signOut()
                }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 w-full active:scale-[0.98] transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">Sign in to sync your data across devices</p>
              <Link 
                href="/"
                onClick={() => setShowAccountMenu(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium text-sm"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-30 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom transition-transform duration-300",
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
