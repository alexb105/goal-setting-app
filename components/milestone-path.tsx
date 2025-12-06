"use client"

import { useState, useEffect } from "react"
import type React from "react"
import { Check, Circle, Trash2, Calendar, Pencil, CheckSquare, Plus, X, GripVertical, Target, ExternalLink, Goal, List, Play, Pause, Sparkles, Pin, PinOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { Goal, Milestone, Task, PinnedMilestoneTask } from "@/types"

const PINNED_TASKS_STORAGE_KEY = "goalritual-pinned-milestone-tasks"
import { useGoals } from "@/components/goals-context"
import { useSupabaseSync } from "@/hooks/use-supabase-sync"
import { EditMilestoneDialog } from "@/components/edit-milestone-dialog"
import { AITaskSuggestions } from "@/components/ai-task-suggestions"
import { cn } from "@/lib/utils"
import { useMilestoneStatus } from "@/hooks/use-milestone-status"
import { formatDaysRemaining } from "@/utils/date"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface MilestonePathProps {
  goalId: string
  milestones: Milestone[]
  onNavigateToGoal?: (goalId: string) => void
}


interface SortableTaskItemProps {
  task: Task
  goalId: string
  goalTitle: string
  milestoneId: string
  milestoneTitle: string
  onToggle: () => void
  onUpdate: (title: string) => void
  onDelete: () => void
  displayStyle?: "checkbox" | "bullet"
}

function SortableTaskItem({ task, goalId, goalTitle, milestoneId, milestoneTitle, onToggle, onUpdate, onDelete, displayStyle = "checkbox" }: SortableTaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [isPinned, setIsPinned] = useState(false)
  const { triggerSync } = useSupabaseSync()
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  useEffect(() => {
    setEditTitle(task.title)
  }, [task.title])

  // Check if task is pinned
  useEffect(() => {
    const stored = localStorage.getItem(PINNED_TASKS_STORAGE_KEY)
    if (stored) {
      try {
        const pinnedTasks: PinnedMilestoneTask[] = JSON.parse(stored)
        setIsPinned(pinnedTasks.some(pt => pt.taskId === task.id))
      } catch {
        setIsPinned(false)
      }
    }
  }, [task.id])

  const togglePin = () => {
    const stored = localStorage.getItem(PINNED_TASKS_STORAGE_KEY)
    let pinnedTasks: PinnedMilestoneTask[] = []
    if (stored) {
      try {
        pinnedTasks = JSON.parse(stored)
      } catch {
        pinnedTasks = []
      }
    }

    if (isPinned) {
      // Unpin
      pinnedTasks = pinnedTasks.filter(pt => pt.taskId !== task.id)
    } else {
      // Pin
      const newPinnedTask: PinnedMilestoneTask = {
        id: crypto.randomUUID(),
        goalId,
        goalTitle,
        milestoneId,
        milestoneTitle,
        taskId: task.id,
        taskTitle: task.title,
        pinnedAt: new Date().toISOString(),
        completedDate: task.completed ? new Date().toISOString().split("T")[0] : undefined,
      }
      pinnedTasks.push(newPinnedTask)
    }

    localStorage.setItem(PINNED_TASKS_STORAGE_KEY, JSON.stringify(pinnedTasks))
    setIsPinned(!isPinned)
    // Dispatch storage event to notify other components
    window.dispatchEvent(new Event('storage'))
    // Trigger cloud sync
    triggerSync()
  }

  const handleSave = () => {
    if (editTitle.trim()) {
      onUpdate(editTitle.trim())
    } else {
      setEditTitle(task.title)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      setEditTitle(task.title)
      setIsEditing(false)
    }
  }

  // If this is a separator, render it differently
  if (task.isSeparator) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-2.5 group/task">
        <button
          {...attributes}
          {...listeners}
          className={cn(
            "cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors",
            isDragging && "cursor-grabbing",
          )}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </button>
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="h-7 text-sm flex-1 font-semibold"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="text-sm font-semibold text-foreground flex-1 cursor-pointer"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
          >
            {task.title}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover/task:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2.5 group/task">
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors",
          isDragging && "cursor-grabbing",
        )}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>
      {displayStyle === "checkbox" ? (
        <>
          <Checkbox
            id={`inline-${task.id}`}
            checked={task.completed}
            onCheckedChange={onToggle}
          />
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="h-7 text-sm flex-1"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <label
              htmlFor={`inline-${task.id}`}
              className={cn(
                "text-sm cursor-pointer flex-1",
                task.completed ? "line-through text-muted-foreground" : "text-foreground",
              )}
              onDoubleClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
            >
              {task.title}
            </label>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={onToggle}
            className={cn(
              "w-2 h-2 rounded-full border-2 transition-all flex-shrink-0",
              task.completed
                ? "bg-primary border-primary"
                : "border-muted-foreground hover:border-primary"
            )}
            aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
          />
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="h-7 text-sm flex-1"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={cn(
                "text-sm cursor-pointer flex-1",
                task.completed ? "line-through text-muted-foreground" : "text-foreground",
              )}
              onDoubleClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
            >
              {task.title}
            </span>
          )}
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "transition-opacity h-6 w-6",
          isPinned 
            ? "opacity-100 text-emerald-600 hover:text-emerald-700" 
            : "opacity-0 group-hover/task:opacity-100 text-muted-foreground hover:text-emerald-600"
        )}
        onClick={togglePin}
        title={isPinned ? "Unpin from Today's Tasks" : "Pin to Today's Tasks"}
      >
        {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover/task:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

interface SortableMilestoneItemProps {
  milestone: Milestone
  index: number
  isLast: boolean
  goalId: string
  goal: Goal
  onEdit: (milestone: Milestone) => void
  onDelete: () => void
  onToggle: () => void
  onToggleInProgress: () => void
  onAddTask: (milestoneId: string, isSeparator?: boolean) => void
  addTaskDirect: (milestoneId: string, title: string, isSeparator?: boolean) => void
  addingTaskToMilestone: string | null
  newTaskTitle: string
  setNewTaskTitle: (title: string) => void
  setAddingTaskToMilestone: (id: string | null) => void
  toggleTask: (goalId: string, milestoneId: string, taskId: string) => void
  updateTask: (goalId: string, milestoneId: string, taskId: string, title: string) => void
  deleteTask: (goalId: string, milestoneId: string, taskId: string) => void
  reorderTasks: (goalId: string, milestoneId: string, activeId: string, overId: string) => void
  onNavigateToGoal?: (goalId: string) => void
}

function SortableMilestoneItem({
  milestone,
  index,
  isLast,
  goalId,
  goal,
  onEdit,
  onDelete,
  onToggle,
  onToggleInProgress,
  onAddTask,
  addingTaskToMilestone,
  newTaskTitle,
  setNewTaskTitle,
  setAddingTaskToMilestone,
  toggleTask,
  updateTask,
  deleteTask,
  reorderTasks,
  addTaskDirect,
  onNavigateToGoal,
}: SortableMilestoneItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: milestone.id,
  })
  const { goals } = useGoals()
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  
  const linkedGoal = milestone.linkedGoalId ? goals.find((g) => g.id === milestone.linkedGoalId) : null
  
  // Check if linked goal is completed
  // Goals with no progress tracking (showProgress === false) are automatically considered completed
  // Otherwise, check if all milestones are completed
  const isLinkedGoalCompleted = linkedGoal
    ? linkedGoal.showProgress === false || (linkedGoal.milestones.length > 0 && linkedGoal.milestones.every((m) => m.completed))
    : true
  
  // Disable toggle if milestone is linked to a goal that isn't completed
  const canToggle = !milestone.linkedGoalId || isLinkedGoalCompleted

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const { daysUntilDue } = useMilestoneStatus(milestone)
  const tasks = milestone.tasks || []
  const regularTasks = tasks.filter((t) => !t.isSeparator)
  const completedTasks = regularTasks.filter((t) => t.completed).length
  const linkedGoals = (milestone.linkedGoals || [])
    .map((goalId) => goals.find((g) => g.id === goalId))
    .filter((goal): goal is NonNullable<typeof goal> => goal !== undefined)

  const handleAddTask = (milestoneId: string, isSeparator = false) => {
    if (newTaskTitle.trim()) {
      onAddTask(milestoneId, isSeparator)
      setNewTaskTitle("")
      setAddingTaskToMilestone(null)
    }
  }

  const handleAddSeparator = (milestoneId: string) => {
    const separatorText = prompt('Enter separator text:')
    if (separatorText?.trim()) {
      onAddTask(milestoneId, true)
      // We need to set the title and then add it
      setNewTaskTitle(separatorText.trim())
      // Use a small delay to ensure state is updated
      setTimeout(() => {
        onAddTask(milestoneId, true)
        setNewTaskTitle("")
      }, 0)
    }
  }

  // Calculate task progress for the ring
  const taskProgress = regularTasks.length > 0 ? (completedTasks / regularTasks.length) * 100 : 0
  const circumference = 2 * Math.PI * 22 // radius of 22 for the progress ring
  const strokeDashoffset = circumference - (taskProgress / 100) * circumference

  // Auto-complete/uncomplete milestone based on task completion
  // Only applies to checkbox-style tasks - bullet-style tasks allow manual completion
  useEffect(() => {
    // Skip auto-completion for milestones with no tasks or bullet-style tasks
    // Bullet-style milestones can be manually completed anytime
    if (regularTasks.length === 0 || milestone.taskDisplayStyle === "bullet") return

    const allTasksCompleted = completedTasks === regularTasks.length

    // Auto-complete: all tasks done and milestone not completed
    if (allTasksCompleted && !milestone.completed && canToggle) {
      // Small delay to let the progress ring animation complete
      const timer = setTimeout(() => {
        onToggle()
        // Clear in-progress status when completing
        if (milestone.inProgress) {
          onToggleInProgress()
        }
      }, 300)
      return () => clearTimeout(timer)
    }

    // Auto-uncomplete: not all tasks done but milestone is completed
    if (!allTasksCompleted && milestone.completed) {
      // Immediately uncheck the milestone
      onToggle()
    }
  }, [completedTasks, regularTasks.length, milestone.completed, milestone.inProgress, milestone.taskDisplayStyle, canToggle, onToggle, onToggleInProgress])

  return (
    <div ref={setNodeRef} style={style} id={`milestone-${milestone.id}`} className="relative flex gap-2 sm:gap-4">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div className="relative">
          {/* Progress Ring SVG */}
          {regularTasks.length > 0 && !milestone.completed && (
            <svg
              className="absolute -inset-0.5 sm:-inset-1 h-10 w-10 sm:h-12 sm:w-12 -rotate-90"
              viewBox="0 0 48 48"
            >
              {/* Background circle */}
              <circle
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-border"
              />
              {/* Progress circle */}
              <circle
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="text-primary transition-all duration-300"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                }}
              />
            </svg>
          )}
          <button
            onClick={canToggle ? onToggle : undefined}
            disabled={!canToggle}
            className={cn(
              "relative z-10 flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full transition-all touch-target",
              milestone.completed
                ? "border-2 border-primary bg-primary text-primary-foreground"
                : regularTasks.length > 0
                  ? "bg-card text-muted-foreground hover:bg-muted cursor-pointer active:scale-95"
                  : canToggle
                    ? "border-2 border-border bg-card text-muted-foreground hover:border-primary/50 cursor-pointer active:scale-95"
                    : "border-2 border-border bg-card text-muted-foreground opacity-50 cursor-not-allowed",
            )}
            title={!canToggle && milestone.linkedGoalId ? "Complete the linked goal first" : undefined}
          >
            {milestone.completed ? (
              <Check className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <span className="text-xs sm:text-sm font-medium">{index + 1}</span>
            )}
          </button>
        </div>
        {!isLast && (
          <div
            className={cn("w-0.5 flex-1 transition-colors", milestone.completed ? "bg-primary" : "bg-border")}
          />
        )}
      </div>

      {/* Content */}
      <div className={cn("pb-6 sm:pb-8 flex-1 min-w-0", isLast && "pb-0")}>
        <div
          className={cn(
            "group rounded-xl border bg-card p-3 sm:p-4 transition-all",
            milestone.completed ? "border-primary/20 bg-primary/5" : "border-border hover:border-primary/20",
          )}
        >
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <button
              {...attributes}
              {...listeners}
              className={cn(
                "cursor-grab active:cursor-grabbing p-1 sm:p-1.5 rounded hover:bg-muted transition-colors mt-0.5 flex-shrink-0",
                isDragging && "cursor-grabbing",
              )}
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              {milestone.linkedGoalId && linkedGoal ? (
                <button
                  onClick={() => onNavigateToGoal?.(milestone.linkedGoalId!)}
                  className="group/link w-full text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                      <Goal className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                      Goal
                    </Badge>
                  </div>
                  <h3
                    className={cn(
                      "font-semibold text-sm sm:text-base text-foreground flex items-center gap-2 group-hover/link:text-primary transition-colors",
                      milestone.completed && "line-through opacity-70",
                    )}
                  >
                    {milestone.title}
                    <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                  </h3>
                  {milestone.description && (
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">{milestone.description}</p>
                  )}
                  <p className="mt-1 text-[11px] sm:text-xs text-primary font-medium">Tap to view goal →</p>
                  {!isLinkedGoalCompleted && (
                    <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground">
                      Complete the linked goal to mark this complete
                    </p>
                  )}
                </button>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h3
                      className={cn(
                        "font-semibold text-sm sm:text-base text-foreground",
                        milestone.completed && "line-through opacity-70",
                      )}
                    >
                      {milestone.title}
                    </h3>
                    {milestone.inProgress && !milestone.completed && (
                      <Badge variant="default" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-amber-500/90 hover:bg-amber-500/90 text-white">
                        <Play className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 fill-current" />
                        In Progress
                      </Badge>
                    )}
                  </div>
                  {milestone.description && (
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">{milestone.description}</p>
                  )}
                </>
              )}
              {!milestone.linkedGoalId && (
                <>
                  <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 text-[11px] sm:text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 sm:gap-1.5">
                      <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                      {milestone.completed
                        ? "Completed"
                        : formatDaysRemaining(daysUntilDue)}
                    </span>
                    {regularTasks.length > 0 && milestone.taskDisplayStyle !== "bullet" && (
                      <span className="flex items-center gap-1 sm:gap-1.5">
                        <CheckSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                        {completedTasks}/{regularTasks.length} tasks
                      </span>
                    )}
                    {linkedGoals.length > 0 && (
                      <span className="flex items-center gap-1 sm:gap-1.5">
                        <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                        {linkedGoals.length} goal{linkedGoals.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {linkedGoals.length > 0 && (
                    <div className="mt-1.5 sm:mt-2 flex flex-wrap gap-1 sm:gap-1.5">
                      {linkedGoals.map((goal) => (
                        <Badge key={goal.id} variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                          {goal.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            {/* Action buttons - always visible on mobile */}
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              {!milestone.completed && !milestone.linkedGoalId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "transition-opacity h-7 w-7 sm:h-8 sm:w-8",
                    milestone.inProgress 
                      ? "opacity-100 text-amber-500 hover:text-amber-600" 
                      : "sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-amber-500"
                  )}
                  onClick={onToggleInProgress}
                  title={milestone.inProgress ? "Mark as not in progress" : "Mark as in progress"}
                >
                  {milestone.inProgress ? <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                </Button>
              )}
              {!milestone.linkedGoalId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(milestone)}
                >
                  <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          {!milestone.linkedGoalId && (
            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50">
              {tasks.length > 0 && (
                <TaskList
                  tasks={tasks}
                  goalId={goalId}
                  goalTitle={goal.title}
                  milestoneId={milestone.id}
                  milestoneTitle={milestone.title}
                  toggleTask={toggleTask}
                  updateTask={updateTask}
                  deleteTask={deleteTask}
                  reorderTasks={reorderTasks}
                  displayStyle={milestone.taskDisplayStyle || "checkbox"}
                />
              )}

              {addingTaskToMilestone === milestone.id ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    placeholder="Task name..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddTask(milestone.id)
                      if (e.key === "Escape") {
                        setAddingTaskToMilestone(null)
                        setNewTaskTitle("")
                      }
                    }}
                    className="h-9 sm:h-8 text-sm flex-1"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-9 sm:h-8 flex-1 sm:flex-none"
                      onClick={() => handleAddTask(milestone.id)}
                      disabled={!newTaskTitle.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 sm:h-8 text-xs hidden sm:inline-flex"
                      onClick={() => handleAddTask(milestone.id, true)}
                      disabled={!newTaskTitle.trim()}
                    >
                      Separator
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 sm:h-8"
                      onClick={() => {
                        setAddingTaskToMilestone(null)
                        setNewTaskTitle("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 sm:h-7 text-xs text-muted-foreground hover:text-foreground px-2 sm:px-3"
                    onClick={() => setAddingTaskToMilestone(milestone.id)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                    Add task
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 sm:h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-500/10 px-2 sm:px-3"
                    onClick={() => setShowAISuggestions(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                    AI Suggest
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 sm:h-7 text-xs text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                    onClick={() => {
                      const separatorText = prompt('Enter separator text:')
                      if (separatorText?.trim()) {
                        addTaskDirect(milestone.id, separatorText.trim(), true)
                      }
                    }}
                  >
                    Add separator
                  </Button>
                </div>
              )}

              <AITaskSuggestions
                open={showAISuggestions}
                onOpenChange={setShowAISuggestions}
                goal={goal}
                milestone={milestone}
                onAddTasks={(tasks) => {
                  tasks.forEach(title => addTaskDirect(milestone.id, title, false))
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface TaskListProps {
  tasks: Task[]
  goalId: string
  goalTitle: string
  milestoneId: string
  milestoneTitle: string
  toggleTask: (goalId: string, milestoneId: string, taskId: string) => void
  updateTask: (goalId: string, milestoneId: string, taskId: string, title: string) => void
  deleteTask: (goalId: string, milestoneId: string, taskId: string) => void
  reorderTasks: (goalId: string, milestoneId: string, activeId: string, overId: string) => void
  displayStyle?: "checkbox" | "bullet"
}

function TaskList({ tasks, goalId, goalTitle, milestoneId, milestoneTitle, toggleTask, updateTask, deleteTask, reorderTasks, displayStyle = "checkbox" }: TaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      reorderTasks(goalId, milestoneId, active.id as string, over.id as string)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 mb-3">
           {tasks.map((task) => (
             <SortableTaskItem
               key={task.id}
               task={task}
               goalId={goalId}
               goalTitle={goalTitle}
               milestoneId={milestoneId}
               milestoneTitle={milestoneTitle}
               onToggle={() => toggleTask(goalId, milestoneId, task.id)}
               onUpdate={(title) => updateTask(goalId, milestoneId, task.id, title)}
               onDelete={() => deleteTask(goalId, milestoneId, task.id)}
               displayStyle={displayStyle}
             />
           ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export function MilestonePath({ goalId, milestones, onNavigateToGoal }: MilestonePathProps) {
  const { goals, toggleMilestone, deleteMilestone, toggleTask, addTask, updateTask, deleteTask, reorderMilestones, reorderTasks, updateMilestone } = useGoals()
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [addingTaskToMilestone, setAddingTaskToMilestone] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  
  const currentGoal = goals.find((g) => g.id === goalId)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      reorderMilestones(goalId, active.id as string, over.id as string)
    }
  }

  const handleAddTask = (milestoneId: string, isSeparator = false) => {
    if (newTaskTitle.trim()) {
      addTask(goalId, milestoneId, newTaskTitle.trim(), isSeparator)
    }
  }

  if (milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/50 py-12 text-center">
        <Circle className="mb-3 h-10 w-10 text-muted-foreground/50" />
        <h3 className="mb-1 font-medium text-foreground">No milestones yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Break down your goal into smaller, achievable milestones to track your progress.
        </p>
      </div>
    )
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={milestones.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          <div className="relative">
            {milestones.map((milestone, index) => {
              const isLast = index === milestones.length - 1

              return currentGoal ? (
                <SortableMilestoneItem
                  key={milestone.id}
                  milestone={milestone}
                  index={index}
                  isLast={isLast}
                  goalId={goalId}
                  goal={currentGoal}
                  onEdit={setEditingMilestone}
                  onDelete={() => deleteMilestone(goalId, milestone.id)}
                  onToggle={() => toggleMilestone(goalId, milestone.id)}
                  onToggleInProgress={() => updateMilestone(goalId, milestone.id, { inProgress: !milestone.inProgress })}
                  onAddTask={handleAddTask}
                  addingTaskToMilestone={addingTaskToMilestone}
                  newTaskTitle={newTaskTitle}
                  setNewTaskTitle={setNewTaskTitle}
                  setAddingTaskToMilestone={setAddingTaskToMilestone}
                  toggleTask={toggleTask}
                  updateTask={updateTask}
                  deleteTask={deleteTask}
                  reorderTasks={reorderTasks}
                  addTaskDirect={(milestoneId, title, isSeparator) => addTask(goalId, milestoneId, title, isSeparator)}
                  onNavigateToGoal={onNavigateToGoal}
                />
              ) : null
            })}
          </div>
        </SortableContext>
      </DndContext>

      {editingMilestone && (
        <EditMilestoneDialog
          goalId={goalId}
          milestone={editingMilestone}
          open={!!editingMilestone}
          onOpenChange={(open) => !open && setEditingMilestone(null)}
        />
      )}
    </>
  )
}
