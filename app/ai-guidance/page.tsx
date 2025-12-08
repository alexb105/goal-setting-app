"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Sparkles, Brain, Target, Compass, AlertTriangle, CheckCircle2, Lightbulb, RefreshCw, TrendingUp, AlertCircle, ArrowRight, Clock, Flame, ThumbsUp, Zap, Heart, Calendar, Link2, BarChart3, Shield, Crosshair, Timer, Rocket, BookOpen, Layers, PlusCircle, CircleDot, Pencil, Plus, Check, X, Wand2, Pin, PinOff } from "lucide-react"
import type { PinnedInsight } from "@/types"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useGoals } from "@/components/goals-context"
import { useSupabaseSync } from "@/hooks/use-supabase-sync"
import { isGoalCompleted, calculateProgress } from "@/utils/goals"
import { isMilestoneOverdue, isMilestoneDueSoon } from "@/utils/date"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const LIFE_PURPOSE_STORAGE = "goalritual-life-purpose"
const AI_ANALYSIS_STORAGE = "goalritual-ai-analysis"
const AI_APPLIED_SUGGESTIONS = "goalritual-ai-applied-suggestions"
const AI_DISMISSED_SUGGESTIONS = "goalritual-ai-dismissed-suggestions"
const PINNED_INSIGHTS_STORAGE = "goalritual-pinned-insights"

// Life Purpose Area - key areas needed to achieve purpose
interface PurposeArea {
  name: string
  description: string
  importance: "critical" | "important" | "helpful"
  coverage: number // 0-100 how well current goals cover this
  coveredBy: string[] // goal titles that cover this area
  gap: string // what's missing
  suggestedGoal: string // suggested new goal if gap exists
}

interface AlignmentItem {
  goal: string
  score: number
  area: string // which purpose area it serves
  insight: string
  suggestion: string
}

interface ActionItem {
  priority: "high" | "medium" | "low"
  action: string
  impact: string
  timeframe: string
}

interface GoalConnection {
  goal1: string
  goal2: string
  relationship: "supports" | "conflicts" | "synergy"
  explanation: string
}

interface TimelineInsight {
  goal: string
  status: "on-track" | "at-risk" | "behind"
  recommendation: string
}

interface WeeklyFocus {
  goal: string
  milestone: string
  reason: string
}

interface HabitInsight {
  observation: string
  suggestion: string
}

// AI Suggestions that can be applied
interface AISuggestion {
  id: string
  type: "edit_goal" | "add_milestone" | "edit_milestone" | "new_goal" | "add_task" | "edit_task"
  goalId?: string // For edit_goal, add_milestone, edit_milestone, add_task, edit_task
  goalTitle?: string // For display purposes
  milestoneId?: string // For edit_milestone, add_task, edit_task
  milestoneTitle?: string // For display purposes
  taskId?: string // For edit_task
  taskTitle?: string // For display - current task title
  changes: {
    title?: string
    description?: string
    why?: string
    targetDate?: string
  }
  reason: string
  impact: string
}

interface DependencyImpact {
  blockingGoal: string // The goal that's blocking others
  blockingGoalId: string
  whyItMatters: string // Why this blocking goal is important to address
  impactedGoals: {
    goalTitle: string
    goalId: string
    howItImpacts: string // Specific explanation of how it impacts this goal
    whatYouLose: string // What progress/benefits you're missing out on
    unlockPotential: string // What completing the blocker would unlock
  }[]
  actionPlan: string[] // Specific steps to address the blocking goal
  urgencyLevel: "critical" | "high" | "medium"
}

interface AnalysisResult {
  // Life Purpose Breakdown
  purposeSummary: string
  purposeAreas: PurposeArea[]
  overallCoverage: number
  criticalGaps: string[]
  
  // Scores
  overallScore: number
  alignmentScore: number
  progressScore: number
  balanceScore: number
  urgencyScore: number
  
  // Deep Analysis
  alignmentItems: AlignmentItem[]
  goalConnections: GoalConnection[]
  timelineInsights: TimelineInsight[]
  
  // Dependency Impact Analysis
  dependencyImpacts: DependencyImpact[]
  
  // Recommendations
  weeklyFocus: WeeklyFocus[]
  actionItems: ActionItem[]
  habitInsights: HabitInsight[]
  
  // Quick Wins
  quickWins: string[]
  
  // Warnings
  risks: string[]
  blindSpots: string[]
  
  // Positives
  strengths: string[]
  momentum: string
  
  // Motivation
  encouragement: string
  
  // Strategic
  bigPictureInsight: string
  nextMilestone: string
  thirtyDayGoal: string
  
  // AI Suggestions
  suggestions: AISuggestion[]
}

export default function AIGuidancePage() {
  const { goals, updateGoal, addGoal, addMilestone, updateMilestone, addTask, updateTask } = useGoals()
  const { triggerSync } = useSupabaseSync()
  const [lifePurpose, setLifePurpose] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set())
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [pinnedInsights, setPinnedInsights] = useState<PinnedInsight[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    const storedPurpose = localStorage.getItem(LIFE_PURPOSE_STORAGE)
    if (storedPurpose) {
      setLifePurpose(storedPurpose)
    }
    // Load persisted analysis data
    const storedAnalysis = localStorage.getItem(AI_ANALYSIS_STORAGE)
    if (storedAnalysis) {
      try {
        setAnalysis(JSON.parse(storedAnalysis))
      } catch {
        // Ignore parse errors
      }
    }
    const storedApplied = localStorage.getItem(AI_APPLIED_SUGGESTIONS)
    if (storedApplied) {
      try {
        setAppliedSuggestions(new Set(JSON.parse(storedApplied)))
      } catch {
        // Ignore parse errors
      }
    }
    const storedDismissed = localStorage.getItem(AI_DISMISSED_SUGGESTIONS)
    if (storedDismissed) {
      try {
        setDismissedSuggestions(new Set(JSON.parse(storedDismissed)))
      } catch {
        // Ignore parse errors
      }
    }
    const storedPinned = localStorage.getItem(PINNED_INSIGHTS_STORAGE)
    if (storedPinned) {
      try {
        setPinnedInsights(JSON.parse(storedPinned))
      } catch {
        // Ignore parse errors
      }
    }
    setDataLoaded(true)
  }, [])

  // Persist analysis to localStorage
  useEffect(() => {
    if (!dataLoaded) return
    if (analysis) {
      localStorage.setItem(AI_ANALYSIS_STORAGE, JSON.stringify(analysis))
      triggerSync()
    }
  }, [analysis, dataLoaded, triggerSync])

  // Persist applied suggestions to localStorage
  useEffect(() => {
    if (!dataLoaded) return
    localStorage.setItem(AI_APPLIED_SUGGESTIONS, JSON.stringify([...appliedSuggestions]))
    triggerSync()
  }, [appliedSuggestions, dataLoaded, triggerSync])

  // Persist dismissed suggestions to localStorage
  useEffect(() => {
    if (!dataLoaded) return
    localStorage.setItem(AI_DISMISSED_SUGGESTIONS, JSON.stringify([...dismissedSuggestions]))
    triggerSync()
  }, [dismissedSuggestions, dataLoaded, triggerSync])

  // Persist pinned insights to localStorage
  useEffect(() => {
    if (!dataLoaded) return
    localStorage.setItem(PINNED_INSIGHTS_STORAGE, JSON.stringify(pinnedInsights))
    triggerSync()
  }, [pinnedInsights, dataLoaded, triggerSync])

  const pinInsight = (
    goalId: string,
    blockerGoalId: string,
    blockerGoalTitle: string,
    howItImpacts: string,
    whatYouLose: string,
    unlockPotential: string
  ) => {
    const newInsight: PinnedInsight = {
      id: `${goalId}-${blockerGoalId}-${Date.now()}`,
      goalId,
      blockerGoalId,
      blockerGoalTitle,
      howItImpacts,
      whatYouLose,
      unlockPotential,
      pinnedAt: new Date().toISOString()
    }
    setPinnedInsights(prev => [...prev, newInsight])
  }

  const unpinInsight = (goalId: string, blockerGoalId: string) => {
    setPinnedInsights(prev => prev.filter(p => !(p.goalId === goalId && p.blockerGoalId === blockerGoalId)))
  }

  const isInsightPinned = (goalId: string, blockerGoalId: string) => {
    return pinnedInsights.some(p => p.goalId === goalId && p.blockerGoalId === blockerGoalId)
  }

  const activeGoals = useMemo(() => {
    return goals.filter((goal) => !isGoalCompleted(goal) && !goal.archived)
  }, [goals])

  const completedGoals = useMemo(() => {
    return goals.filter((goal) => isGoalCompleted(goal))
  }, [goals])

  const lateMilestones = useMemo(() => {
    return activeGoals.flatMap((goal) =>
      goal.milestones.filter(isMilestoneOverdue).map((m) => ({ milestone: m, goalTitle: goal.title }))
    )
  }, [activeGoals])

  const expiringMilestones = useMemo(() => {
    return activeGoals.flatMap((goal) =>
      goal.milestones.filter(isMilestoneDueSoon).map((m) => ({ milestone: m, goalTitle: goal.title }))
    )
  }, [activeGoals])

  const averageProgress = useMemo(() => {
    if (activeGoals.length === 0) return 0
    const total = activeGoals.reduce((acc, goal) => acc + calculateProgress(goal), 0)
    return Math.round(total / activeGoals.length)
  }, [activeGoals])

  const buildAnalysisPrompt = () => {
    const goalsData = activeGoals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      why: goal.why || "Not specified",
      targetDate: goal.targetDate,
      progress: calculateProgress(goal),
      priority: goal.priority || 0,
      tags: goal.tags,
      group: goal.group,
      negativeImpactOnAll: goal.negativeImpactOnAll || false,
      negativeImpactOn: goal.negativeImpactOn || [],
      milestones: goal.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        targetDate: m.targetDate,
        completed: m.completed,
        inProgress: m.inProgress,
        tasks: (m.tasks || []).filter(t => !t.isSeparator).map((t) => ({
          id: t.id,
          title: t.title,
          completed: t.completed,
        })),
      })),
      recurringTasks: goal.recurringTaskGroups?.map((g) => ({
        name: g.name,
        recurrence: g.recurrence,
        completionCount: g.completionCount || 0,
      })) || [],
    }))

    // Build dependency info for the AI
    const dependencyInfo = activeGoals
      .filter(g => g.negativeImpactOnAll || (g.negativeImpactOn && g.negativeImpactOn.length > 0))
      .map(g => {
        const impactedGoalTitles = g.negativeImpactOnAll 
          ? activeGoals.filter(og => og.id !== g.id).map(og => og.title)
          : (g.negativeImpactOn || []).map(id => goals.find(og => og.id === id)?.title).filter(Boolean)
        return {
          blockingGoal: g.title,
          blockingGoalId: g.id,
          impactsAll: g.negativeImpactOnAll,
          impactedGoals: impactedGoalTitles,
          progress: calculateProgress(g)
        }
      })

    const hasGoals = activeGoals.length > 0
    const hasDependencies = dependencyInfo.length > 0

    return `You are an expert life coach and strategic planner. Your task is to THOROUGHLY DISSECT the life purpose statement and identify ALL the key areas needed to achieve it.

## LIFE PURPOSE STATEMENT
"${lifePurpose || "Not defined"}"

## CURRENT GOALS (${activeGoals.length})
${hasGoals ? JSON.stringify(goalsData, null, 2) : "NO GOALS YET - User needs help getting started!"}

## STATS
- Completed Goals: ${completedGoals.length}
- Late Milestones: ${lateMilestones.length}
- Average Progress: ${averageProgress}%

${hasDependencies ? `## GOAL DEPENDENCIES (CRITICAL - ANALYZE ALL OF THESE)
The user has marked certain goals as "blocking" other goals - meaning if these aren't completed, other goals will be negatively impacted. 

**IMPORTANT: You MUST analyze EVERY SINGLE impacted goal - do not skip any or provide only a sample!**

${JSON.stringify(dependencyInfo, null, 2)}

For EACH blocking goal, you must explain:
1. WHY this goal matters for ALL the impacted goals (psychological, practical, foundational reasons)
2. For EVERY impacted goal (list them ALL, not just 2-3):
   - HOW specifically the blocker is holding back THIS specific goal
   - WHAT progress/benefits are being lost
   - WHAT will unlock once the blocker is resolved
3. SPECIFIC action steps to address the blocking goal (3-5 steps)

**DO NOT TRUNCATE OR SAMPLE - Include analysis for EVERY goal in the impactedGoals list!**
` : ''}

${!hasGoals ? `
## SPECIAL INSTRUCTION: NO GOALS EXIST
The user has defined their life purpose but hasn't created any goals yet. Your PRIMARY task is to:
1. Break down their life purpose into key areas
2. Suggest 5-8 specific NEW GOALS they should create to start their journey
3. Make each suggested goal actionable and specific
4. Include a mix of short-term (1-3 months), medium-term (3-6 months), and long-term (6-12 months) goals
5. For suggestions, focus heavily on "new_goal" type suggestions since they have no goals to edit
` : ''}

## YOUR CRITICAL TASK: DISSECT THE LIFE PURPOSE

Step 1: Parse every distinct element/component mentioned in the purpose statement
Step 2: For EACH element, identify what skills, knowledge, resources, or achievements are needed
Step 3: Create 6-10 comprehensive areas (be thorough - don't miss anything)

EXAMPLE: If purpose is "I want to be a musician in Japan while running a tech business"
You MUST identify areas like:
- Music Production Skills (instruments, DAW, composition)
- Music Industry Knowledge (marketing, distribution, networking)
- Japanese Language (for living/working there)
- Japan Residency (visa, legal requirements, housing)
- Japanese Culture (understanding local market, customs)
- Technical Skills (for the tech business)
- Business Management (running a company)
- Financial Foundation (funding both pursuits)
- Work-Life Balance (managing dual careers)
- Network Building (connections in both industries)

BE THOROUGH. Extract EVERY component from their specific purpose statement.

Respond with this EXACT JSON (no markdown):
{
  "purposeSummary": "<2-3 sentence interpretation breaking down what their purpose actually requires>",
  "purposeAreas": [
    {
      "name": "<specific area name>",
      "description": "<why this specific area is essential for their stated purpose>",
      "importance": "critical|important|helpful",
      "coverage": <0-100 how well their current goals cover this>,
      "coveredBy": ["<goal title that covers this>"],
      "gap": "<specific skill/knowledge/resource missing, or 'Well covered' if coverage > 70>",
      "suggestedGoal": "<specific, actionable goal suggestion if coverage < 70, or empty string>"
    }
  ],
  "overallCoverage": <0-100 overall coverage>,
  "criticalGaps": ["<most critical uncovered area with explanation>", "<second critical gap>", "<third if applicable>"],
  
  "overallScore": <0-100>,
  "alignmentScore": <0-100>,
  "progressScore": <0-100>,
  "balanceScore": <0-100>,
  "urgencyScore": <0-100>,
  
  "alignmentItems": [
    {"goal": "<title>", "score": <0-100>, "area": "<which purpose area it serves>", "insight": "<specific insight>", "suggestion": "<improvement>"}
  ],
  
  "goalConnections": [
    {"goal1": "<title>", "goal2": "<title>", "relationship": "supports|conflicts|synergy", "explanation": "<how>"}
  ],
  
  "timelineInsights": [
    {"goal": "<title>", "status": "on-track|at-risk|behind", "recommendation": "<action>"}
  ],
  
  "dependencyImpacts": [
    {
      "blockingGoal": "<title of the blocking goal>",
      "blockingGoalId": "<id of blocking goal>",
      "whyItMatters": "<deep psychological/practical explanation of why this blocker is important - be specific about the underlying issue>",
      "impactedGoals": [
        // **INCLUDE ALL IMPACTED GOALS - DO NOT TRUNCATE OR SAMPLE!**
        // If a goal impacts 9 goals, list all 9 with unique analysis for each
        {
          "goalTitle": "<title of impacted goal>",
          "goalId": "<id>",
          "howItImpacts": "<SPECIFIC to THIS goal - how the blocker affects it>",
          "whatYouLose": "<SPECIFIC to THIS goal - what progress is being lost>",
          "unlockPotential": "<SPECIFIC to THIS goal - what benefits unlock>"
        }
        // ... repeat for EVERY impacted goal, no exceptions
      ],
      "actionPlan": ["<step 1>", "<step 2>", "<step 3>", "<step 4>", "<step 5>"],
      "urgencyLevel": "critical|high|medium"
    }
  ],
  
  "weeklyFocus": [
    {"goal": "<title>", "milestone": "<milestone>", "reason": "<why this week>"}
  ],
  
  "actionItems": [
    {"priority": "high|medium|low", "action": "<specific action>", "impact": "<result>", "timeframe": "today|this week|this month"}
  ],
  
  "habitInsights": [
    {"observation": "<pattern>", "suggestion": "<improvement>"}
  ],
  
  "quickWins": ["<easy win>", "<easy win>", "<easy win>"],
  
  "risks": ["<risk>", "<risk>"],
  "blindSpots": ["<blind spot>", "<blind spot>"],
  
  "strengths": ["<strength>", "<strength>", "<strength>"],
  "momentum": "<momentum observation>",
  
  "encouragement": "<personalized encouragement>",
  
  "bigPictureInsight": "<how goals connect to purpose>",
  "nextMilestone": "<most important next milestone>",
  "thirtyDayGoal": "<30 day target>",
  
  "suggestions": [
    {
      "id": "<unique id like 'sug-1'>",
      "type": "edit_goal|add_milestone|edit_milestone|new_goal|add_task|edit_task",
      "goalId": "<goal id - required for all except new_goal>",
      "goalTitle": "<goal title for display>",
      "milestoneId": "<milestone id - required for milestone and task operations>",
      "milestoneTitle": "<milestone title for display>",
      "taskId": "<task id - only for edit_task>",
      "taskTitle": "<current task title for display - only for edit_task>",
      "changes": {
        "title": "<new/improved title>",
        "description": "<new/improved description if applicable>",
        "why": "<new/improved why statement - only for goals>",
        "targetDate": "<YYYY-MM-DD format if suggesting date>"
      },
      "reason": "<detailed explanation of why this change is important>",
      "impact": "<specific, measurable expected benefit>"
    }
  ]
}

## DEEP ANALYSIS REQUIREMENTS - BE THOROUGH AND CRITICAL

ANALYZE THESE ASPECTS:
1. CLARITY: Are titles/descriptions vague? "work on X" should be "Complete Y by doing Z"
2. MEASURABILITY: Can progress be tracked? Add specific metrics or deliverables
3. SPECIFICITY: Generic tasks → concrete actions with clear outcomes
4. COMPLETENESS: Are there missing steps between milestones? Gaps in the plan?
5. ALIGNMENT: Does each item directly serve the life purpose?
6. TIMELINE: Are dates realistic? Missing deadlines that should be set?
7. BREAKDOWN: Are large items broken into manageable pieces?
8. ACTIONABILITY: Do tasks start with strong action verbs?
9. DEPENDENCIES: Should some items be reworded to show what comes first?
10. MOTIVATION: Are "why" statements compelling and specific?

SUGGESTION GUIDELINES:
- Generate 8-15 DEEP, specific suggestions
- Use EXACT goal, milestone, and task IDs from the data
- BE CRITICAL - even well-written items can be improved
- PRIORITIZE high-impact changes that will drive real progress

SUGGESTION TYPES TO INCLUDE:
* new_goal: Fill gaps in purpose coverage (be specific about what's missing)
* edit_goal: 
  - Strengthen weak "why" statements with emotional drivers
  - Make titles more inspiring/specific
  - Add missing descriptions that clarify the vision
  - Suggest realistic target dates for undated goals
* add_milestone:
  - Break down large goals into 3-5 clear phases
  - Add "quick win" milestones for motivation
  - Add validation/review milestones
* edit_milestone:
  - Make milestones SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
  - Add success criteria to descriptions
  - Clarify what "done" looks like
* add_task:
  - Add specific first actions to get started
  - Include research/learning tasks where knowledge gaps exist
  - Add review/reflection tasks
  - Break complex tasks into smaller steps
* edit_task:
  - Transform vague tasks into specific actions
  - Add context (who, what, where, when)
  - Make tasks completable in one session
  - Start with strong verbs: Create, Write, Call, Research, Design, Build, Review, Schedule

QUALITY STANDARDS:
- Every suggestion must have a SPECIFIC reason tied to purpose/progress
- Impact should describe the tangible benefit
- Changes should be immediately actionable
- Prefer multiple smaller improvements over few large ones`
  }

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    setError(null)
    setAnalysis(null)
    setAppliedSuggestions(new Set())
    setDismissedSuggestions(new Set())

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are an expert life coach. Respond with valid JSON only." },
            { role: "user", content: buildAnalysisPrompt() },
          ],
          temperature: 0.7,
          max_tokens: 8000,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error("No response")

      setAnalysis(JSON.parse(content))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getScoreColor = (score: number) => score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-red-600"
  const getScoreBg = (score: number) => score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"
  const getImportanceColor = (imp: string) => imp === "critical" ? "bg-red-500 text-white" : imp === "important" ? "bg-amber-500 text-white" : "bg-blue-500 text-white"
  const getPriorityColor = (p: string) => p === "high" ? "bg-red-500 text-white" : p === "medium" ? "bg-amber-500 text-white" : "bg-blue-500 text-white"
  const getStatusColor = (s: string) => s === "on-track" ? "text-green-600 bg-green-500/10" : s === "at-risk" ? "text-amber-600 bg-amber-500/10" : "text-red-600 bg-red-500/10"
  const getRelColor = (r: string) => r === "supports" ? "bg-blue-500/10 text-blue-600 border-blue-500/30" : r === "synergy" ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-red-500/10 text-red-600 border-red-500/30"
  const getSuggestionTypeColor = (t: string) => {
    switch (t) {
      case "new_goal": return "bg-green-500 text-white"
      case "add_milestone": return "bg-blue-500 text-white"
      case "add_task": return "bg-cyan-500 text-white"
      case "edit_goal": return "bg-amber-500 text-white"
      case "edit_milestone": return "bg-orange-500 text-white"
      case "edit_task": return "bg-purple-500 text-white"
      default: return "bg-gray-500 text-white"
    }
  }
  const getSuggestionTypeLabel = (t: string) => {
    switch (t) {
      case "new_goal": return "New Goal"
      case "add_milestone": return "Add Milestone"
      case "add_task": return "Add Task"
      case "edit_goal": return "Edit Goal"
      case "edit_milestone": return "Edit Milestone"
      case "edit_task": return "Edit Task"
      default: return t
    }
  }
  const getSuggestionTypeIcon = (t: string) => {
    switch (t) {
      case "new_goal":
      case "add_milestone":
      case "add_task":
        return Plus
      default:
        return Pencil
    }
  }

  const applySuggestion = (suggestion: AISuggestion) => {
    try {
      switch (suggestion.type) {
        case "edit_goal":
          if (suggestion.goalId) {
            const updates: Partial<{ title: string; description: string; why: string; targetDate: string }> = {}
            if (suggestion.changes.title) updates.title = suggestion.changes.title
            if (suggestion.changes.description) updates.description = suggestion.changes.description
            if (suggestion.changes.why) updates.why = suggestion.changes.why
            if (suggestion.changes.targetDate) updates.targetDate = suggestion.changes.targetDate
            updateGoal(suggestion.goalId, updates)
          }
          break
        case "add_milestone":
          if (suggestion.goalId && suggestion.changes.title) {
            addMilestone(suggestion.goalId, {
              title: suggestion.changes.title,
              description: suggestion.changes.description || "",
              targetDate: suggestion.changes.targetDate || "",
              completed: false,
            })
          }
          break
        case "edit_milestone":
          if (suggestion.goalId && suggestion.milestoneId) {
            const updates: Partial<{ title: string; description: string; targetDate: string }> = {}
            if (suggestion.changes.title) updates.title = suggestion.changes.title
            if (suggestion.changes.description) updates.description = suggestion.changes.description
            if (suggestion.changes.targetDate) updates.targetDate = suggestion.changes.targetDate
            updateMilestone(suggestion.goalId, suggestion.milestoneId, updates)
          }
          break
        case "new_goal":
          if (suggestion.changes.title) {
            addGoal({
              title: suggestion.changes.title,
              description: suggestion.changes.description || "",
              why: suggestion.changes.why || "",
              targetDate: suggestion.changes.targetDate || "",
              milestones: [],
              tags: [],
              showProgress: true,
            })
          }
          break
        case "add_task":
          if (suggestion.goalId && suggestion.milestoneId && suggestion.changes.title) {
            addTask(suggestion.goalId, suggestion.milestoneId, suggestion.changes.title)
          }
          break
        case "edit_task":
          if (suggestion.goalId && suggestion.milestoneId && suggestion.taskId && suggestion.changes.title) {
            updateTask(suggestion.goalId, suggestion.milestoneId, suggestion.taskId, suggestion.changes.title)
          }
          break
      }
      setAppliedSuggestions(prev => new Set([...prev, suggestion.id]))
    } catch (err) {
      console.error("Failed to apply suggestion:", err)
    }
  }

  const dismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]))
  }

  const pendingSuggestions = useMemo(() => {
    if (!analysis?.suggestions) return []
    return analysis.suggestions.filter(s => !appliedSuggestions.has(s.id) && !dismissedSuggestions.has(s.id))
  }, [analysis?.suggestions, appliedSuggestions, dismissedSuggestions])

  return (
    <div className="min-h-screen safe-area-top bg-gradient-to-b from-background to-muted/30">
      <header className="border-b border-border glass-strong sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link href="/"><Button variant="ghost" className="gap-2 -ml-2 h-9 px-2 sm:px-3"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Back</span></Button></Link>
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0">
                <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">AI Guidance</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Purpose-driven insights</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-3 sm:px-6 py-4 sm:py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { icon: Target, value: activeGoals.length, label: "Active", color: "text-primary" },
            { icon: TrendingUp, value: `${averageProgress}%`, label: "Progress", color: "text-blue-600" },
            { icon: AlertTriangle, value: lateMilestones.length, label: "Late", color: lateMilestones.length > 0 ? "text-red-600" : "text-foreground" },
            { icon: CheckCircle2, value: completedGoals.length, label: "Done", color: "text-green-600" },
          ].map((s, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-2 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Life Purpose */}
        {lifePurpose ? (
          <div className="mb-4 rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Compass className="h-3.5 w-3.5 text-purple-600" />
              <span className="text-[10px] font-medium text-purple-600 uppercase tracking-wide">Life Purpose</span>
            </div>
            <p className="text-sm text-foreground line-clamp-2">{lifePurpose}</p>
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-3 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-muted-foreground flex-1">Add your life purpose for purpose-area analysis</p>
            <Link href="/"><Button variant="outline" size="sm">Add</Button></Link>
          </div>
        )}

        {/* Analyze Button */}
        <Button onClick={runAnalysis} disabled={isAnalyzing || (!lifePurpose && activeGoals.length === 0)}
          className="w-full gap-2 h-11 mb-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20">
          {isAnalyzing ? <><RefreshCw className="h-4 w-4 animate-spin" />Analyzing...</> : <><Sparkles className="h-4 w-4" />Analyze Purpose & Goals</>}
        </Button>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" /><p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 mb-4">
              <TabsList className="inline-flex w-max sm:grid sm:w-full sm:grid-cols-7 gap-1">
                <TabsTrigger value="suggestions" className="text-[11px] sm:text-xs relative px-2.5 sm:px-3">
                  <Wand2 className="h-3 w-3 mr-1" />
                  <span className="hidden xs:inline">Apply</span>
                  {pendingSuggestions.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {pendingSuggestions.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="purpose" className="text-[11px] sm:text-xs px-2.5 sm:px-3">Purpose</TabsTrigger>
                <TabsTrigger value="overview" className="text-[11px] sm:text-xs px-2.5 sm:px-3">Overview</TabsTrigger>
                <TabsTrigger value="impact" className="text-[11px] sm:text-xs px-2.5 sm:px-3">Impact</TabsTrigger>
                <TabsTrigger value="insights" className="text-[11px] sm:text-xs px-2.5 sm:px-3">Insights</TabsTrigger>
                <TabsTrigger value="actions" className="text-[11px] sm:text-xs px-2.5 sm:px-3">Actions</TabsTrigger>
                <TabsTrigger value="strategy" className="text-[11px] sm:text-xs px-2.5 sm:px-3">Strategy</TabsTrigger>
              </TabsList>
            </div>

            {/* SUGGESTIONS TAB */}
            <TabsContent value="suggestions" className="space-y-4 mt-0">
              <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-foreground">AI Suggestions</span>
                </div>
                <p className="text-xs text-muted-foreground">Review and apply these suggestions to improve your goals and milestones. Changes are applied instantly when you click Accept.</p>
              </div>

              {/* Applied Suggestions Count */}
              {appliedSuggestions.size > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-400">{appliedSuggestions.size} suggestion{appliedSuggestions.size !== 1 ? "s" : ""} applied</span>
                </div>
              )}

              {/* Pending Suggestions */}
              {pendingSuggestions.length > 0 ? (
                <div className="space-y-3">
                  {pendingSuggestions.map((suggestion) => {
                    const TypeIcon = getSuggestionTypeIcon(suggestion.type)
                    return (
                    <div key={suggestion.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${getSuggestionTypeColor(suggestion.type)} text-[10px] px-2 gap-1`}>
                            <TypeIcon className="h-3 w-3" />
                            {getSuggestionTypeLabel(suggestion.type)}
                          </Badge>
                          {suggestion.goalTitle && suggestion.type !== "new_goal" && (
                            <span className="text-xs text-muted-foreground">
                              on "{suggestion.goalTitle}"
                            </span>
                          )}
                          {suggestion.milestoneTitle && (
                            <span className="text-xs text-muted-foreground">
                              → "{suggestion.milestoneTitle}"
                            </span>
                          )}
                          {suggestion.taskTitle && (
                            <span className="text-xs text-muted-foreground">
                              → task "{suggestion.taskTitle}"
                            </span>
                          )}
                        </div>
                      </div>

                      {/* What will change */}
                      <div className="space-y-2 mb-3">
                        {suggestion.changes.title && (
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                              {suggestion.type === "add_task" || suggestion.type === "edit_task" ? "Task" : 
                               suggestion.type === "add_milestone" || suggestion.type === "edit_milestone" ? "Milestone" : "Title"}
                            </p>
                            <p className="text-sm font-medium text-foreground">{suggestion.changes.title}</p>
                          </div>
                        )}
                        {suggestion.changes.description && (
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                            <p className="text-sm text-foreground">{suggestion.changes.description}</p>
                          </div>
                        )}
                        {suggestion.changes.why && (
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Why</p>
                            <p className="text-sm text-foreground">{suggestion.changes.why}</p>
                          </div>
                        )}
                        {suggestion.changes.targetDate && (
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Target Date</p>
                            <p className="text-sm text-foreground">{suggestion.changes.targetDate}</p>
                          </div>
                        )}
                      </div>

                      {/* Reason & Impact */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <TrendingUp className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-green-700 dark:text-green-500">{suggestion.impact}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => applySuggestion(suggestion)}
                          className="gap-1.5 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => dismissSuggestion(suggestion.id)}
                          className="gap-1.5"
                        >
                          <X className="h-3.5 w-3.5" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  )})}
                
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
                  {appliedSuggestions.size > 0 || dismissedSuggestions.size > 0 ? (
                    <>
                      <CheckCircle2 className="h-10 w-10 text-green-600/50 mx-auto mb-3" />
                      <h3 className="text-sm font-semibold text-foreground mb-1">All Caught Up!</h3>
                      <p className="text-xs text-muted-foreground">You've reviewed all suggestions. Run another analysis to get more.</p>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-10 w-10 text-purple-600/50 mx-auto mb-3" />
                      <h3 className="text-sm font-semibold text-foreground mb-1">No Suggestions Yet</h3>
                      <p className="text-xs text-muted-foreground">Run an analysis to get AI-powered suggestions for improving your goals.</p>
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            {/* PURPOSE TAB */}
            <TabsContent value="purpose" className="space-y-4 mt-0">
              {/* Purpose Summary */}
              <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Compass className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-foreground">Your Purpose Decoded</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{analysis.purposeSummary}</p>
              </div>

              {/* Overall Coverage Score */}
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">Purpose Coverage Score</p>
                <div className="relative w-24 h-24 mx-auto mb-2">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                    <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${analysis.overallCoverage * 2.51} 251`} className={getScoreColor(analysis.overallCoverage)} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-2xl font-bold ${getScoreColor(analysis.overallCoverage)}`}>{analysis.overallCoverage}%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">of required areas covered by your goals</p>
              </div>

              {/* Critical Gaps Alert */}
              {analysis.criticalGaps.length > 0 && (
                <div className="rounded-xl border-2 border-red-500/50 bg-red-500/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-semibold text-red-700 dark:text-red-400">Critical Gaps in Your Plan</span>
                  </div>
                  <div className="space-y-2">
                    {analysis.criticalGaps.map((gap, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10">
                        <PlusCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-foreground">{gap}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Purpose Areas Breakdown */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-foreground">Key Areas to Achieve Your Purpose</span>
                </div>
                <div className="space-y-3">
                  {analysis.purposeAreas.map((area, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${area.coverage >= 70 ? 'border-green-500/30 bg-green-500/5' : area.coverage >= 40 ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${getImportanceColor(area.importance)} text-[10px] px-1.5`}>{area.importance}</Badge>
                          <span className="text-sm font-semibold text-foreground">{area.name}</span>
                        </div>
                        <span className={`text-sm font-bold ${getScoreColor(area.coverage)}`}>{area.coverage}%</span>
                      </div>
                      <Progress value={area.coverage} className="h-2 mb-2" />
                      <p className="text-xs text-muted-foreground mb-2">{area.description}</p>
                      
                      {area.coveredBy.length > 0 && (
                        <div className="mb-2">
                          <p className="text-[10px] text-muted-foreground mb-1">Covered by:</p>
                          <div className="flex flex-wrap gap-1">
                            {area.coveredBy.map((goal, j) => (
                              <Badge key={j} variant="secondary" className="text-[10px]">{goal}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {area.coverage < 70 && area.gap && (
                        <div className="mt-2 p-2 rounded bg-background/50">
                          <div className="flex items-start gap-2 mb-1">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-amber-700 dark:text-amber-500">{area.gap}</p>
                          </div>
                          {area.suggestedGoal && (
                            <div className="flex items-start gap-2 mt-2">
                              <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-primary font-medium">Suggested: {area.suggestedGoal}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {area.coverage >= 70 && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">Well covered</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4 mt-0">
              {/* Score Ring */}
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <div className="relative w-28 h-28 mx-auto mb-3">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
                    <circle cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${analysis.overallScore * 3.02} 302`} className={getScoreColor(analysis.overallScore)} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>{analysis.overallScore}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Overall Health</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Alignment", score: analysis.alignmentScore, icon: Compass },
                    { label: "Progress", score: analysis.progressScore, icon: TrendingUp },
                    { label: "Balance", score: analysis.balanceScore, icon: BarChart3 },
                    { label: "Urgency", score: analysis.urgencyScore, icon: Timer },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <item.icon className={`h-3.5 w-3.5 mx-auto mb-1 ${getScoreColor(item.score)}`} />
                      <p className={`text-sm font-bold ${getScoreColor(item.score)}`}>{item.score}</p>
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 30 Day Goal & Next Milestone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border-2 border-primary/50 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Rocket className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-primary">30-Day Target</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{analysis.thirtyDayGoal}</p>
                </div>
                <div className="rounded-xl border border-amber-500/50 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Crosshair className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-600">Next Milestone</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{analysis.nextMilestone}</p>
                </div>
              </div>

              {/* Quick Wins */}
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700 dark:text-green-500">Quick Wins</span>
                </div>
                <div className="space-y-1.5">
                  {analysis.quickWins.map((win, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground">{win}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsUp className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-foreground">Strengths</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {analysis.strengths.map((s, i) => <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>)}
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                  <Flame className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{analysis.momentum}</p>
                </div>
              </div>

              {/* Encouragement */}
              <div className="rounded-xl border border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-purple-500/5 p-3">
                <div className="flex items-start gap-2">
                  <Heart className="h-5 w-5 text-pink-600 flex-shrink-0" />
                  <p className="text-sm text-foreground">{analysis.encouragement}</p>
                </div>
              </div>
            </TabsContent>

            {/* IMPACT TAB - Goal Dependencies */}
            <TabsContent value="impact" className="space-y-4 mt-0">
              {(() => {
                // Find goals that impact other goals
                const impactingGoals = goals.filter(g => 
                  !g.archived && ((g.negativeImpactOn && g.negativeImpactOn.length > 0) || g.negativeImpactOnAll)
                )
                
                // Find goals that are being impacted
                const impactedGoalIds = new Set<string>()
                const impactMap: Record<string, { impactedBy: { id: string; title: string; isAll: boolean }[] }> = {}
                
                impactingGoals.forEach(g => {
                  if (g.negativeImpactOnAll) {
                    // This goal impacts all other goals
                    goals.filter(og => og.id !== g.id && !og.archived).forEach(og => {
                      impactedGoalIds.add(og.id)
                      if (!impactMap[og.id]) impactMap[og.id] = { impactedBy: [] }
                      impactMap[og.id].impactedBy.push({ id: g.id, title: g.title, isAll: true })
                    })
                  } else if (g.negativeImpactOn) {
                    g.negativeImpactOn.forEach(impactedId => {
                      impactedGoalIds.add(impactedId)
                      if (!impactMap[impactedId]) impactMap[impactedId] = { impactedBy: [] }
                      impactMap[impactedId].impactedBy.push({ id: g.id, title: g.title, isAll: false })
                    })
                  }
                })
                
                const impactedGoals = goals.filter(g => impactedGoalIds.has(g.id) && !g.archived)
                
                // Calculate impact scores
                const incompleteImpactingGoals = impactingGoals.filter(g => !isGoalCompleted(g))
                const atRiskGoals = impactedGoals.filter(g => {
                  const blockers = impactMap[g.id]?.impactedBy || []
                  return blockers.some(b => {
                    const blockerGoal = goals.find(bg => bg.id === b.id)
                    return blockerGoal && !isGoalCompleted(blockerGoal)
                  })
                })
                
                return (
                  <>
                    {/* Impact Overview */}
                    <div className="rounded-lg sm:rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-red-500/10 p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                        <span className="text-xs sm:text-sm font-semibold text-foreground">Goal Dependencies Impact</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">
                        Analyze how your goal dependencies are affecting your overall progress.
                      </p>
                    </div>
                    
                    {/* Impact Stats */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      <div className="rounded-lg sm:rounded-xl border border-border bg-card p-2 sm:p-3 text-center">
                        <AlertTriangle className={`h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1 ${incompleteImpactingGoals.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
                        <p className={`text-lg sm:text-xl font-bold ${incompleteImpactingGoals.length > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                          {incompleteImpactingGoals.length}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground">Blocking</p>
                      </div>
                      <div className="rounded-lg sm:rounded-xl border border-border bg-card p-2 sm:p-3 text-center">
                        <Target className={`h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1 ${atRiskGoals.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
                        <p className={`text-lg sm:text-xl font-bold ${atRiskGoals.length > 0 ? 'text-red-600' : 'text-foreground'}`}>
                          {atRiskGoals.length}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground">At Risk</p>
                      </div>
                      <div className="rounded-lg sm:rounded-xl border border-border bg-card p-2 sm:p-3 text-center">
                        <Link2 className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-0.5 sm:mb-1 text-blue-600" />
                        <p className="text-lg sm:text-xl font-bold text-blue-600">{Object.keys(impactMap).length}</p>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground">Links</p>
                      </div>
                    </div>

                    {/* AI-Powered Dependency Analysis */}
                    {analysis?.dependencyImpacts && analysis.dependencyImpacts.length > 0 ? (
                      <div className="space-y-4">
                        {analysis.dependencyImpacts.map((impact, idx) => (
                          <div key={idx} className="rounded-xl border-2 border-red-500/50 bg-gradient-to-br from-red-500/5 to-amber-500/5 p-3 sm:p-4">
                            {/* Header */}
                            <div className="flex items-start sm:items-center justify-between gap-2 mb-3">
                              <div className="flex items-start sm:items-center gap-2 min-w-0">
                                <AlertTriangle className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5 sm:mt-0 ${impact.urgencyLevel === 'critical' ? 'text-red-600' : impact.urgencyLevel === 'high' ? 'text-amber-600' : 'text-yellow-600'}`} />
                                <span className="text-xs sm:text-sm font-semibold text-foreground break-words">{impact.blockingGoal}</span>
                              </div>
                              <Badge className={`text-[10px] flex-shrink-0 ${impact.urgencyLevel === 'critical' ? 'bg-red-500' : impact.urgencyLevel === 'high' ? 'bg-amber-500' : 'bg-yellow-500'} text-white`}>
                                {impact.urgencyLevel}
                              </Badge>
                            </div>

                            {/* Why It Matters */}
                            <div className="p-2.5 sm:p-3 rounded-lg bg-background/50 mb-3 sm:mb-4">
                              <div className="flex items-start gap-2">
                                <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide mb-1">Why This Matters</p>
                                  <p className="text-xs sm:text-sm text-foreground">{impact.whyItMatters}</p>
                                </div>
                              </div>
                            </div>

                            {/* How It Impacts Each Goal */}
                            <div className="mb-3 sm:mb-4">
                              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
                                Impact on Your Goals
                              </p>
                              <div className="space-y-2 sm:space-y-3">
                                {impact.impactedGoals.map((impacted, i) => {
                                  const isPinned = isInsightPinned(impacted.goalId, impact.blockingGoalId)
                                  return (
                                  <div key={i} className="p-2.5 sm:p-3 rounded-lg bg-background border border-red-500/20">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <p className="text-xs sm:text-sm font-medium text-foreground min-w-0 break-words">{impacted.goalTitle}</p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-6 w-6 sm:h-7 sm:w-7 p-0 flex-shrink-0 ${isPinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                        onClick={() => {
                                          if (isPinned) {
                                            unpinInsight(impacted.goalId, impact.blockingGoalId)
                                          } else {
                                            pinInsight(
                                              impacted.goalId,
                                              impact.blockingGoalId,
                                              impact.blockingGoal,
                                              impacted.howItImpacts,
                                              impacted.whatYouLose,
                                              impacted.unlockPotential
                                            )
                                          }
                                        }}
                                        title={isPinned ? "Unpin from goal page" : "Pin to goal page"}
                                      >
                                        {isPinned ? <PinOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Pin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                                      </Button>
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                      <div className="flex items-start gap-2">
                                        <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                                        <div className="min-w-0">
                                          <p className="text-[9px] sm:text-[10px] text-red-600 font-medium uppercase">How It's Blocking</p>
                                          <p className="text-[11px] sm:text-xs text-foreground">{impacted.howItImpacts}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <div className="min-w-0">
                                          <p className="text-[9px] sm:text-[10px] text-amber-600 font-medium uppercase">What You're Losing</p>
                                          <p className="text-[11px] sm:text-xs text-foreground">{impacted.whatYouLose}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                                        <div className="min-w-0">
                                          <p className="text-[9px] sm:text-[10px] text-green-600 font-medium uppercase">What Gets Unlocked</p>
                                          <p className="text-[11px] sm:text-xs text-foreground">{impacted.unlockPotential}</p>
                                        </div>
                                      </div>
                                    </div>
                                    {isPinned && (
                                      <div className="mt-2 pt-2 border-t border-border">
                                        <p className="text-[10px] text-primary flex items-center gap-1">
                                          <Pin className="h-3 w-3" />
                                          Pinned to goal page
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )})}
                              </div>
                            </div>

                            {/* Action Plan */}
                            <div className="p-2.5 sm:p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                              <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                                <Rocket className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                Action Plan
                              </p>
                              <div className="space-y-1.5">
                                {impact.actionPlan.map((step, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green-500 text-white text-[9px] sm:text-[10px] flex items-center justify-center font-bold">
                                      {i + 1}
                                    </span>
                                    <p className="text-xs sm:text-sm text-foreground">{step}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : impactingGoals.length > 0 && !analysis ? (
                      <div className="rounded-lg sm:rounded-xl border border-dashed border-purple-500/50 bg-purple-500/5 p-3 sm:p-4 text-center">
                        <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600/50 mx-auto mb-2" />
                        <p className="text-xs sm:text-sm font-medium text-foreground mb-1">Get AI-Powered Impact Analysis</p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
                          Run an AI analysis to understand HOW your blocking goals are affecting your progress.
                        </p>
                        <Button onClick={runAnalysis} disabled={isAnalyzing} size="sm" className="gap-2 h-8 sm:h-9 text-xs sm:text-sm">
                          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Analyze
                        </Button>
                      </div>
                    ) : null}
                    
                    {/* Blocking Goals - Goals that impact others */}
                    {incompleteImpactingGoals.length > 0 ? (
                      <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/5 p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-400">
                            Priority: Complete These First
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
                          These incomplete goals are blocking progress on other goals.
                        </p>
                        <div className="space-y-2 sm:space-y-3">
                          {incompleteImpactingGoals.map((goal) => {
                            const progress = calculateProgress(goal)
                            const impactCount = goal.negativeImpactOnAll 
                              ? goals.filter(g => g.id !== goal.id && !g.archived).length
                              : (goal.negativeImpactOn?.length || 0)
                            
                            return (
                              <div key={goal.id} className="p-2.5 sm:p-3 rounded-lg bg-background border border-amber-500/30">
                                <div className="flex items-start sm:items-center justify-between gap-2 mb-2">
                                  <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                                    <span className="text-xs sm:text-sm font-medium text-foreground break-words">{goal.title}</span>
                                    {goal.negativeImpactOnAll && (
                                      <Badge className="bg-red-500 text-white text-[9px] sm:text-[10px]">Impacts All</Badge>
                                    )}
                                  </div>
                                  <span className={`text-xs sm:text-sm font-bold flex-shrink-0 ${getScoreColor(progress)}`}>{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-1.5 sm:h-2 mb-2" />
                                <div className="flex items-start gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground">
                                  <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                  <span className="break-words">
                                    Blocking {impactCount} goal{impactCount !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : impactingGoals.length > 0 ? (
                      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">
                            All blocking goals are completed!
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                          Great work! You've completed all goals that were blocking others.
                        </p>
                      </div>
                    ) : null}
                    
                    {/* Empty State */}
                    {impactingGoals.length === 0 && (
                      <div className="rounded-lg sm:rounded-xl border border-dashed border-border bg-card/50 p-6 sm:p-8 text-center">
                        <Link2 className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50 mx-auto mb-2 sm:mb-3" />
                        <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-1">No Dependencies Set</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground max-w-sm mx-auto">
                          Edit a goal to specify which other goals would be impacted if it's not completed.
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}
            </TabsContent>

            {/* INSIGHTS TAB */}
            <TabsContent value="insights" className="space-y-4 mt-0">
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-600">Big Picture</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{analysis.bigPictureInsight}</p>
              </div>

              {/* Goal Alignment with Areas */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Compass className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-foreground">Goal-Purpose Alignment</span>
                </div>
                <div className="space-y-3">
                  {analysis.alignmentItems.map((item, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground">{item.goal}</p>
                        <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>{item.score}%</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] mb-2">{item.area}</Badge>
                      <Progress value={item.score} className="h-1.5 mb-2" />
                      <p className="text-xs text-muted-foreground mb-1">{item.insight}</p>
                      <div className="flex items-start gap-1.5 mt-2">
                        <Lightbulb className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-500">{item.suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Goal Connections */}
              {analysis.goalConnections.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Link2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-foreground">Goal Connections</span>
                  </div>
                  <div className="space-y-2">
                    {analysis.goalConnections.map((conn, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${getRelColor(conn.relationship)}`}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-medium">{conn.goal1}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-xs font-medium">{conn.goal2}</span>
                          <Badge variant="outline" className="ml-auto text-[10px]">{conn.relationship}</Badge>
                        </div>
                        <p className="text-xs opacity-80">{conn.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risks & Blind Spots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-semibold text-red-700 dark:text-red-500">Risks</span>
                  </div>
                  <div className="space-y-1.5">
                    {analysis.risks.map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-foreground">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-500">Blind Spots</span>
                  </div>
                  <div className="space-y-1.5">
                    {analysis.blindSpots.map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CircleDot className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-foreground">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ACTIONS TAB */}
            <TabsContent value="actions" className="space-y-4 mt-0">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">This Week's Focus</span>
                </div>
                <div className="space-y-2">
                  {analysis.weeklyFocus.map((f, i) => (
                    <div key={i} className="p-3 rounded-lg bg-background border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium text-primary">{f.goal}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">{f.milestone}</p>
                      <p className="text-xs text-muted-foreground">{f.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-foreground">Action Items</span>
                </div>
                <div className="space-y-2">
                  {analysis.actionItems.map((item, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 flex items-start gap-3">
                      <Badge className={`${getPriorityColor(item.priority)} text-[10px] px-1.5 py-0.5 flex-shrink-0`}>{item.priority}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.action}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <div className="flex items-center gap-1">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{item.impact}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{item.timeframe}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {analysis.habitInsights.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-semibold text-foreground">Habit Insights</span>
                  </div>
                  <div className="space-y-2">
                    {analysis.habitInsights.map((h, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/30">
                        <p className="text-sm text-foreground mb-1">{h.observation}</p>
                        <div className="flex items-start gap-1.5">
                          <Lightbulb className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-700 dark:text-amber-500">{h.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* STRATEGY TAB */}
            <TabsContent value="strategy" className="space-y-4 mt-0">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-foreground">Timeline Status</span>
                </div>
                <div className="space-y-2">
                  {analysis.timelineInsights.map((t, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 flex items-start gap-3">
                      <Badge className={`${getStatusColor(t.status)} text-[10px] px-1.5 py-0.5 border`}>{t.status}</Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{t.goal}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-foreground">Score Breakdown</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Purpose Coverage", score: analysis.overallCoverage },
                    { label: "Overall Health", score: analysis.overallScore },
                    { label: "Purpose Alignment", score: analysis.alignmentScore },
                    { label: "Progress & Momentum", score: analysis.progressScore },
                    { label: "Life Balance", score: analysis.balanceScore },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>{item.score}%</span>
                      </div>
                      <Progress value={item.score} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!analysis && !isAnalyzing && !error && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Brain className="h-12 w-12 text-purple-600/50 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">Purpose-Driven Analysis</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Get insights on how your goals align with your life purpose, identify gaps, and receive personalized recommendations.
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
