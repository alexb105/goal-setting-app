"use client"

import { useState, useEffect } from "react"
import { Plus, X, RefreshCw, Trash2, ChevronDown, Calendar, Repeat, Pencil, Check, Minus, Trophy, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useGoals } from "@/components/goals-context"
import type { RecurringTaskGroup, RecurrenceType, RecurringTask } from "@/types"
import { cn } from "@/lib/utils"

interface RecurringTasksProps {
  goalId: string
  groups: RecurringTaskGroup[]
}

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

function shouldAutoReset(group: RecurringTaskGroup): boolean {
  if (!group.lastResetDate) return false
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // If there's a start date and it's in the future, don't reset yet
  if (group.startDate) {
    const startDate = new Date(group.startDate)
    startDate.setHours(0, 0, 0, 0)
    if (startDate > today) {
      return false // Start date hasn't arrived yet
    }
  }
  
  const lastReset = new Date(group.lastResetDate)
  lastReset.setHours(0, 0, 0, 0)
  
  const daysDiff = Math.floor((today.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24))
  
  switch (group.recurrence) {
    case "daily":
      return daysDiff >= 1
    case "weekly":
      return daysDiff >= 7
    case "monthly":
      return daysDiff >= 30
    default:
      return false
  }
}

interface SortableTaskItemProps {
  task: RecurringTask
  groupId: string
  goalId: string
  isEditing: boolean
  editingTaskTitle: string
  setEditingTaskTitle: (title: string) => void
  handleSaveEditTask: (groupId: string, taskId: string) => void
  handleCancelEditTask: () => void
  handleStartEditTask: (taskId: string, taskTitle: string) => void
  toggleRecurringTask: (goalId: string, groupId: string, taskId: string) => void
  deleteRecurringTask: (goalId: string, groupId: string, taskId: string) => void
}

function SortableTaskItem({
  task,
  groupId,
  goalId,
  isEditing,
  editingTaskTitle,
  setEditingTaskTitle,
  handleSaveEditTask,
  handleCancelEditTask,
  handleStartEditTask,
  toggleRecurringTask,
  deleteRecurringTask,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Render separator/header differently
  if (task.isSeparator) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center gap-2 rounded-lg bg-muted/50 p-2.5 group",
          isDragging && "shadow-lg ring-2 ring-primary/20 opacity-50"
        )}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Minus className="h-4 w-4 text-muted-foreground" />
        {isEditing ? (
          <>
            <Input
              value={editingTaskTitle}
              onChange={(e) => setEditingTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEditTask(groupId, task.id)
                if (e.key === "Escape") handleCancelEditTask()
              }}
              className="flex-1 h-8 text-sm font-semibold"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-green-600 hover:text-green-700"
              onClick={() => handleSaveEditTask(groupId, task.id)}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleCancelEditTask}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm font-semibold text-foreground">
              {task.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              onClick={() => handleStartEditTask(task.id, task.title)}
              title="Edit header"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => deleteRecurringTask(goalId, groupId, task.id)}
              title="Delete header"
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
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card/50 p-2.5 group",
        isDragging && "shadow-lg ring-2 ring-primary/20 opacity-50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Checkbox
        id={`recurring-${task.id}`}
        checked={task.completed}
        onCheckedChange={() => toggleRecurringTask(goalId, groupId, task.id)}
        disabled={isEditing}
      />
      {isEditing ? (
        <>
          <Input
            value={editingTaskTitle}
            onChange={(e) => setEditingTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEditTask(groupId, task.id)
              if (e.key === "Escape") handleCancelEditTask()
            }}
            className="flex-1 h-8 text-sm"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-green-600 hover:text-green-700"
            onClick={() => handleSaveEditTask(groupId, task.id)}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleCancelEditTask}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <>
          <label
            htmlFor={`recurring-${task.id}`}
            className={cn(
              "flex-1 text-sm cursor-pointer",
              task.completed ? "line-through text-muted-foreground" : "text-foreground"
            )}
          >
            {task.title}
          </label>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            onClick={() => handleStartEditTask(task.id, task.title)}
            title="Edit task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={() => deleteRecurringTask(goalId, groupId, task.id)}
            title="Delete task"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  )
}

export function RecurringTasks({ goalId, groups }: RecurringTasksProps) {
  const {
    addRecurringTaskGroup,
    updateRecurringTaskGroup,
    deleteRecurringTaskGroup,
    addRecurringTask,
    updateRecurringTask,
    toggleRecurringTask,
    deleteRecurringTask,
    resetRecurringTaskGroup,
    reorderRecurringTasks,
  } = useGoals()

  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupRecurrence, setNewGroupRecurrence] = useState<RecurrenceType>("daily")
  const [newGroupStartDate, setNewGroupStartDate] = useState("")
  const [addingTaskToGroup, setAddingTaskToGroup] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string> | null>(null) // null = not initialized
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [editingGroupRecurrence, setEditingGroupRecurrence] = useState<RecurrenceType>("daily")
  const [editingGroupStartDate, setEditingGroupStartDate] = useState("")
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTaskTitle, setEditingTaskTitle] = useState("")

  // Auto-reset groups based on their recurrence schedule
  useEffect(() => {
    groups.forEach((group) => {
      if (shouldAutoReset(group)) {
        resetRecurringTaskGroup(goalId, group.id)
      }
    })
  }, [groups, goalId, resetRecurringTaskGroup])

  // Initialize all groups as collapsed by default
  useEffect(() => {
    if (collapsedGroups === null && groups.length > 0) {
      const allGroupIds = new Set(groups.map((g) => g.id))
      setCollapsedGroups(allGroupIds)
    }
  }, [groups, collapsedGroups])

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return
    addRecurringTaskGroup(goalId, newGroupName.trim(), newGroupRecurrence, newGroupStartDate || undefined)
    setNewGroupName("")
    setNewGroupRecurrence("daily")
    setNewGroupStartDate("")
    setIsAddingGroup(false)
  }

  const handleAddTask = (groupId: string, isSeparator = false) => {
    if (!newTaskTitle.trim()) return
    addRecurringTask(goalId, groupId, newTaskTitle.trim(), isSeparator)
    setNewTaskTitle("")
    setAddingTaskToGroup(null)
  }

  const handleAddSeparator = (groupId: string) => {
    const separatorText = prompt("Enter header text:")
    if (separatorText?.trim()) {
      addRecurringTask(goalId, groupId, separatorText.trim(), true)
    }
  }

  const handleStartEditGroup = (group: RecurringTaskGroup) => {
    setEditingGroupId(group.id)
    setEditingGroupName(group.name)
    setEditingGroupRecurrence(group.recurrence)
    setEditingGroupStartDate(group.startDate || "")
  }

  const handleSaveEditGroup = (groupId: string) => {
    if (!editingGroupName.trim()) return
    updateRecurringTaskGroup(goalId, groupId, {
      name: editingGroupName.trim(),
      recurrence: editingGroupRecurrence,
      startDate: editingGroupStartDate || undefined,
    })
    setEditingGroupId(null)
    setEditingGroupName("")
    setEditingGroupRecurrence("daily")
    setEditingGroupStartDate("")
  }

  const handleCancelEditGroup = () => {
    setEditingGroupId(null)
    setEditingGroupName("")
    setEditingGroupRecurrence("daily")
    setEditingGroupStartDate("")
  }

  const handleStartEditTask = (taskId: string, taskTitle: string) => {
    setEditingTaskId(taskId)
    setEditingTaskTitle(taskTitle)
  }

  const handleSaveEditTask = (groupId: string, taskId: string) => {
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

  const getRegularTasks = (group: RecurringTaskGroup) => {
    return group.tasks.filter((t) => !t.isSeparator)
  }

  const getCompletedCount = (group: RecurringTaskGroup) => {
    return getRegularTasks(group).filter((t) => t.completed).length
  }

  const isGroupComplete = (group: RecurringTaskGroup) => {
    const regularTasks = getRegularTasks(group)
    return regularTasks.length > 0 && getCompletedCount(group) === regularTasks.length
  }

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (groupId: string) => (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const group = groups.find((g) => g.id === groupId)
    if (!group) return

    reorderRecurringTasks(goalId, groupId, active.id as string, over.id as string)
  }

  if (groups.length === 0 && !isAddingGroup) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
            <Repeat className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-medium text-foreground mb-1">No Recurring Tasks</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            Create recurring task groups for daily, weekly, or monthly habits.
          </p>
          <Button onClick={() => setIsAddingGroup(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Recurring Task Group
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Existing Groups */}
      {groups.map((group) => {
        const isComplete = isGroupComplete(group)
        const completedCount = getCompletedCount(group)
        const isCollapsed = isGroupCollapsed(group.id)

        return (
          <div
            key={group.id}
            className={cn(
              "rounded-xl border bg-card transition-all",
              isComplete
                ? "border-green-500/50 bg-green-500/5"
                : "border-border"
            )}
          >
            <Collapsible open={!isCollapsed} onOpenChange={() => toggleCollapse(group.id)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 rounded-t-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isCollapsed && "-rotate-90"
                      )}
                    />
                    {editingGroupId === group.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEditGroup(group.id)
                            if (e.key === "Escape") handleCancelEditGroup()
                          }}
                          className="h-8 w-40"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Select
                          value={editingGroupRecurrence}
                          onValueChange={(v) => setEditingGroupRecurrence(v as RecurrenceType)}
                        >
                          <SelectTrigger className="h-8 w-28" onClick={(e) => e.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="date"
                            value={editingGroupStartDate}
                            onChange={(e) => setEditingGroupStartDate(e.target.value)}
                            className="h-8 w-36"
                            title="Start date"
                          />
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSaveEditGroup(group.id)
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
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "font-semibold text-foreground",
                            isComplete && "text-green-700 dark:text-green-500"
                          )}>
                            {group.name}
                          </h4>
                          <Badge variant="outline" className={cn("text-xs", RECURRENCE_COLORS[group.recurrence])}>
                            <Repeat className="h-3 w-3 mr-1" />
                            {RECURRENCE_LABELS[group.recurrence]}
                          </Badge>
                          {isComplete && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-500 border-green-500/20">
                              ✓ Complete
                            </Badge>
                          )}
                          {(group.completionCount || 0) > 0 && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                              <Trophy className="h-3 w-3 mr-1" />
                              {group.completionCount}x
                            </Badge>
                          )}
                          {group.startDate && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              from {new Date(group.startDate).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {completedCount}/{getRegularTasks(group).length} tasks completed
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {editingGroupId !== group.id && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartEditGroup(group)}
                          title="Edit group"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => resetRecurringTaskGroup(goalId, group.id)}
                          title="Reset all tasks"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
                          <AlertDialogTitle>Delete Recurring Task Group</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{group.name}&quot;? This will remove all tasks in this group.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteRecurringTaskGroup(goalId, group.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-2 border-t border-border/50">
                  {/* Tasks with drag-and-drop */}
                  {group.tasks.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd(group.id)}
                    >
                      <SortableContext
                        items={group.tasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2 mb-3">
                          {group.tasks.map((task) => (
                            <SortableTaskItem
                              key={task.id}
                              task={task}
                              groupId={group.id}
                              goalId={goalId}
                              isEditing={editingTaskId === task.id}
                              editingTaskTitle={editingTaskTitle}
                              setEditingTaskTitle={setEditingTaskTitle}
                              handleSaveEditTask={handleSaveEditTask}
                              handleCancelEditTask={handleCancelEditTask}
                              handleStartEditTask={handleStartEditTask}
                              toggleRecurringTask={toggleRecurringTask}
                              deleteRecurringTask={deleteRecurringTask}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-3 mb-3">
                      No tasks yet. Add tasks to this recurring group.
                    </p>
                  )}

                  {/* Add Task Input */}
                  {addingTaskToGroup === group.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Task name..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddTask(group.id)
                          if (e.key === "Escape") {
                            setAddingTaskToGroup(null)
                            setNewTaskTitle("")
                          }
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleAddTask(group.id)}>
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => setAddingTaskToGroup(group.id)}
                      >
                        <Plus className="h-4 w-4" />
                        Add Task
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleAddSeparator(group.id)}
                        title="Add a header to organize tasks"
                      >
                        <Minus className="h-4 w-4" />
                        Add Header
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )
      })}

      {/* Add New Group Form */}
      {isAddingGroup ? (
        <div className="rounded-xl border border-primary/50 bg-card p-4 space-y-3">
          <h4 className="font-medium text-foreground">New Recurring Task Group</h4>
          <div className="space-y-2">
            <Input
              placeholder="Group name (e.g., Eat Healthy)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddGroup()
                if (e.key === "Escape") {
                  setIsAddingGroup(false)
                  setNewGroupName("")
                  setNewGroupStartDate("")
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Select value={newGroupRecurrence} onValueChange={(v) => setNewGroupRecurrence(v as RecurrenceType)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Recurrence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="date"
                  value={newGroupStartDate}
                  onChange={(e) => setNewGroupStartDate(e.target.value)}
                  className="flex-1"
                  title="Start date (optional)"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Start date is optional. If not set, the recurrence starts from today.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddGroup} size="sm">
              Create Group
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingGroup(false)
                setNewGroupName("")
                setNewGroupStartDate("")
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setIsAddingGroup(true)}
        >
          <Plus className="h-4 w-4" />
          Add Recurring Task Group
        </Button>
      )}
    </div>
  )
}
