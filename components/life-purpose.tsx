"use client"

import { useState, useEffect } from "react"
import { Sparkles, Pencil, Check, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useSupabaseSync } from "@/hooks/use-supabase-sync"

const STORAGE_KEY = "goalritual-life-purpose"

export function LifePurpose() {
  const { triggerSync } = useSupabaseSync()
  const [lifePurpose, setLifePurpose] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Load life purpose from localStorage
  useEffect(() => {
    const loadFromStorage = () => {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setLifePurpose(stored)
      } else {
        setLifePurpose("")
      }
    }
    
    loadFromStorage()
    setIsLoaded(true)
    
    // Listen for storage updates from cloud sync
    const handleStorageUpdate = () => {
      loadFromStorage()
    }
    
    window.addEventListener('goalritual-storage-updated', handleStorageUpdate)
    window.addEventListener('storage', handleStorageUpdate)
    return () => {
      window.removeEventListener('goalritual-storage-updated', handleStorageUpdate)
      window.removeEventListener('storage', handleStorageUpdate)
    }
  }, [])

  // Save life purpose to localStorage
  useEffect(() => {
    if (isLoaded) {
      if (lifePurpose.trim()) {
        localStorage.setItem(STORAGE_KEY, lifePurpose)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
      triggerSync()
    }
  }, [lifePurpose, isLoaded, triggerSync])

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
      <div className="mb-4 sm:mb-6 rounded-xl border border-dashed border-border glass-subtle p-3 sm:p-6">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-purple-500/10 flex-shrink-0">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">My Life Purpose</h3>
            </div>
            <p className="text-[11px] sm:text-sm text-muted-foreground mb-2 sm:mb-3">
              Define your life purpose to stay focused on what truly matters.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              className="gap-1.5 h-8 text-xs sm:text-sm"
            >
              <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Add Your Life Purpose</span>
              <span className="sm:hidden">Add Purpose</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Check if purpose is long enough to warrant collapsing on mobile
  const isLongPurpose = lifePurpose.length > 100

  return (
    <div className="mb-4 sm:mb-6 rounded-xl border border-border glass bg-gradient-to-br from-purple-500/10 to-indigo-500/10 p-3 sm:p-6">
      {isEditing ? (
        // Editing mode - full display
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-purple-500/10 flex-shrink-0">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-2">My Life Purpose</h3>
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
              <div className="flex items-center gap-2 flex-wrap">
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
                <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto hidden sm:inline">
                  Press Cmd/Ctrl + Enter to save
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Display mode - collapsible on mobile for long text
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-purple-500/10 flex-shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground">My Life Purpose</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleStartEdit}
                  className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Button>
              </div>
              
              {/* Mobile: Show truncated with expand option for long text */}
              {isLongPurpose ? (
                <>
                  {/* Mobile collapsed view */}
                  <div className="sm:hidden">
                    {!isExpanded && (
                      <p className="text-sm text-foreground leading-relaxed line-clamp-2 mt-1">
                        {lifePurpose}
                      </p>
                    )}
                    <CollapsibleContent>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mt-1">
                        {lifePurpose}
                      </p>
                    </CollapsibleContent>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 mt-1.5 py-1">
                        <span>{isExpanded ? "Show less" : "Read more"}</span>
                        <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  {/* Desktop: Always show full */}
                  <p className="hidden sm:block text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap mt-1">
                    {lifePurpose}
                  </p>
                </>
              ) : (
                <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap mt-1">
                  {lifePurpose}
                </p>
              )}
            </div>
          </div>
        </Collapsible>
      )}
    </div>
  )
}


