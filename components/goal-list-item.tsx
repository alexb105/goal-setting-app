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

interface GoalListItemProps {
  goal: Goal
  onClick: () => void
  onNavigateToGoal?: (goalId: string) => void
}

export function GoalListItem({ goal, onClick, onNavigateToGoal }: GoalListItemProps) {
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

  // Convert hex color to rgba with opacity for subtle background
  const getColorWithOpacity = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  // Text color classes when goal has a custom color (for better contrast)
  const hasCustomColor = !!goal.color
  const textColorClass = hasCustomColor ? "text-white" : "text-foreground"
  const mutedTextColorClass = hasCustomColor ? "text-white/70" : "text-muted-foreground"
  const iconColorClass = hasCustomColor ? "text-white/60" : "text-muted-foreground"

  return (
    <div
      onClick={onClick}
      onPointerDown={(e) => {
        // Don't trigger click if dragging
        if (e.target !== e.currentTarget) {
          const target = e.target as HTMLElement
          if (target.closest('[data-draggable-handle]')) {
            return
          }
        }
      }}
      className={`group flex items-start sm:items-center gap-2 sm:gap-4 rounded-xl border px-3 sm:px-4 py-3 sm:py-3 text-left transition-all cursor-pointer active-scale hover:brightness-110 active:brightness-105 backdrop-blur-sm ${
        negativelyImpacts.length > 0
          ? "border-destructive/50 hover:border-destructive bg-card/80"
          : goal.color 
            ? "" 
            : "border-border hover:border-primary/50 bg-card/80 hover:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
      }`}
      style={goal.color ? { 
        backgroundColor: getColorWithOpacity(goal.color, 0.35),
        borderColor: getColorWithOpacity(goal.color, 0.5),
        boxShadow: `0 0 20px ${getColorWithOpacity(goal.color, 0.15)}`,
      } : undefined}
    >
      {/* Priority Indicator */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation()
              const currentPriority = goal.priority !== undefined ? goal.priority : 0
              const newPriority = currentPriority >= 5 ? 0 : currentPriority + 1
              updateGoal(goal.id, { priority: newPriority })
            }}
            className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-foreground/20 text-xs sm:text-sm font-semibold text-white transition-all flex-shrink-0 mt-0.5 sm:mt-0 ${priorityColorClass}`}
          >
            {goal.priority !== undefined ? goal.priority : 0}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">Priority: {currentPriority === 0 ? "None" : currentPriority}</p>
            <p className="text-xs opacity-90">
              {currentPriority === 0 && "No priority assigned"}
              {currentPriority === 1 && "Highest priority (Fuchsia)"}
              {currentPriority === 2 && "High priority (Violet)"}
              {currentPriority === 3 && "Medium priority (Purple)"}
              {currentPriority === 4 && "Low priority (Indigo)"}
              {currentPriority === 5 && "Lowest priority (Blue)"}
            </p>
            <p className="text-xs opacity-75">Tap to change priority</p>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Goal Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
          <h3 className={`text-sm sm:text-base font-semibold line-clamp-2 sm:truncate ${textColorClass}`}>{goal.title}</h3>
          {goal.tags && goal.tags.length > 0 && (
            <div className="flex gap-1 flex-shrink-0 flex-wrap">
              {goal.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className={`text-[10px] sm:text-xs px-1.5 py-0 h-4 sm:h-5 ${hasCustomColor ? "bg-white/20 text-white border-white/30" : ""}`}>
                  {tag}
                </Badge>
              ))}
              {goal.tags.length > 2 && (
                <Badge variant="secondary" className={`text-[10px] sm:text-xs px-1.5 py-0 h-4 sm:h-5 ${hasCustomColor ? "bg-white/20 text-white border-white/30" : ""}`}>
                  +{goal.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {goal.description && (
          <p className={`text-xs sm:text-sm line-clamp-1 mb-1.5 sm:mb-2 ${mutedTextColorClass}`}>{goal.description}</p>
        )}

        {/* Mobile: Inline progress + info row */}
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs ${mutedTextColorClass}`}>
          {goal.showProgress !== false && (
            <>
              <span className="flex items-center gap-1">
                <span className={`font-medium ${textColorClass}`}>{goal.milestones.filter((m) => m.completed).length}</span>/{goal.milestones.length} milestones
              </span>
              {daysRemaining !== null && (
                <div className="flex items-center gap-1">
                  <Calendar className={`h-3 w-3 ${iconColorClass}`} />
                  <span>{daysRemainingFormatted}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Impact Indicators */}
        {negativelyImpactedBy.length > 0 && (
          <div className="mt-1.5 sm:mt-2">
            <Collapsible open={isImpactOpen} onOpenChange={setIsImpactOpen}>
              <CollapsibleTrigger
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-destructive hover:underline cursor-pointer py-0.5">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  <span>Impacted by {negativelyImpactedBy.length} goal{negativelyImpactedBy.length !== 1 ? "s" : ""}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${isImpactOpen ? "rotate-180" : ""}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <div className="flex flex-wrap gap-1">
                  {negativelyImpactedBy.map((impactingGoal) => (
                    <span key={impactingGoal.id} className="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-[10px] sm:text-xs">
                      {impactingGoal.title}
                    </span>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {supportingGoals.length > 0 && (
          <div className="mt-1.5 sm:mt-2">
            <Collapsible open={isAidingOpen} onOpenChange={setIsAidingOpen}>
              <CollapsibleTrigger
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-green-600 hover:underline cursor-pointer py-0.5">
                  <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                  <span>Supported by {supportingGoals.length} goal{supportingGoals.length !== 1 ? "s" : ""}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${isAidingOpen ? "rotate-180" : ""}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <div className="flex flex-wrap gap-1">
                  {supportingGoals.map((supportingGoal) => (
                    <button
                      key={supportingGoal.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onNavigateToGoal?.(supportingGoal.id)
                      }}
                      className="bg-green-600/10 text-green-600 hover:bg-green-600/20 rounded px-1.5 py-0.5 text-[10px] sm:text-xs transition-colors cursor-pointer"
                    >
                      {supportingGoal.title}
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>

      {/* Progress Bar (if enabled) - Hidden on small mobile, shown on larger screens */}
      {goal.showProgress !== false && goal.milestones.length > 0 && (
        <div className="hidden sm:block w-24 lg:w-32 flex-shrink-0">
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Arrow */}
      <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 flex-shrink-0 mt-0.5 sm:mt-0 ${iconColorClass}`} />
    </div>
  )
}

