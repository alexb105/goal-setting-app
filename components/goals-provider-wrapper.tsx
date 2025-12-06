"use client"

import { GoalsProvider } from "@/components/goals-context"
import { AuthProvider } from "@/components/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
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
        <GoalsProvider>{children}</GoalsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
