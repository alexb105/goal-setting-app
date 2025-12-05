import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { GoalsProviderWrapper } from "@/components/goals-provider-wrapper"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GoalAddict - Long-Term Goal Planner",
  description: "Set long-term goals and build a clear path to achieve them",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isVercel = process.env.VERCEL === "1"
  
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <GoalsProviderWrapper>
          {children}
        </GoalsProviderWrapper>
        {isVercel && <Analytics />}
      </body>
    </html>
  )
}
