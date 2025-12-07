"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, Target, CheckCircle2, ChevronRight, Filter, X, Play, Folder, Archive, ArchiveRestore, Tag, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import type { Goal, Milestone } from "@/types"
import { useGoals } from "@/components/goals-context"
import { GoalDetailView } from "@/components/goal-detail-view"
import { isMilestoneOverdue, isMilestoneDueSoon, getMilestoneDaysUntilDue } from "@/utils/date"

type StatusFilter = "all" | "in-progress" | "completed" | "overdue" | "due-soon"
type ViewTab = "active" | "archived"

export default function MilestonesPage() {
  const { goals, archiveMilestone, unarchiveMilestone } = useGoals()
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [tagFilter, setTagFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [viewTab, setViewTab] = useState<ViewTab>("active")
  const [showFilters, setShowFilters] = useState(false)

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

  // Get all unique tags from goals
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    goals.forEach((goal) => {
      goal.tags?.forEach((tag) => {
        tags.add(tag)
      })
    })
    return Array.from(tags).sort()
  }, [goals])

  // Collect all milestones with their parent goal information
  // Exclude linked goals (nested goals that act as milestones)
  const allMilestones = useMemo(() => {
    const milestones: Array<{ milestone: Milestone; goal: Goal }> = []
    goals.forEach((goal) => {
      goal.milestones.forEach((milestone) => {
        // Skip milestones that are actually links to other goals
        if (!milestone.linkedGoalId) {
          milestones.push({ milestone, goal })
        }
      })
    })
    return milestones
  }, [goals])

  // Separate active and archived milestones
  const activeMilestones = useMemo(() => {
    return allMilestones.filter(({ milestone }) => !milestone.archived)
  }, [allMilestones])

  const archivedMilestones = useMemo(() => {
    return allMilestones.filter(({ milestone }) => milestone.archived)
  }, [allMilestones])

  // Filter milestones based on current tab
  const filteredMilestones = useMemo(() => {
    const baseMilestones = viewTab === "active" ? activeMilestones : archivedMilestones
    
    return baseMilestones.filter(({ milestone, goal }) => {
      // Group filter
      if (groupFilter !== "all") {
        if (groupFilter === "ungrouped") {
          if (goal.group) return false
        } else {
          if (goal.group !== groupFilter) return false
        }
      }

      // Tag filter
      if (tagFilter !== "all") {
        if (!goal.tags || !goal.tags.includes(tagFilter)) return false
      }

      // Status filter (only for active milestones)
      if (viewTab === "active") {
        const isOverdue = isMilestoneOverdue(milestone)
        const isDueSoon = isMilestoneDueSoon(milestone)

        switch (statusFilter) {
          case "all":
            // Show all non-completed
            if (milestone.completed) return false
            break
          case "in-progress":
            if (!milestone.inProgress || milestone.completed) return false
            break
          case "completed":
            if (!milestone.completed) return false
            break
          case "overdue":
            if (!isOverdue || milestone.completed) return false
            break
          case "due-soon":
            if (!isDueSoon || milestone.completed) return false
            break
        }
      }

      return true
    })
  }, [activeMilestones, archivedMilestones, viewTab, groupFilter, tagFilter, statusFilter])
  
  // Count of active (non-completed, non-archived) milestones for display
  const activeMilestonesCount = useMemo(() => {
    return activeMilestones.filter(({ milestone }) => !milestone.completed).length
  }, [activeMilestones])

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

  const hasActiveFilters = groupFilter !== "all" || tagFilter !== "all" || statusFilter !== "all"

  const clearFilters = () => {
    setGroupFilter("all")
    setTagFilter("all")
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

  // Count filters for badge
  const activeFilterCount = [
    groupFilter !== "all" ? 1 : 0,
    tagFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen safe-area-top">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 py-3 sm:py-4">
          {/* Top row: Back button + Title + Filter button (mobile) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link href="/">
                <Button variant="ghost" className="gap-2 -ml-2 h-9 px-2 sm:px-3 active:scale-95">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">Milestones</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {sortedMilestones.length} {viewTab === "archived" ? "archived" : statusFilter === "completed" ? "completed" : "active"}
                </p>
              </div>
            </div>
            
            {/* Mobile filter button */}
            {viewTab === "active" && (
              <Button
                variant="outline"
                size="sm"
                className="md:hidden h-9 gap-1.5 active:scale-95"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            )}
          </div>

          {/* Active/Archived toggle - simplified segmented control */}
          <div className="mt-3 flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
            <button
              onClick={() => setViewTab("active")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all active:scale-95",
                viewTab === "active" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Active
              {activeMilestonesCount > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({activeMilestonesCount})</span>
              )}
            </button>
            <button
              onClick={() => setViewTab("archived")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all active:scale-95",
                viewTab === "archived" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Archived
              {archivedMilestones.length > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({archivedMilestones.length})</span>
              )}
            </button>
          </div>

          {/* Status filter chips - horizontal scroll on mobile */}
          {viewTab === "active" && (
            <div className="mt-3 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
              <div className="flex items-center gap-2 min-w-max">
                {[
                  { value: "all", label: "All Active" },
                  { value: "in-progress", label: "In Progress", icon: Play, color: "text-amber-600" },
                  { value: "due-soon", label: "Due Soon", color: "text-orange-600" },
                  { value: "overdue", label: "Overdue", color: "text-red-600" },
                  { value: "completed", label: "Completed", icon: CheckCircle2, color: "text-green-600" },
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setStatusFilter(status.value as StatusFilter)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 whitespace-nowrap",
                      statusFilter === status.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {status.icon && <status.icon className={cn("h-3.5 w-3.5", statusFilter !== status.value && status.color)} />}
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Expandable filters section - mobile */}
          {viewTab === "active" && showFilters && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border md:hidden space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filters</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                    Clear all
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="h-10 text-sm">
                    <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    <SelectItem value="ungrouped">Ungrouped</SelectItem>
                    {allGroups.map((group) => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {allTags.length > 0 && (
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="h-10 text-sm">
                      <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {allTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {/* Desktop filters - inline */}
          {viewTab === "active" && (allGroups.length > 0 || allTags.length > 0) && (
            <div className="mt-3 hidden md:flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Filter by:</span>
              
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  <SelectItem value="ungrouped">Ungrouped</SelectItem>
                  {allGroups.map((group) => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {allTags.length > 0 && (
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger className="w-[160px] h-9 text-sm">
                    <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {allTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-8">
        {sortedMilestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 py-12 sm:py-16 px-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              {viewTab === "archived" ? (
                <Archive className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              ) : (
              <Target className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              )}
            </div>
            <h3 className="mb-2 text-base sm:text-lg font-semibold text-foreground text-center">
              {viewTab === "archived" ? "No archived milestones" : "No milestones yet"}
            </h3>
            <p className="mb-6 text-center text-sm text-muted-foreground max-w-sm">
              {viewTab === "archived" 
                ? "Archive milestones you no longer need from the active tab."
                : "Create goals and add milestones to see them listed here."
              }
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
                  className={`group flex flex-col rounded-xl border p-3 sm:p-5 text-left transition-all hover:shadow-lg ${
                    milestone.archived
                      ? "border-border/50 bg-muted/30 opacity-80"
                      : milestone.completed
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
                    <div 
                      className="flex items-center gap-1.5 sm:gap-2 flex-wrap flex-1 cursor-pointer"
                      onClick={() => setSelectedGoalId(goal.id)}
                    >
                      {milestone.archived && (
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] sm:text-xs">
                          <Archive className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                          Archived
                        </Badge>
                      )}
                      {milestone.inProgress && !milestone.completed && !milestone.archived && (
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
                      ) : !milestone.archived && isOverdue ? (
                        <Badge variant="destructive" className="text-[10px] sm:text-xs">
                          {daysUntilDue !== null ? `${Math.abs(daysUntilDue)}d overdue` : "Overdue"}
                        </Badge>
                      ) : !milestone.archived && isDueSoon ? (
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-500 border-orange-500/20 text-[10px] sm:text-xs">
                          {daysUntilDue === 0
                            ? "Due today"
                            : daysUntilDue === 1
                              ? "Tomorrow"
                              : `${daysUntilDue}d left`}
                        </Badge>
                      ) : !milestone.archived && daysUntilDue !== null ? (
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
                      {goal.tags && goal.tags.length > 0 && goal.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] sm:text-xs bg-primary/5 text-primary border-primary/20 hidden sm:flex">
                          <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {goal.tags && goal.tags.length > 2 && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs bg-muted/50 hidden sm:flex">
                          +{goal.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Archive/Unarchive button */}
                      {milestone.archived ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restore Milestone</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to restore &quot;{milestone.title}&quot; to active milestones?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => unarchiveMilestone(goal.id, milestone.id)}
                              >
                                Restore
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Archive Milestone</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to archive &quot;{milestone.title}&quot;? You can restore it later from the Archived tab.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => archiveMilestone(goal.id, milestone.id)}
                              >
                                Archive
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <ChevronRight 
                        className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 flex-shrink-0 cursor-pointer" 
                        onClick={() => setSelectedGoalId(goal.id)}
                      />
                    </div>
                  </div>

                  <div className="cursor-pointer" onClick={() => setSelectedGoalId(goal.id)}>
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
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
