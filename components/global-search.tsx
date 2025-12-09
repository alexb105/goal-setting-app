"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Search, X, Target, Flag, CheckSquare, Repeat, Calendar, Sparkles, Tag, Folder } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useGoals } from "@/components/goals-context"
import { cn } from "@/lib/utils"

interface SearchResult {
  id: string
  type: "goal" | "milestone" | "task" | "recurring-group" | "recurring-task" | "daily-todo" | "standalone-recurring" | "life-purpose" | "tag" | "group"
  title: string
  subtitle?: string
  goalId?: string
  milestoneId?: string
  groupName?: string
}

interface GlobalSearchProps {
  onNavigateToGoal?: (goalId: string) => void
  className?: string
}

// Search trigger button component
export function SearchTrigger({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn("h-8 w-8", className)}
      title="Search (⌘K)"
    >
      <Search className="h-4 w-4" />
    </Button>
  )
}

export function GlobalSearch({ onNavigateToGoal, className }: GlobalSearchProps) {
  const { goals } = useGoals()
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Open search modal
  const openSearch = useCallback(() => {
    setIsOpen(true)
    // Focus input after modal opens
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // Close search modal
  const closeSearch = useCallback(() => {
    setIsOpen(false)
    setSearchQuery("")
    setSelectedIndex(0)
  }, [])

  // Get daily todos and recurring tasks from localStorage
  const [dailyTodos, setDailyTodos] = useState<Array<{ id: string; title: string }>>([])
  const [standaloneRecurring, setStandaloneRecurring] = useState<Array<{ id: string; title: string }>>([])
  const [lifePurpose, setLifePurpose] = useState("")

  // Load data from localStorage when modal opens
  useEffect(() => {
    if (!isOpen) return
    
    // Load daily todos
    const storedTodos = localStorage.getItem("goalritual-daily-todos")
    if (storedTodos) {
      try {
        const parsed = JSON.parse(storedTodos)
        setDailyTodos(parsed.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })))
      } catch {
        // Ignore parse errors
      }
    }

    // Load standalone recurring tasks
    const storedRecurring = localStorage.getItem("goalritual-recurring-tasks")
    if (storedRecurring) {
      try {
        const parsed = JSON.parse(storedRecurring)
        setStandaloneRecurring(parsed.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })))
      } catch {
        // Ignore parse errors
      }
    }

    // Load life purpose
    const storedPurpose = localStorage.getItem("goalritual-life-purpose")
    if (storedPurpose) {
      setLifePurpose(storedPurpose)
    }
  }, [isOpen])

  // Keyboard shortcut to open search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        if (isOpen) {
          closeSearch()
        } else {
          openSearch()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, openSearch, closeSearch])

  // Build search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase().trim()
    const results: SearchResult[] = []

    // Search goals
    goals.forEach((goal) => {
      // Goal title and description
      if (
        goal.title.toLowerCase().includes(query) ||
        goal.description?.toLowerCase().includes(query) ||
        goal.why?.toLowerCase().includes(query)
      ) {
        results.push({
          id: `goal-${goal.id}`,
          type: "goal",
          title: goal.title,
          subtitle: goal.description?.slice(0, 60) || undefined,
          goalId: goal.id,
        })
      }

      // Tags
      goal.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(query)) {
          // Only add unique tags
          const existingTag = results.find((r) => r.type === "tag" && r.title === tag)
          if (!existingTag) {
            results.push({
              id: `tag-${tag}`,
              type: "tag",
              title: tag,
              subtitle: `Tag used in ${goals.filter((g) => g.tags.includes(tag)).length} goal(s)`,
            })
          }
        }
      })

      // Group
      if (goal.group && goal.group.toLowerCase().includes(query)) {
        const existingGroup = results.find((r) => r.type === "group" && r.groupName === goal.group)
        if (!existingGroup) {
          results.push({
            id: `group-${goal.group}`,
            type: "group",
            title: goal.group,
            subtitle: `Group with ${goals.filter((g) => g.group === goal.group).length} goal(s)`,
            groupName: goal.group,
          })
        }
      }

      // Milestones
      goal.milestones.forEach((milestone) => {
        if (
          milestone.title.toLowerCase().includes(query) ||
          milestone.description?.toLowerCase().includes(query)
        ) {
          results.push({
            id: `milestone-${goal.id}-${milestone.id}`,
            type: "milestone",
            title: milestone.title,
            subtitle: `In goal: ${goal.title}`,
            goalId: goal.id,
            milestoneId: milestone.id,
          })
        }

        // Tasks within milestones
        milestone.tasks.forEach((task) => {
          if (task.title.toLowerCase().includes(query) && !task.isSeparator) {
            results.push({
              id: `task-${goal.id}-${milestone.id}-${task.id}`,
              type: "task",
              title: task.title,
              subtitle: `In milestone: ${milestone.title} (${goal.title})`,
              goalId: goal.id,
              milestoneId: milestone.id,
            })
          }
        })
      })

      // Recurring task groups
      goal.recurringTaskGroups?.forEach((group) => {
        if (group.name.toLowerCase().includes(query)) {
          results.push({
            id: `recurring-group-${goal.id}-${group.id}`,
            type: "recurring-group",
            title: group.name,
            subtitle: `Recurring tasks in: ${goal.title}`,
            goalId: goal.id,
          })
        }

        // Recurring tasks
        group.tasks.forEach((task) => {
          if (task.title.toLowerCase().includes(query) && !task.isSeparator) {
            results.push({
              id: `recurring-task-${goal.id}-${group.id}-${task.id}`,
              type: "recurring-task",
              title: task.title,
              subtitle: `In ${group.name} (${goal.title})`,
              goalId: goal.id,
            })
          }
        })
      })
    })

    // Search daily todos
    dailyTodos.forEach((todo) => {
      if (todo.title.toLowerCase().includes(query)) {
        results.push({
          id: `daily-${todo.id}`,
          type: "daily-todo",
          title: todo.title,
          subtitle: "Daily todo",
        })
      }
    })

    // Search standalone recurring tasks
    standaloneRecurring.forEach((task) => {
      if (task.title.toLowerCase().includes(query)) {
        results.push({
          id: `standalone-recurring-${task.id}`,
          type: "standalone-recurring",
          title: task.title,
          subtitle: "Standalone recurring task",
        })
      }
    })

    // Search life purpose
    if (lifePurpose && lifePurpose.toLowerCase().includes(query)) {
      results.push({
        id: "life-purpose",
        type: "life-purpose",
        title: "Life Purpose",
        subtitle: lifePurpose.slice(0, 60) + (lifePurpose.length > 60 ? "..." : ""),
      })
    }

    return results.slice(0, 20) // Limit to 20 results
  }, [searchQuery, goals, dailyTodos, standaloneRecurring, lifePurpose])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchResults])

  // Handle keyboard navigation within search input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        if (searchResults.length > 0) {
          setSelectedIndex((prev) => (prev + 1) % searchResults.length)
        }
        break
      case "ArrowUp":
        e.preventDefault()
        if (searchResults.length > 0) {
          setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length)
        }
        break
      case "Enter":
        e.preventDefault()
        if (searchResults.length > 0 && searchResults[selectedIndex]) {
          handleSelectResult(searchResults[selectedIndex])
        }
        break
      case "Escape":
        e.preventDefault()
        closeSearch()
        break
    }
  }

  // Handle result selection
  const handleSelectResult = (result: SearchResult) => {
    if (result.goalId && onNavigateToGoal) {
      onNavigateToGoal(result.goalId)
    }
    closeSearch()
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeSearch()
    }
  }

  // Get icon for result type
  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "goal":
        return <Target className="h-4 w-4 text-primary" />
      case "milestone":
        return <Flag className="h-4 w-4 text-blue-500" />
      case "task":
        return <CheckSquare className="h-4 w-4 text-green-500" />
      case "recurring-group":
      case "recurring-task":
      case "standalone-recurring":
        return <Repeat className="h-4 w-4 text-purple-500" />
      case "daily-todo":
        return <Calendar className="h-4 w-4 text-orange-500" />
      case "life-purpose":
        return <Sparkles className="h-4 w-4 text-amber-500" />
      case "tag":
        return <Tag className="h-4 w-4 text-cyan-500" />
      case "group":
        return <Folder className="h-4 w-4 text-indigo-500" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  // Don't render anything if not open
  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={handleBackdropClick}
      />

      {/* Search Modal */}
      <div className="fixed inset-x-0 top-0 z-50 p-4 sm:p-6 md:p-8">
        <div
          ref={containerRef}
          className={cn(
            "mx-auto max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden",
            className
          )}
        >
          {/* Search Input */}
          <div className="relative border-b border-border">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search goals, milestones, tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-14 pl-12 pr-12 text-base border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
              autoFocus
            />
            <button
              onClick={closeSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {!searchQuery.trim() ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <p className="text-sm">Start typing to search...</p>
                <p className="text-xs mt-2 opacity-60">Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">ESC</kbd> to close</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No results found for &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <div className="py-2">
                {searchResults.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className={cn(
                      "w-full px-4 py-3 flex items-start gap-3 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-primary/10"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                        {result.type.replace("-", " ")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          {searchQuery.trim() && searchResults.length > 0 && (
            <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span><kbd className="px-1 py-0.5 bg-muted rounded font-mono">↑↓</kbd> Navigate</span>
                <span><kbd className="px-1 py-0.5 bg-muted rounded font-mono">↵</kbd> Select</span>
              </div>
              <span><kbd className="px-1 py-0.5 bg-muted rounded font-mono">ESC</kbd> Close</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Wrapper component that includes both trigger and modal
interface GlobalSearchWithTriggerProps {
  onNavigateToGoal?: (goalId: string) => void
  triggerClassName?: string
}

export function GlobalSearchWithTrigger({ onNavigateToGoal, triggerClassName }: GlobalSearchWithTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <SearchTrigger onClick={() => setIsOpen(true)} className={triggerClassName} />
      {isOpen && (
        <GlobalSearchModal
          onNavigateToGoal={onNavigateToGoal}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

// Standalone modal component that can be controlled externally
interface GlobalSearchModalProps {
  onNavigateToGoal?: (goalId: string) => void
  onClose: () => void
}

export function GlobalSearchModal({ onNavigateToGoal, onClose }: GlobalSearchModalProps) {
  const { goals } = useGoals()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get daily todos and recurring tasks from localStorage
  const [dailyTodos, setDailyTodos] = useState<Array<{ id: string; title: string }>>([])
  const [standaloneRecurring, setStandaloneRecurring] = useState<Array<{ id: string; title: string }>>([])
  const [lifePurpose, setLifePurpose] = useState("")

  // Load data from localStorage
  useEffect(() => {
    // Load daily todos
    const storedTodos = localStorage.getItem("goalritual-daily-todos")
    if (storedTodos) {
      try {
        const parsed = JSON.parse(storedTodos)
        setDailyTodos(parsed.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })))
      } catch {
        // Ignore parse errors
      }
    }

    // Load standalone recurring tasks
    const storedRecurring = localStorage.getItem("goalritual-recurring-tasks")
    if (storedRecurring) {
      try {
        const parsed = JSON.parse(storedRecurring)
        setStandaloneRecurring(parsed.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })))
      } catch {
        // Ignore parse errors
      }
    }

    // Load life purpose
    const storedPurpose = localStorage.getItem("goalritual-life-purpose")
    if (storedPurpose) {
      setLifePurpose(storedPurpose)
    }

    // Focus input
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  // Build search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase().trim()
    const results: SearchResult[] = []

    // Search goals
    goals.forEach((goal) => {
      if (
        goal.title.toLowerCase().includes(query) ||
        goal.description?.toLowerCase().includes(query) ||
        goal.why?.toLowerCase().includes(query)
      ) {
        results.push({
          id: `goal-${goal.id}`,
          type: "goal",
          title: goal.title,
          subtitle: goal.description?.slice(0, 60) || undefined,
          goalId: goal.id,
        })
      }

      goal.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(query)) {
          const existingTag = results.find((r) => r.type === "tag" && r.title === tag)
          if (!existingTag) {
            results.push({
              id: `tag-${tag}`,
              type: "tag",
              title: tag,
              subtitle: `Tag used in ${goals.filter((g) => g.tags.includes(tag)).length} goal(s)`,
            })
          }
        }
      })

      if (goal.group && goal.group.toLowerCase().includes(query)) {
        const existingGroup = results.find((r) => r.type === "group" && r.groupName === goal.group)
        if (!existingGroup) {
          results.push({
            id: `group-${goal.group}`,
            type: "group",
            title: goal.group,
            subtitle: `Group with ${goals.filter((g) => g.group === goal.group).length} goal(s)`,
            groupName: goal.group,
          })
        }
      }

      goal.milestones.forEach((milestone) => {
        if (
          milestone.title.toLowerCase().includes(query) ||
          milestone.description?.toLowerCase().includes(query)
        ) {
          results.push({
            id: `milestone-${goal.id}-${milestone.id}`,
            type: "milestone",
            title: milestone.title,
            subtitle: `In goal: ${goal.title}`,
            goalId: goal.id,
            milestoneId: milestone.id,
          })
        }

        milestone.tasks.forEach((task) => {
          if (task.title.toLowerCase().includes(query) && !task.isSeparator) {
            results.push({
              id: `task-${goal.id}-${milestone.id}-${task.id}`,
              type: "task",
              title: task.title,
              subtitle: `In milestone: ${milestone.title} (${goal.title})`,
              goalId: goal.id,
              milestoneId: milestone.id,
            })
          }
        })
      })

      goal.recurringTaskGroups?.forEach((group) => {
        if (group.name.toLowerCase().includes(query)) {
          results.push({
            id: `recurring-group-${goal.id}-${group.id}`,
            type: "recurring-group",
            title: group.name,
            subtitle: `Recurring tasks in: ${goal.title}`,
            goalId: goal.id,
          })
        }

        group.tasks.forEach((task) => {
          if (task.title.toLowerCase().includes(query) && !task.isSeparator) {
            results.push({
              id: `recurring-task-${goal.id}-${group.id}-${task.id}`,
              type: "recurring-task",
              title: task.title,
              subtitle: `In ${group.name} (${goal.title})`,
              goalId: goal.id,
            })
          }
        })
      })
    })

    dailyTodos.forEach((todo) => {
      if (todo.title.toLowerCase().includes(query)) {
        results.push({
          id: `daily-${todo.id}`,
          type: "daily-todo",
          title: todo.title,
          subtitle: "Daily todo",
        })
      }
    })

    standaloneRecurring.forEach((task) => {
      if (task.title.toLowerCase().includes(query)) {
        results.push({
          id: `standalone-recurring-${task.id}`,
          type: "standalone-recurring",
          title: task.title,
          subtitle: "Standalone recurring task",
        })
      }
    })

    if (lifePurpose && lifePurpose.toLowerCase().includes(query)) {
      results.push({
        id: "life-purpose",
        type: "life-purpose",
        title: "Life Purpose",
        subtitle: lifePurpose.slice(0, 60) + (lifePurpose.length > 60 ? "..." : ""),
      })
    }

    return results.slice(0, 20)
  }, [searchQuery, goals, dailyTodos, standaloneRecurring, lifePurpose])

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchResults])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        if (searchResults.length > 0) {
          setSelectedIndex((prev) => (prev + 1) % searchResults.length)
        }
        break
      case "ArrowUp":
        e.preventDefault()
        if (searchResults.length > 0) {
          setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length)
        }
        break
      case "Enter":
        e.preventDefault()
        if (searchResults.length > 0 && searchResults[selectedIndex]) {
          handleSelectResult(searchResults[selectedIndex])
        }
        break
    }
  }

  const handleSelectResult = (result: SearchResult) => {
    if (result.goalId && onNavigateToGoal) {
      onNavigateToGoal(result.goalId)
    }
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "goal":
        return <Target className="h-4 w-4 text-primary" />
      case "milestone":
        return <Flag className="h-4 w-4 text-blue-500" />
      case "task":
        return <CheckSquare className="h-4 w-4 text-green-500" />
      case "recurring-group":
      case "recurring-task":
      case "standalone-recurring":
        return <Repeat className="h-4 w-4 text-purple-500" />
      case "daily-todo":
        return <Calendar className="h-4 w-4 text-orange-500" />
      case "life-purpose":
        return <Sparkles className="h-4 w-4 text-amber-500" />
      case "tag":
        return <Tag className="h-4 w-4 text-cyan-500" />
      case "group":
        return <Folder className="h-4 w-4 text-indigo-500" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={handleBackdropClick}
      />

      {/* Search Modal */}
      <div className="fixed inset-x-0 top-0 z-50 p-4 sm:p-6 md:p-8">
        <div
          ref={containerRef}
          className="mx-auto max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Search Input */}
          <div className="relative border-b border-border">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search goals, milestones, tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-14 pl-12 pr-12 text-base border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
              autoFocus
            />
            <button
              onClick={onClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {!searchQuery.trim() ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <p className="text-sm">Start typing to search...</p>
                <p className="text-xs mt-2 opacity-60">Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">ESC</kbd> to close</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No results found for &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <div className="py-2">
                {searchResults.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className={cn(
                      "w-full px-4 py-3 flex items-start gap-3 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-primary/10"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                        {result.type.replace("-", " ")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          {searchQuery.trim() && searchResults.length > 0 && (
            <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span><kbd className="px-1 py-0.5 bg-muted rounded font-mono">↑↓</kbd> Navigate</span>
                <span><kbd className="px-1 py-0.5 bg-muted rounded font-mono">↵</kbd> Select</span>
              </div>
              <span><kbd className="px-1 py-0.5 bg-muted rounded font-mono">ESC</kbd> Close</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}


