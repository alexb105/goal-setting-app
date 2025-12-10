"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Sparkles, RefreshCw, Check, X, Plus, Pencil, Map, Calendar, ChevronDown, AlertTriangle, Target, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGoals } from "@/components/goals-context"
import { useSupabaseSync } from "@/hooks/use-supabase-sync"
import type { Goal, Milestone } from "@/types"
import { isGoalCompleted } from "@/utils/goals"

const LIFE_PURPOSE_STORAGE = "goalritual-life-purpose"

interface Suggestion {
  id: string
  action: "add" | "edit" | "adjust_date"
  goalId: string
  goalTitle: string
  milestoneId?: string
  currentTitle?: string
  title: string
  description?: string
  targetDate?: string
  currentDate?: string
  reason: string
  priority: "high" | "medium" | "low"
  phase: string
}

interface Phase {
  name: string
  timeframe: string
}

const PHASES: Phase[] = [
  { name: "Phase 1: Foundation", timeframe: "Now - 3 months" },
  { name: "Phase 2: Development", timeframe: "3-6 months" },
  { name: "Phase 3: Acceleration", timeframe: "6-12 months" },
  { name: "Phase 4: Mastery", timeframe: "1-2 years" },
  { name: "Phase 5: Legacy", timeframe: "2+ years" },
]

interface AIRoadmapDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIRoadmapDialog({ open, onOpenChange }: AIRoadmapDialogProps) {
  const { goals, addGoal, addMilestone, updateMilestone } = useGoals()
  const { triggerSync } = useSupabaseSync()
  const [lifePurpose, setLifePurpose] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem(LIFE_PURPOSE_STORAGE)
      if (stored) setLifePurpose(stored)
    }
  }, [open])

  // Get all existing milestones
  const existingMilestones = useMemo(() => {
    const milestones: Array<{
      id: string
      goalId: string
      goalTitle: string
      title: string
      description: string
      targetDate: string
      completed: boolean
      inProgress: boolean
    }> = []
    
    goals.forEach((goal) => {
      if (goal.archived) return
      goal.milestones.forEach((m) => {
        if (!m.linkedGoalId && !m.archived) {
          milestones.push({
            id: m.id,
            goalId: goal.id,
            goalTitle: goal.title,
            title: m.title,
            description: m.description || "",
            targetDate: m.targetDate || "",
            completed: m.completed || false,
            inProgress: m.inProgress || false,
          })
        }
      })
    })
    
    return milestones.sort((a, b) => {
      if (a.completed && !b.completed) return 1
      if (!a.completed && b.completed) return -1
      if (!a.targetDate && !b.targetDate) return 0
      if (!a.targetDate) return 1
      if (!b.targetDate) return -1
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    })
  }, [goals])

  const activeGoals = useMemo(() => {
    return goals.filter((goal) => !isGoalCompleted(goal) && !goal.archived)
  }, [goals])

  const buildPrompt = () => {
    // Limit to first 10 goals to reduce prompt size
    const goalsData = activeGoals.slice(0, 10).map((goal) => ({
      id: goal.id,
      title: goal.title,
      milestones: goal.milestones
        .filter(m => !m.linkedGoalId && !m.archived)
        .slice(0, 8) // Limit milestones per goal
        .map((m) => ({ id: m.id, title: m.title, date: m.targetDate || "" })),
    }))

    return `Suggest improvements for this roadmap.

PURPOSE: "${lifePurpose || "Self-improvement"}"
TODAY: ${new Date().toISOString().split('T')[0]}
GOALS: ${JSON.stringify(goalsData)}

Return JSON:
{"suggestions":[{"id":"1","action":"add|edit|adjust_date","goalId":"<id or new-goal>","goalTitle":"<title>","milestoneId":"<if edit/date>","title":"<title>","targetDate":"<YYYY-MM-DD>","reason":"<brief>","priority":"high|medium|low","phase":"Phase 1: Foundation|Phase 2: Development|Phase 3: Acceleration|Phase 4: Mastery|Phase 5: Legacy"}]}

Generate 5-8 actionable suggestions. Be concise.`
  }

  const runAnalysis = async () => {
    setIsLoading(true)
    setError("")
    setSuggestions([])
    setAppliedIds(new Set())
    setDismissedIds(new Set())

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "Return valid JSON only, no markdown. Be concise." },
            { role: "user", content: buildPrompt() },
          ],
          temperature: 0.6,
          max_tokens: 1200,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "API request failed")
      }

      const data = await response.json()
      let content = data.choices?.[0]?.message?.content
      if (content) {
        content = content.trim()
        if (content.startsWith("```json")) content = content.slice(7)
        else if (content.startsWith("```")) content = content.slice(3)
        if (content.endsWith("```")) content = content.slice(0, -3)
        content = content.trim()
        
        const parsed = JSON.parse(content)
        setSuggestions(parsed.suggestions || [])
      }
    } catch (err) {
      console.error("Failed to analyze:", err)
      setError(err instanceof Error ? err.message : "Failed to analyze")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && suggestions.length === 0 && !isLoading && existingMilestones.length > 0) {
      runAnalysis()
    }
  }, [open])

  // Pending milestones for new goals
  const [pendingMilestones, setPendingMilestones] = useState<Array<{
    goalTitle: string
    milestone: { title: string; description: string; targetDate: string }
  }>>([])

  useEffect(() => {
    if (pendingMilestones.length === 0) return
    
    const remaining: typeof pendingMilestones = []
    pendingMilestones.forEach(pending => {
      const goal = goals.find(g => 
        g.title.toLowerCase().trim() === pending.goalTitle.toLowerCase().trim() && !g.archived
      )
      if (goal) {
        const exists = goal.milestones.some(m => 
          m.title.toLowerCase().trim() === pending.milestone.title.toLowerCase().trim()
        )
        if (!exists) {
          addMilestone(goal.id, {
            title: pending.milestone.title,
            description: pending.milestone.description,
            targetDate: pending.milestone.targetDate,
            completed: false,
            linkedGoals: [],
          })
        }
      } else {
        remaining.push(pending)
      }
    })
    if (remaining.length !== pendingMilestones.length) {
      setPendingMilestones(remaining)
      triggerSync()
    }
  }, [goals, pendingMilestones, addMilestone, triggerSync])

  const applySuggestion = (item: Suggestion) => {
    try {
      if (item.action === "add" && item.title) {
        if (item.goalId === "new-goal" && item.goalTitle) {
          const existing = goals.find(g => 
            g.title.toLowerCase().trim() === item.goalTitle.toLowerCase().trim() && !g.archived
          )
          if (existing) {
            addMilestone(existing.id, {
              title: item.title,
              description: item.description || "",
              targetDate: item.targetDate || "",
              completed: false,
              linkedGoals: [],
            })
          } else {
            addGoal({
              title: item.goalTitle,
              description: "Created from AI Roadmap",
              tags: [],
              targetDate: "",
              milestones: [],
              showProgress: true,
            })
            setPendingMilestones(prev => [...prev, {
              goalTitle: item.goalTitle,
              milestone: { title: item.title, description: item.description || "", targetDate: item.targetDate || "" }
            }])
          }
        } else {
          addMilestone(item.goalId, {
            title: item.title,
            description: item.description || "",
            targetDate: item.targetDate || "",
            completed: false,
            linkedGoals: [],
          })
        }
      } else if (item.action === "edit" && item.goalId && item.milestoneId) {
        updateMilestone(item.goalId, item.milestoneId, {
          title: item.title,
          description: item.description,
        })
      } else if (item.action === "adjust_date" && item.goalId && item.milestoneId && item.targetDate) {
        updateMilestone(item.goalId, item.milestoneId, { targetDate: item.targetDate })
      }
      setAppliedIds(prev => new Set([...prev, item.id]))
      triggerSync()
    } catch (err) {
      console.error("Failed to apply:", err)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePhase = (phase: string) => {
    setCollapsedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phase)) next.delete(phase)
      else next.add(phase)
      return next
    })
  }

  // Assign existing milestones to phases based on date
  const assignPhase = (targetDate: string | undefined): string => {
    if (!targetDate) return "Phase 1: Foundation"
    const date = new Date(targetDate)
    const now = new Date()
    const months = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth())
    if (months <= 3) return "Phase 1: Foundation"
    if (months <= 6) return "Phase 2: Development"
    if (months <= 12) return "Phase 3: Acceleration"
    if (months <= 24) return "Phase 4: Mastery"
    return "Phase 5: Legacy"
  }

  // Combine existing milestones with suggestions by phase
  const itemsByPhase = useMemo(() => {
    const grouped: Record<string, Array<{
      type: "existing" | "suggestion"
      data: typeof existingMilestones[0] | Suggestion
    }>> = {}

    PHASES.forEach(p => { grouped[p.name] = [] })

    // Add existing milestones
    existingMilestones.forEach(m => {
      const phase = assignPhase(m.targetDate)
      if (!grouped[phase]) grouped[phase] = []
      grouped[phase].push({ type: "existing", data: m })
    })

    // Add suggestions (filtered)
    suggestions
      .filter(s => !appliedIds.has(s.id) && !dismissedIds.has(s.id))
      .forEach(s => {
        const phase = s.phase || "Phase 1: Foundation"
        if (!grouped[phase]) grouped[phase] = []
        grouped[phase].push({ type: "suggestion", data: s })
      })

    // Sort each phase
    Object.keys(grouped).forEach(phase => {
      grouped[phase].sort((a, b) => {
        const aDate = a.type === "existing" 
          ? (a.data as typeof existingMilestones[0]).targetDate 
          : (a.data as Suggestion).targetDate
        const bDate = b.type === "existing" 
          ? (b.data as typeof existingMilestones[0]).targetDate 
          : (b.data as Suggestion).targetDate
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return new Date(aDate).getTime() - new Date(bDate).getTime()
      })
    })

    return grouped
  }, [existingMilestones, suggestions, appliedIds, dismissedIds])

  const suggestedCount = suggestions.filter(s => !appliedIds.has(s.id) && !dismissedIds.has(s.id)).length
  const completedCount = existingMilestones.filter(m => m.completed).length
  const totalCount = existingMilestones.length + suggestedCount

  const getPhaseProgress = (phase: string) => {
    const items = itemsByPhase[phase] || []
    const existing = items.filter(i => i.type === "existing")
    if (existing.length === 0) return 0
    const completed = existing.filter(i => (i.data as typeof existingMilestones[0]).completed).length
    return Math.round((completed / existing.length) * 100)
  }

  const getPriorityBorder = (p?: string) => {
    if (p === "high") return "border-red-500"
    if (p === "medium") return "border-amber-500"
    return "border-blue-500"
  }

  const getActionBadge = (action: string) => {
    if (action === "add") return { label: "Add", color: "bg-green-500", icon: Plus }
    if (action === "edit") return { label: "Edit", color: "bg-amber-500", icon: Pencil }
    return { label: "Date", color: "bg-blue-500", icon: Calendar }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-purple-600" />
            Roadmap to Life Purpose
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              {totalCount} milestones
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {completedCount} done
            </span>
            {suggestedCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {suggestedCount} suggestions
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {!lifePurpose && (
            <div className="flex items-center gap-2 p-3 m-4 mb-0 rounded-lg border border-amber-500/50 bg-amber-500/5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>Set your life purpose for better suggestions</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Analyzing your roadmap...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 px-4">
              <p className="text-sm text-destructive mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={runAnalysis}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </Button>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {PHASES.map((phase) => {
                const items = itemsByPhase[phase.name] || []
                const isCollapsed = collapsedPhases.has(phase.name)
                const progress = getPhaseProgress(phase.name)
                
                if (items.length === 0) return null

                return (
                  <div key={phase.name} className="rounded-lg border overflow-hidden">
                    <button
                      onClick={() => togglePhase(phase.name)}
                      className="w-full flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    >
                      <ChevronDown className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isCollapsed && "-rotate-90"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{phase.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            <Clock className="h-2.5 w-2.5 mr-1" />
                            {phase.timeframe}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-7">{progress}%</span>
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="p-2 space-y-1">
                        {items.map((item, idx) => {
                          if (item.type === "existing") {
                            const m = item.data as typeof existingMilestones[0]
                            return (
                              <div
                                key={`ex-${m.id}-${idx}`}
                                className={cn(
                                  "flex items-start gap-2 p-2 rounded-md",
                                  m.completed && "opacity-50"
                                )}
                              >
                                <div className={cn(
                                  "w-3 h-3 rounded-full border-2 mt-0.5 flex-shrink-0",
                                  m.completed ? "bg-primary border-primary" : 
                                  m.inProgress ? "bg-amber-500 border-amber-500" : "border-muted-foreground/40"
                                )} />
                                <div className="flex-1 min-w-0">
                                  <span className={cn("text-sm", m.completed && "line-through")}>
                                    {m.title}
                                  </span>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span className="truncate">{m.goalTitle}</span>
                                    {m.targetDate && (
                                      <>
                                        <span>•</span>
                                        <span>{m.targetDate}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          } else {
                            const s = item.data as Suggestion
                            const badge = getActionBadge(s.action)
                            const isExpanded = expandedIds.has(s.id)
                            const isNewGoal = s.goalId === "new-goal"

                            return (
                              <div
                                key={`sug-${s.id}-${idx}`}
                                className={cn(
                                  "flex items-start gap-2 p-2 rounded-md border-2 border-dashed bg-muted/20",
                                  getPriorityBorder(s.priority)
                                )}
                              >
                                <div className="w-3 h-3 rounded-full border-2 border-purple-500 bg-purple-500/20 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge className={cn("text-[9px] h-4 px-1 gap-0.5 text-white", badge.color)}>
                                      <badge.icon className="h-2 w-2" />
                                      {badge.label}
                                    </Badge>
                                    {isNewGoal && (
                                      <Badge variant="outline" className="text-[9px] h-4 px-1 text-purple-600 border-purple-500">
                                        + {s.goalTitle}
                                      </Badge>
                                    )}
                                    <span className="text-sm">{s.title}</span>
                                  </div>
                                  
                                  {s.action === "edit" && s.currentTitle && (
                                    <p className="text-[10px] text-muted-foreground line-through">
                                      {s.currentTitle}
                                    </p>
                                  )}
                                  
                                  {s.action === "adjust_date" && (
                                    <div className="flex items-center gap-1 text-[10px] mt-0.5">
                                      <span className="line-through text-muted-foreground">{s.currentDate}</span>
                                      <span>→</span>
                                      <span className="text-blue-600 font-medium">{s.targetDate}</span>
                                    </div>
                                  )}

                                  <div className="text-[10px] text-muted-foreground">
                                    {!isNewGoal && s.goalTitle}
                                    {s.targetDate && s.action !== "adjust_date" && ` • ${s.targetDate}`}
                                  </div>

                                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(s.id)}>
                                    <CollapsibleTrigger className="text-[10px] text-purple-600 hover:text-purple-700 flex items-center gap-0.5">
                                      <ChevronDown className={cn("h-2.5 w-2.5", isExpanded && "rotate-180")} />
                                      {isExpanded ? "Less" : "Why?"}
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <p className="text-[10px] text-muted-foreground mt-1">{s.reason}</p>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </div>

                                <div className="flex gap-0.5">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-green-600 hover:bg-green-500/10"
                                    onClick={() => applySuggestion(s)}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => setDismissedIds(prev => new Set([...prev, s.id]))}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            )
                          }
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-3 border-t flex items-center justify-between bg-muted/20">
          <span className="text-xs text-muted-foreground">
            {appliedIds.size > 0 && <span className="text-green-600">{appliedIds.size} applied</span>}
          </span>
          <Button variant="outline" size="sm" onClick={runAnalysis} disabled={isLoading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isLoading && "animate-spin")} />
            Regenerate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


