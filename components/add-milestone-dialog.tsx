"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Sparkles, RefreshCw, Lightbulb } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SuggestedMilestone {
  title: string
  description: string
  timeframe: string
  reason: string
}

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
  
  // AI Suggestions state
  const [suggestions, setSuggestions] = useState<SuggestedMilestone[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Get the current goal
  const currentGoal = goals.find((g) => g.id === goalId)

  // Filter out the current goal from the list of goals that can be linked
  const availableGoals = goals.filter((g) => g.id !== goalId)

  const handleGoalSelect = (selectedId: string) => {
    setSelectedGoalId(selectedId)
    const goal = goals.find((g) => g.id === selectedId)
    if (goal) {
      setTitle(goal.title)
      setDescription(goal.description)
      const goalDate = getGoalDate(goal)
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

  const getAISuggestions = async () => {
    if (!currentGoal) return

    setIsLoadingSuggestions(true)
    setShowSuggestions(true)
    setSuggestions([])

    try {
      const existingMilestones = currentGoal.milestones.map((m) => ({
        title: m.title,
        completed: m.completed,
      }))

      const prompt = `You are a goal planning expert. Suggest 3-4 NEW milestones for this goal.

GOAL: "${currentGoal.title}"
DESCRIPTION: "${currentGoal.description || 'No description'}"
WHY: "${currentGoal.why || 'Not specified'}"
TARGET DATE: ${currentGoal.targetDate || 'Not set'}

EXISTING MILESTONES:
${existingMilestones.length > 0 ? existingMilestones.map((m) => `- ${m.title} ${m.completed ? '(completed)' : ''}`).join('\n') : 'None yet'}

Suggest milestones that:
1. Are NOT duplicates of existing milestones
2. Fill gaps in the current plan
3. Are specific and actionable
4. Build logically toward the goal
5. Have realistic timeframes

Respond with ONLY valid JSON (no markdown):
{
  "suggestions": [
    {
      "title": "<specific milestone title>",
      "description": "<1-2 sentence description>",
      "timeframe": "<suggested timeframe like '2 weeks', '1 month'>",
      "reason": "<why this milestone is important>"
    }
  ]
}`

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are a helpful goal planning assistant. Respond with valid JSON only." },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        throw new Error("API request failed")
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (content) {
        const parsed = JSON.parse(content)
        setSuggestions(parsed.suggestions || [])
      }
    } catch (error) {
      console.error("Failed to get suggestions:", error)
      setSuggestions([])
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  const selectSuggestion = (suggestion: SuggestedMilestone) => {
    setTitle(suggestion.title)
    setDescription(suggestion.description)
    // Convert timeframe to a date
    const now = new Date()
    if (suggestion.timeframe.includes("week")) {
      const weeks = parseInt(suggestion.timeframe) || 2
      now.setDate(now.getDate() + weeks * 7)
    } else if (suggestion.timeframe.includes("month")) {
      const months = parseInt(suggestion.timeframe) || 1
      now.setMonth(now.getMonth() + months)
    } else if (suggestion.timeframe.includes("day")) {
      const days = parseInt(suggestion.timeframe) || 14
      now.setDate(now.getDate() + days)
    } else {
      now.setMonth(now.getMonth() + 1)
    }
    setTargetDate(now.toISOString().split("T")[0])
    setShowSuggestions(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "existing") {
      if (!selectedGoalId) return
      const goal = goals.find((g) => g.id === selectedGoalId)
      if (!goal) return
      
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
      
      resetForm()
      onOpenChange(false)
      return
    }
    
    if (!title) return

    addMilestone(goalId, {
      title,
      description,
      targetDate: targetDate || "",
      completed: false,
    })

    resetForm()
    onOpenChange(false)
  }

  const resetForm = () => {
    setMode("new")
    setSelectedGoalId("")
    setTitle("")
    setDescription("")
    setTargetDate("")
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm()
      onOpenChange(open)
    }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                setSelectedGoalId("")
                setTitle("")
                setDescription("")
                setTargetDate("")
                setShowSuggestions(false)
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

          {/* AI Suggestions Section */}
          {mode === "new" && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getAISuggestions}
                disabled={isLoadingSuggestions}
                className="w-full gap-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:border-purple-500/50"
              >
                {isLoadingSuggestions ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" />Getting suggestions...</>
                ) : (
                  <><Sparkles className="h-4 w-4 text-purple-600" />Get AI Suggestions</>
                )}
              </Button>

              {showSuggestions && suggestions.length > 0 && (
                <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-400">AI Suggestions</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        className="w-full text-left p-2.5 rounded-md border border-border bg-background hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{suggestion.title}</span>
                          <Badge variant="secondary" className="text-[10px] flex-shrink-0">{suggestion.timeframe}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{suggestion.reason}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">Click a suggestion to use it</p>
                </div>
              )}

              {showSuggestions && !isLoadingSuggestions && suggestions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No suggestions available</p>
              )}
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
