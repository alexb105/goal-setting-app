"use client"

import { useState } from "react"
import { Calendar, ChevronRight, AlertTriangle, ChevronDown, CheckCircle2 } from "lucide-react"
import type { Goal } from "@/types"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useGoals } from "@/components/goals-context"
import { useGoalDate } from "@/hooks/use-goal-date"
import { calculateProgress, getNegativelyImpactedBy, getNegativelyImpacts, getSupportingGoals } from "@/utils/goals"
import { PRIORITY_COLORS } from "@/constants"

interface GoalCardProps {
  goal: Goal
  onClick: () => void
  onNavigateToGoal?: (goalId: string) => void
}

export function GoalCard({ goal, onClick, onNavigateToGoal }: GoalCardProps) {
  const { goals, updateGoal } = useGoals()
  const [isImpactOpen, setIsImpactOpen] = useState(false)
  const [isAidingOpen, setIsAidingOpen] = useState(false)
  
  const progress = calculateProgress(goal)
  const { daysRemaining, formatted: daysRemainingFormatted } = useGoalDate(goal)
  const negativelyImpactedBy = getNegativelyImpactedBy(goals, goal.id)
  const negativelyImpacts = getNegativelyImpacts(goals, goal)
  const supportingGoals = getSupportingGoals(goals, goal)

  const currentPriority = goal.priority !== undefined ? goal.priority : 0
  const priorityColorClass = PRIORITY_COLORS[currentPriority] || PRIORITY_COLORS[0]

  const cardStyle = goal.color
    ? {
        backgroundColor: goal.color,
      }
    : undefined

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col rounded-xl p-5 text-left transition-all hover:shadow-lg cursor-pointer ${
        negativelyImpacts.length > 0
          ? "border-[3px] border-destructive hover:border-destructive/80 hover:shadow-destructive/5"
          : "border border-border hover:border-primary/30 hover:shadow-primary/5"
      } ${goal.color ? "" : "bg-card"}`}
      style={cardStyle}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex flex-wrap gap-1">
          {goal.tags && goal.tags.length > 0 ? (
            <>
              {goal.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} className="text-xs px-2 py-0.5 bg-black text-white border-0">
                  {tag}
                </Badge>
              ))}
              {goal.tags.length > 2 && (
                <Badge className="text-xs px-2 py-0.5 bg-black text-white border-0">
                  +{goal.tags.length - 2}
                </Badge>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No tags</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const currentPriority = goal.priority !== undefined ? goal.priority : 0
                  const newPriority = currentPriority >= 5 ? 0 : currentPriority + 1
                  updateGoal(goal.id, { priority: newPriority })
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-foreground/20 text-sm font-semibold text-white transition-all ${priorityColorClass}`}
              >
                {goal.priority !== undefined ? goal.priority : 0}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-semibold">Priority: {currentPriority === 0 ? "None" : currentPriority}</p>
                <p className="text-xs opacity-90">
                  {currentPriority === 0 && "No priority assigned"}
                  {currentPriority === 1 && "Highest priority (Red)"}
                  {currentPriority === 2 && "High priority (Orange)"}
                  {currentPriority === 3 && "Medium priority (Yellow)"}
                  {currentPriority === 4 && "Low priority (Blue)"}
                  {currentPriority === 5 && "Lowest priority (Green)"}
                </p>
                <p className="text-xs opacity-75">Click to change priority</p>
              </div>
            </TooltipContent>
          </Tooltip>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      <h3 className="mb-1 text-lg font-semibold text-foreground line-clamp-1">{goal.title}</h3>
      <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{goal.description}</p>

      {negativelyImpactedBy.length > 0 && (
        <div className="mb-3 rounded-md bg-destructive text-xs text-white">
          <Collapsible open={isImpactOpen} onOpenChange={setIsImpactOpen}>
            <CollapsibleTrigger
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between gap-1.5 px-2 py-1.5 hover:bg-destructive/90 transition-colors rounded-md cursor-pointer">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="font-medium">
                    Impacted by {negativelyImpactedBy.length} other goal{negativelyImpactedBy.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${isImpactOpen ? "rotate-180" : ""}`}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pb-1.5">
              <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t border-white/20">
                {negativelyImpactedBy.map((impactingGoal) => (
                  <span key={impactingGoal.id} className="bg-white/20 rounded px-1.5 py-0.5 text-xs">
                    {impactingGoal.title}
                  </span>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {supportingGoals.length > 0 && (
        <div className="mb-3 rounded-md bg-green-600 text-xs text-white">
          <Collapsible open={isAidingOpen} onOpenChange={setIsAidingOpen}>
            <CollapsibleTrigger
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between gap-1.5 px-2 py-1.5 hover:bg-green-700 transition-colors rounded-md cursor-pointer">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="font-medium">
                    Supported by {supportingGoals.length} other goal{supportingGoals.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${isAidingOpen ? "rotate-180" : ""}`}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pb-1.5">
              <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t border-white/20">
                {supportingGoals.map((supportingGoal) => (
                  <button
                    key={supportingGoal.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onNavigateToGoal?.(supportingGoal.id)
                    }}
                    className="bg-white/20 hover:bg-white/30 rounded px-1.5 py-0.5 text-xs transition-colors cursor-pointer"
                  >
                    {supportingGoal.title}
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {goal.showProgress !== false && (
        <div className="mt-auto">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">
              {goal.milestones.filter((m) => m.completed).length}/{goal.milestones.length} milestones
            </span>
          </div>
          <Progress value={progress} className="h-2" />

          {daysRemaining !== null && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{daysRemainingFormatted}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
