"use client"

import { useState } from "react"
import { User, Mail, Lock, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/components/auth-context"
import { cn } from "@/lib/utils"

type SyncStatus = "synced" | "syncing" | "error" | "none"

interface AuthModalProps {
  syncStatus?: SyncStatus
}

export function AuthModal({ syncStatus = "none" }: AuthModalProps) {
  const { user, isLoading, signInWithEmail, signUpWithEmail } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin")
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
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      resetForm()
    }
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
        // Force full page reload to load data properly
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
        // Set flag to preserve localStorage during email verification flow
        // Use localStorage so it persists across tabs (for email verification link)
        localStorage.setItem("goalritual-pending-auth", "true")
        setSuccess("Check your email for a confirmation link!")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled className="h-8 w-8 rounded-full">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  // User is logged in - show account dropdown
  if (user) {
    const getSyncColor = () => {
      switch (syncStatus) {
        case "synced": return "bg-green-500"
        case "syncing": return "bg-amber-500"
        case "error": return "bg-red-500"
        default: return "bg-primary"
      }
    }
    
    const getSyncTooltip = () => {
      switch (syncStatus) {
        case "synced": return "Synced to cloud"
        case "syncing": return "Syncing..."
        case "error": return "Sync error"
        default: return "Account"
      }
    }
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title={getSyncTooltip()}>
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors",
              getSyncColor()
            )}>
              <User className="h-4 w-4" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              {syncStatus === "synced" && "✓ Synced"}
              {syncStatus === "syncing" && "Syncing..."}
              {syncStatus === "error" && "Sync error"}
              {syncStatus === "none" && "Signed in"}
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // User is not logged in - show sign in button/modal
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <User className="h-4 w-4" />
          Sign In
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Welcome to GoalRitual</DialogTitle>
          <DialogDescription className="text-center">
            Sign in to sync your goals across devices
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

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
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Your data is stored locally and synced when signed in.
        </p>
      </DialogContent>
    </Dialog>
  )
}

