"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Sparkles, RefreshCw, Plus, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Goal, Milestone } from "@/types"

const API_KEY_STORAGE = "pathwise-openai-api-key"

interface SuggestedTask {
  title: string
  reason: string
  effort: "quick" | "medium" | "large"
}

interface AITaskSuggestionsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal
  milestone: Milestone
  onAddTasks: (tasks: string[]) => void
}

export function AITaskSuggestions({ open, onOpenChange, goal, milestone, onAddTasks }: AITaskSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())
  const [apiKey, setApiKey] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE)
    if (storedKey) setApiKey(storedKey)
  }, [])

  useEffect(() => {
    if (open && apiKey) {
      getSuggestions()
    }
  }, [open])

  const getSuggestions = async () => {
    if (!apiKey) return

    setIsLoading(true)
    setSuggestions([])
    setSelectedTasks(new Set())
    setError("")

    try {
      const existingTasks = (milestone.tasks || []).filter(t => !t.isSeparator).map(t => t.title)

      const prompt = `You are a productivity expert. Suggest 5-7 specific, actionable tasks to complete this milestone.

GOAL: "${goal.title}"
${goal.description ? `GOAL DESCRIPTION: "${goal.description}"` : ''}
${goal.why ? `WHY: "${goal.why}"` : ''}

MILESTONE: "${milestone.title}"
${milestone.description ? `MILESTONE DESCRIPTION: "${milestone.description}"` : ''}

EXISTING TASKS:
${existingTasks.length > 0 ? existingTasks.map(t => `- ${t}`).join('\n') : 'None yet'}

Suggest tasks that:
1. Are specific and actionable (start with a verb)
2. Are NOT duplicates of existing tasks
3. Can be completed in a single session
4. Build logically toward completing the milestone
5. Cover different aspects needed to complete the milestone

Respond with ONLY valid JSON (no markdown):
{
  "tasks": [
    {
      "title": "<specific task starting with action verb>",
      "reason": "<why this task is important for the milestone>",
      "effort": "<'quick' (< 30 min), 'medium' (30 min - 2 hours), or 'large' (> 2 hours)>"
    }
  ]
}`

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a helpful productivity assistant. Respond with valid JSON only." },
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
        setSuggestions(parsed.tasks || [])
        // Auto-select all by default
        setSelectedTasks(new Set((parsed.tasks || []).map((_: SuggestedTask, i: number) => i)))
      }
    } catch (err) {
      console.error("Failed to get suggestions:", err)
      setError("Failed to get suggestions. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTask = (index: number) => {
    setSelectedTasks(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleAddSelected = () => {
    const tasksToAdd = Array.from(selectedTasks).map(i => suggestions[i].title)
    onAddTasks(tasksToAdd)
    onOpenChange(false)
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case "quick": return "bg-green-500/10 text-green-600 border-green-500/20"
      case "medium": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
      case "large": return "bg-red-500/10 text-red-600 border-red-500/20"
      default: return ""
    }
  }

  const getEffortLabel = (effort: string) => {
    switch (effort) {
      case "quick": return "< 30 min"
      case "medium": return "30m - 2h"
      case "large": return "> 2 hours"
      default: return effort
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Task Suggestions
          </DialogTitle>
          <DialogDescription>
            Select tasks to add to <span className="font-medium text-foreground">{milestone.title}</span>
          </DialogDescription>
        </DialogHeader>

        {!apiKey ? (
          <div className="text-center py-8">
            <Sparkles className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Set your OpenAI API key in AI Guidance to get task suggestions
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Analyzing milestone and generating tasks...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="outline" onClick={getSuggestions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {selectedTasks.size} of {suggestions.length} selected
              </p>
              <Button variant="ghost" size="sm" onClick={getSuggestions} className="h-7 text-xs">
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Regenerate
              </Button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {suggestions.map((task, index) => (
                <div
                  key={index}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleTask(index)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      toggleTask(index)
                    }
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all cursor-pointer",
                    selectedTasks.has(index)
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selectedTasks.has(index)} onCheckedChange={() => toggleTask(index)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{task.title}</span>
                        <Badge variant="outline" className={cn("text-[10px] flex-shrink-0", getEffortColor(task.effort))}>
                          {getEffortLabel(task.effort)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSelected} disabled={selectedTasks.size === 0}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add {selectedTasks.size} Task{selectedTasks.size !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No suggestions available</p>
            <Button variant="outline" size="sm" onClick={getSuggestions} className="mt-3">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

