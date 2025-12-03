import { useMemo } from "react"
import type { Milestone } from "@/types"
import {
  isMilestoneOverdue,
  isMilestoneDueSoon,
  getMilestoneDaysUntilDue,
  getMilestoneDaysOverdue,
} from "@/utils/date"

/**
 * Hook to get milestone status information
 */
export function useMilestoneStatus(milestone: Milestone) {
  return useMemo(() => {
    const overdue = isMilestoneOverdue(milestone)
    const dueSoon = isMilestoneDueSoon(milestone)
    const daysUntilDue = getMilestoneDaysUntilDue(milestone)
    const daysOverdue = overdue ? getMilestoneDaysOverdue(milestone) : 0

    return {
      overdue,
      dueSoon,
      daysUntilDue,
      daysOverdue,
    }
  }, [milestone])
}


