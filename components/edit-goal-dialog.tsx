"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { AlertTriangle, X } from "lucide-react"
import type { Goal } from "@/types"
import { useGoals } from "@/components/goals-context"
import { PASTEL_COLORS } from "@/constants"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BarChart3 } from "lucide-react"
import { TagInput } from "@/components/shared/tag-input"
import { DateQuickSelect } from "@/components/shared/date-quick-select"

interface EditGoalDialogProps {
  goal: Goal
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditGoalDialog({ goal, open, onOpenChange }: EditGoalDialogProps) {
  const { updateGoal, getAllTags, goals } = useGoals()
  const [title, setTitle] = useState(goal.title)
  const [description, setDescription] = useState(goal.description)
  const [why, setWhy] = useState(goal.why || "")
  const [targetDate, setTargetDate] = useState(goal.targetDate || "")
  const [tags, setTags] = useState<string[]>(goal.tags || [])
  const [negativeImpactOn, setNegativeImpactOn] = useState<string[]>(goal.negativeImpactOn || [])
  const [selectedColor, setSelectedColor] = useState<string | undefined>(goal.color || undefined)
  const [showProgress, setShowProgress] = useState(goal.showProgress !== undefined ? goal.showProgress : true)
  const [group, setGroup] = useState<string>(goal.group || "")

  const existingTags = getAllTags()
  // Filter out the current goal from the list of goals that can be negatively impacted
  const availableGoals = goals.filter((g) => g.id !== goal.id)
  // Get all existing groups from goals (excluding current goal's group if it's the only one)
  const existingGroups = Array.from(new Set(goals.map((g) => g.group).filter((g): g is string => !!g)))

  // Reset form when goal changes
  useEffect(() => {
    setTitle(goal.title)
    setDescription(goal.description)
    setWhy(goal.why || "")
    setTargetDate(goal.targetDate || "")
    setTags(goal.tags || [])
    setNegativeImpactOn(goal.negativeImpactOn || [])
    setSelectedColor(goal.color || undefined)
    setShowProgress(goal.showProgress !== undefined ? goal.showProgress : true)
    setGroup(goal.group || "")
  }, [goal])

  const handleToggleNegativeImpact = (goalId: string) => {
    setNegativeImpactOn((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    updateGoal(goal.id, {
      title,
      description,
      why: why.trim() || undefined,
      tags,
      negativeImpactOn,
      color: selectedColor,
      showProgress,
      group: group.trim() || undefined,
      targetDate: targetDate || "", // Custom date or empty (will use milestone dates)
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0 border-b sm:border-b-0">
          <DialogTitle className="text-lg sm:text-xl">Edit Goal</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">Update your goal details. The goal date is determined by your milestone dates.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 overflow-y-auto px-4 sm:px-6">
            <div className="space-y-3 sm:space-y-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Goal Title</Label>
            <Input
              id="edit-title"
              placeholder="e.g., Launch my own startup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Describe your goal and why it matters to you..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-why">Why I want to achieve this goal</Label>
            <Textarea
              id="edit-why"
              placeholder="Write a short note about why this goal matters to you..."
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This stays private in your dashboard and helps keep you motivated.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-targetDate">Target Date (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="edit-targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="flex-1"
              />
              {targetDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setTargetDate("")}
                  title="Clear date"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <DateQuickSelect onSelect={setTargetDate} />
            <p className="text-xs text-muted-foreground">
              Set a custom deadline, or leave empty to use your milestone dates.
            </p>
          </div>

          <TagInput tags={tags} onTagsChange={setTags} existingTags={existingTags} />

          <div className="space-y-2">
            <Label htmlFor="edit-group">Group (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="edit-group"
                placeholder="e.g., Work, Personal, Health"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                list="edit-group-suggestions"
              />
              <datalist id="edit-group-suggestions">
                {existingGroups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
            {existingGroups.length > 0 && (
              <div className="pt-1">
                <p className="text-xs text-muted-foreground mb-1">Existing groups:</p>
                <div className="flex flex-wrap gap-1">
                  {existingGroups.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGroup(g)}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted-foreground/20 transition-colors"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Organize your goals into groups for better organization
            </p>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <p className="text-xs text-muted-foreground mb-2">Choose a pastel color for your goal card</p>
            <div className="grid grid-cols-5 gap-2">
              {PASTEL_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(selectedColor === color.value ? undefined : color.value)}
                  className={`h-10 w-full rounded-md border-2 transition-all ${
                    selectedColor === color.value
                      ? "border-foreground ring-2 ring-ring ring-offset-2"
                      : "border-border hover:border-foreground/50"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  aria-label={`Select ${color.name} color`}
                />
              ))}
            </div>
            {selectedColor && (
              <p className="text-xs text-muted-foreground">
                Selected: {PASTEL_COLORS.find((c) => c.value === selectedColor)?.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-show-progress"
                checked={showProgress}
                onCheckedChange={(checked) => setShowProgress(checked as boolean)}
              />
              <Label htmlFor="edit-show-progress" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Show progress tracking
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              {showProgress
                ? "Track progress with milestones and show progress bar"
                : "No milestones or progress tracking - just a simple goal"}
            </p>
          </div>

          {availableGoals.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Negative Impact on Other Goals
              </Label>
              <p className="text-xs text-muted-foreground">
                Select goals that will be negatively impacted if you don't complete this goal
              </p>
              <ScrollArea className="h-32 rounded-md border border-border p-3">
                <div className="space-y-2">
                  {availableGoals.map((otherGoal) => (
                    <div key={otherGoal.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-negative-impact-${otherGoal.id}`}
                        checked={negativeImpactOn.includes(otherGoal.id)}
                        onCheckedChange={() => handleToggleNegativeImpact(otherGoal.id)}
                      />
                      <label
                        htmlFor={`edit-negative-impact-${otherGoal.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {otherGoal.title}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {negativeImpactOn.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {negativeImpactOn.length} goal{negativeImpactOn.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}
            </div>
          </ScrollArea>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 pb-4 sm:pb-6 px-4 sm:px-6 border-t flex-shrink-0 safe-area-bottom">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 sm:h-9">
              Cancel
            </Button>
            <Button type="submit" className="h-10 sm:h-9">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
