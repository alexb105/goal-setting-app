"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Calendar, Plus, Trash2, MoreVertical, Pencil, AlertTriangle, CheckCircle2, Repeat, Target, Archive, ArchiveRestore, Brain, AlertCircle, ArrowRight, Zap, PinOff } from "lucide-react"
import type { PinnedInsight } from "@/types"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Goal } from "@/types"
import { useGoals } from "@/components/goals-context"
import { Textarea } from "@/components/ui/textarea"
import { MilestonePath } from "@/components/milestone-path"
import { AddMilestoneDialog } from "@/components/add-milestone-dialog"
import { EditGoalDialog } from "@/components/edit-goal-dialog"
import { RecurringTasks } from "@/components/recurring-tasks"
import { useGoalDate } from "@/hooks/use-goal-date"
import { calculateProgress, getNegativelyImpactedBy, getNegativelyImpacts, getSupportingGoals } from "@/utils/goals"

const PINNED_INSIGHTS_STORAGE = "goaladdict-pinned-insights"
const SCROLL_TO_MILESTONE_KEY = "goaladdict-scroll-to-milestone"

interface GoalDetailViewProps {
  goal: Goal
  onBack: () => void
  onNavigateToGoal?: (goalId: string) => void
}

export function GoalDetailView({ goal, onBack, onNavigateToGoal }: GoalDetailViewProps) {
  const { deleteGoal, goals, updateGoal, archiveGoal, unarchiveGoal } = useGoals()
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [whyText, setWhyText] = useState(goal.why || "")
  const [activeTab, setActiveTab] = useState("overview")
  const [pinnedInsights, setPinnedInsights] = useState<PinnedInsight[]>([])

  // Load pinned insights for this goal
  useEffect(() => {
    const stored = localStorage.getItem(PINNED_INSIGHTS_STORAGE)
    if (stored) {
      try {
        const allPinned: PinnedInsight[] = JSON.parse(stored)
        setPinnedInsights(allPinned.filter(p => p.goalId === goal.id))
      } catch {
        // Ignore parse errors
      }
    }
  }, [goal.id])

  // Scroll to milestone if requested
  useEffect(() => {
    const milestoneId = localStorage.getItem(SCROLL_TO_MILESTONE_KEY)
    if (milestoneId) {
      // Clear the stored milestone ID
      localStorage.removeItem(SCROLL_TO_MILESTONE_KEY)
      
      // Wait a bit for the DOM to render
      const timer = setTimeout(() => {
        const element = document.getElementById(`milestone-${milestoneId}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
          // Add a highlight effect
          element.classList.add("ring-2", "ring-emerald-500", "ring-offset-2")
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-emerald-500", "ring-offset-2")
          }, 2000)
        }
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [goal.id])

  const unpinInsight = (insightId: string) => {
    const stored = localStorage.getItem(PINNED_INSIGHTS_STORAGE)
    if (stored) {
      try {
        const allPinned: PinnedInsight[] = JSON.parse(stored)
        const updated = allPinned.filter(p => p.id !== insightId)
        localStorage.setItem(PINNED_INSIGHTS_STORAGE, JSON.stringify(updated))
        setPinnedInsights(updated.filter(p => p.goalId === goal.id))
      } catch {
        // Ignore parse errors
      }
    }
  }

  const negativelyImpactedBy = getNegativelyImpactedBy(goals, goal.id)
  const negativelyImpacts = getNegativelyImpacts(goals, goal)
  const supportingGoals = getSupportingGoals(goals, goal)
  const progress = calculateProgress(goal)
  const { goalDate, daysRemaining, formatted: daysRemainingFormatted } = useGoalDate(goal)

  const handleDelete = () => {
    deleteGoal(goal.id)
    onBack()
  }

  return (
    <div className="min-h-screen safe-area-top">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2 h-9 px-2 sm:px-3">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Goals</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)} className="h-10">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Goal
                </DropdownMenuItem>
                {goal.archived ? (
                  <DropdownMenuItem
                    onClick={() => {
                      unarchiveGoal(goal.id)
                      onBack()
                    }}
                    className="h-10"
                  >
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Unarchive Goal
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => {
                      archiveGoal(goal.id)
                      onBack()
                    }}
                    className="h-10"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Goal
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive h-10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-3 sm:px-6 py-4 sm:py-8">
        {/* Pinned AI Insights */}
        {pinnedInsights.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-600">
              <Brain className="h-4 w-4" />
              <span>AI Insights</span>
            </div>
            {pinnedInsights.map((insight) => (
              <div key={insight.id} className="rounded-xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-amber-500/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-foreground">
                      Blocked by: <span className="text-amber-600">{insight.blockerGoalTitle}</span>
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => unpinInsight(insight.id)}
                    title="Unpin insight"
                  >
                    <PinOff className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-red-600 font-medium uppercase">How It's Blocking</p>
                      <p className="text-xs text-foreground">{insight.howItImpacts}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-amber-600 font-medium uppercase">What You're Losing</p>
                      <p className="text-xs text-foreground">{insight.whatYouLose}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-green-600 font-medium uppercase">What Gets Unlocked</p>
                      <p className="text-xs text-foreground">{insight.unlockPotential}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Goal Info */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-3 sm:mb-4 flex flex-wrap items-center gap-2">
            {goal.tags && goal.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {goal.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] sm:text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {goal.showProgress !== false && goalDate && (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground ml-auto">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{daysRemainingFormatted}</span>
              </div>
            )}
          </div>

          <h1 className="mb-2 text-xl sm:text-3xl font-bold text-foreground leading-tight">{goal.title}</h1>

          {goal.description && <p className="mb-4 sm:mb-6 text-sm sm:text-base text-muted-foreground">{goal.description}</p>}

          {/* Why I want to achieve this goal */}
          <div className="mb-4 sm:mb-6 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-2">
              <span className="text-sm font-medium text-foreground">Why I want to achieve this goal</span>
              <span className="text-xs text-muted-foreground">Keep yourself motivated</span>
            </div>
            <Textarea
              value={whyText}
              onChange={(e) => {
                const value = e.target.value
                setWhyText(value)
                updateGoal(goal.id, { why: value.trim() || undefined })
              }}
              placeholder="Write a short note about why this goal matters to you..."
              rows={3}
              className="text-sm sm:text-base"
            />
          </div>

          {/* Negative Impact Information */}
          {(negativelyImpactedBy.length > 0 || negativelyImpacts.length > 0) && (
            <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3">
              {negativelyImpactedBy.length > 0 && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 sm:p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs sm:text-sm font-semibold text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Negatively Impacted By</span>
                  </div>
                  <p className="mb-2 text-[11px] sm:text-xs text-muted-foreground">
                    These goals will negatively impact this goal if not completed:
                  </p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {negativelyImpactedBy.map((impactingGoal) => (
                      <Badge key={impactingGoal.id} variant="destructive" className="text-[10px] sm:text-xs">
                        {impactingGoal.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {negativelyImpacts.length > 0 && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 sm:p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs sm:text-sm font-semibold text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Negatively Impacts</span>
                  </div>
                  <p className="mb-2 text-[11px] sm:text-xs text-muted-foreground">
                    This goal will negatively impact these goals if not completed:
                  </p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {negativelyImpacts.map((impactedGoal) => (
                      <Badge key={impactedGoal.id} variant="destructive" className="text-[10px] sm:text-xs">
                        {impactedGoal.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Supporting Goals Information */}
          {supportingGoals.length > 0 && (
            <div className="mb-4 sm:mb-6 rounded-xl border border-green-600/20 bg-green-600/5 p-3 sm:p-4">
              <div className="mb-2 flex items-center gap-2 text-xs sm:text-sm font-semibold text-green-700 dark:text-green-500">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Supported by Other Goals</span>
              </div>
              <p className="mb-2 text-[11px] sm:text-xs text-muted-foreground">
                These goals are supporting this goal as milestones:
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {supportingGoals.map((supportingGoal) => (
                  <Badge key={supportingGoal.id} variant="outline" className="text-[10px] sm:text-xs bg-green-600/10 text-green-700 dark:text-green-500 border-green-600/20">
                    {supportingGoal.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {goal.showProgress !== false && (
            <div className="rounded-xl border border-border bg-card p-3 sm:p-5">
              <div className="mb-2 sm:mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="text-sm font-medium text-foreground">Overall Progress</span>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {goal.milestones.filter((m) => m.completed).length} of {goal.milestones.length} milestones
                </span>
              </div>
              <Progress value={progress} className="h-2.5 sm:h-3" />
              <p className="mt-2 text-right text-base sm:text-lg font-semibold text-primary">{Math.round(progress)}%</p>
            </div>
          )}
        </div>

        {/* Tabs for Overview and Recurring Tasks */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 sm:mb-6 grid w-full grid-cols-2 max-w-full sm:max-w-md h-auto">
            <TabsTrigger value="overview" className="gap-1.5 sm:gap-2 text-xs sm:text-sm py-2.5 px-2 sm:px-4">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Milestones</span>
            </TabsTrigger>
            <TabsTrigger value="recurring" className="gap-1.5 sm:gap-2 text-xs sm:text-sm py-2.5 px-2 sm:px-4">
              <Repeat className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Recurring</span>
              {(goal.recurringTaskGroups?.length || 0) > 0 && (
                <Badge variant="secondary" className="ml-0.5 sm:ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                  {goal.recurringTaskGroups?.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            {/* Milestones Path */}
            <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Your Path</h2>
              <Button onClick={() => setAddMilestoneOpen(true)} size="sm" className="gap-1.5 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Add Milestone</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>

            <MilestonePath 
              goalId={goal.id} 
              milestones={goal.milestones}
              onNavigateToGoal={onNavigateToGoal}
            />
          </TabsContent>

          <TabsContent value="recurring" className="mt-0">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Recurring Tasks</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Track daily, weekly, or monthly habits that support this goal.
              </p>
            </div>
            <RecurringTasks goalId={goal.id} groups={goal.recurringTaskGroups || []} />
          </TabsContent>
        </Tabs>
      </div>

      <AddMilestoneDialog goalId={goal.id} open={addMilestoneOpen} onOpenChange={setAddMilestoneOpen} />

      <EditGoalDialog goal={goal} open={editDialogOpen} onOpenChange={setEditDialogOpen} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this goal? This action cannot be undone and all milestones will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
