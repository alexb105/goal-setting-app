"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, X, Sun, Trash2, Repeat, Calendar, Check, Pencil, List, Pin, PinOff, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useGoals } from "@/components/goals-context"
import { useSupabaseSync } from "@/hooks/use-supabase-sync"
import type { DailyTodo, StandaloneRecurringTask, PinnedMilestoneTask } from "@/types"

const STORAGE_KEY = "goalritual-daily-todos"
const RECURRING_STORAGE_KEY = "goalritual-recurring-tasks"
const PINNED_TASKS_STORAGE_KEY = "goalritual-pinned-milestone-tasks"
const LAST_RESET_KEY = "goalritual-daily-todos-last-reset"
const TOTAL_COMPLETED_KEY = "goalritual-total-completed-count"

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun", fullLabel: "Sunday" },
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" },
]

function getTodayDateString(): string {
  const now = new Date()
  // Use local date, not UTC (toISOString uses UTC which can cause wrong reset times)
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getTodayDayOfWeek(): number {
  return new Date().getDay()
}

function formatDays(days: number[]): string {
  if (days.length === 7) return "Every day"
  if (days.length === 0) return "No days selected"
  
  // Check for weekdays (Mon-Fri)
  const weekdays = [1, 2, 3, 4, 5]
  if (days.length === 5 && weekdays.every(d => days.includes(d))) {
    return "Weekdays"
  }
  
  // Check for weekends (Sat-Sun)
  const weekends = [0, 6]
  if (days.length === 2 && weekends.every(d => days.includes(d))) {
    return "Weekends"
  }
  
  // Sort and display short names
  const sortedDays = [...days].sort((a, b) => a - b)
  return sortedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(", ")
}

const SCROLL_TO_MILESTONE_KEY = "goalritual-scroll-to-milestone"

interface DailyTodoListProps {
  onNavigateToGoal?: (goalId: string, milestoneId?: string) => void
  triggerAddTask?: boolean
  onAddTaskTriggered?: () => void
}

export function DailyTodoList({ onNavigateToGoal, triggerAddTask, onAddTaskTriggered }: DailyTodoListProps) {
  const { goals, toggleTask } = useGoals()
  const { triggerSync } = useSupabaseSync()
  const [todos, setTodos] = useState<DailyTodo[]>([])
  const [recurringTasks, setRecurringTasks] = useState<StandaloneRecurringTask[]>([])
  const [pinnedTasks, setPinnedTasks] = useState<PinnedMilestoneTask[]>([])
  const [newTodoTitle, setNewTodoTitle] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Recurring task dialog state
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false)
  const [recurringDialogTab, setRecurringDialogTab] = useState<"new" | "manage">("new")
  const [newRecurringTitle, setNewRecurringTitle] = useState("")
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [editingRecurringTask, setEditingRecurringTask] = useState<StandaloneRecurringTask | null>(null)
  const [totalCompletedAllTime, setTotalCompletedAllTime] = useState(0)

  const [currentDate, setCurrentDate] = useState(getTodayDateString)
  const todayDayOfWeek = getTodayDayOfWeek()

  // Check for date changes when page becomes visible (e.g., user comes back after midnight)
  useEffect(() => {
    const checkDateChange = () => {
      const newDate = getTodayDateString()
      if (newDate !== currentDate) {
        setCurrentDate(newDate)
      }
    }

    // Check on visibility change (when user returns to tab/app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDateChange()
      }
    }

    // Check on window focus (backup for PWAs)
    const handleFocus = () => {
      checkDateChange()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Also check periodically (every minute) in case the app stays visible at midnight
    const interval = setInterval(checkDateChange, 60000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [currentDate])

  // Load todos, recurring tasks, and pinned tasks from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const storedRecurring = localStorage.getItem(RECURRING_STORAGE_KEY)
    const storedPinned = localStorage.getItem(PINNED_TASKS_STORAGE_KEY)
    const lastReset = localStorage.getItem(LAST_RESET_KEY)
    const storedTotalCompleted = localStorage.getItem(TOTAL_COMPLETED_KEY)

    let loadedTodos: DailyTodo[] = []
    let loadedRecurring: StandaloneRecurringTask[] = []
    let loadedPinned: PinnedMilestoneTask[] = []

    // Load total completed count
    if (storedTotalCompleted) {
      setTotalCompletedAllTime(parseInt(storedTotalCompleted, 10) || 0)
    }

    if (stored) {
      try {
        loadedTodos = JSON.parse(stored)
      } catch {
        loadedTodos = []
      }
    }

    if (storedRecurring) {
      try {
        loadedRecurring = JSON.parse(storedRecurring)
      } catch {
        loadedRecurring = []
      }
    }

    if (storedPinned) {
      try {
        loadedPinned = JSON.parse(storedPinned)
      } catch {
        loadedPinned = []
      }
    }

    // Check if we need to reset (new day)
    if (lastReset !== currentDate) {
      // Filter out completed todos, keep only uncompleted ones
      loadedTodos = loadedTodos.filter((todo) => !todo.completed)
      // Filter out pinned tasks that were completed yesterday (completedDate is before today)
      loadedPinned = loadedPinned.filter((task) => !task.completedDate || task.completedDate === currentDate)
      localStorage.setItem(LAST_RESET_KEY, currentDate)
    }

    setTodos(loadedTodos)
    setRecurringTasks(loadedRecurring)
    setPinnedTasks(loadedPinned)
    setIsLoaded(true)
  }, [currentDate])

  // Listen for storage events (when data is changed from other components or cloud sync)
  useEffect(() => {
    const handleStorageChange = () => {
      // Reload all data from localStorage
      const storedTodos = localStorage.getItem(STORAGE_KEY)
      const storedRecurring = localStorage.getItem(RECURRING_STORAGE_KEY)
      const storedPinned = localStorage.getItem(PINNED_TASKS_STORAGE_KEY)
      
      if (storedTodos) {
        try {
          setTodos(JSON.parse(storedTodos))
        } catch {
          // Ignore parse errors
        }
      } else {
        setTodos([])
      }
      
      if (storedRecurring) {
        try {
          setRecurringTasks(JSON.parse(storedRecurring))
        } catch {
          // Ignore parse errors
        }
      } else {
        setRecurringTasks([])
      }
      
      if (storedPinned) {
        try {
          setPinnedTasks(JSON.parse(storedPinned))
        } catch {
          // Ignore parse errors
        }
      } else {
        setPinnedTasks([])
      }
    }

    // Listen for both standard storage events (cross-tab) and custom events (same window)
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('goalritual-storage-updated', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('goalritual-storage-updated', handleStorageChange)
    }
  }, [])

  // Save todos to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
      triggerSync()
    }
  }, [todos, isLoaded, triggerSync])

  // Save recurring tasks to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(RECURRING_STORAGE_KEY, JSON.stringify(recurringTasks))
      triggerSync()
    }
  }, [recurringTasks, isLoaded, triggerSync])

  // Save pinned tasks to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(PINNED_TASKS_STORAGE_KEY, JSON.stringify(pinnedTasks))
      triggerSync()
    }
  }, [pinnedTasks, isLoaded, triggerSync])

  // Handle trigger from FAB
  useEffect(() => {
    if (triggerAddTask) {
      setIsAdding(true)
      onAddTaskTriggered?.()
    }
  }, [triggerAddTask, onAddTaskTriggered])

  const addTodo = useCallback(() => {
    if (!newTodoTitle.trim()) return

    const newTodo: DailyTodo = {
      id: crypto.randomUUID(),
      title: newTodoTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    }

    setTodos((prev) => [...prev, newTodo])
    setNewTodoTitle("")
    setIsAdding(false)
  }, [newTodoTitle])

  const incrementTotalCompleted = useCallback(() => {
    setTotalCompletedAllTime((prev) => {
      const newCount = prev + 1
      localStorage.setItem(TOTAL_COMPLETED_KEY, String(newCount))
      return newCount
    })
  }, [])

  const decrementTotalCompleted = useCallback(() => {
    setTotalCompletedAllTime((prev) => {
      const newCount = Math.max(0, prev - 1) // Don't go below 0
      localStorage.setItem(TOTAL_COMPLETED_KEY, String(newCount))
      return newCount
    })
  }, [])

  const resetTotalCompleted = useCallback(() => {
    setTotalCompletedAllTime(0)
    localStorage.setItem(TOTAL_COMPLETED_KEY, "0")
  }, [])

  const toggleTodo = useCallback((id: string) => {
    // Find the todo first to check its current state
    const todo = todos.find((t) => t.id === id)
    if (todo) {
      if (!todo.completed) {
        // Task is being completed - increment counter
        incrementTotalCompleted()
      } else {
        // Task is being uncompleted - decrement counter
        decrementTotalCompleted()
      }
    }
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    )
  }, [todos, incrementTotalCompleted, decrementTotalCompleted])

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    setTodos((prev) => prev.filter((todo) => !todo.completed))
  }, [])

  // Pinned milestone task functions
  const togglePinnedTask = useCallback((pinnedTask: PinnedMilestoneTask) => {
    // Check if the task is currently completed in goals
    const goal = goals.find((g) => g.id === pinnedTask.goalId)
    const milestone = goal?.milestones.find((m) => m.id === pinnedTask.milestoneId)
    const originalTask = milestone?.tasks.find((t) => t.id === pinnedTask.taskId)
    
    // We're toggling, so if it was completed, it will become not completed
    const willBeCompleted = originalTask ? !originalTask.completed : false
    
    // Update the counter based on completion state
    if (willBeCompleted) {
      incrementTotalCompleted()
    } else {
      decrementTotalCompleted()
    }
    
    // Toggle the task in the goals context
    toggleTask(pinnedTask.goalId, pinnedTask.milestoneId, pinnedTask.taskId)
    
    // Update the pinned task's completed date
    setPinnedTasks((prev) =>
      prev.map((task) => {
        if (task.id !== pinnedTask.id) return task
        
        return {
          ...task,
          completedDate: willBeCompleted ? currentDate : undefined,
        }
      })
    )
  }, [goals, toggleTask, currentDate, incrementTotalCompleted, decrementTotalCompleted])

  const unpinTask = useCallback((pinnedTaskId: string) => {
    setPinnedTasks((prev) => prev.filter((task) => task.id !== pinnedTaskId))
  }, [])

  // Recurring task functions
  const addOrUpdateRecurringTask = useCallback(() => {
    if (!newRecurringTitle.trim() || selectedDays.length === 0) return

    if (editingRecurringTask) {
      // Update existing task
      setRecurringTasks((prev) =>
        prev.map((task) =>
          task.id === editingRecurringTask.id
            ? { ...task, title: newRecurringTitle.trim(), daysOfWeek: selectedDays }
            : task
        )
      )
    } else {
      // Add new task
      const newTask: StandaloneRecurringTask = {
        id: crypto.randomUUID(),
        title: newRecurringTitle.trim(),
        daysOfWeek: selectedDays,
        completedDates: [],
        createdAt: new Date().toISOString(),
      }
      setRecurringTasks((prev) => [...prev, newTask])
    }

    setNewRecurringTitle("")
    setSelectedDays([])
    setEditingRecurringTask(null)
    // Stay on manage tab after adding/editing
    setRecurringDialogTab("manage")
  }, [newRecurringTitle, selectedDays, editingRecurringTask])

  const toggleRecurringTask = useCallback((taskId: string) => {
    // Find the task first to check its current state
    const task = recurringTasks.find((t) => t.id === taskId)
    const isCompletedToday = task?.completedDates.includes(currentDate)
    
    // Update counter based on completion state
    if (task) {
      if (!isCompletedToday) {
        // Task is being completed - increment counter
        incrementTotalCompleted()
      } else {
        // Task is being uncompleted - decrement counter
        decrementTotalCompleted()
      }
    }
    
    setRecurringTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t

        if (isCompletedToday) {
          // Remove today from completed dates
          return {
            ...t,
            completedDates: t.completedDates.filter((d) => d !== currentDate),
          }
        } else {
          // Add today to completed dates
          return {
            ...t,
            completedDates: [...t.completedDates, currentDate],
          }
        }
      })
    )
  }, [recurringTasks, currentDate, incrementTotalCompleted, decrementTotalCompleted])

  const deleteRecurringTask = useCallback((taskId: string) => {
    setRecurringTasks((prev) => prev.filter((task) => task.id !== taskId))
  }, [])

  const skipRecurringTaskForToday = useCallback((taskId: string) => {
    setRecurringTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task
        const skippedDates = task.skippedDates || []
        if (skippedDates.includes(currentDate)) return task
        return {
          ...task,
          skippedDates: [...skippedDates, currentDate],
        }
      })
    )
  }, [currentDate])

  const openEditRecurringTask = useCallback((task: StandaloneRecurringTask) => {
    setEditingRecurringTask(task)
    setNewRecurringTitle(task.title)
    setSelectedDays(task.daysOfWeek)
    setRecurringDialogTab("new")
    setIsRecurringDialogOpen(true)
  }, [])

  const toggleDay = useCallback((day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }, [])

  const selectWeekdays = useCallback(() => {
    setSelectedDays([1, 2, 3, 4, 5])
  }, [])

  const selectWeekends = useCallback(() => {
    setSelectedDays([0, 6])
  }, [])

  const selectEveryDay = useCallback(() => {
    setSelectedDays([0, 1, 2, 3, 4, 5, 6])
  }, [])

  const resetFormAndClose = useCallback(() => {
    setIsRecurringDialogOpen(false)
    setNewRecurringTitle("")
    setSelectedDays([])
    setEditingRecurringTask(null)
    setRecurringDialogTab("new")
  }, [])

  const clearForm = useCallback(() => {
    setNewRecurringTitle("")
    setSelectedDays([])
    setEditingRecurringTask(null)
  }, [])

  // Get recurring tasks scheduled for today (excluding skipped ones)
  const todaysRecurringTasks = recurringTasks.filter((task) =>
    task.daysOfWeek.includes(todayDayOfWeek) && 
    !(task.skippedDates || []).includes(currentDate)
  )

  // Get real-time status for pinned tasks from goals context
  const getPinnedTaskStatus = useCallback((pinnedTask: PinnedMilestoneTask) => {
    const goal = goals.find((g) => g.id === pinnedTask.goalId)
    const milestone = goal?.milestones.find((m) => m.id === pinnedTask.milestoneId)
    const task = milestone?.tasks.find((t) => t.id === pinnedTask.taskId)
    return {
      exists: !!task,
      completed: task?.completed ?? false,
      goalTitle: goal?.title ?? pinnedTask.goalTitle,
      milestoneTitle: milestone?.title ?? pinnedTask.milestoneTitle,
      taskTitle: task?.title ?? pinnedTask.taskTitle,
    }
  }, [goals])

  // Filter pinned tasks that still exist in goals
  const validPinnedTasks = pinnedTasks.filter((task) => getPinnedTaskStatus(task).exists)

  // Count completions
  const regularCompletedCount = todos.filter((t) => t.completed).length
  const recurringCompletedCount = todaysRecurringTasks.filter((t) =>
    t.completedDates.includes(currentDate)
  ).length
  const pinnedCompletedCount = validPinnedTasks.filter((t) => getPinnedTaskStatus(t).completed).length
  const totalCompletedCount = regularCompletedCount + recurringCompletedCount + pinnedCompletedCount
  const totalCount = todos.length + todaysRecurringTasks.length + validPinnedTasks.length

  return (
    <div className="rounded-xl border border-border west-quest-card p-2.5 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-500/10 flex-shrink-0">
            <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Today's Tasks</h3>
            <p className="text-[10px] text-muted-foreground">
              {totalCount === 0
                ? "No tasks yet"
                : `${totalCompletedCount}/${totalCount} done`}
              {totalCompletedAllTime > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-primary ml-1.5 hover:underline cursor-pointer">
                      • {totalCompletedAllTime.toLocaleString()} total
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Total Counter?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will reset your all-time completed tasks counter from {totalCompletedAllTime.toLocaleString()} back to 0. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={resetTotalCompleted}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Reset Counter
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </p>
          </div>
        </div>
        {regularCompletedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCompleted}
            className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-2"
          >
            <Trash2 className="h-3 w-3" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        )}
      </div>

      {/* Pinned Milestone Tasks */}
      {validPinnedTasks.length > 0 && (
        <TooltipProvider>
          <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
            {validPinnedTasks.map((pinnedTask) => {
              const status = getPinnedTaskStatus(pinnedTask)
              return (
                <div
                  key={pinnedTask.id}
                  className="group flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-2.5 sm:px-3 py-2 sm:py-3 transition-all hover:bg-emerald-500/10 active:bg-emerald-500/15 active:scale-[0.99]"
                >
                  <Checkbox
                    id={`pinned-${pinnedTask.id}`}
                    checked={status.completed}
                    onCheckedChange={() => togglePinnedTask(pinnedTask)}
                    className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0"
                  />
                  <label
                    htmlFor={`pinned-${pinnedTask.id}`}
                    className={cn(
                      "flex-1 text-xs sm:text-base cursor-pointer min-w-0",
                      status.completed && "line-through text-muted-foreground"
                    )}
                  >
                    <span className="block truncate">{status.taskTitle}</span>
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-[9px] sm:text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 shrink-0 max-w-[80px] sm:max-w-[120px] cursor-pointer hover:bg-emerald-500/20 transition-colors py-0.5 sm:py-1 px-1.5 sm:px-2"
                        onClick={() => {
                          if (onNavigateToGoal) {
                            localStorage.setItem(SCROLL_TO_MILESTONE_KEY, pinnedTask.milestoneId)
                            onNavigateToGoal(pinnedTask.goalId, pinnedTask.milestoneId)
                          }
                        }}
                      >
                        <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 shrink-0" />
                        <span className="truncate">{status.milestoneTitle}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        <span className="font-semibold">{status.goalTitle}</span>
                        <span className="text-muted-foreground"> → </span>
                        <span>{status.milestoneTitle}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">Click to go to milestone</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => unpinTask(pinnedTask.id)}
                        className="h-7 w-7 sm:h-7 sm:w-7 flex-shrink-0 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-emerald-600 active:scale-90"
                      >
                        <PinOff className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Unpin from today</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )
            })}
          </div>
        </TooltipProvider>
      )}

      {/* Recurring Tasks for Today */}
      {todaysRecurringTasks.length > 0 && (
        <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
          {todaysRecurringTasks.map((task) => {
            const isCompletedToday = task.completedDates.includes(currentDate)
            return (
              <div
                key={task.id}
                className="group flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-purple-500/30 bg-purple-500/5 px-2.5 sm:px-3 py-2 sm:py-3 transition-all hover:bg-purple-500/10 active:bg-purple-500/15 active:scale-[0.99]"
              >
                <Checkbox
                  id={`recurring-${task.id}`}
                  checked={isCompletedToday}
                  onCheckedChange={() => toggleRecurringTask(task.id)}
                  className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0"
                />
                <label
                  htmlFor={`recurring-${task.id}`}
                  className={cn(
                    "flex-1 text-xs sm:text-base cursor-pointer",
                    isCompletedToday && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </label>
                <Badge
                  variant="outline"
                  className="text-[9px] sm:text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 cursor-pointer hover:bg-purple-500/20 py-0.5 sm:py-1 px-1.5 sm:px-2"
                  onClick={() => openEditRecurringTask(task)}
                >
                  <Repeat className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">{formatDays(task.daysOfWeek)}</span>
                  <span className="sm:hidden">{task.daysOfWeek.length}d</span>
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground active:scale-90"
                  onClick={() => skipRecurringTaskForToday(task.id)}
                  title="Skip for today"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Regular Todo List */}
      <div className="space-y-1.5 sm:space-y-2">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className="group flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-border/50 bg-background/50 px-2.5 sm:px-3 py-2 sm:py-3 transition-all hover:bg-muted/30 active:bg-muted/50 active:scale-[0.99]"
          >
            <Checkbox
              id={`daily-todo-${todo.id}`}
              checked={todo.completed}
              onCheckedChange={() => toggleTodo(todo.id)}
              className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0"
            />
            <label
              htmlFor={`daily-todo-${todo.id}`}
              className={cn(
                "flex-1 text-xs sm:text-base cursor-pointer",
                todo.completed && "line-through text-muted-foreground"
              )}
            >
              {todo.title}
            </label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteTodo(todo.id)}
              className="h-7 w-7 flex-shrink-0 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive active:scale-90"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add Todo */}
      {isAdding ? (
        <div className="mt-2 flex items-center gap-1.5 sm:gap-2">
          <Input
            placeholder="What needs to be done?"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTodo()
              if (e.key === "Escape") {
                setIsAdding(false)
                setNewTodoTitle("")
              }
            }}
            className="h-8 sm:h-9 text-xs sm:text-sm flex-1"
            autoFocus
          />
          <Button size="sm" onClick={addTodo} disabled={!newTodoTitle.trim()} className="h-8 sm:h-9 px-3 text-xs">
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAdding(false)
              setNewTodoTitle("")
            }}
            className="h-8 sm:h-9 px-2 text-xs"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="flex-1 h-8 sm:h-9 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground justify-start gap-1.5"
          >
            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="sm:hidden">Add task</span>
            <span className="hidden sm:inline">Add a task for today</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingRecurringTask(null)
              setNewRecurringTitle("")
              setSelectedDays([])
              setRecurringDialogTab(recurringTasks.length > 0 ? "manage" : "new")
              setIsRecurringDialogOpen(true)
            }}
            className="h-8 sm:h-9 text-[11px] sm:text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-500/10 gap-1 sm:gap-1.5 px-2 sm:px-3"
          >
            <Repeat className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Recurring</span>
          </Button>
        </div>
      )}

      {/* Info text - hidden on mobile to save space */}
      <p className="mt-2 text-[10px] text-muted-foreground/70 text-center hidden sm:block">
        Completed tasks clear at midnight. Recurring tasks reset each day.
      </p>

      {/* Recurring Task Dialog with Tabs */}
      <Dialog open={isRecurringDialogOpen} onOpenChange={(open) => {
        if (!open) resetFormAndClose()
        else setIsRecurringDialogOpen(open)
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-purple-600" />
              Recurring Tasks
            </DialogTitle>
            <DialogDescription>
              Create tasks that automatically appear on selected days.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={recurringDialogTab} onValueChange={(v) => setRecurringDialogTab(v as "new" | "manage")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {editingRecurringTask ? "Edit Task" : "New Task"}
              </TabsTrigger>
              <TabsTrigger value="manage" className="gap-1.5">
                <List className="h-3.5 w-3.5" />
                All Tasks
                {recurringTasks.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {recurringTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* New/Edit Task Tab */}
            <TabsContent value="new" className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Task Name</label>
                <Input
                  placeholder="e.g., Go to the gym"
                  value={newRecurringTitle}
                  onChange={(e) => setNewRecurringTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newRecurringTitle.trim() && selectedDays.length > 0) {
                      addOrUpdateRecurringTask()
                    }
                  }}
                  autoFocus={recurringDialogTab === "new"}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Repeat on</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        "h-10 w-10 rounded-full text-sm font-medium transition-all",
                        selectedDays.includes(day.value)
                          ? "bg-purple-600 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectWeekdays}
                    className="text-xs"
                  >
                    Weekdays
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectWeekends}
                    className="text-xs"
                  >
                    Weekends
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectEveryDay}
                    className="text-xs"
                  >
                    Every day
                  </Button>
                </div>
              </div>
              {selectedDays.length > 0 && (
                <div className="rounded-lg bg-purple-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Will appear on: <strong>{formatDays(selectedDays)}</strong>
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {editingRecurringTask && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearForm}
                    className="flex-1"
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button
                  onClick={addOrUpdateRecurringTask}
                  disabled={!newRecurringTitle.trim() || selectedDays.length === 0}
                  className={cn(
                    "bg-purple-600 hover:bg-purple-700",
                    !editingRecurringTask && "w-full"
                  )}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {editingRecurringTask ? "Save Changes" : "Create Task"}
                </Button>
              </div>
            </TabsContent>

            {/* Manage Tasks Tab */}
            <TabsContent value="manage" className="mt-4">
              {recurringTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-purple-500/10 mb-3">
                    <Repeat className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    No recurring tasks yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRecurringDialogTab("new")}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create your first recurring task
                  </Button>
                </div>
              ) : (
                <ScrollArea className="max-h-[300px] pr-3">
                  <div className="space-y-2">
                    {recurringTasks.map((task) => {
                      const isScheduledToday = task.daysOfWeek.includes(todayDayOfWeek)
                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "group flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors",
                            isScheduledToday
                              ? "border-purple-500/30 bg-purple-500/5"
                              : "border-border/50 bg-background/50"
                          )}
                        >
                          <Repeat className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isScheduledToday ? "text-purple-600" : "text-muted-foreground"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDays(task.daysOfWeek)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingRecurringTask(task)
                                setNewRecurringTitle(task.title)
                                setSelectedDays(task.daysOfWeek)
                                setRecurringDialogTab("new")
                              }}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Recurring Task</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &quot;{task.title}&quot;? This will remove it from all scheduled days.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteRecurringTask(task.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
              {recurringTasks.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    clearForm()
                    setRecurringDialogTab("new")
                  }}
                  className="w-full mt-3 gap-1.5 text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
                >
                  <Plus className="h-4 w-4" />
                  Add New Recurring Task
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
