"use client"

import { useState } from "react"
import { Plus, Target, Sun, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileFabProps {
  onCreateGoal: () => void
  onCreateTask: () => void
}

export function MobileFab({ onCreateGoal, onCreateTask }: MobileFabProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div className="fixed bottom-24 right-4 z-50 md:hidden flex flex-col items-end gap-3">
        {/* Action buttons - appear above FAB */}
        <div
          className={cn(
            "flex flex-col gap-3 transition-all duration-200 origin-bottom",
            isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          )}
        >
          <button
            onClick={() => {
              setIsOpen(false)
              onCreateTask()
            }}
            className="flex items-center gap-3 bg-amber-500 text-white pl-4 pr-5 py-3.5 rounded-full shadow-xl active:scale-95 transition-transform"
          >
            <Sun className="w-5 h-5" />
            <span className="text-sm font-semibold">Today's Task</span>
          </button>
          <button
            onClick={() => {
              setIsOpen(false)
              onCreateGoal()
            }}
            className="flex items-center gap-3 bg-primary text-primary-foreground pl-4 pr-5 py-3.5 rounded-full shadow-xl active:scale-95 transition-transform"
          >
            <Target className="w-5 h-5" />
            <span className="text-sm font-semibold">New Goal</span>
          </button>
        </div>

        {/* Main FAB */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-200 active:scale-95",
            isOpen
              ? "bg-foreground text-background rotate-45"
              : "bg-primary text-primary-foreground"
          )}
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>
    </>
  )
}

