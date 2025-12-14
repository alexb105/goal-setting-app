"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, TrendingUp, Calendar, Target, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useGoals } from "@/components/goals-context"
import { GoalDetailView } from "@/components/goal-detail-view"
import { cn } from "@/lib/utils"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts"
import { STANDALONE_MILESTONES_GOAL_TITLE } from "@/constants"

interface MilestoneDataPoint {
  date: string
  dateTimestamp: number
  displayDate: string
  progress: number
  milestone: {
    id: string
    title: string
    goalId: string
    goalTitle: string
    goalColor?: string
    completed: boolean
    targetDate: string
  }
}

export default function MilestoneTimelinePage() {
  const { goals } = useGoals()
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)

  // Collect all milestones with their target dates
  const milestoneData = useMemo(() => {
    const dataPoints: MilestoneDataPoint[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    goals.forEach((goal) => {
      if (goal.archived) return

      goal.milestones.forEach((milestone) => {
        // Skip milestones without target dates or linked goal milestones
        if (!milestone.targetDate || milestone.linkedGoalId || milestone.archived) return

        const targetDate = new Date(milestone.targetDate)
        targetDate.setHours(0, 0, 0, 0)
        const targetTimestamp = targetDate.getTime()

        // Calculate linear progress
        // We assume a start date 90 days before target (or goal creation)
        // If no creation date available, use 90 days before target
        const startTimestamp = targetTimestamp - (90 * 24 * 60 * 60 * 1000)
        const totalDuration = targetTimestamp - startTimestamp
        const elapsed = todayTimestamp - startTimestamp
        
        let progress: number
        if (milestone.completed) {
          progress = 100
        } else if (todayTimestamp >= targetTimestamp) {
          progress = 100 // Past due
        } else if (todayTimestamp <= startTimestamp) {
          progress = 0
        } else {
          progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
        }

        dataPoints.push({
          date: milestone.targetDate,
          dateTimestamp: targetTimestamp,
          displayDate: targetDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: targetDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
          }),
          progress: Math.round(progress),
          milestone: {
            id: milestone.id,
            title: milestone.title,
            goalId: goal.id,
            goalTitle: goal.title === STANDALONE_MILESTONES_GOAL_TITLE ? "Quick Milestones" : goal.title,
            goalColor: goal.color,
            completed: milestone.completed,
            targetDate: milestone.targetDate,
          },
        })
      })
    })

    // Sort by date
    return dataPoints.sort((a, b) => a.dateTimestamp - b.dateTimestamp)
  }, [goals])

  // Create chart data with cumulative progress points
  const chartData = useMemo(() => {
    if (milestoneData.length === 0) return []

    // Group milestones by date and create chart points
    const dateMap = new Map<string, MilestoneDataPoint[]>()
    milestoneData.forEach((point) => {
      const existing = dateMap.get(point.date) || []
      existing.push(point)
      dateMap.set(point.date, existing)
    })

    // Create chart points for each date
    const chartPoints = Array.from(dateMap.entries()).map(([date, points]) => {
      const firstPoint = points[0]
      // Average progress for milestones on the same date
      const avgProgress = Math.round(
        points.reduce((sum, p) => sum + p.progress, 0) / points.length
      )
      
      return {
        date: firstPoint.displayDate,
        dateTimestamp: firstPoint.dateTimestamp,
        progress: avgProgress,
        milestones: points.map(p => p.milestone),
        count: points.length,
      }
    })

    return chartPoints
  }, [milestoneData])

  // Get today's position for reference line
  const todayTimestamp = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today.getTime()
  }, [])

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (!active || !payload || !payload.length) return null
    
    const data = payload[0].payload
    const isPast = data.dateTimestamp < todayTimestamp
    const isToday = Math.abs(data.dateTimestamp - todayTimestamp) < 24 * 60 * 60 * 1000
    
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{data.date}</span>
          {isToday && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary">Today</Badge>
          )}
          {isPast && !isToday && (
            <Badge variant="outline" className="text-xs">Past</Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground mb-2">
          Progress: <span className="font-semibold text-foreground">{data.progress}%</span>
        </div>
        <div className="space-y-1">
          {data.milestones.map((m: MilestoneDataPoint["milestone"]) => (
            <div 
              key={m.id} 
              className={cn(
                "flex items-start gap-2 text-xs p-1.5 rounded",
                m.completed ? "bg-green-500/10" : "bg-muted/50"
              )}
            >
              <div 
                className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: m.goalColor || "#8b5cf6" }}
              />
              <div className="min-w-0">
                <div className={cn(
                  "font-medium truncate",
                  m.completed && "line-through text-muted-foreground"
                )}>
                  {m.title}
                </div>
                <div className="text-muted-foreground truncate">{m.goalTitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Stats
  const stats = useMemo(() => {
    const total = milestoneData.length
    const completed = milestoneData.filter(m => m.milestone.completed).length
    const upcoming = milestoneData.filter(m => !m.milestone.completed && m.dateTimestamp >= todayTimestamp).length
    const overdue = milestoneData.filter(m => !m.milestone.completed && m.dateTimestamp < todayTimestamp).length
    const avgProgress = total > 0 
      ? Math.round(milestoneData.reduce((sum, m) => sum + m.progress, 0) / total)
      : 0
    
    return { total, completed, upcoming, overdue, avgProgress }
  }, [milestoneData, todayTimestamp])

  // Show goal detail view if a goal is selected
  const selectedGoal = goals.find((g) => g.id === selectedGoalId)
  if (selectedGoal) {
    return (
      <GoalDetailView
        goal={selectedGoal}
        onBack={() => setSelectedGoalId(null)}
        onNavigateToGoal={(goalId) => setSelectedGoalId(goalId)}
      />
    )
  }

  return (
    <div className="min-h-screen safe-area-top">
      {/* Header */}
      <header className="border-b border-border glass-strong sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/milestones">
                <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Timeline
                </h1>
                <p className="text-xs text-muted-foreground">
                  {stats.total} milestones plotted
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Upcoming</p>
            <p className="text-2xl font-bold text-blue-500">{stats.upcoming}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-red-500">{stats.overdue}</p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="rounded-xl border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Progress Over Time
            </h2>
            <div className="h-[300px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={{ className: "stroke-border" }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={{ className: "stroke-border" }}
                    tickFormatter={(value) => `${value}%`}
                    width={45}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: "20px" }}
                    formatter={() => <span className="text-xs">Expected Progress</span>}
                  />
                  {/* Today reference line */}
                  {chartData.some(d => d.dateTimestamp >= todayTimestamp) && (
                    <ReferenceLine 
                      x={chartData.find(d => Math.abs(d.dateTimestamp - todayTimestamp) < 24 * 60 * 60 * 1000)?.date}
                      stroke="#8b5cf6"
                      strokeDasharray="5 5"
                      label={{ value: "Today", position: "top", fontSize: 10, fill: "#8b5cf6" }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="progress"
                    name="Progress"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload, index } = props
                      const isCompleted = payload.milestones?.every((m: MilestoneDataPoint["milestone"]) => m.completed)
                      return (
                        <circle
                          key={`dot-${index}`}
                          cx={cx}
                          cy={cy}
                          r={payload.count > 1 ? 6 : 4}
                          fill={isCompleted ? "#22c55e" : "#8b5cf6"}
                          stroke="white"
                          strokeWidth={2}
                        />
                      )
                    }}
                    activeDot={{ r: 8, fill: "#8b5cf6", stroke: "white", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Each point represents milestones due on that date. Progress is calculated linearly from 90 days before the target date.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground text-center">
              No milestones with dates
            </h3>
            <p className="mb-6 text-center text-sm text-muted-foreground max-w-xs">
              Add target dates to your milestones to see them plotted on the timeline.
            </p>
            <Link href="/milestones">
              <Button>View Milestones</Button>
            </Link>
          </div>
        )}

        {/* Milestone List */}
        {milestoneData.length > 0 && (
          <div className="mt-6 rounded-xl border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Milestones by Date
            </h2>
            <div className="space-y-2">
              {milestoneData.map((item) => (
                <button 
                  key={item.milestone.id}
                  onClick={() => setSelectedGoalId(item.milestone.goalId)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left group hover:shadow-md active:scale-[0.99]",
                    item.milestone.completed 
                      ? "bg-green-500/5 border-green-500/20 hover:border-green-500/40" 
                      : item.dateTimestamp < todayTimestamp
                        ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                        : "bg-muted/30 border-border hover:border-primary/30"
                  )}
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.milestone.goalColor || "#8b5cf6" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium text-sm truncate",
                      item.milestone.completed && "line-through text-muted-foreground"
                    )}>
                      {item.milestone.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.milestone.goalTitle}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium">{item.displayDate}</div>
                    <div className={cn(
                      "text-xs",
                      item.milestone.completed 
                        ? "text-green-500" 
                        : item.dateTimestamp < todayTimestamp
                          ? "text-red-500"
                          : "text-muted-foreground"
                    )}>
                      {item.milestone.completed 
                        ? "Completed" 
                        : item.dateTimestamp < todayTimestamp
                          ? "Overdue"
                          : `${item.progress}% progress`
                      }
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}





