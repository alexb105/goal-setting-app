"use client"

import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Target, CheckCircle2, ChevronRight, Repeat, Filter, X, Folder, RefreshCw, Play, Minus, Plus, Trophy, Flame, TrendingUp, TrendingDown, Pencil, Check, Trash2, Calendar, Clock, GripVertical } from "lucide-react"
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
import type { Goal, RecurringTaskGroup, RecurrenceType, RecurringGroupDivider } from "@/types"
import { useGoals } from "@/components/goals-context"
import { GoalDetailView } from "@/components/goal-detail-view"
import { cn } from "@/lib/utils"
import { STANDALONE_MILESTONES_GOAL_TITLE } from "@/constants"
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core"
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useDndSensors } from "@/hooks/use-dnd-sensors"

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

// Sortable Group Component
interface SortableGroupItemProps {
  item: { type: "group"; data: { group: RecurringTaskGroup; goal: Goal }; id: string }
  isCollapsed: boolean
  isComplete: boolean
  progress: number
  completedCount: number
  regularTasks: any[]
  score: number
  scoreInfo: ReturnType<typeof getScoreInfo>
  ScoreIcon: any
  editingGroupId: string | null
  editingGroupName: string
  editingGroupRecurrence: RecurrenceType
  editingGroupCycleStartDay: number | undefined
  onToggleCollapse: () => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onSetEditingGroupName: (name: string) => void
  onSetEditingGroupRecurrence: (v: RecurrenceType) => void
  onSetEditingGroupCycleStartDay: (v: number | undefined) => void
  onDelete: () => void
  isOver?: boolean
  children: React.ReactNode
}

function SortableGroupItem({
  item,
  isCollapsed,
  isComplete,
  progress,
  completedCount,
  regularTasks,
  score,
  scoreInfo,
  ScoreIcon,
  editingGroupId,
  editingGroupName,
  editingGroupRecurrence,
  editingGroupCycleStartDay,
  onToggleCollapse,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onSetEditingGroupName,
  onSetEditingGroupRecurrence,
  onSetEditingGroupCycleStartDay,
  onDelete,
  isOver = false,
  children,
}: SortableGroupItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.4 : 1,
    scale: isDragging ? 0.98 : 1,
  }

  const { group, goal } = item.data

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border bg-card transition-all duration-200",
        isComplete
          ? "border-green-500/50 bg-green-500/5"
          : "border-border hover:border-primary/30",
        isDragging && "shadow-2xl ring-2 ring-primary/40 scale-[0.98] z-50",
        isOver && !isDragging && "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
      )}
    >
      <Collapsible open={!isCollapsed} onOpenChange={onToggleCollapse}>
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-muted/30 rounded-t-xl transition-colors">
            {editingGroupId === group.id ? (
              <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editingGroupName}
                              onChange={(e) => onSetEditingGroupName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") onSaveEdit()
                                if (e.key === "Escape") onCancelEdit()
                              }}
                              className="h-9 flex-1 min-w-[150px]"
                              autoFocus
                            />
                <Select
                  value={editingGroupRecurrence}
                  onValueChange={(v) => onSetEditingGroupRecurrence(v as RecurrenceType)}
                >
                  <SelectTrigger className="h-9 w-28">
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
                    onValueChange={(v) => onSetEditingGroupCycleStartDay(parseInt(v))}
                  >
                    <SelectTrigger className="h-9 w-28">
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
                    onValueChange={(v) => onSetEditingGroupCycleStartDay(parseInt(v))}
                  >
                    <SelectTrigger className="h-9 w-24">
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
                    variant="default"
                    className="h-9 w-9"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSaveEdit()
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCancelEdit()
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {/* Drag handle - mobile friendly */}
                <div
                  {...attributes}
                  {...listeners}
                  className="flex-shrink-0 touch-target p-1.5 -ml-0.5 text-muted-foreground hover:text-primary transition-all cursor-grab active:cursor-grabbing flex items-center justify-center rounded-md hover:bg-primary/10 active:bg-primary/20 group/drag"
                  onClick={(e) => e.stopPropagation()}
                  title="Drag to reorder"
                >
                  <GripVertical className="h-5 w-5 group-hover/drag:scale-110 transition-transform" />
                </div>

                {/* Circular progress indicator */}
                <div className="relative flex-shrink-0">
                  <svg className="w-12 h-12 -rotate-90">
                    <circle
                      cx="24" cy="24" r="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-muted/30"
                    />
                    <circle
                      cx="24" cy="24" r="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${progress * 1.257} 125.7`}
                      className={isComplete ? "text-green-500" : "text-primary"}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <span className="text-xs font-bold">{completedCount}/{regularTasks.length}</span>
                    )}
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={cn(
                      "font-semibold text-foreground truncate",
                      isComplete && "text-green-600 dark:text-green-400"
                    )}>
                      {group.name}
                    </h3>
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                      group.recurrence === "daily" && "bg-blue-500/10 text-blue-500",
                      group.recurrence === "weekly" && "bg-purple-500/10 text-purple-500",
                      group.recurrence === "monthly" && "bg-green-500/10 text-green-500"
                    )}>
                      {RECURRENCE_LABELS[group.recurrence]}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {(() => {
                      const resetInfo = getNextResetInfo(group)
                      return (
                        <span className={cn(
                          "flex items-center gap-1",
                          resetInfo.daysUntil <= 1 && "text-amber-500 font-medium"
                        )}>
                          <Clock className="h-3 w-3" />
                          {resetInfo.label}
                        </span>
                      )
                    })()}
                    {score !== 0 && (
                      <>
                        <span>•</span>
                        <span className={cn("flex items-center gap-0.5 font-medium", scoreInfo.color)}>
                          {ScoreIcon && <ScoreIcon className="h-3 w-3" />}
                          {score > 0 ? '+' : ''}{score}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartEdit()
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Habit</AlertDialogTitle>
                        <AlertDialogDescription>
                          Delete &quot;{group.name}&quot; and all its tasks?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={onDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <ChevronRight
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform",
                      !isCollapsed && "rotate-90"
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        </CollapsibleTrigger>
        {children}
      </Collapsible>
    </div>
  )
}

// Sortable Divider Component
interface SortableDividerItemProps {
  item: { type: "divider"; data: RecurringGroupDivider; id: string }
  editingDividerId: string | null
  editingDividerTitle: string
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onSetEditingDividerTitle: (title: string) => void
  onDelete: () => void
  isOver?: boolean
}

function SortableDividerItem({
  item,
  editingDividerId,
  editingDividerTitle,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onSetEditingDividerTitle,
  onDelete,
  isOver = false,
}: SortableDividerItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.4 : 1,
    scale: isDragging ? 0.98 : 1,
  }

  const divider = item.data
  const isEditing = editingDividerId === divider.id

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1.5 py-3 px-1 transition-all duration-200",
        isDragging && "shadow-2xl ring-2 ring-primary/40 scale-[0.98] z-50",
        isOver && !isDragging && "bg-primary/5 rounded-lg"
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 touch-target p-1.5 -ml-0.5 text-muted-foreground hover:text-primary transition-all cursor-grab active:cursor-grabbing flex items-center justify-center rounded-md hover:bg-primary/10 active:bg-primary/20 group/drag"
        title="Drag to reorder"
      >
        <GripVertical className="h-5 w-5 group-hover/drag:scale-110 transition-transform" />
      </div>

      {isEditing ? (
        <>
          <Input
            value={editingDividerTitle}
            onChange={(e) => onSetEditingDividerTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit()
              if (e.key === "Escape") onCancelEdit()
            }}
            className="flex-1 h-9 text-sm font-semibold"
            autoFocus
          />
          <Button
            variant="default"
            size="icon"
            className="h-9 w-9"
            onClick={onSaveEdit}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onCancelEdit}
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-base font-semibold text-foreground uppercase tracking-wide">
            {divider.title}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground/50 hover:text-foreground"
            onClick={onStartEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground/50 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Divider</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete the divider &quot;{divider.title}&quot;?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
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

  // Divider state
  const STORAGE_KEY_DIVIDERS = "goalritual-recurring-group-dividers"
  const STORAGE_KEY_ORDER = "goalritual-recurring-groups-order"
  const [dividers, setDividers] = useState<RecurringGroupDivider[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_DIVIDERS)
      return stored ? JSON.parse(stored) : []
    }
    return []
  })

  // Custom order state (array of IDs: "group-{goalId}-{groupId}" or "divider-{dividerId}")
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_ORDER)
      return stored ? JSON.parse(stored) : []
    }
    return []
  })

  // Save dividers to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_DIVIDERS, JSON.stringify(dividers))
    }
  }, [dividers])

  // Save order to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && customOrder.length > 0) {
      localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(customOrder))
    }
  }, [customOrder])

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const sensors = useDndSensors()

  // Divider dialog state
  const [addDividerOpen, setAddDividerOpen] = useState(false)
  const [newDividerTitle, setNewDividerTitle] = useState("")
  const [newDividerPosition, setNewDividerPosition] = useState(0)
  const [editingDividerId, setEditingDividerId] = useState<string | null>(null)
  const [editingDividerTitle, setEditingDividerTitle] = useState("")

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

  // Sort by recurrence type (daily first, then weekly, then monthly) - default order
  const sortedGroups = useMemo(() => {
    const order: Record<RecurrenceType, number> = { daily: 0, weekly: 1, monthly: 2 }
    return [...filteredGroups].sort((a, b) => order[a.group.recurrence] - order[b.group.recurrence])
  }, [filteredGroups])

  // Helper to generate IDs for items
  const getGroupId = (goalId: string, groupId: string) => `group-${goalId}-${groupId}`
  const getDividerId = (dividerId: string) => `divider-${dividerId}`

  // Combine groups and dividers for rendering with custom order support
  type ListItem = 
    | { type: "group"; data: { group: RecurringTaskGroup; goal: Goal }; id: string }
    | { type: "divider"; data: RecurringGroupDivider; id: string }

  const combinedList = useMemo(() => {
    // Create all items with their IDs
    const allItems: ListItem[] = []
    
    // Add groups
    sortedGroups.forEach((groupData) => {
      allItems.push({
        type: "group",
        data: groupData,
        id: getGroupId(groupData.goal.id, groupData.group.id)
      })
    })
    
    // Add dividers
    dividers.forEach((divider) => {
      allItems.push({
        type: "divider",
        data: divider,
        id: getDividerId(divider.id)
      })
    })

    // If we have a custom order, use it
    if (customOrder.length > 0) {
      // Create a map for quick lookup
      const itemsMap = new Map(allItems.map(item => [item.id, item]))
      
      // Build ordered list from custom order, filtering out items that no longer exist
      const ordered: ListItem[] = []
      const usedIds = new Set<string>()
      
      // Add items in custom order
      customOrder.forEach(id => {
        const item = itemsMap.get(id)
        if (item) {
          ordered.push(item)
          usedIds.add(id)
        }
      })
      
      // Add any items not in custom order (new items) at the end
      allItems.forEach(item => {
        if (!usedIds.has(item.id)) {
          ordered.push(item)
        }
      })
      
      return ordered
    }
    
    // Default: combine groups and dividers by position
    const allItemsWithPosition: Array<{ item: ListItem; position: number; isDivider: boolean }> = []
    
    // Add groups: group at index i appears at position i
    sortedGroups.forEach((groupData, index) => {
      allItemsWithPosition.push({ 
        item: {
          type: "group" as const,
          data: groupData,
          id: getGroupId(groupData.goal.id, groupData.group.id)
        }, 
        position: index,
        isDivider: false
      })
    })
    
    // Add dividers with their stored position
    dividers.forEach((divider) => {
      allItemsWithPosition.push({ 
        item: {
          type: "divider" as const,
          data: divider,
          id: getDividerId(divider.id)
        }, 
        position: divider.position,
        isDivider: true
      })
    })
    
    // Sort by position, with dividers appearing before groups at the same position
    allItemsWithPosition.sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position
      }
      // If same position, dividers come first
      if (a.isDivider && !b.isDivider) return -1
      if (!a.isDivider && b.isDivider) return 1
      return 0
    })
    
    return allItemsWithPosition.map(({ item }) => item)
  }, [sortedGroups, dividers, customOrder])

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

  // Divider handlers
  const handleAddDivider = () => {
    if (!newDividerTitle.trim()) return
    
    const newDivider: RecurringGroupDivider = {
      id: crypto.randomUUID(),
      title: newDividerTitle.trim(),
      position: newDividerPosition,
    }
    
    setDividers((prev) => {
      // Adjust positions of existing dividers if needed
      const updated = prev.map((d) => 
        d.position >= newDividerPosition ? { ...d, position: d.position + 1 } : d
      )
      return [...updated, newDivider].sort((a, b) => a.position - b.position)
    })
    
    // Add to custom order if it exists
    if (customOrder.length > 0) {
      // Insert at the appropriate position in custom order
      const dividerId = getDividerId(newDivider.id)
      const insertIndex = Math.min(newDividerPosition, customOrder.length)
      setCustomOrder((prev) => {
        const newOrder = [...prev]
        newOrder.splice(insertIndex, 0, dividerId)
        return newOrder
      })
    }
    
    setAddDividerOpen(false)
    setNewDividerTitle("")
    setNewDividerPosition(0)
  }

  const handleStartEditDivider = (divider: RecurringGroupDivider) => {
    setEditingDividerId(divider.id)
    setEditingDividerTitle(divider.title)
  }

  const handleSaveEditDivider = () => {
    if (!editingDividerTitle.trim() || !editingDividerId) return
    
    setDividers((prev) =>
      prev.map((d) =>
        d.id === editingDividerId ? { ...d, title: editingDividerTitle.trim() } : d
      )
    )
    
    setEditingDividerId(null)
    setEditingDividerTitle("")
  }

  const handleCancelEditDivider = () => {
    setEditingDividerId(null)
    setEditingDividerTitle("")
  }

  const handleDeleteDivider = (dividerId: string) => {
    setDividers((prev) => {
      const divider = prev.find((d) => d.id === dividerId)
      if (!divider) return prev
      
      // Adjust positions of dividers after the deleted one
      return prev
        .filter((d) => d.id !== dividerId)
        .map((d) =>
          d.position > divider.position ? { ...d, position: d.position - 1 } : d
        )
        .sort((a, b) => a.position - b.position)
    })
    
    // Remove from custom order
    setCustomOrder((prev) => prev.filter(id => id !== getDividerId(dividerId)))
  }

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: any) => {
    const { over } = event
    setOverId(over ? (over.id as string) : null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverId(null)

    if (!over || active.id === over.id) return

    const oldIndex = combinedList.findIndex(item => item.id === active.id)
    const newIndex = combinedList.findIndex(item => item.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(combinedList, oldIndex, newIndex)
      setCustomOrder(newOrder.map(item => item.id))
    }
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
      {/* Header - Simplified */}
      <header className="border-b border-border glass-strong sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/">
                <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-foreground">Habits</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Quick stats */}
              {totalGroups > 0 && (
                <div className="flex items-center gap-3 text-sm mr-2">
                  <span className="text-green-500 font-semibold">{completedTasks}/{totalTasks}</span>
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Divider button */}
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5"
                onClick={() => {
                  setNewDividerPosition(sortedGroups.length)
                  setAddDividerOpen(true)
                }}
              >
                <GripVertical className="h-4 w-4" />
                <span className="hidden sm:inline">Divider</span>
              </Button>
              
              {/* Add button */}
              <Button
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setAddGroupOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </div>
          </div>

          {/* Filter chips - simplified */}
          {totalGroups > 0 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
              {/* Recurrence filter chips */}
              <button
                onClick={() => setRecurrenceFilter(recurrenceFilter === "daily" ? "all" : "daily")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  recurrenceFilter === "daily"
                    ? "bg-blue-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Daily
              </button>
              <button
                onClick={() => setRecurrenceFilter(recurrenceFilter === "weekly" ? "all" : "weekly")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  recurrenceFilter === "weekly"
                    ? "bg-purple-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Weekly
              </button>
              <button
                onClick={() => setRecurrenceFilter(recurrenceFilter === "monthly" ? "all" : "monthly")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  recurrenceFilter === "monthly"
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Monthly
              </button>
              
              <div className="w-px h-4 bg-border mx-1" />
              
              {/* Status filter */}
              <button
                onClick={() => setStatusFilter(statusFilter === "incomplete" ? "all" : "incomplete")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  statusFilter === "incomplete"
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                To Do
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === "complete" ? "all" : "complete")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  statusFilter === "complete"
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Done
              </button>
              
              {hasActiveFilters && (
                <>
                  <div className="w-px h-4 bg-border mx-1" />
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4">
        {sortedGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Repeat className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground text-center">
              {hasActiveFilters ? "No matching habits" : "No habits yet"}
            </h3>
            <p className="mb-6 text-center text-sm text-muted-foreground max-w-xs">
              {hasActiveFilters
                ? "Try changing your filters."
                : "Build consistent habits by creating recurring tasks."}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button onClick={() => setAddGroupOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Habit
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={combinedList.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
          <div className="space-y-3">
                {combinedList.map((item, index) => {
                  const itemIsOver = overId === item.id && activeId !== item.id
                  
                  // Render divider
                  if (item.type === "divider") {
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "transition-all duration-200",
                          itemIsOver && "pt-2 pb-2"
                        )}
                      >
                        {itemIsOver && (
                          <div className="h-0.5 bg-primary/50 rounded-full mb-2 mx-4 animate-pulse" />
                        )}
                        <SortableDividerItem
                          item={item}
                          editingDividerId={editingDividerId}
                          editingDividerTitle={editingDividerTitle}
                          onStartEdit={() => handleStartEditDivider(item.data)}
                          onSaveEdit={handleSaveEditDivider}
                          onCancelEdit={handleCancelEditDivider}
                          onSetEditingDividerTitle={setEditingDividerTitle}
                          onDelete={() => handleDeleteDivider(item.data.id)}
                          isOver={itemIsOver}
                        />
                        {itemIsOver && (
                          <div className="h-0.5 bg-primary/50 rounded-full mt-2 mx-4 animate-pulse" />
                        )}
                      </div>
                    )
                  }

                  // Render group
                  const { group, goal } = item.data
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
                      key={item.id}
                      className={cn(
                        "transition-all duration-200",
                        itemIsOver && "pt-2 pb-2"
                      )}
                    >
                      {itemIsOver && (
                        <div className="h-0.5 bg-primary/50 rounded-full mb-2 mx-4 animate-pulse" />
                      )}
                      <SortableGroupItem
                        item={item}
                        isCollapsed={isCollapsed}
                        isComplete={isComplete}
                        progress={progress}
                        completedCount={completedCount}
                        regularTasks={regularTasks}
                        score={score}
                        scoreInfo={scoreInfo}
                        ScoreIcon={ScoreIcon}
                        editingGroupId={editingGroupId}
                        editingGroupName={editingGroupName}
                        editingGroupRecurrence={editingGroupRecurrence}
                        editingGroupCycleStartDay={editingGroupCycleStartDay}
                        onToggleCollapse={() => toggleCollapse(group.id)}
                        onStartEdit={() => handleStartEditGroup(group)}
                        onSaveEdit={() => handleSaveEditGroup(goal.id, group.id)}
                        onCancelEdit={handleCancelEditGroup}
                        onSetEditingGroupName={setEditingGroupName}
                        onSetEditingGroupRecurrence={setEditingGroupRecurrence}
                        onSetEditingGroupCycleStartDay={setEditingGroupCycleStartDay}
                        onDelete={() => deleteRecurringTaskGroup(goal.id, group.id)}
                        isOver={itemIsOver}
                      >
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-1 border-t border-border/30">
                        {group.tasks.length > 0 ? (
                          <div className="space-y-1">
                            {group.tasks.map((task) => {
                              const isEditingThisTask = editingTaskId === task.id
                              
                              // Render separator/header differently
                              if (task.isSeparator) {
                                return (
                                  <div
                                    key={task.id}
                                    className="flex items-center gap-2 py-2 px-1"
                                  >
                                    {isEditingThisTask ? (
                                      <>
                                        <Input
                                          value={editingTaskTitle}
                                          onChange={(e) => setEditingTaskTitle(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveEditTask(goal.id, group.id, task.id)
                                            if (e.key === "Escape") handleCancelEditTask()
                                          }}
                                          className="flex-1 h-8 text-sm font-medium"
                                          autoFocus
                                        />
                                        <Button
                                          variant="default"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => handleSaveEditTask(goal.id, group.id, task.id)}
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={handleCancelEditTask}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                          {task.title}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground/50 hover:text-foreground"
                                          onClick={() => handleStartEditTask(task.id, task.title)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground/50 hover:text-destructive"
                                          onClick={() => deleteRecurringTask(goal.id, group.id, task.id)}
                                        >
                                          <X className="h-3 w-3" />
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
                                  className={cn(
                                    "group flex items-center gap-3 py-2 px-1 rounded-lg transition-colors",
                                    task.completed ? "opacity-60" : "hover:bg-muted/30"
                                  )}
                                >
                                  <Checkbox
                                    id={`page-recurring-${task.id}`}
                                    checked={task.completed}
                                    onCheckedChange={() => toggleRecurringTask(goal.id, group.id, task.id)}
                                    className="h-6 w-6"
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
                                        className="flex-1 h-9"
                                        autoFocus
                                      />
                                      <Button
                                        variant="default"
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={() => handleSaveEditTask(goal.id, group.id, task.id)}
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={handleCancelEditTask}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <label
                                        htmlFor={`page-recurring-${task.id}`}
                                        className={cn(
                                          "flex-1 text-sm cursor-pointer select-none",
                                          task.completed && "line-through text-muted-foreground"
                                        )}
                                      >
                                        {task.title}
                                      </label>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground/50 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleStartEditTask(task.id, task.title)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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
                          <p className="text-sm text-muted-foreground text-center py-6">
                            No tasks yet
                          </p>
                        )}
                        
                        {/* Add Task Section */}
                        {addingTaskToGroup?.goalId === goal.id && addingTaskToGroup?.groupId === group.id ? (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                            <Input
                              placeholder="New task..."
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddTask(goal.id, group.id)
                                if (e.key === "Escape") {
                                  setAddingTaskToGroup(null)
                                  setNewTaskTitle("")
                                }
                              }}
                              className="flex-1 h-10"
                              autoFocus
                            />
                            <Button className="h-10" onClick={() => handleAddTask(goal.id, group.id)}>
                              Add
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-10"
                              onClick={() => {
                                setAddingTaskToGroup(null)
                                setNewTaskTitle("")
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="w-full mt-2 pt-2 border-t border-border/30 flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setAddingTaskToGroup({ goalId: goal.id, groupId: group.id })}
                          >
                            <Plus className="h-4 w-4" />
                            Add task
                          </button>
                        )}
                      </div>
                    </CollapsibleContent>
                    </SortableGroupItem>
                      {itemIsOver && (
                        <div className="h-0.5 bg-primary/50 rounded-full mt-2 mx-4 animate-pulse" />
                      )}
                    </div>
              )
            })}
          </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeId ? (
                (() => {
                  const activeItem = combinedList.find(item => item.id === activeId)
                  if (!activeItem) return null
                  
                  if (activeItem.type === "divider") {
                    return (
                      <div className="flex items-center gap-2 py-3 px-1 bg-card/95 backdrop-blur-md rounded-lg border-2 border-primary/50 shadow-2xl ring-2 ring-primary/20">
                        <GripVertical className="h-5 w-5 text-primary" />
                        <span className="text-base font-semibold text-foreground uppercase tracking-wide">
                          {activeItem.data.title}
                        </span>
                      </div>
                    )
                  }
                  
                  const { group, goal } = activeItem.data
                  const regularTasks = getRegularTasks(group.tasks)
                  const completedCount = regularTasks.filter((t) => t.completed).length
                  const isComplete = regularTasks.length > 0 && completedCount === regularTasks.length
                  
                  return (
                    <div className="rounded-xl border-2 border-primary/50 bg-card/95 backdrop-blur-md p-3 shadow-2xl ring-2 ring-primary/20 w-full max-w-md">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="relative flex-shrink-0">
                          <svg className="w-12 h-12 -rotate-90">
                            <circle
                              cx="24" cy="24" r="20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="text-muted/30"
                            />
                            <circle
                              cx="24" cy="24" r="20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={`${regularTasks.length > 0 ? (completedCount / regularTasks.length) * 100 * 1.257 : 0} 125.7`}
                              className={isComplete ? "text-green-500" : "text-primary"}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            {isComplete ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <span className="text-xs font-bold">{completedCount}/{regularTasks.length}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {group.name}
                          </h3>
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Add Habit Dialog */}
      <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Habit</DialogTitle>
            <DialogDescription>
              Create a recurring habit to track regularly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                placeholder="e.g., Morning Routine, Exercise"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <div className="flex gap-2">
                {(["daily", "weekly", "monthly"] as RecurrenceType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewGroupRecurrence(type)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                      newGroupRecurrence === type
                        ? type === "daily" ? "bg-blue-500 text-white" 
                          : type === "weekly" ? "bg-purple-500 text-white"
                          : "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-goal">Link to Goal (optional)</Label>
              <Select value={newGroupGoalId} onValueChange={setNewGroupGoalId}>
                <SelectTrigger id="group-goal">
                  <SelectValue placeholder="Select a goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone">
                    <span className="text-muted-foreground">No goal - standalone habit</span>
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
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={resetAddGroupForm}>
              Cancel
            </Button>
            <Button onClick={handleAddGroup} disabled={!newGroupName.trim()}>
              Create Habit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Divider Dialog */}
      <Dialog open={addDividerOpen} onOpenChange={setAddDividerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Divider</DialogTitle>
            <DialogDescription>
              Create a divider to organize your recurring groups.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="divider-title">Title</Label>
              <Input
                id="divider-title"
                placeholder="e.g., Morning Habits, Weekly Reviews"
                value={newDividerTitle}
                onChange={(e) => setNewDividerTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddDivider()
                }}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="divider-position">Position</Label>
              <Select 
                value={newDividerPosition.toString()} 
                onValueChange={(v) => setNewDividerPosition(parseInt(v))}
              >
                <SelectTrigger id="divider-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Before first group</SelectItem>
                  {sortedGroups.map((_, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      After group {index + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="ghost" 
              onClick={() => {
                setAddDividerOpen(false)
                setNewDividerTitle("")
                setNewDividerPosition(0)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddDivider} disabled={!newDividerTitle.trim()}>
              Add Divider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

