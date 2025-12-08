"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import type { Goal, Milestone, Task, RecurringTaskGroup, RecurringTask, RecurrenceType } from "@/types"
import { STORAGE_KEY } from "@/constants"
import { getAllTags as getAllTagsUtil } from "@/utils/goals"
import { createClient } from "@/lib/supabase/client"
import { getSyncInstance } from "@/lib/supabase/sync"
import type { User } from "@supabase/supabase-js"

// Re-export types for backward compatibility
export type { Goal, Milestone, Task } from "@/types"

// Re-export constants for backward compatibility
export { PASTEL_COLORS } from "@/constants"

interface GoalsContextType {
  goals: Goal[]
  addGoal: (goal: Omit<Goal, "id" | "createdAt">) => void
  updateGoal: (id: string, goal: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  addMilestone: (goalId: string, milestone: Omit<Milestone, "id" | "tasks">) => void
  updateMilestone: (goalId: string, milestoneId: string, updates: Partial<Milestone>) => void
  toggleMilestone: (goalId: string, milestoneId: string) => void
  deleteMilestone: (goalId: string, milestoneId: string) => void
  reorderMilestones: (goalId: string, activeId: string, overId: string) => void
  addTask: (goalId: string, milestoneId: string, title: string, isSeparator?: boolean) => void
  toggleTask: (goalId: string, milestoneId: string, taskId: string) => void
  updateTask: (goalId: string, milestoneId: string, taskId: string, title: string) => void
  deleteTask: (goalId: string, milestoneId: string, taskId: string) => void
  reorderTasks: (goalId: string, milestoneId: string, activeId: string, overId: string) => void
  getAllTags: () => string[]
  renameTag: (oldTag: string, newTag: string) => void
  renameGroup: (oldGroupName: string, newGroupName: string) => void
  reorderGoals: (activeId: string, overId: string) => void
  archiveGoal: (id: string) => void
  unarchiveGoal: (id: string) => void
  archiveMilestone: (goalId: string, milestoneId: string) => void
  unarchiveMilestone: (goalId: string, milestoneId: string) => void
  // Recurring task groups
  addRecurringTaskGroup: (goalId: string, name: string, recurrence: RecurrenceType, startDate?: string) => void
  updateRecurringTaskGroup: (goalId: string, groupId: string, updates: Partial<Omit<RecurringTaskGroup, "id" | "tasks">>) => void
  deleteRecurringTaskGroup: (goalId: string, groupId: string) => void
  addRecurringTask: (goalId: string, groupId: string, title: string, isSeparator?: boolean) => void
  updateRecurringTask: (goalId: string, groupId: string, taskId: string, title: string) => void
  toggleRecurringTask: (goalId: string, groupId: string, taskId: string) => void
  deleteRecurringTask: (goalId: string, groupId: string, taskId: string) => void
  resetRecurringTaskGroup: (goalId: string, groupId: string) => void
  reorderRecurringTasks: (goalId: string, groupId: string, activeId: string, overId: string) => void
  // Sync status and trigger
  isSyncing: boolean
  syncError: string | null
  triggerSync: () => void
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined)

// Migration function to move data from old keys to new "goalritual-" keys
function migrateLocalStorageKeys() {
  const migrations = [
    // Migrate from pathwise
    { old: "pathwise-goals", new: "goalritual-goals" },
    { old: "pathwise-daily-todos", new: "goalritual-daily-todos" },
    { old: "pathwise-daily-todos-last-reset", new: "goalritual-daily-todos-last-reset" },
    { old: "pathwise-recurring-tasks", new: "goalritual-recurring-tasks" },
    { old: "pathwise-pinned-milestone-tasks", new: "goalritual-pinned-milestone-tasks" },
    { old: "pathwise-life-purpose", new: "goalritual-life-purpose" },
    { old: "pathwise-openai-api-key", new: "goalritual-openai-api-key" },
    { old: "pathwise-ai-analysis", new: "goalritual-ai-analysis" },
    { old: "pathwise-ai-applied-suggestions", new: "goalritual-ai-applied-suggestions" },
    { old: "pathwise-ai-dismissed-suggestions", new: "goalritual-ai-dismissed-suggestions" },
    { old: "pathwise-pinned-insights", new: "goalritual-pinned-insights" },
    { old: "pathwise-scroll-to-milestone", new: "goalritual-scroll-to-milestone" },
    // Migrate from goaladdict
    { old: "goaladdict-goals", new: "goalritual-goals" },
    { old: "goaladdict-daily-todos", new: "goalritual-daily-todos" },
    { old: "goaladdict-daily-todos-last-reset", new: "goalritual-daily-todos-last-reset" },
    { old: "goaladdict-recurring-tasks", new: "goalritual-recurring-tasks" },
    { old: "goaladdict-pinned-milestone-tasks", new: "goalritual-pinned-milestone-tasks" },
    { old: "goaladdict-life-purpose", new: "goalritual-life-purpose" },
    { old: "goaladdict-openai-api-key", new: "goalritual-openai-api-key" },
    { old: "goaladdict-ai-analysis", new: "goalritual-ai-analysis" },
    { old: "goaladdict-ai-applied-suggestions", new: "goalritual-ai-applied-suggestions" },
    { old: "goaladdict-ai-dismissed-suggestions", new: "goalritual-ai-dismissed-suggestions" },
    { old: "goaladdict-pinned-insights", new: "goalritual-pinned-insights" },
    { old: "goaladdict-scroll-to-milestone", new: "goalritual-scroll-to-milestone" },
  ]

  migrations.forEach(({ old: oldKey, new: newKey }) => {
    const oldValue = localStorage.getItem(oldKey)
    if (oldValue && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, oldValue)
      localStorage.removeItem(oldKey)
    }
  })
}

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const hasLoadedFromStorage = useRef(false)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userRef = useRef<User | null>(null)
  
  // Initialize Supabase client and sync
  const supabase = createClient()
  const sync = getSyncInstance(supabase)

  // Debounced sync to cloud
  const debouncedSyncToCloud = useCallback(async () => {
    if (!userRef.current) return
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }
    
    syncTimeoutRef.current = setTimeout(async () => {
      setIsSyncing(true)
      setSyncError(null)
      try {
        await sync.syncToCloud()
      } catch (error) {
        console.error("Sync error:", error)
        setSyncError("Failed to sync to cloud")
      } finally {
        setIsSyncing(false)
      }
    }, 1000) // Debounce for 1 second
  }, [sync])

  // Load from localStorage and set up auth listener
  useEffect(() => {
    // Migrate old localStorage keys to new ones (one-time migration)
    migrateLocalStorageKeys()
    
    const initializeData = async () => {
      // Check if user is signed in
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      userRef.current = user
      sync.setUser(user)

      // Check if we're in an auth flow (user clicked sign up/sign in)
      const pendingAuth = sessionStorage.getItem("goalritual-pending-auth")

      if (user) {
        // User is signed in - clear pending auth flags (both storage types for safety)
        sessionStorage.removeItem("goalritual-pending-auth")
        localStorage.removeItem("goalritual-pending-auth")
        
        // Check if we just imported data and need to force push to cloud
        const forcePush = sessionStorage.getItem("goalritual-force-push-to-cloud")
        if (forcePush) {
          sessionStorage.removeItem("goalritual-force-push-to-cloud")
          
          // Load the imported data from localStorage first
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            const parsedGoals: Goal[] = JSON.parse(stored)
            setGoals(parsedGoals)
          }
          
          // Push to cloud
          setIsSyncing(true)
          try {
            await sync.pushLocalToCloud()
          } catch (error) {
            console.error("Error pushing imported data to cloud:", error)
            setSyncError("Failed to save imported data to cloud")
          } finally {
            setIsSyncing(false)
          }
          
          hasLoadedFromStorage.current = true
          return
        }
        
        // Normal flow - load data from cloud
        setIsSyncing(true)
        try {
          // Always check if user has existing data in cloud first
          const remoteData = await sync.fetchFromSupabase()
          
          if (remoteData) {
            // User has cloud data (even if goals array is empty) - pull it to local
            console.log("Found cloud data, pulling to local. Goals count:", remoteData.goals?.length || 0)
            await sync.pullCloudToLocal()
          } else {
            // User has no cloud data - check if they have local data to push
            const localData = localStorage.getItem(STORAGE_KEY)
            if (localData) {
              try {
                const parsedLocalGoals: Goal[] = JSON.parse(localData)
                // Only push to cloud if there's actual data
                if (parsedLocalGoals && parsedLocalGoals.length > 0) {
                  console.log("No cloud data, pushing local data to cloud. Goals count:", parsedLocalGoals.length)
                  await sync.pushLocalToCloud()
                }
              } catch {
                // Invalid local data - ignore and start fresh
              }
            }
            // If no local data, don't push empty data to cloud - just start fresh
          }
          
          // Load goals from localStorage after sync (or initialize empty if none exists)
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            try {
              const parsedGoals: Goal[] = JSON.parse(stored)
              console.log("Loaded goals from localStorage after sync. Count:", parsedGoals.length)
              setGoals(parsedGoals)
            } catch {
              // Invalid data - start with empty array
              console.warn("Invalid data in localStorage, starting with empty array")
              setGoals([])
            }
          } else {
            // No stored data - initialize with empty array
            console.log("No data in localStorage, initializing with empty array")
            setGoals([])
          }
        } catch (error) {
          console.error("Error loading from cloud:", error)
          setSyncError("Failed to load from cloud")
          // On error, still try to load from localStorage or initialize empty
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            try {
              const parsedGoals: Goal[] = JSON.parse(stored)
              setGoals(parsedGoals)
            } catch {
              setGoals([])
            }
          } else {
            setGoals([])
          }
        } finally {
          setIsSyncing(false)
        }
      } else {
        // User is NOT signed in
        // Check if they're in the middle of signing up (pendingAuth flag in localStorage)
        const pendingAuthLocal = localStorage.getItem("goalritual-pending-auth")
        
        if (pendingAuthLocal) {
          // User is signing up - keep their localStorage data
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            try {
              const parsedGoals: Goal[] = JSON.parse(stored)
              setGoals(parsedGoals)
            } catch {
              setGoals([])
            }
          } else {
            setGoals([])
          }
        } else {
          // User is not signed in and not signing up - clear localStorage
          sync.clearLocalData()
          setGoals([])
        }
      }
      
      hasLoadedFromStorage.current = true
    }

    initializeData()

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null
        userRef.current = user
        sync.setUser(user)

        if (event === "SIGNED_IN" && user) {
          // Clear pending auth flags (both storage types)
          sessionStorage.removeItem("goalritual-pending-auth")
          localStorage.removeItem("goalritual-pending-auth")
          
          // Check if we already handled this sign-in (prevent duplicate handling)
          const signInHandled = sessionStorage.getItem("goalritual-signin-handled")
          if (signInHandled) {
            // Clear the flag - initializeData has already loaded data
            sessionStorage.removeItem("goalritual-signin-handled")
            return
          }
          
          // First sign-in event - set flag and reload to let initializeData handle sync cleanly
          sessionStorage.setItem("goalritual-signin-handled", "true")
          window.location.reload()
        } else if (event === "SIGNED_OUT") {
          // User signed out - clear localStorage and refresh
          sync.clearLocalData()
          window.location.reload()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [supabase.auth, sync])

  // Save to localStorage and sync to cloud whenever goals change
  useEffect(() => {
    if (hasLoadedFromStorage.current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
      debouncedSyncToCloud()
    }
  }, [goals, debouncedSyncToCloud])

  // Listen for external storage changes (e.g., from sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newGoals = JSON.parse(e.newValue)
          setGoals(newGoals)
        } catch {
          // Ignore parse errors
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const addGoal = (goal: Omit<Goal, "id" | "createdAt">) => {
    setGoals((prev) => {
      const maxOrder = Math.max(...prev.map((g) => g.order || 0), -1)
      const newGoal: Goal = {
        ...goal,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        tags: goal.tags || [],
        color: goal.color || undefined,
        showProgress: goal.showProgress !== undefined ? goal.showProgress : true,
        group: goal.group || undefined,
        order: goal.order !== undefined ? goal.order : maxOrder + 1,
      }
      return [...prev, newGoal]
    })
  }

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals((prev) => prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal)))
  }

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id))
  }

  const addMilestone = (goalId: string, milestone: Omit<Milestone, "id" | "tasks" | "linkedGoals" | "linkedGoalId"> & Partial<Pick<Milestone, "linkedGoals" | "linkedGoalId">>) => {
    const newMilestone: Milestone = {
      ...milestone,
      id: crypto.randomUUID(),
      tasks: [],
      linkedGoals: milestone.linkedGoals || [],
      linkedGoalId: milestone.linkedGoalId || undefined,
    }
    setGoals((prev) =>
      prev.map((goal) => (goal.id === goalId ? { ...goal, milestones: [...goal.milestones, newMilestone] } : goal)),
    )
  }

  const updateMilestone = (goalId: string, milestoneId: string, updates: Partial<Milestone>) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              milestones: goal.milestones.map((m) => (m.id === milestoneId ? { ...m, ...updates } : m)),
            }
          : goal,
      ),
    )
  }

  const toggleMilestone = (goalId: string, milestoneId: string) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              milestones: goal.milestones.map((m) => (m.id === milestoneId ? { ...m, completed: !m.completed } : m)),
            }
          : goal,
      ),
    )
  }

  const deleteMilestone = (goalId: string, milestoneId: string) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              milestones: goal.milestones.filter((m) => m.id !== milestoneId),
            }
          : goal,
      ),
    )
  }

  const reorderMilestones = (goalId: string, activeId: string, overId: string) => {
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== goalId) return goal

        const milestones = [...goal.milestones]
        const activeIndex = milestones.findIndex((m) => m.id === activeId)
        const overIndex = milestones.findIndex((m) => m.id === overId)

        if (activeIndex === -1 || overIndex === -1) return goal

        const [removed] = milestones.splice(activeIndex, 1)
        milestones.splice(overIndex, 0, removed)

        return {
          ...goal,
          milestones,
        }
      }),
    )
  }

  const addTask = (goalId: string, milestoneId: string, title: string, isSeparator = false) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      isSeparator,
    }
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              milestones: goal.milestones.map((m) =>
                m.id === milestoneId ? { ...m, tasks: [...m.tasks, newTask] } : m,
              ),
            }
          : goal,
      ),
    )
  }

  const toggleTask = (goalId: string, milestoneId: string, taskId: string) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              milestones: goal.milestones.map((m) =>
                m.id === milestoneId
                  ? {
                      ...m,
                      tasks: m.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
                    }
                  : m,
              ),
            }
          : goal,
      ),
    )
  }

  const updateTask = (goalId: string, milestoneId: string, taskId: string, title: string) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              milestones: goal.milestones.map((m) =>
                m.id === milestoneId
                  ? {
                      ...m,
                      tasks: m.tasks.map((t) => (t.id === taskId ? { ...t, title } : t)),
                    }
                  : m,
              ),
            }
          : goal,
      ),
    )
  }

  const deleteTask = (goalId: string, milestoneId: string, taskId: string) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              milestones: goal.milestones.map((m) =>
                m.id === milestoneId
                  ? {
                      ...m,
                      tasks: m.tasks.filter((t) => t.id !== taskId),
                    }
                  : m,
              ),
            }
          : goal,
      ),
    )
  }

  const reorderTasks = (goalId: string, milestoneId: string, activeId: string, overId: string) => {
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== goalId) return goal

        return {
          ...goal,
          milestones: goal.milestones.map((milestone) => {
            if (milestone.id !== milestoneId) return milestone

            const tasks = [...milestone.tasks]
            const activeIndex = tasks.findIndex((t) => t.id === activeId)
            const overIndex = tasks.findIndex((t) => t.id === overId)

            if (activeIndex === -1 || overIndex === -1) return milestone

            const [removed] = tasks.splice(activeIndex, 1)
            tasks.splice(overIndex, 0, removed)

            return {
              ...milestone,
              tasks,
            }
          }),
        }
      }),
    )
  }

  const getAllTags = () => {
    return getAllTagsUtil(goals)
  }

  const renameTag = (oldTag: string, newTag: string) => {
    const normalizedOldTag = oldTag.toLowerCase()
    const normalizedNewTag = newTag.toLowerCase()
    
    setGoals((prev) =>
      prev.map((goal) => ({
        ...goal,
        tags: goal.tags.map((tag) => (tag.toLowerCase() === normalizedOldTag ? newTag : tag)),
      })),
    )
  }

  const renameGroup = (oldGroupName: string, newGroupName: string) => {
    const trimmedNewName = newGroupName.trim()
    if (!trimmedNewName || trimmedNewName === oldGroupName) return
    
    setGoals((prev) =>
      prev.map((goal) => ({
        ...goal,
        group: goal.group === oldGroupName ? trimmedNewName : goal.group,
      })),
    )
  }

  const reorderGoals = (activeId: string, overId: string) => {
    setGoals((prev) => {
      const activeGoal = prev.find((g) => g.id === activeId)
      const overGoal = prev.find((g) => g.id === overId)

      if (!activeGoal || !overGoal) return prev

      // Only reorder if they're in the same group
      const activeGroup = activeGoal.group || ""
      const overGroup = overGoal.group || ""
      if (activeGroup !== overGroup) return prev

      // Get all goals in the same group, sorted by current order
      const sameGroupGoals = prev
        .filter((g) => (g.group || "") === activeGroup)
        .sort((a, b) => (a.order || 0) - (b.order || 0))

      const activeGoalInGroup = sameGroupGoals.find((g) => g.id === activeId)
      const overGoalInGroup = sameGroupGoals.find((g) => g.id === overId)

      if (!activeGoalInGroup || !overGoalInGroup) return prev

      const activeIndexInGroup = sameGroupGoals.findIndex((g) => g.id === activeId)
      const overIndexInGroup = sameGroupGoals.findIndex((g) => g.id === overId)

      // Remove active goal from its position
      sameGroupGoals.splice(activeIndexInGroup, 1)
      // Insert at new position
      sameGroupGoals.splice(overIndexInGroup, 0, activeGoalInGroup)

      // Update order values for all goals in this group
      const updatedGoals = prev.map((goal) => {
        const newIndex = sameGroupGoals.findIndex((g) => g.id === goal.id)
        if (newIndex !== -1 && (goal.group || "") === activeGroup) {
          return { ...goal, order: newIndex }
        }
        return goal
      })

      return updatedGoals
    })
  }

  // Recurring Task Group Functions
  const addRecurringTaskGroup = (goalId: string, name: string, recurrence: RecurrenceType, startDate?: string) => {
    const today = new Date().toISOString().split("T")[0]
    const newGroup: RecurringTaskGroup = {
      id: crypto.randomUUID(),
      name,
      recurrence,
      startDate: startDate || today,
      tasks: [],
      lastResetDate: startDate || today,
    }
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? { ...goal, recurringTaskGroups: [...(goal.recurringTaskGroups || []), newGroup] }
          : goal
      )
    )
  }

  const updateRecurringTaskGroup = (goalId: string, groupId: string, updates: Partial<Omit<RecurringTaskGroup, "id" | "tasks">>) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              recurringTaskGroups: (goal.recurringTaskGroups || []).map((group) =>
                group.id === groupId ? { ...group, ...updates } : group
              ),
            }
          : goal
      )
    )
  }

  const deleteRecurringTaskGroup = (goalId: string, groupId: string) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              recurringTaskGroups: (goal.recurringTaskGroups || []).filter((group) => group.id !== groupId),
            }
          : goal
      )
    )
  }

  const addRecurringTask = (goalId: string, groupId: string, title: string, isSeparator = false) => {
    const newTask: RecurringTask = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      isSeparator,
    }
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              recurringTaskGroups: (goal.recurringTaskGroups || []).map((group) =>
                group.id === groupId
                  ? { ...group, tasks: [...group.tasks, newTask] }
                  : group
              ),
            }
          : goal
      )
    )
  }

  const toggleRecurringTask = (goalId: string, groupId: string, taskId: string) => {
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== goalId) return goal

        const updatedGroups = (goal.recurringTaskGroups || []).map((group) => {
          if (group.id !== groupId) return group

          // Toggle the task
          const updatedTasks = group.tasks.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
          )

          // Check if all regular tasks are now completed
          const regularTasks = updatedTasks.filter((t) => !t.isSeparator)
          const allComplete = regularTasks.length > 0 && regularTasks.every((t) => t.completed)

          // Check if they were all complete before this toggle
          const previousRegularTasks = group.tasks.filter((t) => !t.isSeparator)
          const wasAllComplete = previousRegularTasks.length > 0 &&
            previousRegularTasks.every((t) => t.completed)

          // Calculate new completion count
          let newCompletionCount = group.completionCount || 0

          if (allComplete && !wasAllComplete) {
            // Just completed all tasks - increment
            newCompletionCount += 1
          } else if (!allComplete && wasAllComplete) {
            // Was complete, now incomplete (unchecked a task) - decrement
            newCompletionCount = Math.max(0, newCompletionCount - 1)
          }

          return {
            ...group,
            tasks: updatedTasks,
            completionCount: newCompletionCount,
          }
        })

        return { ...goal, recurringTaskGroups: updatedGroups }
      })
    )
  }

  const updateRecurringTask = (goalId: string, groupId: string, taskId: string, title: string) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              recurringTaskGroups: (goal.recurringTaskGroups || []).map((group) =>
                group.id === groupId
                  ? {
                      ...group,
                      tasks: group.tasks.map((task) =>
                        task.id === taskId ? { ...task, title } : task
                      ),
                    }
                  : group
              ),
            }
          : goal
      )
    )
  }

  const deleteRecurringTask = (goalId: string, groupId: string, taskId: string) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              recurringTaskGroups: (goal.recurringTaskGroups || []).map((group) =>
                group.id === groupId
                  ? { ...group, tasks: group.tasks.filter((task) => task.id !== taskId) }
                  : group
              ),
            }
          : goal
      )
    )
  }

  const resetRecurringTaskGroup = (goalId: string, groupId: string, wasAutoReset?: boolean) => {
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== goalId) return goal
        
        return {
          ...goal,
          recurringTaskGroups: (goal.recurringTaskGroups || []).map((group) => {
            if (group.id !== groupId) return group
            
            // Check if all non-separator tasks were completed before reset
            const regularTasks = group.tasks.filter(t => !t.isSeparator)
            const allCompleted = regularTasks.length > 0 && regularTasks.every(t => t.completed)
            
            // Calculate new score (only for auto-resets, not manual resets)
            let newScore = group.score ?? 0
            if (wasAutoReset) {
              if (allCompleted) {
                // +1 point for completing all tasks, max 100
                newScore = Math.min(100, newScore + 1)
              } else {
                // -1 point for missing deadline, min -100
                newScore = Math.max(-100, newScore - 1)
              }
            }
            
            // Update completion count if all tasks were completed
            const newCompletionCount = allCompleted 
              ? (group.completionCount || 0) + 1 
              : group.completionCount || 0
            
            return {
              ...group,
              tasks: group.tasks.map((task) => ({ ...task, completed: false })),
              lastResetDate: new Date().toISOString().split("T")[0],
              completionCount: newCompletionCount,
              score: newScore,
            }
          }),
        }
      })
    )
  }

  const reorderRecurringTasks = (goalId: string, groupId: string, activeId: string, overId: string) => {
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== goalId) return goal

        return {
          ...goal,
          recurringTaskGroups: (goal.recurringTaskGroups || []).map((group) => {
            if (group.id !== groupId) return group

            const tasks = [...group.tasks]
            const activeIndex = tasks.findIndex((t) => t.id === activeId)
            const overIndex = tasks.findIndex((t) => t.id === overId)

            if (activeIndex === -1 || overIndex === -1) return group

            const [removed] = tasks.splice(activeIndex, 1)
            tasks.splice(overIndex, 0, removed)

            return {
              ...group,
              tasks,
            }
          }),
        }
      })
    )
  }

  const archiveGoal = (id: string) => {
    setGoals((prev) => prev.map((goal) => (goal.id === id ? { ...goal, archived: true } : goal)))
  }

  const unarchiveGoal = (id: string) => {
    setGoals((prev) => prev.map((goal) => (goal.id === id ? { ...goal, archived: false } : goal)))
  }

  const archiveMilestone = (goalId: string, milestoneId: string) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              milestones: goal.milestones.map((m) =>
                m.id === milestoneId ? { ...m, archived: true } : m
              ),
            }
          : goal
      )
    )
  }

  const unarchiveMilestone = (goalId: string, milestoneId: string) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              milestones: goal.milestones.map((m) =>
                m.id === milestoneId ? { ...m, archived: false } : m
              ),
            }
          : goal
      )
    )
  }

  return (
    <GoalsContext.Provider
      value={{
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        addMilestone,
        updateMilestone,
        toggleMilestone,
        deleteMilestone,
        reorderMilestones,
        addTask,
        toggleTask,
        updateTask,
        deleteTask,
        reorderTasks,
        getAllTags,
        renameTag,
        renameGroup,
        reorderGoals,
        archiveGoal,
        unarchiveGoal,
        archiveMilestone,
        unarchiveMilestone,
        addRecurringTaskGroup,
        updateRecurringTaskGroup,
        deleteRecurringTaskGroup,
        addRecurringTask,
        updateRecurringTask,
        toggleRecurringTask,
        deleteRecurringTask,
        resetRecurringTaskGroup,
        reorderRecurringTasks,
        isSyncing,
        syncError,
        triggerSync: debouncedSyncToCloud,
      }}
    >
      {children}
    </GoalsContext.Provider>
  )
}

export function useGoals() {
  const context = useContext(GoalsContext)
  if (!context) {
    throw new Error("useGoals must be used within a GoalsProvider")
  }
  return context
}
