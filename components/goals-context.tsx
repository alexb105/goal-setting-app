"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import type { Goal, Milestone, Task, RecurringTaskGroup, RecurringTask, RecurrenceType } from "@/types"
import { STORAGE_KEY } from "@/constants"
import { getAllTags as getAllTagsUtil } from "@/utils/goals"

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
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined)

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([])
  const hasLoadedFromStorage = useRef(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsedGoals: Goal[] = JSON.parse(stored)
      const migratedGoals = parsedGoals.map((goal, index) => ({
        ...goal,
        tags: goal.tags || [],
        color: goal.color || undefined,
        showProgress: goal.showProgress !== undefined ? goal.showProgress : true, // Default to true for existing goals
        group: goal.group || undefined,
        why: goal.why || undefined,
        order: goal.order !== undefined ? goal.order : index, // Preserve existing order or use index
        archived: goal.archived || false, // Default to false for existing goals
        milestones: goal.milestones.map((m) => ({
          ...m,
          tasks: m.tasks || [],
          linkedGoals: m.linkedGoals || [],
          linkedGoalId: m.linkedGoalId || undefined,
          taskDisplayStyle: m.taskDisplayStyle || undefined,
        })),
      }))
      setGoals(migratedGoals)
    }
    hasLoadedFromStorage.current = true
  }, [])

  useEffect(() => {
    // Only write to localStorage after we've loaded from it
    if (hasLoadedFromStorage.current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
    }
  }, [goals])

  const addGoal = (goal: Omit<Goal, "id" | "createdAt">) => {
    setGoals((prev) => {
      const maxOrder = Math.max(...prev.map((g) => g.order || 0), -1)
      const newGoal: Goal = {
        ...goal,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        tags: goal.tags || [], // Use tags from input or default to empty array
        color: goal.color || undefined, // Use color from input or default to undefined
        showProgress: goal.showProgress !== undefined ? goal.showProgress : true, // Default to true if not specified
        group: goal.group || undefined, // Use group from input or default to undefined
        order: goal.order !== undefined ? goal.order : maxOrder + 1, // Set order to be after all existing goals
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

  const resetRecurringTaskGroup = (goalId: string, groupId: string) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              recurringTaskGroups: (goal.recurringTaskGroups || []).map((group) =>
                group.id === groupId
                  ? {
                      ...group,
                      tasks: group.tasks.map((task) => ({ ...task, completed: false })),
                      lastResetDate: new Date().toISOString().split("T")[0],
                    }
                  : group
              ),
            }
          : goal
      )
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
        addRecurringTaskGroup,
        updateRecurringTaskGroup,
        deleteRecurringTaskGroup,
        addRecurringTask,
        updateRecurringTask,
        toggleRecurringTask,
        deleteRecurringTask,
        resetRecurringTaskGroup,
        reorderRecurringTasks,
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
