"use client"

import { GoalsProvider } from "@/components/goals-context"
import { AuthProvider } from "@/components/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import type { ReactNode } from "react"

export function GoalsProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <GoalsProvider>
          <div className="pb-20 md:pb-0">
            {children}
          </div>
          <MobileBottomNav />
        </GoalsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
