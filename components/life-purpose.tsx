"use client"

import { useState, useEffect } from "react"
import { Sparkles, Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "goaladdict-life-purpose"

export function LifePurpose() {
  const [lifePurpose, setLifePurpose] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)

  // Load life purpose from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setLifePurpose(stored)
      } catch {
        // Ignore parse errors
      }
    }
    setIsLoaded(true)
  }, [])

  // Save life purpose to localStorage
  useEffect(() => {
    if (isLoaded) {
      if (lifePurpose.trim()) {
        localStorage.setItem(STORAGE_KEY, lifePurpose)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [lifePurpose, isLoaded])

  const handleStartEdit = () => {
    setEditValue(lifePurpose)
    setIsEditing(true)
  }

  const handleSave = () => {
    setLifePurpose(editValue.trim())
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(lifePurpose)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  // Don't show anything if there's no life purpose and we're not editing
  if (!isLoaded) {
    return null
  }

  if (!lifePurpose && !isEditing) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-border bg-card/50 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 flex-shrink-0">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-foreground">My Life Purpose</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3">
              Define your life purpose to stay focused on what truly matters. This will remind you why you're working towards your goals.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              className="gap-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              Add Your Life Purpose
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 flex-shrink-0">
          <Sparkles className="h-5 w-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-foreground">My Life Purpose</h3>
            {!isEditing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleStartEdit}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What is your life purpose? What are you working towards? What legacy do you want to leave?"
                rows={4}
                className="text-sm sm:text-base resize-none"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="gap-2"
                  disabled={!editValue.trim()}
                >
                  <Check className="h-3.5 w-3.5" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  className="gap-2"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  Press Cmd/Ctrl + Enter to save
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap">
              {lifePurpose}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}


