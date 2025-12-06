"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Plus, Target, TrendingUp, Calendar, CheckCircle2, Tag, X, Settings, ArrowLeft, AlertTriangle, ChevronRight, Bell, ChevronDown, ArrowUpDown, List, Folder, GripVertical, Pencil, Trash2, Repeat, Menu, Archive, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { Goal, Milestone } from "@/types"
import { useGoals } from "@/components/goals-context"
import { useSupabaseSync } from "@/hooks/use-supabase-sync"
import { GoalListItem } from "@/components/goal-list-item"
import { CreateGoalDialog } from "@/components/create-goal-dialog"
import { GoalDetailView } from "@/components/goal-detail-view"
import { SettingsDialog } from "@/components/settings-dialog"
import { isMilestoneOverdue, isMilestoneDueSoon, getMilestoneDaysUntilDue, getMilestoneDaysOverdue } from "@/utils/date"
import { isGoalCompleted } from "@/utils/goals"
import { DailyTodoList } from "@/components/daily-todo-list"
import { LifePurpose } from "@/components/life-purpose"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/components/auth-context"
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvidedDragHandleProps,
} from "@hello-pangea/dnd"

// Group Section Component (used inside Draggable)
interface GroupSectionContentProps {
  groupName: string
  groupGoals: Goal[]
  droppableId: string
  isEditing: boolean
  editingValue: string
  isCollapsed: boolean
  onDoubleClick: () => void
  onRename: () => void
  onRenameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onValueChange: (value: string) => void
  onToggleCollapse: () => void
  onDelete: () => void
  onGoalClick: (goalId: string) => void
  onNavigateToGoal?: (goalId: string) => void
  dragHandleProps?: DraggableProvidedDragHandleProps | null
}

function GroupSectionContent({
  groupName,
  groupGoals,
  droppableId,
  isEditing,
  editingValue,
  isCollapsed,
  onDoubleClick,
  onRename,
  onRenameKeyDown,
  onValueChange,
  onToggleCollapse,
  onDelete,
  onGoalClick,
  onNavigateToGoal,
  dragHandleProps,
}: GroupSectionContentProps) {
  return (
    <div className="space-y-4">
      <Collapsible open={!isCollapsed} onOpenChange={() => onToggleCollapse()}>
        <div className="flex items-center gap-2 border-b border-border pb-2 transition-colors rounded-t-lg px-2 -mx-2">
          {/* Group drag handle */}
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 py-1">
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
              />
              <Folder className="h-5 w-5 text-muted-foreground" />
              {isEditing ? (
                <Input
                  value={editingValue}
                  onChange={(e) => onValueChange(e.target.value)}
                  onBlur={onRename}
                  onKeyDown={onRenameKeyDown}
                  className="text-xl font-semibold h-8 px-2 flex-1 max-w-md"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <h2
                    className="text-xl font-semibold text-foreground hover:text-primary transition-colors flex-1"
                    title="Click to collapse/expand"
                  >
                    {groupName}
                  </h2>
                </>
              )}
              <span className="text-sm text-muted-foreground">({groupGoals.length})</span>
            </div>
          </CollapsibleTrigger>
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  onDoubleClick()
                }}
                title="Rename group"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => e.stopPropagation()}
                    title="Delete group"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Group</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the group &quot;{groupName}&quot;? All goals in this group will be moved to &quot;Ungrouped&quot;.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                      }}
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
        <CollapsibleContent>
          <Droppable droppableId={droppableId} type="GOAL">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-2 pt-4 min-h-[60px] rounded-lg transition-colors ${
                  snapshot.isDraggingOver ? "bg-primary/5" : ""
                }`}
              >
                {groupGoals.map((goal, index) => (
                  <Draggable key={goal.id} draggableId={goal.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`relative cursor-grab active:cursor-grabbing ${snapshot.isDragging ? "opacity-50" : ""}`}
                      >
                        <GoalListItem goal={goal} onClick={() => onGoalClick(goal.id)} onNavigateToGoal={onNavigateToGoal} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// Ungrouped Section Component
interface UngroupedSectionProps {
  ungroupedGoals: Goal[]
  showHeader: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
  onGoalClick: (goalId: string) => void
  onNavigateToGoal?: (goalId: string) => void
}

function UngroupedSection({
  ungroupedGoals,
  showHeader,
  isCollapsed,
  onToggleCollapse,
  onGoalClick,
  onNavigateToGoal,
}: UngroupedSectionProps) {
  return (
    <div className="space-y-4">
      <Collapsible open={!isCollapsed} onOpenChange={() => onToggleCollapse()}>
        {showHeader && (
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2 border-b border-border pb-2 transition-colors cursor-pointer hover:bg-muted/50 rounded-t-lg px-2 -mx-2">
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
              />
              <Folder className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">Ungrouped</h2>
              <span className="text-sm text-muted-foreground">({ungroupedGoals.length})</span>
            </div>
          </CollapsibleTrigger>
        )}
        <CollapsibleContent>
          <Droppable droppableId="ungrouped" type="GOAL">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-2 pt-4 min-h-[60px] rounded-lg transition-colors ${
                  snapshot.isDraggingOver ? "bg-primary/5" : ""
                }`}
              >
                {ungroupedGoals.map((goal, index) => (
                  <Draggable key={goal.id} draggableId={goal.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`relative cursor-grab active:cursor-grabbing ${snapshot.isDragging ? "opacity-50" : ""}`}
                      >
                        <GoalListItem goal={goal} onClick={() => onGoalClick(goal.id)} onNavigateToGoal={onNavigateToGoal} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}


export function GoalDashboard() {
  const { goals, getAllTags, renameGroup, updateGoal, isSyncing } = useGoals()
  const { user, isLoading: isAuthLoading } = useAuth()
  const { triggerSync } = useSupabaseSync()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showLateMilestones, setShowLateMilestones] = useState(false)
  const [showExpiringMilestones, setShowExpiringMilestones] = useState(false)
  const [statsOpen, setStatsOpen] = useState(true)
  const [sortBy, setSortBy] = useState<"date" | "priority">("date")
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editingGroupValue, setEditingGroupValue] = useState<string>("")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [ungroupedCollapsed, setUngroupedCollapsed] = useState(false)
  const [knownGroupNames, setKnownGroupNames] = useState<Set<string>>(new Set())
  const [groupOrder, setGroupOrder] = useState<string[]>([])
  const [groupOrderLoaded, setGroupOrderLoaded] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Load group order from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("goal-group-order")
    if (stored) {
      try {
        setGroupOrder(JSON.parse(stored))
      } catch {
        // Ignore parse errors
      }
    }
    setGroupOrderLoaded(true)
  }, [])

  // Save group order to localStorage
  useEffect(() => {
    // Only save after initial load to prevent overwriting with empty array
    if (groupOrderLoaded) {
      localStorage.setItem("goal-group-order", JSON.stringify(groupOrder))
      triggerSync()
    }
  }, [groupOrder, groupOrderLoaded, triggerSync])

  const allTags = getAllTags()

  // Filter out completed and archived goals from the main dashboard
  const activeGoals = useMemo(() => {
    return goals.filter((goal) => !isGoalCompleted(goal) && !goal.archived)
  }, [goals])

  const filteredGoals = useMemo(() => {
    if (selectedTags.length > 0) {
      return activeGoals.filter((goal) => selectedTags.every((tag) => goal.tags.includes(tag)))
    }
    return activeGoals
  }, [activeGoals, selectedTags])

  // Sort goals
  const sortedGoals = [...filteredGoals].sort((a, b) => {
    if (sortBy === "priority") {
      const priorityA = a.priority || 0
      const priorityB = b.priority || 0
      // Higher priority first (5 > 4 > 3 > 2 > 1 > 0)
      return priorityB - priorityA
    } else {
      // Sort by date created (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  // Track all group names that have ever existed (to preserve empty groups)
  useEffect(() => {
    const currentGroups = new Set<string>()
    goals.forEach((goal) => {
      if (goal.group) {
        currentGroups.add(goal.group)
      }
    })
    // Merge current groups with known groups to preserve empty groups
    setKnownGroupNames((prev) => {
      const merged = new Set(prev)
      currentGroups.forEach((group) => merged.add(group))
      return merged
    })
  }, [goals])

  // Get all unique group names (including empty groups that were previously populated)
  const allGroupNames = useMemo(() => {
    const currentGroups = new Set<string>()
    goals.forEach((goal) => {
      if (goal.group) {
        currentGroups.add(goal.group)
      }
    })
    // Include both current groups and known groups (preserves empty groups)
    const allGroups = new Set([...knownGroupNames, ...currentGroups])
    return Array.from(allGroups).sort()
  }, [goals, knownGroupNames])

  // Group goals by group name, preserving order within groups
  const groupedGoals = useMemo(() => {
    const groups: Record<string, Goal[]> = {}
    const ungrouped: Goal[] = []

    // Initialize all known groups (even if empty)
    allGroupNames.forEach((groupName) => {
      groups[groupName] = []
    })

    // Group goals and sort within each group by order
    sortedGoals.forEach((goal) => {
      if (goal.group) {
        if (!groups[goal.group]) {
          groups[goal.group] = []
        }
        groups[goal.group].push(goal)
      } else {
        ungrouped.push(goal)
      }
    })

    // Sort within each group by order, then by the original sort criteria
    Object.keys(groups).forEach((groupName) => {
      groups[groupName].sort((a, b) => {
        const orderA = a.order ?? 0
        const orderB = b.order ?? 0
        if (orderA !== orderB) return orderA - orderB
        // Fallback to original sort if order is the same
        if (sortBy === "priority") {
          const priorityA = a.priority || 0
          const priorityB = b.priority || 0
          return priorityB - priorityA
        } else {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
      })
    })

    // Sort ungrouped goals by order, then by original sort criteria
    ungrouped.sort((a, b) => {
      const orderA = a.order ?? 0
      const orderB = b.order ?? 0
      if (orderA !== orderB) return orderA - orderB
      // Fallback to original sort if order is the same
      if (sortBy === "priority") {
        const priorityA = a.priority || 0
        const priorityB = b.priority || 0
        return priorityB - priorityA
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    return { groups, ungrouped }
  }, [sortedGoals, allGroupNames, sortBy])

  // Get sorted group names based on saved order (preserve empty groups)
  const sortedGroupNames = useMemo(() => {
    // Start with groups in saved order
    const orderedGroups: string[] = []
    
    // First add groups that are in the saved order
    groupOrder.forEach((name) => {
      if (allGroupNames.includes(name)) {
        orderedGroups.push(name)
      }
    })
    
    // Then add any new groups not in the saved order (alphabetically)
    allGroupNames
      .filter((name) => !groupOrder.includes(name))
      .sort()
      .forEach((name) => orderedGroups.push(name))
    
    return orderedGroups
  }, [allGroupNames, groupOrder])
  
  // Keep groupOrder in sync when groups are added/removed
  useEffect(() => {
    // Wait for group order to be loaded from localStorage first
    if (!groupOrderLoaded) return
    
    const currentGroupSet = new Set(allGroupNames)
    const orderSet = new Set(groupOrder)
    
    // Check if we need to update
    const hasNewGroups = allGroupNames.some((name) => !orderSet.has(name))
    const hasRemovedGroups = groupOrder.some((name) => !currentGroupSet.has(name))
    
    if (hasNewGroups || hasRemovedGroups) {
      // Build new order: keep existing order, add new groups at end, remove deleted groups
      const newOrder = groupOrder.filter((name) => currentGroupSet.has(name))
      allGroupNames.forEach((name) => {
        if (!newOrder.includes(name)) {
          newOrder.push(name)
        }
      })
      setGroupOrder(newOrder)
    }
  }, [allGroupNames, groupOrder, groupOrderLoaded])

  // Calculate stats only for active goals
  const totalMilestones = activeGoals.reduce((acc, goal) => acc + goal.milestones.length, 0)
  const completedMilestones = activeGoals.reduce((acc, goal) => acc + goal.milestones.filter((m) => m.completed).length, 0)
  const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0

  // Calculate late milestones (past target date and not completed) with their goal info
  const lateMilestonesData = useMemo(() => {
    return activeGoals.reduce((acc, goal) => {
      const late = goal.milestones
        .filter(isMilestoneOverdue)
        .map((milestone) => ({
          milestone,
          goal,
          daysOverdue: getMilestoneDaysOverdue(milestone),
        }))
      return [...acc, ...late]
    }, [] as Array<{ milestone: Milestone; goal: Goal; daysOverdue: number }>)
  }, [goals])

  const lateMilestones = lateMilestonesData.length

  // Calculate milestones expiring in 3 days (not completed, due within 3 days but not overdue)
  const expiringMilestonesData = useMemo(() => {
    return activeGoals.reduce((acc, goal) => {
      const expiring = goal.milestones
        .filter(isMilestoneDueSoon)
        .map((milestone) => ({
          milestone,
          goal,
          // isMilestoneDueSoon already filters out milestones without dates, so this is safe
          daysUntilDue: getMilestoneDaysUntilDue(milestone) ?? 0,
        }))
      return [...acc, ...expiring]
    }, [] as Array<{ milestone: Milestone; goal: Goal; daysUntilDue: number }>)
  }, [goals])

  const expiringMilestones = expiringMilestonesData.length

  const selectedGoal = goals.find((g) => g.id === selectedGoalId)

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const clearTagFilters = () => {
    setSelectedTags([])
  }

  const handleGroupDoubleClick = (groupName: string) => {
    setEditingGroup(groupName)
    setEditingGroupValue(groupName)
  }

  const handleGroupRename = (oldGroupName: string) => {
    const trimmedValue = editingGroupValue.trim()
    if (trimmedValue && trimmedValue !== oldGroupName) {
      renameGroup(oldGroupName, trimmedValue)
      // Update knownGroupNames to replace old name with new name
      setKnownGroupNames((prev) => {
        const newSet = new Set(prev)
        newSet.delete(oldGroupName)
        newSet.add(trimmedValue)
        return newSet
      })
    }
    setEditingGroup(null)
    setEditingGroupValue("")
  }

  const handleGroupRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, oldGroupName: string) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleGroupRename(oldGroupName)
    } else if (e.key === "Escape") {
      setEditingGroup(null)
      setEditingGroupValue("")
    }
  }

  const handleDeleteGroup = (groupName: string) => {
    // Move all goals in this group to ungrouped
    goals.forEach((goal) => {
      if (goal.group === groupName) {
        updateGoal(goal.id, { group: undefined })
      }
    })
    // Remove group name from known groups
    setKnownGroupNames((prev) => {
      const newSet = new Set(prev)
      newSet.delete(groupName)
      return newSet
    })
    // Remove from collapsed groups if it was collapsed
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev)
      newSet.delete(groupName)
      return newSet
    })
  }

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupName)) {
        newSet.delete(groupName)
      } else {
        newSet.add(groupName)
      }
      return newSet
    })
  }

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result

    // Dropped outside a droppable area
    if (!destination) return

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    // Handle GROUP reordering
    if (type === "GROUP") {
      const newOrder = Array.from(sortedGroupNames)
      const [removed] = newOrder.splice(source.index, 1)
      newOrder.splice(destination.index, 0, removed)
      setGroupOrder(newOrder)
      return
    }

    // Handle GOAL reordering
    const sourceGroupName = source.droppableId === "ungrouped" ? undefined : source.droppableId.replace("group-", "")
    const destGroupName = destination.droppableId === "ungrouped" ? undefined : destination.droppableId.replace("group-", "")

    // Get the goals in the source and destination groups
    const sourceGoals = sourceGroupName
      ? groupedGoals.groups[sourceGroupName] || []
      : groupedGoals.ungrouped
    const destGoals = destGroupName
      ? groupedGoals.groups[destGroupName] || []
      : groupedGoals.ungrouped

    // Moving within the same group
    if (source.droppableId === destination.droppableId) {
      const newGoals = Array.from(sourceGoals)
      const [removed] = newGoals.splice(source.index, 1)
      newGoals.splice(destination.index, 0, removed)

      // Update order for all goals in this group
      newGoals.forEach((goal, index) => {
        updateGoal(goal.id, { order: index })
      })
    } else {
      // Moving to a different group
      const goal = goals.find((g) => g.id === draggableId)
      if (!goal) return

      // Expand destination group if collapsed
      if (destGroupName && collapsedGroups.has(destGroupName)) {
        setCollapsedGroups((prev) => {
          const newSet = new Set(prev)
          newSet.delete(destGroupName)
          return newSet
        })
      }
      if (!destGroupName && ungroupedCollapsed) {
        setUngroupedCollapsed(false)
      }

      // Calculate new order based on destination index
      const newOrder = destination.index

      // Update the goal's group and order
      updateGoal(draggableId, {
        group: destGroupName,
        order: newOrder,
      })

      // Reorder goals in destination group to make room
      destGoals.forEach((g, index) => {
        if (index >= destination.index) {
          updateGoal(g.id, { order: index + 1 })
        }
      })

      // Reorder goals in source group to fill the gap
      sourceGoals.forEach((g, index) => {
        if (g.id !== draggableId && index > source.index) {
          updateGoal(g.id, { order: index - 1 })
        }
      })
    }
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

  if (showExpiringMilestones) {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setShowExpiringMilestones(false)} className="gap-2 -ml-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Goals
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Expiring Milestones</h1>
            <p className="text-muted-foreground">
              {expiringMilestones === 0
                ? "You have no milestones expiring in the next 3 days."
                : `You have ${expiringMilestones} milestone${expiringMilestones !== 1 ? "s" : ""} expiring in the next 3 days.`}
            </p>
          </div>

          {expiringMilestones === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 mb-4">
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">All good!</h3>
              <p className="mb-6 text-center text-muted-foreground max-w-sm">
                You don't have any milestones expiring in the next 3 days.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {expiringMilestonesData.map(({ milestone, goal, daysUntilDue }) => (
                <div
                  key={`${goal.id}-${milestone.id}`}
                  onClick={() => setSelectedGoalId(goal.id)}
                  className="group flex flex-col rounded-xl border border-orange-500/50 bg-card p-5 text-left transition-all hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/5 cursor-pointer"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-orange-500" />
                      <span className="text-xs font-semibold text-orange-500">
                        {daysUntilDue === 0
                          ? "Due today"
                          : daysUntilDue === 1
                            ? "Due tomorrow"
                            : `Due in ${daysUntilDue} days`}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>

                  <h3 className="mb-1 text-lg font-semibold text-foreground line-clamp-1">{milestone.title}</h3>
                  {milestone.description && (
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{milestone.description}</p>
                  )}

                  <div className="mt-auto pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">From goal:</span>
                      <span className="font-medium text-foreground">{goal.title}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Click to view goal →</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (showLateMilestones) {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setShowLateMilestones(false)} className="gap-2 -ml-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Goals
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Late Milestones</h1>
            <p className="text-muted-foreground">
              {lateMilestones === 0
                ? "You have no late milestones. Great job!"
                : `You have ${lateMilestones} milestone${lateMilestones !== 1 ? "s" : ""} that ${lateMilestones !== 1 ? "are" : "is"} past due.`}
            </p>
          </div>

          {lateMilestones === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">All caught up!</h3>
              <p className="mb-6 text-center text-muted-foreground max-w-sm">
                You don't have any late milestones. Keep up the great work!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lateMilestonesData.map(({ milestone, goal, daysOverdue }) => (
                <div
                  key={`${goal.id}-${milestone.id}`}
                  onClick={() => setSelectedGoalId(goal.id)}
                  className="group flex flex-col rounded-xl border border-destructive/50 bg-card p-5 text-left transition-all hover:border-destructive hover:shadow-lg hover:shadow-destructive/5 cursor-pointer"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-xs font-semibold text-destructive">
                        {daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>

                  <h3 className="mb-1 text-lg font-semibold text-foreground line-clamp-1">{milestone.title}</h3>
                  {milestone.description && (
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{milestone.description}</p>
                  )}

                  <div className="mt-auto pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">From goal:</span>
                      <span className="font-medium text-foreground">{goal.title}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Click to view goal →</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen safe-area-top">
      {/* Sign-in Warning Banner */}
      {!isAuthLoading && !user && (
        <div className="bg-red-600 text-white px-4 py-2.5 text-center text-sm">
          <span className="font-medium">⚠️ Your changes won't be saved! Sign in or create an account to keep your data.</span>
        </div>
      )}
      
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 py-2 sm:py-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Target className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-base font-bold text-foreground hidden sm:block">GoalRitual</span>
            </Link>

            {/* Desktop Navigation - Compact pill style */}
            <nav className="hidden md:flex items-center gap-1 bg-muted/40 rounded-full px-1 py-0.5">
              <Link href="/milestones" className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all">
                Milestones
              </Link>
              <Link href="/recurring-tasks" className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all">
                Recurring
              </Link>
              <Link href="/completed" className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all">
                Completed
              </Link>
              <Link href="/archived" className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all">
                Archived
              </Link>
            </nav>

            {/* Desktop Actions - Grouped and cleaner */}
            <div className="hidden md:flex items-center gap-1.5">
              {/* Alert indicators - compact */}
              {(lateMilestones > 0 || expiringMilestones > 0) && (
                <div className="flex items-center gap-1 mr-1">
                  {lateMilestones > 0 && (
                    <button
                      onClick={() => setShowLateMilestones(true)}
                      className="flex items-center justify-center h-7 w-7 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                      title={`${lateMilestones} late milestone${lateMilestones !== 1 ? 's' : ''}`}
                    >
                      <span className="text-xs font-bold">{lateMilestones}</span>
                    </button>
                  )}
                  {expiringMilestones > 0 && (
                    <button
                      onClick={() => setShowExpiringMilestones(true)}
                      className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors"
                      title={`${expiringMilestones} milestone${expiringMilestones !== 1 ? 's' : ''} due soon`}
                    >
                      <span className="text-xs font-bold">{expiringMilestones}</span>
                    </button>
                  )}
                </div>
              )}
              
              {/* Icon buttons group */}
              <div className="flex items-center">
                {user ? (
                  <Link href="/ai-guidance">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-500/10" title="AI Guidance">
                      <Brain className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 cursor-not-allowed" title="Sign in to use AI Guidance" disabled>
                    <Brain className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsDialogOpen(true)} title="Settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              
              {/* User section */}
              {user ? (
                <AuthModal syncStatus={isSyncing ? "syncing" : "synced"} />
              ) : (
                <AuthModal />
              )}
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-1">
              {/* Compact alert badges */}
              {lateMilestones > 0 && (
                <button
                  onClick={() => setShowLateMilestones(true)}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-red-500 text-white"
                >
                  <span className="text-xs font-bold">{lateMilestones}</span>
                </button>
              )}
              {expiringMilestones > 0 && (
                <button
                  onClick={() => setShowExpiringMilestones(true)}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-white"
                >
                  <span className="text-xs font-bold">{expiringMilestones}</span>
                </button>
              )}
              
              {/* Mobile menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Menu
                    </SheetTitle>
                  </SheetHeader>
                  
                  {/* User section at top */}
                  <div className="p-3 border-b bg-muted/30">
                    <AuthModal syncStatus={user ? (isSyncing ? "syncing" : "synced") : "none"} />
                  </div>
                  
                  <nav className="flex flex-col p-2">
                    <Link href="/milestones" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-3 h-11">
                        <List className="h-4 w-4" />
                        All Milestones
                      </Button>
                    </Link>
                    <Link href="/recurring-tasks" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-3 h-11">
                        <Repeat className="h-4 w-4" />
                        Recurring Tasks
                      </Button>
                    </Link>
                    <Link href="/completed" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-3 h-11">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed Goals
                      </Button>
                    </Link>
                    <Link href="/archived" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-3 h-11">
                        <Archive className="h-4 w-4" />
                        Archived Goals
                      </Button>
                    </Link>
                    <div className="h-px bg-border my-2" />
                    {user ? (
                      <Link href="/ai-guidance" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-purple-600">
                          <Brain className="h-4 w-4" />
                          AI Guidance
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-muted-foreground/50" disabled>
                        <Brain className="h-4 w-4" />
                        AI Guidance
                        <span className="ml-auto text-xs">(Members only)</span>
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-3 h-11"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        setSettingsDialogOpen(true)
                      }}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Button>
                  </nav>
                  
                  {/* Stats summary */}
                  <div className="mt-auto p-4 border-t bg-muted/30">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <p className="text-xl font-bold text-foreground">{activeGoals.length}</p>
                        <p className="text-xs text-muted-foreground">Active Goals</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-primary">{overallProgress}%</p>
                        <p className="text-xs text-muted-foreground">Progress</p>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-8">
        {/* Life Purpose - Top of page */}
        <LifePurpose />

        {/* Daily Todo List */}
        <div className="mb-6">
          <DailyTodoList onNavigateToGoal={(goalId) => setSelectedGoalId(goalId)} />
        </div>

        {/* Goals Panel */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Panel Header */}
          <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">My Goals</h2>
                  <p className="text-xs text-muted-foreground">{activeGoals.length} active • {overallProgress}% complete</p>
                </div>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Goal</span>
              </Button>
            </div>
          </div>
          
          {/* Panel Content */}
          <div className="p-4 sm:p-6">
            {/* Stats - Collapsible */}
            <Collapsible open={statsOpen} onOpenChange={setStatsOpen} className="mb-4 sm:mb-6">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between gap-2 mb-3 cursor-pointer hover:opacity-80 transition-opacity active-scale">
                  <span className="text-sm font-medium text-muted-foreground">
                    {statsOpen ? "Stats" : "Show stats"}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${statsOpen ? "rotate-180" : ""}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
                  <div className="rounded-lg border border-border bg-background p-2.5 sm:p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
                        <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg sm:text-xl font-bold text-foreground">{activeGoals.length}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Active</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-2.5 sm:p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-accent/50 flex-shrink-0">
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg sm:text-xl font-bold text-foreground">{totalMilestones}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Milestones</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-2.5 sm:p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-green-500/10 flex-shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg sm:text-xl font-bold text-foreground">{completedMilestones}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Completed</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-2.5 sm:p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg sm:text-xl font-bold text-foreground">{overallProgress}%</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Progress</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Sort and Tag Filter Section */}
            <div className="mb-4 sm:mb-6 space-y-3">
              {/* Sort Section */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Sort by</span>
                </div>
                <Select value={sortBy} onValueChange={(value: "date" | "priority") => setSortBy(value)}>
                  <SelectTrigger className="w-[140px] sm:w-[160px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date Created</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tag Filter Section */}
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground">Filter by tags</span>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={clearTagFilters}
                      className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors active-scale touch-target"
                    >
                      <X className="h-3 w-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
                {allTags.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-all whitespace-nowrap active-scale ${
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
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Showing <span className="font-medium text-foreground">{sortedGoals.length}</span> of{" "}
                        <span className="font-medium text-foreground">{activeGoals.length}</span> goals
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
                <p className="text-xs text-muted-foreground">
                  No tags yet. Add tags to your goals to filter them.
                </p>
              )}
              </div>
            </div>

            {/* Goals Grid */}
            {goals.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background py-12">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Target className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">No goals yet</h3>
                <p className="mb-4 text-center text-sm text-muted-foreground max-w-xs px-4">
                  Start your journey by creating your first long-term goal.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Goal
                </Button>
              </div>
            ) : sortedGoals.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background py-12">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                  <Tag className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">No matching goals</h3>
                <p className="mb-4 text-center text-sm text-muted-foreground max-w-xs px-4">
                  No goals match the selected tags.
                </p>
                <Button variant="outline" onClick={clearTagFilters} size="sm" className="gap-2 bg-transparent">
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="groups-container" type="GROUP">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-8"
                >
                  {/* Grouped Goals */}
                  {sortedGroupNames.map((groupName, index) => {
                    const groupGoals = groupedGoals.groups[groupName] || []
                    const isEditing = editingGroup === groupName
                    const isCollapsed = collapsedGroups.has(groupName)
                    return (
                      <Draggable key={groupName} draggableId={`group-drag-${groupName}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={snapshot.isDragging ? "opacity-70" : ""}
                          >
                            <GroupSectionContent
                              groupName={groupName}
                              groupGoals={groupGoals}
                              droppableId={`group-${groupName}`}
                              isEditing={isEditing}
                              editingValue={editingGroupValue}
                              isCollapsed={isCollapsed}
                              onDoubleClick={() => handleGroupDoubleClick(groupName)}
                              onRename={() => handleGroupRename(groupName)}
                              onRenameKeyDown={(e) => handleGroupRenameKeyDown(e, groupName)}
                              onValueChange={setEditingGroupValue}
                              onToggleCollapse={() => toggleGroupCollapse(groupName)}
                              onDelete={() => handleDeleteGroup(groupName)}
                              onGoalClick={setSelectedGoalId}
                              onNavigateToGoal={(goalId) => setSelectedGoalId(goalId)}
                              dragHandleProps={provided.dragHandleProps}
                            />
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}

                  {/* Ungrouped Goals - Always show if there are groups so you can drop into it */}
                  {(groupedGoals.ungrouped.length > 0 || sortedGroupNames.length > 0) && (
                    <UngroupedSection
                      ungroupedGoals={groupedGoals.ungrouped}
                      showHeader={sortedGroupNames.length > 0}
                      isCollapsed={ungroupedCollapsed}
                      onToggleCollapse={() => setUngroupedCollapsed(!ungroupedCollapsed)}
                      onGoalClick={setSelectedGoalId}
                      onNavigateToGoal={(goalId) => setSelectedGoalId(goalId)}
                    />
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
          </div>
        </div>
      </div>

      <CreateGoalDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <SettingsDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen} />
    </div>
  )
}
