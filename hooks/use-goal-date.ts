import { useMemo } from "react"
import type { Goal } from "@/types"
import { getGoalDate, getDaysRemaining, formatDaysRemaining } from "@/utils/date"

/**
 * Hook to get goal date information
 */
export function useGoalDate(goal: Goal) {
  return useMemo(() => {
    const goalDate = getGoalDate(goal)
    const daysRemaining = getDaysRemaining(goalDate)
    const formatted = formatDaysRemaining(daysRemaining)
    return { goalDate, daysRemaining, formatted }
  }, [goal])
}

