"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, Target, CheckCircle2, ChevronRight, Filter, X, Play, Folder } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Goal, Milestone } from "@/types"
import { useGoals } from "@/components/goals-context"
import { GoalDetailView } from "@/components/goal-detail-view"
import { isMilestoneOverdue, isMilestoneDueSoon, getMilestoneDaysUntilDue } from "@/utils/date"

type StatusFilter = "all" | "in-progress" | "completed" | "overdue" | "due-soon" | "pending"

export default function MilestonesPage() {
  const { goals } = useGoals()
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  // Get all unique groups from goals
  const allGroups = useMemo(() => {
    const groups = new Set<string>()
    goals.forEach((goal) => {
      if (goal.group) {
        groups.add(goal.group)
      }
    })
    return Array.from(groups).sort()
  }, [goals])

  // Collect all milestones with their parent goal information
  const allMilestones = useMemo(() => {
    const milestones: Array<{ milestone: Milestone; goal: Goal }> = []
    goals.forEach((goal) => {
      goal.milestones.forEach((milestone) => {
        milestones.push({ milestone, goal })
      })
    })
    return milestones
  }, [goals])

  // Filter milestones
  const filteredMilestones = useMemo(() => {
    return allMilestones.filter(({ milestone, goal }) => {
      // Group filter
      if (groupFilter !== "all") {
        if (groupFilter === "ungrouped") {
          if (goal.group) return false
        } else {
          if (goal.group !== groupFilter) return false
        }
      }

      // Status filter
      const isOverdue = isMilestoneOverdue(milestone)
      const isDueSoon = isMilestoneDueSoon(milestone)

      // By default ("all"), hide completed milestones
      if (statusFilter === "all") {
        if (milestone.completed) return false
      } else {
        switch (statusFilter) {
          case "in-progress":
            if (!milestone.inProgress || milestone.completed) return false
            break
          case "completed":
            if (!milestone.completed) return false
            break
          case "overdue":
            if (!isOverdue) return false
            break
          case "due-soon":
            if (!isDueSoon || milestone.completed) return false
            break
          case "pending":
            if (milestone.completed || milestone.inProgress) return false
            break
        }
      }

      return true
    })
  }, [allMilestones, groupFilter, statusFilter])
  
  // Count of active (non-completed) milestones for display
  const activeMilestonesCount = useMemo(() => {
    return allMilestones.filter(({ milestone }) => !milestone.completed).length
  }, [allMilestones])

  // Sort milestones by target date (earliest first), milestones without dates at the end
  const sortedMilestones = useMemo(() => {
    return [...filteredMilestones].sort((a, b) => {
      // Milestones without dates go to the end
      if (!a.milestone.targetDate && !b.milestone.targetDate) return 0
      if (!a.milestone.targetDate) return 1
      if (!b.milestone.targetDate) return -1
      
      const dateA = new Date(a.milestone.targetDate).getTime()
      const dateB = new Date(b.milestone.targetDate).getTime()
      return dateA - dateB
    })
  }, [filteredMilestones])

  const hasActiveFilters = groupFilter !== "all" || statusFilter !== "all"

  const clearFilters = () => {
    setGroupFilter("all")
    setStatusFilter("all")
  }

  const selectedGoal = goals.find((g) => g.id === selectedGoalId)

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
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">All Milestones</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {statusFilter === "completed" 
                    ? `${sortedMilestones.length} completed milestone${sortedMilestones.length !== 1 ? "s" : ""}`
                    : `${sortedMilestones.length} of ${activeMilestonesCount} active milestone${activeMilestonesCount !== 1 ? "s" : ""}`
                  }
                  {hasActiveFilters && statusFilter !== "completed" && " (filtered)"}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters:</span>
            </div>

            {/* Group Filter */}
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-[120px] sm:w-[160px] h-9 text-xs sm:text-sm">
                <Folder className="h-4 w-4 mr-1 sm:mr-2 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                <SelectItem value="ungrouped">Ungrouped</SelectItem>
                {allGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-[120px] sm:w-[160px] h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Active" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Active</SelectItem>
                <SelectItem value="in-progress">
                  <span className="flex items-center gap-2">
                    <Play className="h-3 w-3 fill-current text-amber-500" />
                    In Progress
                  </span>
                </SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="due-soon">Due Soon</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="completed">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    Completed
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 gap-1 text-muted-foreground hover:text-foreground px-2 sm:px-3"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-8">
        {sortedMilestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 py-12 sm:py-16 px-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Target className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-base sm:text-lg font-semibold text-foreground text-center">No milestones yet</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground max-w-sm">
              Create goals and add milestones to see them listed here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {sortedMilestones.map(({ milestone, goal }) => {
              const isOverdue = isMilestoneOverdue(milestone)
              const isDueSoon = isMilestoneDueSoon(milestone)
              const daysUntilDue = getMilestoneDaysUntilDue(milestone)

              return (
                <div
                  key={`${goal.id}-${milestone.id}`}
                  onClick={() => setSelectedGoalId(goal.id)}
                  className={`group flex flex-col rounded-xl border p-3 sm:p-5 text-left transition-all hover:shadow-lg active:scale-[0.99] cursor-pointer ${
                    milestone.completed
                      ? "border-green-500/50 bg-green-500/5 hover:border-green-500/70"
                      : milestone.inProgress
                        ? "border-amber-500/50 bg-amber-500/5 hover:border-amber-500 hover:shadow-amber-500/5"
                        : isOverdue
                          ? "border-destructive/50 bg-destructive/5 hover:border-destructive hover:shadow-destructive/5"
                          : isDueSoon
                            ? "border-orange-500/50 bg-orange-500/5 hover:border-orange-500 hover:shadow-orange-500/5"
                            : "border-border bg-card hover:border-primary/30 hover:shadow-primary/5"
                  }`}
                >
                  <div className="mb-2 sm:mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {milestone.inProgress && !milestone.completed && (
                        <Badge className="bg-amber-500/90 hover:bg-amber-500/90 text-white text-[10px] sm:text-xs">
                          <Play className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 fill-current" />
                          In Progress
                        </Badge>
                      )}
                      {milestone.completed ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-500 border-green-500/20 text-[10px] sm:text-xs">
                          <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                          Completed
                        </Badge>
                      ) : isOverdue ? (
                        <Badge variant="destructive" className="text-[10px] sm:text-xs">
                          {daysUntilDue !== null ? `${Math.abs(daysUntilDue)}d overdue` : "Overdue"}
                        </Badge>
                      ) : isDueSoon ? (
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-500 border-orange-500/20 text-[10px] sm:text-xs">
                          {daysUntilDue === 0
                            ? "Due today"
                            : daysUntilDue === 1
                              ? "Tomorrow"
                              : `${daysUntilDue}d left`}
                        </Badge>
                      ) : daysUntilDue !== null ? (
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          {daysUntilDue > 0
                            ? `${daysUntilDue}d left`
                            : "Due today"}
                        </Badge>
                      ) : null}
                      {goal.group && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs bg-muted/50 hidden sm:flex">
                          <Folder className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                          {goal.group}
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 flex-shrink-0" />
                  </div>

                  <h3 className="mb-1 text-sm sm:text-lg font-semibold text-foreground line-clamp-2 sm:line-clamp-1">{milestone.title}</h3>
                  {milestone.description && (
                    <p className="mb-2 sm:mb-3 text-xs sm:text-sm text-muted-foreground line-clamp-2">{milestone.description}</p>
                  )}

                  <div className="mt-auto pt-2 sm:pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0">
                      <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground hidden sm:inline">From:</span>
                      <span className="font-medium text-foreground truncate">{goal.title}</span>
                    </div>
                    {milestone.targetDate ? (
                      <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span>
                          {new Date(milestone.targetDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] sm:text-xs text-muted-foreground">No date</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

