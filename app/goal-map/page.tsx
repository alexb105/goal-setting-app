"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Sparkles, Brain, Target, Compass, RefreshCw, AlertCircle, Zap, Heart, TrendingUp, AlertTriangle, Eye, EyeOff, Crown, Flame, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useGoals } from "@/components/goals-context"
import { isGoalCompleted, calculateProgress } from "@/utils/goals"

const LIFE_PURPOSE_STORAGE = "goalritual-life-purpose"
const GOAL_MAP_ANALYSIS_STORAGE = "goalritual-goal-map-analysis-v2"

interface PurposeArea {
  id: string
  name: string
  description: string
  color: string
  importance: "critical" | "important" | "supporting"
}

interface GoalPlacement {
  goalId: string
  areas: string[] // IDs of purpose areas this goal contributes to
  primaryArea: string // The main area
  contribution: string // How this goal contributes
  strength: number // 0-100 how strongly it contributes
}

interface MapAnalysis {
  purposeSummary: string
  purposeAreas: PurposeArea[]
  goalPlacements: GoalPlacement[]
  overallAlignment: number
  keyInsight: string
  motivation: string
}

// Predefined colors for purpose areas
const AREA_COLORS = [
  { bg: "rgba(139, 92, 246, 0.15)", border: "rgb(139, 92, 246)", text: "text-purple-700 dark:text-purple-400" }, // Purple
  { bg: "rgba(59, 130, 246, 0.15)", border: "rgb(59, 130, 246)", text: "text-blue-700 dark:text-blue-400" }, // Blue
  { bg: "rgba(16, 185, 129, 0.15)", border: "rgb(16, 185, 129)", text: "text-emerald-700 dark:text-emerald-400" }, // Emerald
  { bg: "rgba(245, 158, 11, 0.15)", border: "rgb(245, 158, 11)", text: "text-amber-700 dark:text-amber-400" }, // Amber
  { bg: "rgba(236, 72, 153, 0.15)", border: "rgb(236, 72, 153)", text: "text-pink-700 dark:text-pink-400" }, // Pink
  { bg: "rgba(99, 102, 241, 0.15)", border: "rgb(99, 102, 241)", text: "text-indigo-700 dark:text-indigo-400" }, // Indigo
]

// Venn diagram layouts for different numbers of areas
const VENN_LAYOUTS: Record<number, { cx: number; cy: number; r: number }[]> = {
  1: [{ cx: 50, cy: 50, r: 40 }],
  2: [
    { cx: 38, cy: 50, r: 35 },
    { cx: 62, cy: 50, r: 35 },
  ],
  3: [
    { cx: 50, cy: 35, r: 30 },
    { cx: 35, cy: 60, r: 30 },
    { cx: 65, cy: 60, r: 30 },
  ],
  4: [
    { cx: 35, cy: 35, r: 28 },
    { cx: 65, cy: 35, r: 28 },
    { cx: 35, cy: 65, r: 28 },
    { cx: 65, cy: 65, r: 28 },
  ],
  5: [
    { cx: 50, cy: 30, r: 25 },
    { cx: 30, cy: 45, r: 25 },
    { cx: 70, cy: 45, r: 25 },
    { cx: 35, cy: 70, r: 25 },
    { cx: 65, cy: 70, r: 25 },
  ],
  6: [
    { cx: 35, cy: 30, r: 23 },
    { cx: 65, cy: 30, r: 23 },
    { cx: 25, cy: 55, r: 23 },
    { cx: 50, cy: 50, r: 23 },
    { cx: 75, cy: 55, r: 23 },
    { cx: 50, cy: 75, r: 23 },
  ],
}

export default function GoalMapPage() {
  const { goals } = useGoals()
  const [lifePurpose, setLifePurpose] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<MapAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Load life purpose and analysis from localStorage
  useEffect(() => {
    const storedPurpose = localStorage.getItem(LIFE_PURPOSE_STORAGE)
    if (storedPurpose) {
      setLifePurpose(storedPurpose)
    }
    const storedAnalysis = localStorage.getItem(GOAL_MAP_ANALYSIS_STORAGE)
    if (storedAnalysis) {
      try {
        setAnalysis(JSON.parse(storedAnalysis))
      } catch {
        // Ignore parse errors
      }
    }
    setDataLoaded(true)
  }, [])

  // Save analysis to localStorage
  useEffect(() => {
    if (dataLoaded && analysis) {
      localStorage.setItem(GOAL_MAP_ANALYSIS_STORAGE, JSON.stringify(analysis))
    }
  }, [analysis, dataLoaded])

  const activeGoals = useMemo(() => {
    return goals.filter((goal) => !isGoalCompleted(goal) && !goal.archived)
  }, [goals])

  const completedGoals = useMemo(() => {
    return goals.filter((goal) => isGoalCompleted(goal) && !goal.archived)
  }, [goals])

  const allRelevantGoals = useMemo(() => {
    return [...activeGoals, ...completedGoals.slice(0, 3)]
  }, [activeGoals, completedGoals])

  const buildMapPrompt = useCallback(() => {
    const goalsData = allRelevantGoals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      why: goal.why || "Not specified",
      progress: calculateProgress(goal),
      tags: goal.tags,
      milestones: goal.milestones.map(m => ({
        title: m.title,
        description: m.description,
        completed: m.completed,
      })),
    }))

    return `You are an analytical life coach. Your task is to SYSTEMATICALLY analyze the life purpose statement and categorize goals based on evidence.

## STEP 1: ANALYZE THE LIFE PURPOSE
"${lifePurpose}"

Extract the distinct themes/areas mentioned or implied in this purpose statement. Look for:
- Career/professional aspirations
- Personal development areas
- Relationships/family goals
- Health/wellness aspects
- Financial objectives
- Creative/passion pursuits
- Impact/legacy goals

## STEP 2: ANALYZE THESE GOALS AND THEIR MILESTONES
${JSON.stringify(goalsData, null, 2)}

For each goal, examine:
- The goal title and description
- The "why" statement
- The milestones and what they involve
- The tags

## STEP 3: MAP GOALS TO PURPOSE AREAS

Based on your analysis, determine which purpose area(s) each goal DIRECTLY contributes to.
A goal belongs to an area if its milestones and activities BUILD TOWARDS that area.

Respond with this EXACT JSON structure (no markdown):
{
  "purposeSummary": "<factual summary of what the life purpose encompasses>",
  "purposeAreas": [
    {
      "id": "area-0",
      "name": "<2-3 word name derived from the purpose statement>",
      "description": "<what this area represents based on the purpose>",
      "color": "purple",
      "importance": "critical|important|supporting"
    },
    {
      "id": "area-1",
      "name": "<second area name>",
      "description": "<description>",
      "color": "blue",
      "importance": "critical|important|supporting"
    }
  ],
  "goalPlacements": [
    {
      "goalId": "<exact goal id from the data>",
      "areas": ["area-0", "area-1"],
      "primaryArea": "area-0",
      "contribution": "<specific explanation of HOW this goal's milestones build towards the listed areas>",
      "strength": <0-100 based on how directly the goal serves the purpose>
    }
  ],
  "overallAlignment": <0-100 how well all goals cover the purpose>,
  "keyInsight": "<analytical observation about goal coverage>",
  "motivation": "<encouraging note>"
}

CRITICAL ID RULES:
- purposeAreas IDs MUST be: "area-0", "area-1", "area-2", "area-3", "area-4" (sequential, starting from 0)
- goalPlacements.areas MUST use these EXACT same IDs (e.g., ["area-0", "area-2"])
- goalPlacements.primaryArea MUST be one of the IDs from the areas array

ANALYSIS RULES:
- Only create areas that are ACTUALLY mentioned or clearly implied in the purpose statement
- A goal belongs to an area ONLY if its milestones demonstrate work towards that area
- List ALL areas a goal contributes to (1, 2, or 3) - don't skip any
- The "contribution" field must reference SPECIFIC milestones or goal content
- Strength is based on how CENTRAL the goal is to that purpose area
- Be consistent: same goals should always map to same areas`
  }, [lifePurpose, allRelevantGoals])

  const runAnalysis = async () => {
    if (!lifePurpose || allRelevantGoals.length === 0) return
    
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are an analytical assistant. Respond with valid JSON only. Be systematic and consistent." },
            { role: "user", content: buildMapPrompt() },
          ],
          temperature: 0,
          max_tokens: 4000,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error("No response")

      const parsed = JSON.parse(content)
      // Assign colors to areas
      parsed.purposeAreas = parsed.purposeAreas.map((area: PurposeArea, i: number) => ({
        ...area,
        color: AREA_COLORS[i % AREA_COLORS.length].border,
      }))
      setAnalysis(parsed)
      setSelectedArea(null)
      setSelectedGoal(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Get goals for a specific area (by index to handle ID mismatches)
  const getGoalsInArea = useCallback((areaId: string | null | undefined, areaIndex?: number) => {
    if (!analysis || !areaId) return []
    
    return analysis.goalPlacements
      .filter(p => {
        if (!p.areas || !Array.isArray(p.areas)) return false
        // Check by exact ID match
        if (p.areas.includes(areaId)) return true
        // Also check by area index (area-0, area-1, etc.) in case of ID format differences
        if (areaIndex !== undefined) {
          const indexBasedId = `area-${areaIndex}`
          if (p.areas.includes(indexBasedId)) return true
          if (p.primaryArea === indexBasedId) return true
        }
        return false
      })
      .map(p => {
        const goal = allRelevantGoals.find(g => g.id === p.goalId)
        return goal ? { ...p, goal } : null
      })
      .filter(Boolean)
  }, [analysis, allRelevantGoals])

  // Helper to find area index by ID (handles different ID formats)
  const findAreaIndex = useCallback((areaId: string | null | undefined) => {
    if (!analysis || !areaId) return -1
    
    // Try exact match first
    let idx = analysis.purposeAreas.findIndex(a => a.id === areaId)
    if (idx >= 0) return idx
    
    // Try matching "area-N" format to index (0-based)
    const match = areaId.match(/area-(\d+)/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num >= 0 && num < analysis.purposeAreas.length) {
        return num
      }
    }
    
    return -1
  }, [analysis])

  // Get all goal positions (calculated once, placed at intersection of their areas)
  const allGoalPositions = useMemo(() => {
    if (!analysis) return []
    
    const areaCount = analysis.purposeAreas.length
    const layout = VENN_LAYOUTS[Math.min(areaCount, 6)] || VENN_LAYOUTS[6]
    
    return analysis.goalPlacements.map((placement, i) => {
      const goal = allRelevantGoals.find(g => g.id === placement.goalId)
      if (!goal) return null
      
      // Calculate position based on ALL areas the goal belongs to
      let x = 0
      let y = 0
      let validAreas = 0
      const areaIndices: number[] = []
      
      const areas = placement.areas || []
      areas.forEach(areaId => {
        if (!areaId) return
        const idx = findAreaIndex(areaId)
        if (idx >= 0 && layout[idx]) {
          x += layout[idx].cx
          y += layout[idx].cy
          validAreas++
          areaIndices.push(idx)
        }
      })
      
      // Fallback: if no valid areas found, use primary area or first area
      if (validAreas === 0) {
        const primaryIdx = findAreaIndex(placement.primaryArea)
        const fallbackIdx = primaryIdx >= 0 ? primaryIdx : 0
        if (layout[fallbackIdx]) {
          x = layout[fallbackIdx].cx
          y = layout[fallbackIdx].cy
          validAreas = 1
          areaIndices.push(fallbackIdx)
        }
      }
      
      if (validAreas > 0) {
        // Position at the centroid of all areas this goal belongs to
        x = x / validAreas
        y = y / validAreas
        
        // Add offset based on goal index within its area group to spread them out
        const offsetAngle = (i * 2.39996) // Golden angle for better distribution
        const offsetDistance = 6 + (i % 4) * 3
        x += Math.cos(offsetAngle) * offsetDistance
        y += Math.sin(offsetAngle) * offsetDistance
        
        // Keep within bounds
        x = Math.max(8, Math.min(92, x))
        y = Math.max(8, Math.min(92, y))
      }
      
      // Get color from primary area
      const primaryIdx = findAreaIndex(placement.primaryArea)
      const colorIdx = primaryIdx >= 0 ? primaryIdx : (areaIndices[0] ?? 0)
      
      return {
        goalId: placement.goalId,
        x,
        y,
        placement,
        goal,
        colorIdx,
        areaIndices,
      }
    }).filter(Boolean)
  }, [analysis, allRelevantGoals, findAreaIndex])

  const selectedGoalData = selectedGoal ? allRelevantGoals.find(g => g.id === selectedGoal) : null
  const selectedPlacement = selectedGoal && analysis ? analysis.goalPlacements.find(p => p.goalId === selectedGoal) : null
  const selectedAreaData = selectedArea && analysis ? analysis.purposeAreas.find(a => a.id === selectedArea) : null

  const overallProgress = useMemo(() => {
    if (activeGoals.length === 0) return 0
    return Math.round(activeGoals.reduce((acc, g) => acc + calculateProgress(g), 0) / activeGoals.length)
  }, [activeGoals])

  const getAreaColor = (index: number) => AREA_COLORS[index % AREA_COLORS.length]

  return (
    <div className="min-h-screen safe-area-top bg-gradient-to-b from-background to-muted/30 pb-24">
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
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0">
                <Compass className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Goal Map</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Purpose areas & goals</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLabels(!showLabels)}
              className="gap-1.5"
            >
              {showLabels ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden sm:inline">{showLabels ? "Hide" : "Show"} Labels</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-3 sm:px-6 py-4 sm:py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg border border-border bg-card p-2 sm:p-3 text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg sm:text-xl font-bold text-primary">{activeGoals.length}</p>
            <p className="text-[10px] text-muted-foreground">Active Goals</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-2 sm:p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-600" />
            <p className="text-lg sm:text-xl font-bold text-blue-600">{overallProgress}%</p>
            <p className="text-[10px] text-muted-foreground">Avg Progress</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-2 sm:p-3 text-center">
            <Zap className="h-4 w-4 mx-auto mb-1 text-amber-600" />
            <p className="text-lg sm:text-xl font-bold text-amber-600">{analysis?.overallAlignment || "—"}%</p>
            <p className="text-[10px] text-muted-foreground">Alignment</p>
          </div>
        </div>

        {/* Life Purpose Banner */}
        {lifePurpose ? (
          <div className="mb-4 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Life Purpose</span>
            </div>
            <p className="text-sm sm:text-base text-foreground line-clamp-2">{lifePurpose}</p>
            {analysis?.purposeSummary && (
              <p className="text-xs text-muted-foreground mt-2 italic">"{analysis.purposeSummary}"</p>
            )}
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Define your life purpose first</p>
              <p className="text-xs text-muted-foreground">Add your life purpose on the home page to visualize the goal map.</p>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">Add</Button>
            </Link>
          </div>
        )}

        {/* Analyze Button */}
        {lifePurpose && allRelevantGoals.length > 0 && (
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="w-full gap-2 h-11 mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-purple-500/20"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Mapping Goals to Purpose...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {analysis ? "Refresh Map" : "Generate Goal Map"}
              </>
            )}
          </Button>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Venn Diagram Visualization */}
        {analysis && analysis.purposeAreas.length > 0 && (
          <div className="rounded-xl border border-border bg-card/50 p-2 sm:p-4 mb-4">
            <div className="relative aspect-square max-w-lg mx-auto">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                style={{ touchAction: "none" }}
              >
                {/* Layer 1: Purpose Area Circles (Venn diagram) */}
                {analysis.purposeAreas.map((area, i) => {
                  const areaCount = analysis.purposeAreas.length
                  const layout = VENN_LAYOUTS[Math.min(areaCount, 6)] || VENN_LAYOUTS[6]
                  const pos = layout[i]
                  if (!pos) return null
                  
                  const colorSet = getAreaColor(i)
                  const isSelected = selectedArea === area.id
                  
                  return (
                    <circle
                      key={area.id}
                      cx={pos.cx}
                      cy={pos.cy}
                      r={pos.r}
                      fill={colorSet.bg}
                      stroke={colorSet.border}
                      strokeWidth={isSelected ? 0.8 : 0.4}
                      opacity={selectedArea && !isSelected ? 0.4 : 0.9}
                      className="cursor-pointer transition-all duration-200"
                      onClick={() => setSelectedArea(isSelected ? null : area.id)}
                    />
                  )
                })}
                
                {/* Layer 2: Goal nodes (rendered on top of all circles) */}
                {allGoalPositions.map((goalPos) => {
                  if (!goalPos) return null
                  
                  const { goal, x, y, colorIdx } = goalPos
                  const colorSet = getAreaColor(colorIdx)
                  const progress = calculateProgress(goal)
                  const isCompleted = progress >= 100
                  const isGoalSelected = selectedGoal === goal.id
                  const nodeRadius = isGoalSelected ? 5 : 4
                  
                  return (
                    <g
                      key={`goal-${goal.id}`}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedGoal(isGoalSelected ? null : goal.id)
                        setSelectedArea(null)
                      }}
                    >
                      {/* Selection ring */}
                      {isGoalSelected && (
                        <circle
                          cx={x}
                          cy={y}
                          r={nodeRadius + 2}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="0.5"
                          className="text-primary"
                        />
                      )}
                      
                      {/* Outer glow for better visibility */}
                      <circle
                        cx={x}
                        cy={y}
                        r={nodeRadius + 0.5}
                        fill="white"
                        opacity="0.9"
                      />
                      
                      {/* Progress ring background */}
                      <circle
                        cx={x}
                        cy={y}
                        r={nodeRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        className="text-muted/40"
                      />
                      
                      {/* Progress ring */}
                      <circle
                        cx={x}
                        cy={y}
                        r={nodeRadius}
                        fill="none"
                        stroke={isCompleted ? "rgb(34, 197, 94)" : colorSet.border}
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeDasharray={`${progress * 0.251} 25.1`}
                        transform={`rotate(-90 ${x} ${y})`}
                      />
                      
                      {/* Node fill */}
                      <circle
                        cx={x}
                        cy={y}
                        r={nodeRadius - 1}
                        fill={isCompleted ? "rgb(220, 252, 231)" : "white"}
                        stroke={isCompleted ? "rgb(34, 197, 94)" : colorSet.border}
                        strokeWidth="0.4"
                      />
                      
                      {/* Goal label */}
                      {showLabels && (
                        <text
                          x={x}
                          y={y + nodeRadius + 3}
                          textAnchor="middle"
                          className="fill-foreground text-[2.5px] font-medium pointer-events-none"
                          style={{ textShadow: "0 0 3px white, 0 0 3px white" }}
                        >
                          {goal.title.length > 12 ? goal.title.substring(0, 10) + "..." : goal.title}
                        </text>
                      )}
                      
                      {/* Completed checkmark or progress text */}
                      {isCompleted ? (
                        <text
                          x={x}
                          y={y + 1}
                          textAnchor="middle"
                          className="fill-green-600 text-[3px] font-bold"
                        >
                          ✓
                        </text>
                      ) : (
                        <text
                          x={x}
                          y={y + 1}
                          textAnchor="middle"
                          className="fill-foreground text-[2.5px] font-bold pointer-events-none"
                        >
                          {progress}%
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-2 mt-3 px-2">
              {analysis.purposeAreas.map((area, i) => {
                const colorSet = getAreaColor(i)
                const isSelected = selectedArea === area.id
                // Count goals using both exact ID and index-based matching
                const goalsInArea = getGoalsInArea(area.id, i)
                
                return (
                  <button
                    key={area.id}
                    onClick={() => setSelectedArea(isSelected ? null : area.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
                      isSelected 
                        ? "ring-2 ring-offset-1 ring-primary bg-muted" 
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colorSet.border }}
                    />
                    <span className={`font-medium ${colorSet.text}`}>{area.name}</span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1">
                      {goalsInArea.length}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Selected Area Detail */}
        {selectedAreaData && (
          <div 
            className="rounded-xl border-2 p-4 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{ 
              borderColor: getAreaColor(analysis?.purposeAreas.findIndex(a => a.id === selectedArea) || 0).border,
              backgroundColor: getAreaColor(analysis?.purposeAreas.findIndex(a => a.id === selectedArea) || 0).bg,
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold text-foreground">{selectedAreaData.name}</h3>
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] ${
                      selectedAreaData.importance === "critical" 
                        ? "border-red-500 text-red-600" 
                        : selectedAreaData.importance === "important"
                        ? "border-amber-500 text-amber-600"
                        : "border-blue-500 text-blue-600"
                    }`}
                  >
                    {selectedAreaData.importance}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{selectedAreaData.description}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedArea(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Goals in this area:</p>
              {getGoalsInArea(selectedAreaData.id, analysis?.purposeAreas.findIndex(a => a.id === selectedAreaData.id)).map((item) => {
                if (!item) return null
                const placement = item as GoalPlacement & { goal: typeof goals[0] }
                const goal = placement.goal
                const progress = calculateProgress(goal)
                
                return (
                  <div
                    key={goal.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-background/50 cursor-pointer hover:bg-background transition-colors"
                    onClick={() => setSelectedGoal(goal.id)}
                  >
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                        <circle
                          cx="18" cy="18" r="16"
                          fill="none"
                          stroke={progress >= 100 ? "rgb(34, 197, 94)" : "currentColor"}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${progress} 100`}
                          transform="rotate(-90 18 18)"
                          className={progress >= 100 ? "" : "text-primary"}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">
                        {progress}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{goal.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{placement.contribution}</p>
                    </div>
                    {placement.primaryArea === selectedAreaData.id && (
                      <Badge variant="secondary" className="text-[9px]">Primary</Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Selected Goal Detail */}
        {selectedGoalData && selectedPlacement && !selectedArea && (
          <div className="rounded-xl border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5 p-4 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">{selectedGoalData.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tap areas below to learn more</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-primary">{calculateProgress(selectedGoalData)}%</p>
                <p className="text-[10px] text-muted-foreground">Complete</p>
              </div>
            </div>
            
            {/* Why this goal is placed here */}
            <div className="p-3 rounded-xl bg-background border border-purple-500/30 mb-4">
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 flex-shrink-0">
                  <Brain className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Why It's Placed Here</p>
                  <p className="text-sm text-foreground leading-relaxed">{selectedPlacement.contribution}</p>
                </div>
              </div>
            </div>
            
            {/* Areas this goal contributes to */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Contributes to these purpose areas:</p>
              <div className="space-y-2">
                {selectedPlacement.areas.map((areaId) => {
                  const area = analysis?.purposeAreas.find(a => a.id === areaId)
                  const colorIndex = analysis?.purposeAreas.findIndex(a => a.id === areaId) || 0
                  const colorSet = getAreaColor(colorIndex)
                  if (!area) return null
                  const isPrimary = selectedPlacement.primaryArea === areaId
                  
                  return (
                    <div
                      key={areaId}
                      className="flex items-center gap-3 p-2.5 rounded-lg border transition-colors"
                      style={{ 
                        borderColor: colorSet.border,
                        backgroundColor: colorSet.bg,
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colorSet.border }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{area.name}</span>
                          {isPrimary && (
                            <Badge className="text-[9px] h-4 bg-primary/20 text-primary border-0">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{area.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Strength indicator */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-foreground">Contribution Strength</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      selectedPlacement.strength >= 80 ? "bg-green-500" : 
                      selectedPlacement.strength >= 50 ? "bg-amber-500" : "bg-red-400"
                    }`}
                    style={{ width: `${selectedPlacement.strength}%` }}
                  />
                </div>
                <span className={`text-sm font-bold ${
                  selectedPlacement.strength >= 80 ? "text-green-600" : 
                  selectedPlacement.strength >= 50 ? "text-amber-600" : "text-red-500"
                }`}>{selectedPlacement.strength}%</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Link href={`/?goal=${selectedGoalData.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-1.5">
                  <Target className="h-4 w-4" />
                  View Goal Details
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedGoal(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}


        {/* AI Insights */}
        {analysis && (
          <div className="space-y-3">
            {/* Key Insight */}
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Key Insight</span>
              </div>
              <p className="text-sm text-foreground">{analysis.keyInsight}</p>
            </div>
            
            {/* Motivation */}
            <div className="rounded-xl border border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-purple-500/5 p-4">
              <div className="flex items-start gap-2">
                <Heart className="h-5 w-5 text-pink-600 flex-shrink-0" />
                <p className="text-sm text-foreground">{analysis.motivation}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {allRelevantGoals.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">No Goals Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              Create goals to see how they map to your life purpose areas.
            </p>
            <Link href="/">
              <Button>Create Your First Goal</Button>
            </Link>
          </div>
        )}

        {/* No Analysis Yet */}
        {allRelevantGoals.length > 0 && lifePurpose && !analysis && !isAnalyzing && (
          <div className="rounded-xl border border-dashed border-purple-500/50 bg-purple-500/5 p-6 text-center">
            <Brain className="h-10 w-10 text-purple-600/50 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">Generate Your Goal Map</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Click the button above to break down your life purpose into areas and see where each goal fits.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

