"use client"

import type React from "react"

import { useState } from "react"
import { useGoals } from "@/components/goals-context"
import { getGoalDate } from "@/utils/date"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DateQuickSelect } from "@/components/shared/date-quick-select"

interface AddMilestoneDialogProps {
  goalId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddMilestoneDialog({ goalId, open, onOpenChange }: AddMilestoneDialogProps) {
  const { addMilestone, goals } = useGoals()
  const [mode, setMode] = useState<"new" | "existing">("new")
  const [selectedGoalId, setSelectedGoalId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [targetDate, setTargetDate] = useState("")

  // Filter out the current goal from the list of goals that can be linked or used as milestone
  const availableGoals = goals.filter((g) => g.id !== goalId)

  // When a goal is selected as milestone, auto-fill the details
  const handleGoalSelect = (goalId: string) => {
    setSelectedGoalId(goalId)
    const goal = goals.find((g) => g.id === goalId)
    if (goal) {
      setTitle(goal.title)
      setDescription(goal.description)
      const goalDate = getGoalDate(goal)
      // If goal has no milestones, use a default date (1 month from now)
      const dateString = goalDate
        ? goalDate.toISOString().split("T")[0]
        : (() => {
            const date = new Date()
            date.setMonth(date.getMonth() + 1)
            return date.toISOString().split("T")[0]
          })()
      setTargetDate(dateString)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "existing") {
      if (!selectedGoalId) return
      const goal = goals.find((g) => g.id === selectedGoalId)
      if (!goal) return
      
      // Create milestone that links to the goal
      const goalDate = getGoalDate(goal)
      const dateString = goalDate
        ? goalDate.toISOString().split("T")[0]
        : (() => {
            const date = new Date()
            date.setMonth(date.getMonth() + 1)
            return date.toISOString().split("T")[0]
          })()
      addMilestone(goalId, {
        title: goal.title,
        description: goal.description,
        targetDate: dateString,
        completed: false,
        linkedGoalId: selectedGoalId,
      })
      
      setMode("new")
      setSelectedGoalId("")
      setTitle("")
      setDescription("")
      setTargetDate("")
      onOpenChange(false)
      return
    }
    
    if (!title) return

    addMilestone(goalId, {
      title,
      description,
      targetDate: targetDate || "", // Allow empty date
      completed: false,
    })

    setMode("new")
    setSelectedGoalId("")
    setTitle("")
    setDescription("")
    setTargetDate("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Milestone</DialogTitle>
          <DialogDescription>Create a milestone to mark your progress toward this goal.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Add Milestone</Label>
            <RadioGroup
              value={mode}
              onValueChange={(value) => {
                setMode(value as "new" | "existing")
                // Reset form when switching modes
                setSelectedGoalId("")
                setTitle("")
                setDescription("")
                setTargetDate("")
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="cursor-pointer font-normal">
                  Create new milestone
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="cursor-pointer font-normal">
                  Add existing goal as milestone
                </Label>
              </div>
            </RadioGroup>
          </div>

          {mode === "existing" && availableGoals.length > 0 && (
            <div className="space-y-2">
              <Label>Select Goal</Label>
              <ScrollArea className="h-40 rounded-md border border-border p-3">
                <RadioGroup value={selectedGoalId} onValueChange={handleGoalSelect}>
                  <div className="space-y-2">
                    {availableGoals.map((goal) => (
                      <div key={goal.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={goal.id} id={`goal-${goal.id}`} />
                        <label
                          htmlFor={`goal-${goal.id}`}
                          className="text-sm font-medium leading-none cursor-pointer flex-1"
                        >
                          {goal.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </ScrollArea>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="milestone-title">Milestone Title</Label>
            <Input
              id="milestone-title"
              placeholder="e.g., Complete market research"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={mode === "existing" && selectedGoalId !== ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-description">Description (optional)</Label>
            <Textarea
              id="milestone-description"
              placeholder="Add any details about this milestone..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={mode === "existing" && selectedGoalId !== ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-date">Target Date (optional)</Label>
            <Input
              id="milestone-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              disabled={mode === "existing" && selectedGoalId !== ""}
            />
            {mode === "new" && <DateQuickSelect onSelect={setTargetDate} />}
            <p className="text-xs text-muted-foreground">
              Leave empty if you don&apos;t have a specific deadline for this milestone.
            </p>
          </div>


          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Milestone</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
