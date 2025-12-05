"use client"

import { GoalsProvider } from "@/components/goals-context"
import type { ReactNode } from "react"

export function GoalsProviderWrapper({ children }: { children: ReactNode }) {
  return <GoalsProvider>{children}</GoalsProvider>
}




