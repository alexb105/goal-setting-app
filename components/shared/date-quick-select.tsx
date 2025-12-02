"use client"

import { Button } from "@/components/ui/button"

interface DateQuickSelectProps {
  onSelect: (date: string) => void
}

const QUICK_DATE_OPTIONS = [
  { label: "1 Week", days: 7 },
  { label: "2 Weeks", days: 14 },
  { label: "3 Weeks", days: 21 },
  { label: "4 Weeks", days: 28 },
  { label: "1 Month", months: 1 },
  { label: "2 Months", months: 2 },
  { label: "3 Months", months: 3 },
  { label: "4 Months", months: 4 },
] as const

export function DateQuickSelect({ onSelect }: DateQuickSelectProps) {
  const handleQuickSelect = (option: (typeof QUICK_DATE_OPTIONS)[number]) => {
    const date = new Date()
    if ("days" in option) {
      date.setDate(date.getDate() + option.days)
    } else {
      date.setMonth(date.getMonth() + option.months)
    }
    onSelect(date.toISOString().split("T")[0])
  }

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {QUICK_DATE_OPTIONS.map((option) => (
        <Button
          key={option.label}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleQuickSelect(option)}
          className="text-xs"
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
