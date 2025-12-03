"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Sparkles, Brain, Target, Compass, AlertTriangle, CheckCircle2, Lightbulb, RefreshCw, Key, TrendingUp, AlertCircle, ArrowRight, Clock, Flame, Star, ThumbsUp, Zap, Heart, Calendar, Link2, BarChart3, Shield, Crosshair, Timer, Rocket, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useGoals } from "@/components/goals-context"
import { isGoalCompleted, calculateProgress } from "@/utils/goals"
import { isMilestoneOverdue, isMilestoneDueSoon } from "@/utils/date"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const API_KEY_STORAGE = "pathwise-openai-api-key"
const LIFE_PURPOSE_STORAGE = "pathwise-life-purpose"

interface AlignmentItem {
  goal: string
  score: number
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

interface AnalysisResult {
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
}

export default function AIGuidancePage() {
  const { goals } = useGoals()
  const [apiKey, setApiKey] = useState("")
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [lifePurpose, setLifePurpose] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  // Load API key and life purpose from localStorage
  useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE)
    if (storedKey) {
      setApiKey(storedKey)
      setApiKeyInput(storedKey)
    }
    const storedPurpose = localStorage.getItem(LIFE_PURPOSE_STORAGE)
    if (storedPurpose) {
      setLifePurpose(storedPurpose)
    }
  }, [])

  const activeGoals = useMemo(() => {
    return goals.filter((goal) => !isGoalCompleted(goal) && !goal.archived)
  }, [goals])

  const completedGoals = useMemo(() => {
    return goals.filter((goal) => isGoalCompleted(goal))
  }, [goals])

  const lateMilestones = useMemo(() => {
    return activeGoals.flatMap((goal) =>
      goal.milestones
        .filter(isMilestoneOverdue)
        .map((m) => ({ milestone: m, goalTitle: goal.title }))
    )
  }, [activeGoals])

  const expiringMilestones = useMemo(() => {
    return activeGoals.flatMap((goal) =>
      goal.milestones
        .filter(isMilestoneDueSoon)
        .map((m) => ({ milestone: m, goalTitle: goal.title }))
    )
  }, [activeGoals])

  const averageProgress = useMemo(() => {
    if (activeGoals.length === 0) return 0
    const total = activeGoals.reduce((acc, goal) => acc + calculateProgress(goal), 0)
    return Math.round(total / activeGoals.length)
  }, [activeGoals])

  const saveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem(API_KEY_STORAGE, apiKeyInput.trim())
      setApiKey(apiKeyInput.trim())
      setShowApiKeyDialog(false)
    }
  }

  const clearApiKey = () => {
    localStorage.removeItem(API_KEY_STORAGE)
    setApiKey("")
    setApiKeyInput("")
  }

  const buildAnalysisPrompt = () => {
    const goalsData = activeGoals.map((goal) => ({
      title: goal.title,
      description: goal.description,
      why: goal.why || "Not specified",
      targetDate: goal.targetDate,
      progress: calculateProgress(goal),
      priority: goal.priority || 0,
      tags: goal.tags,
      group: goal.group,
      milestones: goal.milestones.map((m) => ({
        title: m.title,
        description: m.description,
        targetDate: m.targetDate,
        completed: m.completed,
        inProgress: m.inProgress,
        tasksTotal: m.tasks.length,
        tasksCompleted: m.tasks.filter((t) => t.completed).length,
      })),
      recurringTasks: goal.recurringTaskGroups?.map((g) => ({
        name: g.name,
        recurrence: g.recurrence,
        completionCount: g.completionCount || 0,
        tasksCount: g.tasks.length,
      })) || [],
    }))

    const completedGoalsData = completedGoals.map((g) => ({
      title: g.title,
      completedMilestones: g.milestones.length,
    }))

    return `You are an expert life coach and strategic goal planner. Provide DEEP, SPECIFIC analysis.

## LIFE PURPOSE
${lifePurpose || "Not defined - suggest they create one"}

## ACTIVE GOALS (${activeGoals.length})
${JSON.stringify(goalsData, null, 2)}

## COMPLETED GOALS (${completedGoals.length})
${JSON.stringify(completedGoalsData, null, 2)}

## CURRENT ISSUES
- Late milestones: ${lateMilestones.length}
- Due in 3 days: ${expiringMilestones.length}
- Average progress: ${averageProgress}%

Analyze deeply and respond with this EXACT JSON structure (no markdown):
{
  "overallScore": <0-100>,
  "alignmentScore": <0-100>,
  "progressScore": <0-100>,
  "balanceScore": <0-100>,
  "urgencyScore": <0-100 how urgent action is needed>,
  
  "alignmentItems": [
    {"goal": "<title>", "score": <0-100>, "insight": "<why this score - be specific>", "suggestion": "<specific improvement>"}
  ],
  
  "goalConnections": [
    {"goal1": "<title>", "goal2": "<title>", "relationship": "supports|conflicts|synergy", "explanation": "<how they connect>"}
  ],
  
  "timelineInsights": [
    {"goal": "<title>", "status": "on-track|at-risk|behind", "recommendation": "<specific action>"}
  ],
  
  "weeklyFocus": [
    {"goal": "<title>", "milestone": "<specific milestone to focus on>", "reason": "<why this week>"}
  ],
  
  "actionItems": [
    {"priority": "high|medium|low", "action": "<specific action>", "impact": "<result>", "timeframe": "today|this week|this month"}
  ],
  
  "habitInsights": [
    {"observation": "<pattern noticed in recurring tasks>", "suggestion": "<how to improve>"}
  ],
  
  "quickWins": ["<easy win 1>", "<easy win 2>", "<easy win 3>"],
  
  "risks": ["<risk 1>", "<risk 2>"],
  "blindSpots": ["<thing they might be missing>", "<potential oversight>"],
  
  "strengths": ["<what they're doing well>", "<positive pattern>", "<strength>"],
  "momentum": "<observation about their current momentum and energy>",
  
  "encouragement": "<personalized encouragement based on THEIR specific situation>",
  
  "bigPictureInsight": "<how their goals connect to life purpose and what it means>",
  "nextMilestone": "<the single most important next milestone to complete>",
  "thirtyDayGoal": "<what they should aim to achieve in the next 30 days>"
}`
  }

  const runAnalysis = async () => {
    if (!apiKey) {
      setShowApiKeyDialog(true)
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert life coach. Give specific, actionable advice. Always respond with valid JSON only.",
            },
            {
              role: "user",
              content: buildAnalysisPrompt(),
            },
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          throw new Error("Invalid API key")
        }
        throw new Error(errorData.error?.message || `API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error("No response from AI")
      }

      const parsed = JSON.parse(content)
      setAnalysis(parsed)
    } catch (err) {
      console.error("Analysis error:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-amber-600"
    return "text-red-600"
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-amber-500"
    return "bg-red-500"
  }

  const getPriorityColor = (priority: string) => {
    if (priority === "high") return "bg-red-500 text-white"
    if (priority === "medium") return "bg-amber-500 text-white"
    return "bg-blue-500 text-white"
  }

  const getStatusColor = (status: string) => {
    if (status === "on-track") return "text-green-600 bg-green-500/10"
    if (status === "at-risk") return "text-amber-600 bg-amber-500/10"
    return "text-red-600 bg-red-500/10"
  }

  const getRelationshipColor = (rel: string) => {
    if (rel === "supports") return "bg-blue-500/10 text-blue-600 border-blue-500/30"
    if (rel === "synergy") return "bg-green-500/10 text-green-600 border-green-500/30"
    return "bg-red-500/10 text-red-600 border-red-500/30"
  }

  return (
    <div className="min-h-screen safe-area-top bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link href="/">
                <Button variant="ghost" className="gap-2 -ml-2 h-9 px-2 sm:px-3">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0">
                <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">AI Guidance</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Deep insights & strategy</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowApiKeyDialog(true)} className="gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">{apiKey ? "✓" : "Set Key"}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-3 sm:px-6 py-4 sm:py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="rounded-lg border border-border bg-card p-2 text-center">
            <p className="text-lg font-bold text-foreground">{activeGoals.length}</p>
            <p className="text-[10px] text-muted-foreground">Active</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-2 text-center">
            <p className="text-lg font-bold text-foreground">{averageProgress}%</p>
            <p className="text-[10px] text-muted-foreground">Progress</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-2 text-center">
            <p className={`text-lg font-bold ${lateMilestones.length > 0 ? "text-red-600" : "text-foreground"}`}>{lateMilestones.length}</p>
            <p className="text-[10px] text-muted-foreground">Late</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-2 text-center">
            <p className="text-lg font-bold text-green-600">{completedGoals.length}</p>
            <p className="text-[10px] text-muted-foreground">Done</p>
          </div>
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
            <p className="text-xs text-muted-foreground flex-1">Add your life purpose on the dashboard for better analysis</p>
            <Link href="/"><Button variant="outline" size="sm">Add</Button></Link>
          </div>
        )}

        {/* Analyze Button */}
        <Button
          onClick={runAnalysis}
          disabled={isAnalyzing || activeGoals.length === 0}
          className="w-full gap-2 h-11 mb-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20"
        >
          {isAnalyzing ? (
            <><RefreshCw className="h-4 w-4 animate-spin" />Analyzing...</>
          ) : (
            <><Sparkles className="h-4 w-4" />Get Deep Analysis</>
          )}
        </Button>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
              <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
              <TabsTrigger value="strategy" className="text-xs">Strategy</TabsTrigger>
            </TabsList>

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
                <p className="text-xs text-muted-foreground mb-3">Overall Health Score</p>
                
                {/* Sub-scores */}
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

              {/* Strengths & Momentum */}
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsUp className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-foreground">Your Strengths</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {analysis.strengths.map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
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

            {/* INSIGHTS TAB */}
            <TabsContent value="insights" className="space-y-4 mt-0">
              {/* Big Picture */}
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-600">Big Picture Insight</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{analysis.bigPictureInsight}</p>
              </div>

              {/* Goal Alignment Details */}
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
                      <div key={i} className={`p-3 rounded-lg border ${getRelationshipColor(conn.relationship)}`}>
                        <div className="flex items-center gap-2 mb-1">
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
                    {analysis.risks.map((risk, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-foreground">{risk}</p>
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
                    {analysis.blindSpots.map((spot, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-foreground">{spot}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ACTIONS TAB */}
            <TabsContent value="actions" className="space-y-4 mt-0">
              {/* Weekly Focus */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">This Week's Focus</span>
                </div>
                <div className="space-y-2">
                  {analysis.weeklyFocus.map((focus, i) => (
                    <div key={i} className="p-3 rounded-lg bg-background border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium text-primary">{focus.goal}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">{focus.milestone}</p>
                      <p className="text-xs text-muted-foreground">{focus.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Items */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-foreground">Action Items</span>
                </div>
                <div className="space-y-2">
                  {analysis.actionItems.map((item, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 flex items-start gap-3">
                      <Badge className={`${getPriorityColor(item.priority)} text-[10px] px-1.5 py-0.5 flex-shrink-0`}>
                        {item.priority}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.action}</p>
                        <div className="flex items-center gap-3 mt-1">
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

              {/* Habit Insights */}
              {analysis.habitInsights.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-semibold text-foreground">Habit Insights</span>
                  </div>
                  <div className="space-y-2">
                    {analysis.habitInsights.map((habit, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/30">
                        <p className="text-sm text-foreground mb-1">{habit.observation}</p>
                        <div className="flex items-start gap-1.5">
                          <Lightbulb className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-700 dark:text-amber-500">{habit.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* STRATEGY TAB */}
            <TabsContent value="strategy" className="space-y-4 mt-0">
              {/* Timeline Status */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-foreground">Timeline Status</span>
                </div>
                <div className="space-y-2">
                  {analysis.timelineInsights.map((item, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 flex items-start gap-3">
                      <Badge className={`${getStatusColor(item.status)} text-[10px] px-1.5 py-0.5 border`}>
                        {item.status}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{item.goal}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Scores Summary */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-foreground">Score Breakdown</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Overall Health", score: analysis.overallScore },
                    { label: "Purpose Alignment", score: analysis.alignmentScore },
                    { label: "Progress & Momentum", score: analysis.progressScore },
                    { label: "Life Balance", score: analysis.balanceScore },
                    { label: "Action Urgency", score: analysis.urgencyScore },
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
            <h3 className="text-base font-semibold text-foreground mb-1">Ready for Deep Analysis</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Get personalized insights, strategic recommendations, and actionable guidance.
            </p>
          </div>
        )}
      </div>

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="h-5 w-5" />OpenAI API Key</DialogTitle>
            <DialogDescription>Your key is stored locally.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input id="api-key" type="password" placeholder="sk-..." value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Get from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com</a>
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveApiKey} disabled={!apiKeyInput.trim()} className="flex-1">Save</Button>
              {apiKey && <Button variant="destructive" onClick={clearApiKey}>Remove</Button>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
