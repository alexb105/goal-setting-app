"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Target, CheckCircle2, ChevronRight, Repeat, Filter, X, Folder, RefreshCw, Play, Minus, Plus, Trophy, Flame, TrendingUp, TrendingDown, Pencil, Check, Trash2, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import type { Goal, RecurringTaskGroup, RecurrenceType } from "@/types"
import { useGoals } from "@/components/goals-context"
import { GoalDetailView } from "@/components/goal-detail-view"
import { cn } from "@/lib/utils"
import { STANDALONE_MILESTONES_GOAL_TITLE } from "@/constants"

type RecurrenceFilter = "all" | "daily" | "weekly" | "monthly"
type StatusFilter = "all" | "complete" | "incomplete"

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
}

const RECURRENCE_COLORS: Record<RecurrenceType, string> = {
  daily: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  weekly: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  monthly: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
}

// Get score display info
function getScoreInfo(score: number) {
  if (score >= 50) {
    return { 
      color: "text-green-500", 
      bgColor: "bg-green-500/10", 
      borderColor: "border-green-500/30",
      icon: Flame,
      label: "On Fire!" 
    }
  } else if (score >= 20) {
    return { 
      color: "text-emerald-500", 
      bgColor: "bg-emerald-500/10", 
      borderColor: "border-emerald-500/30",
      icon: TrendingUp,
      label: "Great!" 
    }
  } else if (score >= 1) {
    return { 
      color: "text-blue-500", 
      bgColor: "bg-blue-500/10", 
      borderColor: "border-blue-500/30",
      icon: TrendingUp,
      label: "Good" 
    }
  } else if (score === 0) {
    return { 
      color: "text-muted-foreground", 
      bgColor: "bg-muted/50", 
      borderColor: "border-border",
      icon: null,
      label: "Start" 
    }
  } else if (score >= -20) {
    return { 
      color: "text-amber-500", 
      bgColor: "bg-amber-500/10", 
      borderColor: "border-amber-500/30",
      icon: TrendingDown,
      label: "Slipping" 
    }
  } else if (score >= -50) {
    return { 
      color: "text-orange-500", 
      bgColor: "bg-orange-500/10", 
      borderColor: "border-orange-500/30",
      icon: TrendingDown,
      label: "Danger" 
    }
  } else {
    return { 
      color: "text-red-500", 
      bgColor: "bg-red-500/10", 
      borderColor: "border-red-500/30",
      icon: TrendingDown,
      label: "Critical" 
    }
  }
}

function shouldAutoReset(group: RecurringTaskGroup): boolean {
  if (!group.lastResetDate) return false
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const lastReset = new Date(group.lastResetDate)
  lastReset.setHours(0, 0, 0, 0)
  
  const daysDiff = Math.floor((today.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24))
  
  switch (group.recurrence) {
    case "daily":
      return daysDiff >= 1
    case "weekly":
      // If cycleStartDay is set, reset on that specific day of the week
      if (group.cycleStartDay !== undefined) {
        const todayDayOfWeek = today.getDay()
        return todayDayOfWeek === group.cycleStartDay && daysDiff >= 1
      }
      return daysDiff >= 7
    case "monthly":
      // If cycleStartDay is set, reset on that specific day of the month
      if (group.cycleStartDay !== undefined) {
        const todayDayOfMonth = today.getDate()
        return todayDayOfMonth === group.cycleStartDay && daysDiff >= 1
      }
      return daysDiff >= 30
    default:
      return false
  }
}

// Calculate when the next reset will occur
function getNextResetInfo(group: RecurringTaskGroup): { label: string; daysUntil: number } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const lastReset = group.lastResetDate ? new Date(group.lastResetDate) : today
  lastReset.setHours(0, 0, 0, 0)
  
  let nextReset: Date
  
  switch (group.recurrence) {
    case "daily":
      // Resets tomorrow
      nextReset = new Date(today)
      nextReset.setDate(nextReset.getDate() + 1)
      break
      
    case "weekly":
      if (group.cycleStartDay !== undefined) {
        // Find next occurrence of the cycle start day
        nextReset = new Date(today)
        const currentDay = today.getDay()
        let daysUntilNext = group.cycleStartDay - currentDay
        if (daysUntilNext <= 0) {
          daysUntilNext += 7
        }
        nextReset.setDate(nextReset.getDate() + daysUntilNext)
      } else {
        // 7 days from last reset
        nextReset = new Date(lastReset)
        nextReset.setDate(nextReset.getDate() + 7)
      }
      break
      
    case "monthly":
      if (group.cycleStartDay !== undefined) {
        // Find next occurrence of the cycle start day
        nextReset = new Date(today)
        const currentDayOfMonth = today.getDate()
        if (currentDayOfMonth >= group.cycleStartDay) {
          // Move to next month
          nextReset.setMonth(nextReset.getMonth() + 1)
        }
        nextReset.setDate(Math.min(group.cycleStartDay, new Date(nextReset.getFullYear(), nextReset.getMonth() + 1, 0).getDate()))
      } else {
        // ~30 days from last reset
        nextReset = new Date(lastReset)
        nextReset.setDate(nextReset.getDate() + 30)
      }
      break
      
    default:
      nextReset = new Date(today)
      nextReset.setDate(nextReset.getDate() + 1)
  }
  
  const daysUntil = Math.ceil((nextReset.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  // Format the label
  let label: string
  if (daysUntil === 0) {
    label = "Today"
  } else if (daysUntil === 1) {
    label = "Tomorrow"
  } else {
    label = `${daysUntil} days left`
  }
  
  return { label, daysUntil }
}

export default function RecurringTasksPage() {
  const { 
    goals, 
    addGoal, 
    addRecurringTaskGroup, 
    updateRecurringTaskGroup,
    deleteRecurringTaskGroup,
    addRecurringTask,
    updateRecurringTask,
    toggleRecurringTask, 
    deleteRecurringTask,
    resetRecurringTaskGroup 
  } = useGoals()
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [recurrenceFilter, setRecurrenceFilter] = useState<RecurrenceFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string> | null>(null) // null = not initialized yet
  
  // Add recurring task group dialog state
  const [addGroupOpen, setAddGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupRecurrence, setNewGroupRecurrence] = useState<RecurrenceType>("daily")
  const [newGroupGoalId, setNewGroupGoalId] = useState<string>("standalone")
  const [pendingGroup, setPendingGroup] = useState<{
    name: string
    recurrence: RecurrenceType
  } | null>(null)

  // Editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTaskTitle, setEditingTaskTitle] = useState("")
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [editingGroupRecurrence, setEditingGroupRecurrence] = useState<RecurrenceType>("daily")
  const [editingGroupCycleStartDay, setEditingGroupCycleStartDay] = useState<number | undefined>(undefined)
  
  // Adding task state
  const [addingTaskToGroup, setAddingTaskToGroup] = useState<{ goalId: string; groupId: string } | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")

  // Find the standalone goal by title
  const standaloneGoal = useMemo(() => {
    return goals.find(g => g.title === STANDALONE_MILESTONES_GOAL_TITLE)
  }, [goals])

  // Get active goals for the dropdown (excluding standalone and archived)
  const selectableGoals = useMemo(() => {
    return goals.filter(g => 
      g.title !== STANDALONE_MILESTONES_GOAL_TITLE && 
      !g.archived
    )
  }, [goals])

  // Effect to add pending recurring group after standalone goal is created
  useEffect(() => {
    if (pendingGroup && standaloneGoal) {
      addRecurringTaskGroup(standaloneGoal.id, pendingGroup.name, pendingGroup.recurrence)
      setPendingGroup(null)
    }
  }, [standaloneGoal, pendingGroup, addRecurringTaskGroup])

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return

    if (newGroupGoalId === "standalone") {
      if (standaloneGoal) {
        // Standalone goal exists, add group directly
        addRecurringTaskGroup(standaloneGoal.id, newGroupName.trim(), newGroupRecurrence)
      } else {
        // Create standalone goal first, then add group via effect
        setPendingGroup({
          name: newGroupName.trim(),
          recurrence: newGroupRecurrence,
        })
        addGoal({
          title: STANDALONE_MILESTONES_GOAL_TITLE,
          description: "Quick milestones not tied to any specific goal",
          tags: [],
          targetDate: "",
          milestones: [],
          showProgress: false,
        })
      }
    } else {
      // Add to specific goal
      addRecurringTaskGroup(newGroupGoalId, newGroupName.trim(), newGroupRecurrence)
    }

    resetAddGroupForm()
  }

  const resetAddGroupForm = () => {
    setAddGroupOpen(false)
    setNewGroupName("")
    setNewGroupRecurrence("daily")
    setNewGroupGoalId("standalone")
  }

  // Task editing handlers
  const handleStartEditTask = (taskId: string, taskTitle: string) => {
    setEditingTaskId(taskId)
    setEditingTaskTitle(taskTitle)
  }

  const handleSaveEditTask = (goalId: string, groupId: string, taskId: string) => {
    if (!editingTaskTitle.trim()) {
      handleCancelEditTask()
      return
    }
    updateRecurringTask(goalId, groupId, taskId, editingTaskTitle.trim())
    setEditingTaskId(null)
    setEditingTaskTitle("")
  }

  const handleCancelEditTask = () => {
    setEditingTaskId(null)
    setEditingTaskTitle("")
  }

  // Group editing handlers
  const handleStartEditGroup = (group: RecurringTaskGroup) => {
    setEditingGroupId(group.id)
    setEditingGroupName(group.name)
    setEditingGroupRecurrence(group.recurrence)
    setEditingGroupCycleStartDay(group.cycleStartDay)
  }

  const handleSaveEditGroup = (goalId: string, groupId: string) => {
    if (!editingGroupName.trim()) return
    updateRecurringTaskGroup(goalId, groupId, {
      name: editingGroupName.trim(),
      recurrence: editingGroupRecurrence,
      cycleStartDay: editingGroupRecurrence !== "daily" ? editingGroupCycleStartDay : undefined,
    })
    setEditingGroupId(null)
    setEditingGroupName("")
    setEditingGroupRecurrence("daily")
    setEditingGroupCycleStartDay(undefined)
  }

  const handleCancelEditGroup = () => {
    setEditingGroupId(null)
    setEditingGroupName("")
    setEditingGroupRecurrence("daily")
    setEditingGroupCycleStartDay(undefined)
  }

  // Add task handlers
  const handleAddTask = (goalId: string, groupId: string, isSeparator = false) => {
    if (!newTaskTitle.trim()) return
    addRecurringTask(goalId, groupId, newTaskTitle.trim(), isSeparator)
    setNewTaskTitle("")
    setAddingTaskToGroup(null)
  }

  const handleAddSeparator = (goalId: string, groupId: string) => {
    const separatorText = prompt("Enter header text:")
    if (separatorText?.trim()) {
      addRecurringTask(goalId, groupId, separatorText.trim(), true)
    }
  }

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

  // Collect all recurring task groups with their parent goal information
  const allRecurringGroups = useMemo(() => {
    const groups: Array<{ group: RecurringTaskGroup; goal: Goal }> = []
    goals.forEach((goal) => {
      (goal.recurringTaskGroups || []).forEach((group) => {
        groups.push({ group, goal })
      })
    })
    return groups
  }, [goals])

  // Initialize all groups as collapsed by default
  useEffect(() => {
    if (collapsedGroups === null && allRecurringGroups.length > 0) {
      const allGroupIds = new Set(allRecurringGroups.map(({ group }) => group.id))
      setCollapsedGroups(allGroupIds)
    }
  }, [allRecurringGroups, collapsedGroups])

  // Auto-reset groups based on their recurrence schedule
  useEffect(() => {
    allRecurringGroups.forEach(({ group, goal }) => {
      if (shouldAutoReset(group)) {
        // Pass true to indicate this is an auto-reset (affects score)
        resetRecurringTaskGroup(goal.id, group.id, true)
      }
    })
  }, [allRecurringGroups, resetRecurringTaskGroup])

  // Filter recurring groups
  const filteredGroups = useMemo(() => {
    return allRecurringGroups.filter(({ group, goal }) => {
      // Group filter (goal's group)
      if (groupFilter !== "all") {
        if (groupFilter === "ungrouped") {
          if (goal.group) return false
        } else {
          if (goal.group !== groupFilter) return false
        }
      }

      // Recurrence filter
      if (recurrenceFilter !== "all" && group.recurrence !== recurrenceFilter) {
        return false
      }

      // Status filter
      if (statusFilter !== "all") {
        const regularTasks = group.tasks.filter((t) => !t.isSeparator)
        const completedCount = regularTasks.filter((t) => t.completed).length
        const isComplete = regularTasks.length > 0 && completedCount === regularTasks.length

        if (statusFilter === "complete" && !isComplete) return false
        if (statusFilter === "incomplete" && isComplete) return false
      }

      return true
    })
  }, [allRecurringGroups, groupFilter, recurrenceFilter, statusFilter])

  // Helper to get non-separator tasks
  const getRegularTasks = (tasks: typeof allRecurringGroups[0]["group"]["tasks"]) => {
    return tasks.filter((t) => !t.isSeparator)
  }

  // Sort by recurrence type (daily first, then weekly, then monthly)
  const sortedGroups = useMemo(() => {
    const order: Record<RecurrenceType, number> = { daily: 0, weekly: 1, monthly: 2 }
    return [...filteredGroups].sort((a, b) => order[a.group.recurrence] - order[b.group.recurrence])
  }, [filteredGroups])

  const hasActiveFilters = groupFilter !== "all" || recurrenceFilter !== "all" || statusFilter !== "all"

  const clearFilters = () => {
    setGroupFilter("all")
    setRecurrenceFilter("all")
    setStatusFilter("all")
  }

  const toggleCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev || [])
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  // Check if a group is collapsed (default to collapsed if not initialized)
  const isGroupCollapsed = (groupId: string) => {
    if (collapsedGroups === null) return true // Default to collapsed
    return collapsedGroups.has(groupId)
  }

  // Calculate stats (excluding separators)
  const totalGroups = allRecurringGroups.length
  const totalTasks = allRecurringGroups.reduce((acc, { group }) => acc + getRegularTasks(group.tasks).length, 0)
  const completedTasks = allRecurringGroups.reduce(
    (acc, { group }) => acc + getRegularTasks(group.tasks).filter((t) => t.completed).length,
    0
  )
  const completeGroups = allRecurringGroups.filter(
    ({ group }) => {
      const regularTasks = getRegularTasks(group.tasks)
      return regularTasks.length > 0 && regularTasks.every((t) => t.completed)
    }
  ).length
  const totalCompletions = allRecurringGroups.reduce(
    (acc, { group }) => acc + (group.completionCount || 0),
    0
  )

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
      <header className="border-b border-border glass-strong sticky top-0 z-40">
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
                <h1 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-1.5 sm:gap-2">
                  <Repeat className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                  <span className="truncate">Recurring</span>
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {sortedGroups.length} of {totalGroups} group{totalGroups !== 1 ? "s" : ""}
                  {hasActiveFilters && " (filtered)"}
                </p>
              </div>
            </div>
            
            {/* Add Recurring Group button */}
            <Button
              size="sm"
              className="h-9 gap-1.5 active:scale-95"
              onClick={() => setAddGroupOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>

          {/* Stats - Compact on mobile */}
          {totalGroups > 0 && (
            <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
              <div className="rounded-lg border bg-card p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Groups</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{totalGroups}</p>
              </div>
              <div className="rounded-lg border bg-card p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Complete</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{completeGroups}</p>
              </div>
              <div className="rounded-lg border bg-card p-2 sm:p-3 hidden sm:block">
                <p className="text-xs text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold text-foreground">{totalTasks}</p>
              </div>
              <div className="rounded-lg border bg-card p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Tasks Done</p>
                <p className="text-xl sm:text-2xl font-bold text-primary">{completedTasks}/{totalTasks}</p>
              </div>
              <div className="rounded-lg border bg-card p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                  <Trophy className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500" />
                  <span className="hidden sm:inline">All-Time</span>
                </p>
                <p className="text-xl sm:text-2xl font-bold text-amber-600">{totalCompletions}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          {totalGroups > 0 && (
            <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters:</span>
              </div>

              {/* Goal Group Filter */}
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[110px] sm:w-[160px] h-9 text-xs sm:text-sm">
                  <Folder className="h-4 w-4 mr-1 sm:mr-2 text-muted-foreground flex-shrink-0" />
                  <SelectValue placeholder="Groups" />
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

              {/* Recurrence Filter */}
              <Select value={recurrenceFilter} onValueChange={(v) => setRecurrenceFilter(v as RecurrenceFilter)}>
                <SelectTrigger className="w-[100px] sm:w-[140px] h-9 text-xs sm:text-sm">
                  <Repeat className="h-4 w-4 mr-1 sm:mr-2 text-muted-foreground flex-shrink-0" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter - Hidden on smallest screens */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[100px] sm:w-[140px] h-9 text-xs sm:text-sm hidden xs:flex">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
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
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-8">
        {sortedGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 py-12 sm:py-16 px-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Repeat className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-base sm:text-lg font-semibold text-foreground text-center">
              {hasActiveFilters ? "No matching recurring tasks" : "No recurring tasks yet"}
            </h3>
            <p className="mb-6 text-center text-sm text-muted-foreground max-w-sm">
              {hasActiveFilters
                ? "Try adjusting your filters to see more results."
                : "Create recurring task groups in your goals to track habits."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {sortedGroups.map(({ group, goal }) => {
              const regularTasks = getRegularTasks(group.tasks)
              const completedCount = regularTasks.filter((t) => t.completed).length
              const isComplete = regularTasks.length > 0 && completedCount === regularTasks.length
              const isCollapsed = isGroupCollapsed(group.id)
              const progress = regularTasks.length > 0 ? (completedCount / regularTasks.length) * 100 : 0
              const score = group.score ?? 0
              const scoreInfo = getScoreInfo(score)
              const ScoreIcon = scoreInfo.icon

              return (
                <div
                  key={`${goal.id}-${group.id}`}
                  className={cn(
                    "rounded-xl border bg-card transition-all",
                    isComplete
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <Collapsible open={!isCollapsed} onOpenChange={() => toggleCollapse(group.id)}>
                    <CollapsibleTrigger asChild>
                      <div className="p-3 sm:p-4 cursor-pointer hover:bg-muted/50 rounded-t-xl transition-colors">
                        {editingGroupId === group.id ? (
                          <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editingGroupName}
                              onChange={(e) => setEditingGroupName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEditGroup(goal.id, group.id)
                                if (e.key === "Escape") handleCancelEditGroup()
                              }}
                              className="h-8 w-full sm:w-40 text-sm"
                              autoFocus
                            />
                            <Select
                              value={editingGroupRecurrence}
                              onValueChange={(v) => setEditingGroupRecurrence(v as RecurrenceType)}
                            >
                              <SelectTrigger className="h-8 w-28 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                            {editingGroupRecurrence === "weekly" && (
                              <Select
                                value={editingGroupCycleStartDay?.toString() ?? "1"}
                                onValueChange={(v) => setEditingGroupCycleStartDay(parseInt(v))}
                              >
                                <SelectTrigger className="h-8 w-28 text-xs">
                                  <SelectValue placeholder="Start day" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">Sunday</SelectItem>
                                  <SelectItem value="1">Monday</SelectItem>
                                  <SelectItem value="2">Tuesday</SelectItem>
                                  <SelectItem value="3">Wednesday</SelectItem>
                                  <SelectItem value="4">Thursday</SelectItem>
                                  <SelectItem value="5">Friday</SelectItem>
                                  <SelectItem value="6">Saturday</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {editingGroupRecurrence === "monthly" && (
                              <Select
                                value={editingGroupCycleStartDay?.toString() ?? "1"}
                                onValueChange={(v) => setEditingGroupCycleStartDay(parseInt(v))}
                              >
                                <SelectTrigger className="h-8 w-24 text-xs">
                                  <SelectValue placeholder="Day" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <SelectItem key={day} value={day.toString()}>
                                      {day}{day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSaveEditGroup(goal.id, group.id)
                                }}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCancelEditGroup()
                                }}
                              >
                                <X className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            {/* Left side - Title and info */}
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <ChevronRight
                                className={cn(
                                  "h-5 w-5 text-muted-foreground transition-transform mt-0.5 flex-shrink-0",
                                  !isCollapsed && "rotate-90"
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                {/* Title */}
                                <h3 className={cn(
                                  "font-semibold text-foreground leading-tight",
                                  isComplete && "text-green-700 dark:text-green-500"
                                )}>
                                  {group.name}
                                </h3>
                                
                                {/* Goal name */}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  <Target className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{goal.title}</span>
                                </div>
                                
                                {/* Compact info row */}
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                                  <span className={cn("font-medium", RECURRENCE_COLORS[group.recurrence].split(" ").find(c => c.startsWith("text-")))}>
                                    {RECURRENCE_LABELS[group.recurrence]}
                                  </span>
                                  <span>•</span>
                                  <span>{completedCount}/{regularTasks.length} tasks</span>
                                  {group.cycleStartDay !== undefined && (
                                    <>
                                      <span>•</span>
                                      <span>
                                        {group.recurrence === "weekly" 
                                          ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][group.cycleStartDay]
                                          : `${group.cycleStartDay}${group.cycleStartDay === 1 ? "st" : group.cycleStartDay === 2 ? "nd" : group.cycleStartDay === 3 ? "rd" : "th"}`
                                        }
                                      </span>
                                    </>
                                  )}
                                  <span>•</span>
                                  {(() => {
                                    const resetInfo = getNextResetInfo(group)
                                    return (
                                      <span className={cn(
                                        "flex items-center gap-1",
                                        resetInfo.daysUntil <= 1 && "text-amber-500"
                                      )}>
                                        <Clock className="h-3 w-3" />
                                        {resetInfo.label}
                                      </span>
                                    )
                                  })()}
                                </div>
                                
                                {/* Streak and completion status */}
                                <div className={cn("flex items-center gap-1.5 mt-1.5 text-xs", scoreInfo.color)}>
                                  {ScoreIcon && <ScoreIcon className="h-3 w-3" />}
                                  <span className="font-medium">
                                    {score > 0 ? '+' : ''}{score} streak
                                  </span>
                                  {isComplete && (
                                    <span className="text-green-600 dark:text-green-400 font-medium ml-1">✓ Done</span>
                                  )}
                                  {/* Progress bar */}
                                  <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden ml-2">
                                    <div 
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Right side - Action buttons */}
                            <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartEditGroup(group)
                                }}
                                title="Edit group"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    title="Delete group"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Recurring Task Group</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete &quot;{group.name}&quot;? This will remove all tasks in this group.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteRecurringTaskGroup(goal.id, group.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedGoalId(goal.id)
                                }}
                                title="View goal"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 sm:px-5 pb-3 sm:pb-5 pt-2 border-t border-border/50">
                        {group.tasks.length > 0 ? (
                          <div className="space-y-1.5 sm:space-y-2">
                            {group.tasks.map((task) => {
                              const isEditingThisTask = editingTaskId === task.id
                              
                              // Render separator/header differently
                              if (task.isSeparator) {
                                return (
                                  <div
                                    key={task.id}
                                    className="flex items-center gap-2 sm:gap-3 rounded-lg bg-muted/50 p-2 sm:p-3"
                                  >
                                    <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                    {isEditingThisTask ? (
                                      <>
                                        <Input
                                          value={editingTaskTitle}
                                          onChange={(e) => setEditingTaskTitle(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveEditTask(goal.id, group.id, task.id)
                                            if (e.key === "Escape") handleCancelEditTask()
                                          }}
                                          className="flex-1 h-8 text-xs sm:text-sm font-semibold"
                                          autoFocus
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-green-600 hover:text-green-700"
                                          onClick={() => handleSaveEditTask(goal.id, group.id, task.id)}
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                          onClick={handleCancelEditTask}
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-xs sm:text-sm font-semibold text-foreground">
                                          {task.title}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                          onClick={() => handleStartEditTask(task.id, task.title)}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                          onClick={() => deleteRecurringTask(goal.id, group.id, task.id)}
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                )
                              }

                              // Regular task
                              return (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-2 sm:gap-3 rounded-lg border bg-card/50 p-2.5 sm:p-3"
                                >
                                  <Checkbox
                                    id={`page-recurring-${task.id}`}
                                    checked={task.completed}
                                    onCheckedChange={() => toggleRecurringTask(goal.id, group.id, task.id)}
                                    className="h-5 w-5"
                                    disabled={isEditingThisTask}
                                  />
                                  {isEditingThisTask ? (
                                    <>
                                      <Input
                                        value={editingTaskTitle}
                                        onChange={(e) => setEditingTaskTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleSaveEditTask(goal.id, group.id, task.id)
                                          if (e.key === "Escape") handleCancelEditTask()
                                        }}
                                        className="flex-1 h-8 text-xs sm:text-sm"
                                        autoFocus
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-green-600 hover:text-green-700"
                                        onClick={() => handleSaveEditTask(goal.id, group.id, task.id)}
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={handleCancelEditTask}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <label
                                        htmlFor={`page-recurring-${task.id}`}
                                        className={cn(
                                          "flex-1 text-xs sm:text-sm cursor-pointer",
                                          task.completed ? "line-through text-muted-foreground" : "text-foreground"
                                        )}
                                      >
                                        {task.title}
                                      </label>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => handleStartEditTask(task.id, task.title)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => deleteRecurringTask(goal.id, group.id, task.id)}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-muted-foreground text-center py-3">
                            No tasks in this group yet.
                          </p>
                        )}
                        
                        {/* Add Task Section */}
                        {addingTaskToGroup?.goalId === goal.id && addingTaskToGroup?.groupId === group.id ? (
                          <div className="flex items-center gap-2 mt-3">
                            <Input
                              placeholder="Task name..."
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddTask(goal.id, group.id)
                                if (e.key === "Escape") {
                                  setAddingTaskToGroup(null)
                                  setNewTaskTitle("")
                                }
                              }}
                              className="flex-1 h-9 text-sm"
                              autoFocus
                            />
                            <Button size="sm" onClick={() => handleAddTask(goal.id, group.id)}>
                              Add
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAddingTaskToGroup(null)
                                setNewTaskTitle("")
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2 h-9"
                              onClick={() => setAddingTaskToGroup({ goalId: goal.id, groupId: group.id })}
                            >
                              <Plus className="h-4 w-4" />
                              Add Task
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 h-9"
                              onClick={() => handleAddSeparator(goal.id, group.id)}
                              title="Add a header to organize tasks"
                            >
                              <Minus className="h-4 w-4" />
                              Header
                            </Button>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Recurring Group Dialog */}
      <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Recurring Task Group</DialogTitle>
            <DialogDescription>
              Create a new recurring task group to track habits.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name *</Label>
              <Input
                id="group-name"
                placeholder="e.g., Morning Routine, Exercise"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-recurrence">Recurrence</Label>
              <Select value={newGroupRecurrence} onValueChange={(v) => setNewGroupRecurrence(v as RecurrenceType)}>
                <SelectTrigger id="group-recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs", RECURRENCE_COLORS.daily)}>Daily</Badge>
                      <span className="text-muted-foreground text-xs">Resets every day</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs", RECURRENCE_COLORS.weekly)}>Weekly</Badge>
                      <span className="text-muted-foreground text-xs">Resets every week</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="monthly">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs", RECURRENCE_COLORS.monthly)}>Monthly</Badge>
                      <span className="text-muted-foreground text-xs">Resets every month</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-goal">Assign to Goal</Label>
              <Select value={newGroupGoalId} onValueChange={setNewGroupGoalId}>
                <SelectTrigger id="group-goal">
                  <SelectValue placeholder="Select a goal (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone">
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-muted-foreground" />
                      <span>Quick Habits (no goal)</span>
                    </div>
                  </SelectItem>
                  {selectableGoals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      <div className="flex items-center gap-2">
                        {goal.color && (
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: goal.color }}
                          />
                        )}
                        <span className="truncate">{goal.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Quick habits are stored separately and aren't tied to a specific goal.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetAddGroupForm}>
              Cancel
            </Button>
            <Button onClick={handleAddGroup} disabled={!newGroupName.trim()}>
              Add Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

