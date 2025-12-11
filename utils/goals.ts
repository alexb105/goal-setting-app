import type { Goal, Milestone } from "@/types"

/**
 * Calculate progress percentage for a goal
 */
export function calculateProgress(goal: Goal): number {
  if (goal.milestones.length === 0) return 0
  const completedMilestones = goal.milestones.filter((m) => m.completed).length
  return (completedMilestones / goal.milestones.length) * 100
}

/**
 * Get goals that negatively impact a given goal
 */
export function getNegativelyImpactedBy(goals: Goal[], goalId: string): Goal[] {
  return goals.filter((g) => g.negativeImpactOn?.includes(goalId))
}

/**
 * Get goals that are negatively impacted by a given goal
 */
export function getNegativelyImpacts(goals: Goal[], goal: Goal): Goal[] {
  return goals.filter((g) => goal.negativeImpactOn?.includes(g.id))
}

/**
 * Get goals that are supporting a given goal (linked as milestones)
 */
export function getSupportingGoals(goals: Goal[], goal: Goal): Goal[] {
  return goal.milestones
    .filter((milestone) => milestone.linkedGoalId)
    .map((milestone) => goals.find((g) => g.id === milestone.linkedGoalId))
    .filter((g): g is NonNullable<typeof g> => g !== undefined)
}

/**
 * Check if a goal is supporting another goal (i.e., it's linked as a milestone to another goal)
 */
export function isSupportingGoal(goals: Goal[], goalId: string): boolean {
  return goals.some((goal) =>
    goal.milestones.some((milestone) => milestone.linkedGoalId === goalId)
  )
}

/**
 * Get all unique tags from all goals
 */
export function getAllTags(goals: Goal[]): string[] {
  const allTags = goals.flatMap((goal) => goal.tags)
  return [...new Set(allTags)].sort()
}

/**
 * Check if a goal is completed (all milestones are completed)
 */
export function isGoalCompleted(goal: Goal): boolean {
  // If goal has no milestones, it's not completed
  if (goal.milestones.length === 0) return false
  // If goal has showProgress disabled, it's never considered completed
  if (goal.showProgress === false) return false
  // Goal is completed when all milestones are completed
  return goal.milestones.every((milestone) => milestone.completed)
}

