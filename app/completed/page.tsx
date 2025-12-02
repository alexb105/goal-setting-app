"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Target, Calendar, Tag, X, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Goal } from "@/types"
import { useGoals } from "@/components/goals-context"
import { GoalCard } from "@/components/goal-card"
import { GoalDetailView } from "@/components/goal-detail-view"
import { isGoalCompleted } from "@/utils/goals"

export default function CompletedGoalsPage() {
  const { goals, getAllTags } = useGoals()
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"date" | "priority">("date")

  // Filter to only completed goals
  const completedGoals = useMemo(() => {
    return goals.filter(isGoalCompleted)
  }, [goals])

  const allTags = getAllTags()

  const filteredGoals = useMemo(() => {
    if (selectedTags.length > 0) {
      return completedGoals.filter((goal) => selectedTags.every((tag) => goal.tags.includes(tag)))
    }
    return completedGoals
  }, [completedGoals, selectedTags])

  // Sort goals
  const sortedGoals = useMemo(() => {
    return [...filteredGoals].sort((a, b) => {
      if (sortBy === "priority") {
        const priorityA = a.priority || 0
        const priorityB = b.priority || 0
        return priorityB - priorityA
      } else {
        // Sort by date created (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
  }, [filteredGoals, sortBy])

  const selectedGoal = goals.find((g) => g.id === selectedGoalId)

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const clearTagFilters = () => {
    setSelectedTags([])
  }

  if (selectedGoal) {
    return (
      <GoalDetailView
        goal={selectedGoal}
        onBack={() => setSelectedGoalId(null)}
        onNavigateToGoal={(goalId) => setSelectedGoalId(goalId)}
      />
    )
  }

  return (
    <div className="min-h-screen safe-area-top">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link href="/">
                <Button variant="ghost" className="gap-2 -ml-2 h-9 px-2 sm:px-3">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-green-500 flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Completed</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {completedGoals.length} goal{completedGoals.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-8">
        {/* Sort and Tag Filter Section */}
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          {/* Sort Section */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Sort by</span>
            </div>
            <Select value={sortBy} onValueChange={(value: "date" | "priority") => setSortBy(value)}>
              <SelectTrigger className="w-[140px] sm:w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Created</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tag Filter Section */}
          <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">Filter by tags</span>
              {selectedTags.length > 0 && (
                <button
                  onClick={clearTagFilters}
                  className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                  <span className="hidden sm:inline">Clear filters</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              )}
            </div>
            {allTags.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      className={`rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition-all active-scale ${
                        selectedTags.includes(tag)
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Showing <span className="font-medium text-foreground">{sortedGoals.length}</span> of{" "}
                      <span className="font-medium text-foreground">{completedGoals.length}</span> goals
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                        >
                          {tag}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleTagFilter(tag)
                            }}
                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">
                No tags yet. Add tags to your goals to filter them.
              </p>
            )}
          </div>
        </div>

        {/* Goals Grid */}
        {completedGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 py-12 sm:py-16 px-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
              <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
            </div>
            <h3 className="mb-2 text-base sm:text-lg font-semibold text-foreground text-center">No completed goals yet</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground max-w-sm">
              Complete all milestones in a goal to see it here.
            </p>
            <Link href="/">
              <Button className="gap-2">
                <Target className="h-4 w-4" />
                View Active Goals
              </Button>
            </Link>
          </div>
        ) : sortedGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 py-12 sm:py-16 px-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Tag className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-base sm:text-lg font-semibold text-foreground text-center">No matching goals</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground max-w-sm">
              No completed goals match the selected tags.
            </p>
            <Button variant="outline" onClick={clearTagFilters} className="gap-2 bg-transparent">
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {sortedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => setSelectedGoalId(goal.id)}
                onNavigateToGoal={(goalId) => setSelectedGoalId(goalId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

