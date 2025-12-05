export interface Task {
  id: string
  title: string
  completed: boolean
  isSeparator?: boolean // If true, this task acts as a bold text separator
}

export interface DailyTodo {
  id: string
  title: string
  completed: boolean
  createdAt: string // ISO date string
}

export interface StandaloneRecurringTask {
  id: string
  title: string
  daysOfWeek: number[] // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  completedDates: string[] // ISO date strings (YYYY-MM-DD) when the task was completed
  createdAt: string // ISO date string
}

export type RecurrenceType = "daily" | "weekly" | "monthly"

export interface RecurringTask {
  id: string
  title: string
  completed: boolean
  isSeparator?: boolean // If true, this task acts as a bold text header/separator
}

export interface RecurringTaskGroup {
  id: string
  name: string // e.g., "Eat Healthy"
  recurrence: RecurrenceType // daily, weekly, monthly
  startDate?: string // ISO date string of when the recurrence should start (YYYY-MM-DD)
  tasks: RecurringTask[]
  lastResetDate?: string // ISO date string of when tasks were last reset
  completionCount?: number // Number of times all tasks have been completed
}

export interface Milestone {
  id: string
  title: string
  description: string
  targetDate: string
  completed: boolean
  inProgress?: boolean // If true, this milestone is currently being worked on
  archived?: boolean // If true, this milestone is archived and hidden from main view
  tasks: Task[]
  linkedGoals: string[] // Array of goal IDs that aid this milestone
  linkedGoalId?: string // If set, this milestone is a link to another goal
  taskDisplayStyle?: "checkbox" | "bullet" // How to display tasks: checkbox or bullet point
}

export interface Goal {
  id: string
  title: string
  description: string
  why?: string // Personal motivation: why I want to achieve this goal
  tags: string[]
  targetDate: string
  milestones: Milestone[]
  recurringTaskGroups?: RecurringTaskGroup[] // Recurring task groups for daily/weekly/monthly habits
  createdAt: string
  color?: string // Pastel color for the goal card background
  showProgress?: boolean // If false, hide progress bar and milestone tracking
  negativeImpactOn?: string[] // Array of goal IDs that will be negatively impacted if this goal is not completed
  priority?: number // Priority number for sorting goals (higher number = higher priority)
  group?: string // Optional group name to organize goals
  order?: number // Manual order for goals within their group
  archived?: boolean // If true, this goal is archived and hidden from main view
}
