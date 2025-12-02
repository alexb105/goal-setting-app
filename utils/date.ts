import type { Goal, Milestone } from "@/types"

/**
 * Get the goal date - uses custom targetDate if set, otherwise calculates from milestones
 */
export function getGoalDate(goal: Goal): Date | null {
  // If goal has a custom target date, use it
  if (goal.targetDate) {
    return new Date(goal.targetDate)
  }
  
  // Otherwise, calculate from the latest milestone date
  if (goal.milestones.length === 0) return null
  const milestonesWithDates = goal.milestones.filter((m) => m.targetDate)
  if (milestonesWithDates.length === 0) return null
  const dates = milestonesWithDates.map((m) => new Date(m.targetDate).getTime())
  return new Date(Math.max(...dates))
}

/**
 * Calculate days remaining until a date
 */
export function getDaysRemaining(targetDate: Date | null): number | null {
  if (!targetDate) return null
  return Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

/**
 * Format days remaining as a human-readable string
 */
export function formatDaysRemaining(daysRemaining: number | null): string {
  if (daysRemaining === null) return "No date set"
  if (daysRemaining > 0) return `${daysRemaining} days remaining`
  if (daysRemaining === 0) return "Due today"
  return `${Math.abs(daysRemaining)} days overdue`
}

/**
 * Get the start of today (midnight)
 */
export function getTodayStart(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

/**
 * Get the start of a date (midnight)
 */
export function getDateStart(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Check if a milestone is overdue
 */
export function isMilestoneOverdue(milestone: Milestone): boolean {
  if (milestone.completed || !milestone.targetDate) return false
  const targetDate = getDateStart(milestone.targetDate)
  const today = getTodayStart()
  return targetDate < today
}

/**
 * Check if a milestone is due soon (within 3 days)
 */
export function isMilestoneDueSoon(milestone: Milestone): boolean {
  if (milestone.completed || !milestone.targetDate) return false
  const targetDate = getDateStart(milestone.targetDate)
  const today = getTodayStart()
  const daysUntilDue = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilDue >= 0 && daysUntilDue <= 3
}

/**
 * Calculate days until due for a milestone
 * Returns null if no target date is set
 */
export function getMilestoneDaysUntilDue(milestone: Milestone): number | null {
  if (!milestone.targetDate) return null
  const targetDate = getDateStart(milestone.targetDate)
  const today = getTodayStart()
  return Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Calculate days overdue for a milestone
 * Returns 0 if no target date is set
 */
export function getMilestoneDaysOverdue(milestone: Milestone): number {
  if (!milestone.targetDate) return 0
  const targetDate = getDateStart(milestone.targetDate)
  const today = getTodayStart()
  return Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
}

