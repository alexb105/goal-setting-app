"use client"

import type { SupabaseClient, User } from "@supabase/supabase-js"
import type { Goal, DailyTodo, StandaloneRecurringTask, PinnedMilestoneTask, RecurringGroupDivider, JournalEntry } from "@/types"

// Storage keys
const STORAGE_KEYS = {
  goals: "goalritual-goals",
  groupOrder: "goal-group-order",
  dailyTodos: "goalritual-daily-todos",
  dailyTodosLastReset: "goalritual-daily-todos-last-reset",
  recurringTasks: "goalritual-recurring-tasks",
  pinnedMilestoneTasks: "goalritual-pinned-milestone-tasks",
  lifePurpose: "goalritual-life-purpose",
  openaiApiKey: "goalritual-openai-api-key",
  aiAnalysis: "goalritual-ai-analysis",
  aiAppliedSuggestions: "goalritual-ai-applied-suggestions",
  aiDismissedSuggestions: "goalritual-ai-dismissed-suggestions",
  pinnedInsights: "goalritual-pinned-insights",
  recurringGroupDividers: "goalritual-recurring-group-dividers",
  journal: "goalritual-journal",
} as const

// User data table schema - we store all user data in a single JSONB column for simplicity
interface UserData {
  goals: Goal[]
  group_order: string[]
  daily_todos: DailyTodo[]
  daily_todos_last_reset: string | null
  recurring_tasks: StandaloneRecurringTask[]
  pinned_milestone_tasks: PinnedMilestoneTask[]
  life_purpose: string | null
  openai_api_key: string | null
  ai_analysis: unknown | null
  ai_applied_suggestions: string[] | null
  ai_dismissed_suggestions: string[] | null
  pinned_insights: unknown[] | null
  recurring_group_dividers: RecurringGroupDivider[] | null
  journal_entries: JournalEntry[] | null
  updated_at: string
}

export class SupabaseSync {
  private supabase: SupabaseClient
  private user: User | null = null
  private isSyncing = false
  private pendingSync = false

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  setUser(user: User | null) {
    this.user = user
  }

  // Get all localStorage data
  private getLocalData(): Omit<UserData, "updated_at"> {
    const getJson = <T>(key: string, fallback: T): T => {
      try {
        const data = localStorage.getItem(key)
        return data ? JSON.parse(data) : fallback
      } catch {
        return fallback
      }
    }

    const getString = (key: string): string | null => {
      return localStorage.getItem(key)
    }

    return {
      goals: getJson<Goal[]>(STORAGE_KEYS.goals, []),
      group_order: getJson<string[]>(STORAGE_KEYS.groupOrder, []),
      daily_todos: getJson<DailyTodo[]>(STORAGE_KEYS.dailyTodos, []),
      daily_todos_last_reset: getString(STORAGE_KEYS.dailyTodosLastReset),
      recurring_tasks: getJson<StandaloneRecurringTask[]>(STORAGE_KEYS.recurringTasks, []),
      pinned_milestone_tasks: getJson<PinnedMilestoneTask[]>(STORAGE_KEYS.pinnedMilestoneTasks, []),
      life_purpose: getString(STORAGE_KEYS.lifePurpose),
      openai_api_key: getString(STORAGE_KEYS.openaiApiKey),
      ai_analysis: getJson(STORAGE_KEYS.aiAnalysis, null),
      ai_applied_suggestions: getJson<string[]>(STORAGE_KEYS.aiAppliedSuggestions, []),
      ai_dismissed_suggestions: getJson<string[]>(STORAGE_KEYS.aiDismissedSuggestions, []),
      pinned_insights: getJson(STORAGE_KEYS.pinnedInsights, []),
      recurring_group_dividers: getJson<RecurringGroupDivider[]>(STORAGE_KEYS.recurringGroupDividers, []),
      journal_entries: getJson<JournalEntry[]>(STORAGE_KEYS.journal, []),
    }
  }

  // Set all localStorage data
  private setLocalData(data: Omit<UserData, "updated_at">) {
    const setJson = <T>(key: string, value: T) => {
      if (value === null || (Array.isArray(value) && value.length === 0)) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, JSON.stringify(value))
      }
    }

    const setString = (key: string, value: string | null) => {
      if (value === null) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, value)
      }
    }

    setJson(STORAGE_KEYS.goals, data.goals)
    setJson(STORAGE_KEYS.groupOrder, data.group_order)
    setJson(STORAGE_KEYS.dailyTodos, data.daily_todos)
    setString(STORAGE_KEYS.dailyTodosLastReset, data.daily_todos_last_reset)
    setJson(STORAGE_KEYS.recurringTasks, data.recurring_tasks)
    setJson(STORAGE_KEYS.pinnedMilestoneTasks, data.pinned_milestone_tasks)
    setString(STORAGE_KEYS.lifePurpose, data.life_purpose)
    setString(STORAGE_KEYS.openaiApiKey, data.openai_api_key)
    setJson(STORAGE_KEYS.aiAnalysis, data.ai_analysis)
    setJson(STORAGE_KEYS.aiAppliedSuggestions, data.ai_applied_suggestions)
    setJson(STORAGE_KEYS.aiDismissedSuggestions, data.ai_dismissed_suggestions)
    setJson(STORAGE_KEYS.pinnedInsights, data.pinned_insights)
    setJson(STORAGE_KEYS.recurringGroupDividers, data.recurring_group_dividers)
    setJson(STORAGE_KEYS.journal, data.journal_entries)

    // Dispatch custom event so other components can react (works in same window)
    window.dispatchEvent(new CustomEvent("goalritual-storage-updated"))
  }

  // Clear all localStorage data (for when user is not signed in)
  clearLocalData() {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })
    
    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent("goalritual-storage-updated"))
  }

  // Push local data to cloud (for new account sign up)
  async pushLocalToCloud(): Promise<boolean> {
    if (!this.user) {
      console.warn("Cannot push to cloud: no user")
      return false
    }
    const localData = this.getLocalData()
    const result = await this.saveToSupabase(localData)
    if (!result) {
      console.error("Failed to push local data to cloud for user:", this.user.id)
    }
    return result
  }

  // Pull cloud data and overwrite local (for sign in)
  async pullCloudToLocal(): Promise<boolean> {
    if (!this.user) {
      console.warn("Cannot pull from cloud: no user")
      return false
    }

    const remoteData = await this.fetchFromSupabase()

    if (remoteData) {
      // Remote data exists - overwrite local with it
      console.log("Pulling cloud data to local. Goals:", remoteData.goals?.length || 0, "Daily todos:", remoteData.daily_todos?.length || 0, "Journal entries:", remoteData.journal_entries?.length || 0)
      this.setLocalData({
        goals: remoteData.goals || [],
        group_order: remoteData.group_order || [],
        daily_todos: remoteData.daily_todos || [],
        daily_todos_last_reset: remoteData.daily_todos_last_reset,
        recurring_tasks: remoteData.recurring_tasks || [],
        pinned_milestone_tasks: remoteData.pinned_milestone_tasks || [],
        life_purpose: remoteData.life_purpose,
        openai_api_key: remoteData.openai_api_key,
        ai_analysis: remoteData.ai_analysis,
        ai_applied_suggestions: remoteData.ai_applied_suggestions,
        ai_dismissed_suggestions: remoteData.ai_dismissed_suggestions,
        pinned_insights: remoteData.pinned_insights,
        recurring_group_dividers: remoteData.recurring_group_dividers || [],
        journal_entries: remoteData.journal_entries || [],
      })
      console.log("Successfully pulled cloud data to local storage")
      return true
    } else {
      // No remote data exists - clear local data (new account with no data)
      console.log("No cloud data found, clearing local data")
      this.clearLocalData()
      return true
    }
  }

  // Fetch user data from Supabase
  async fetchFromSupabase(): Promise<UserData | null> {
    if (!this.user) return null

    // Verify we have a valid session
    const { data: { session }, error: sessionError } = await this.supabase.auth.getSession()
    if (sessionError || !session) {
      console.warn("No valid session when trying to fetch:", sessionError)
      return null
    }

    try {
      const { data, error } = await this.supabase
        .from("user_data")
        .select("*")
        .eq("user_id", this.user.id)
        .single()

      if (error) {
        // No data exists yet - this is normal for new users
        if (error.code === "PGRST116") {
          console.log("No user_data row found for user (new user):", this.user.id)
          return null
        }
        console.error("Error fetching from Supabase:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          user_id: this.user.id,
        })
        return null
      }

      if (data) {
        console.log("Fetched data from Supabase. Goals:", (data as UserData).goals?.length || 0, "User ID:", this.user.id)
      }
      return data as UserData
    } catch (error) {
      console.error("Exception fetching from Supabase:", error)
      return null
    }
  }

  // Save user data to Supabase
  async saveToSupabase(data: Omit<UserData, "updated_at">): Promise<boolean> {
    if (!this.user) {
      console.warn("Cannot save to Supabase: no user")
      return false
    }

    // Verify we have a valid session
    const { data: { session }, error: sessionError } = await this.supabase.auth.getSession()
    if (sessionError || !session) {
      console.error("No valid session when trying to save:", sessionError)
      return false
    }

    if (session.user.id !== this.user.id) {
      console.error("Session user ID mismatch:", session.user.id, "vs", this.user.id)
      return false
    }

    // Check if email is confirmed (RLS policies may require this)
    if (session.user.email && !session.user.email_confirmed_at) {
      console.warn("User email not confirmed yet. RLS policies may block data insertion. User ID:", this.user.id)
      // Still try to save - some Supabase configs allow unconfirmed users
    }

    try {
      // First, check if a row exists for this user
      const { data: existingData, error: fetchError } = await this.supabase
        .from("user_data")
        .select("user_id")
        .eq("user_id", this.user.id)
        .maybeSingle()

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 is "no rows returned" which is fine
        console.error("Error checking existing data:", fetchError.message, fetchError.details, fetchError.hint)
      }

      const payload = {
        user_id: this.user.id,
        ...data,
        updated_at: new Date().toISOString(),
      }

      let error
      if (existingData) {
        // Row exists - update it
        const { error: updateError } = await this.supabase
          .from("user_data")
          .update(payload)
          .eq("user_id", this.user.id)
        error = updateError
      } else {
        // Row doesn't exist - insert it
        const { error: insertError } = await this.supabase
          .from("user_data")
          .insert(payload)
        error = insertError
      }

      if (error) {
        console.error("Error saving to Supabase:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          user_id: this.user.id,
          hasData: !!data.goals && data.goals.length > 0,
          operation: existingData ? "update" : "insert",
        })
        return false
      }

      console.log("Successfully saved data to Supabase for user:", this.user.id)
      return true
    } catch (error) {
      console.error("Exception saving to Supabase:", error)
      return false
    }
  }

  // Sync local data to Supabase (called when data changes locally)
  async syncToCloud(): Promise<void> {
    if (!this.user) {
      console.warn("Cannot sync to cloud: no user")
      return
    }

    // Prevent concurrent syncs
    if (this.isSyncing) {
      this.pendingSync = true
      return
    }

    this.isSyncing = true

    try {
      const localData = this.getLocalData()
      const result = await this.saveToSupabase(localData)
      if (!result) {
        console.error("Failed to sync to cloud for user:", this.user.id)
        throw new Error("Failed to save data to Supabase")
      }
    } catch (error) {
      console.error("Error in syncToCloud:", error)
      throw error
    } finally {
      this.isSyncing = false

      // Handle any pending sync requests
      if (this.pendingSync) {
        this.pendingSync = false
        await this.syncToCloud()
      }
    }
  }

  // Sync data from Supabase to local (called on sign in)
  async syncFromCloud(): Promise<boolean> {
    if (!this.user) return false

    const remoteData = await this.fetchFromSupabase()

    if (remoteData) {
      // Remote data exists - use it
      this.setLocalData({
        goals: remoteData.goals || [],
        group_order: remoteData.group_order || [],
        daily_todos: remoteData.daily_todos || [],
        daily_todos_last_reset: remoteData.daily_todos_last_reset,
        recurring_tasks: remoteData.recurring_tasks || [],
        pinned_milestone_tasks: remoteData.pinned_milestone_tasks || [],
        life_purpose: remoteData.life_purpose,
        openai_api_key: remoteData.openai_api_key,
        ai_analysis: remoteData.ai_analysis,
        ai_applied_suggestions: remoteData.ai_applied_suggestions,
        ai_dismissed_suggestions: remoteData.ai_dismissed_suggestions,
        pinned_insights: remoteData.pinned_insights,
        recurring_group_dividers: remoteData.recurring_group_dividers || [],
        journal_entries: remoteData.journal_entries || [],
      })
      return true
    } else {
      // No remote data - upload local data
      const localData = this.getLocalData()
      await this.saveToSupabase(localData)
      return true
    }
  }

  // Merge strategy: Use remote data but merge in any local goals that don't exist remotely
  async mergeData(): Promise<void> {
    if (!this.user) return

    const localData = this.getLocalData()
    const remoteData = await this.fetchFromSupabase()

    if (!remoteData) {
      // No remote data - just upload local
      await this.saveToSupabase(localData)
      return
    }

    // For goals, merge: add local goals that don't exist in remote
    const remoteGoalIds = new Set((remoteData.goals || []).map((g) => g.id))
    const uniqueLocalGoals = localData.goals.filter((g) => !remoteGoalIds.has(g.id))
    const mergedGoals = [...(remoteData.goals || []), ...uniqueLocalGoals]

    // For journal entries, merge: add local entries that don't exist in remote
    const remoteJournalIds = new Set((remoteData.journal_entries || []).map((e) => e.id))
    const uniqueLocalJournalEntries = (localData.journal_entries || []).filter((e) => !remoteJournalIds.has(e.id))
    const mergedJournalEntries = [...(remoteData.journal_entries || []), ...uniqueLocalJournalEntries]

    // For other data, prefer remote if it exists
    const mergedData: Omit<UserData, "updated_at"> = {
      goals: mergedGoals,
      group_order: remoteData.group_order || localData.group_order,
      daily_todos: remoteData.daily_todos || localData.daily_todos,
      daily_todos_last_reset: remoteData.daily_todos_last_reset || localData.daily_todos_last_reset,
      recurring_tasks: remoteData.recurring_tasks || localData.recurring_tasks,
      pinned_milestone_tasks: remoteData.pinned_milestone_tasks || localData.pinned_milestone_tasks,
      life_purpose: remoteData.life_purpose || localData.life_purpose,
      openai_api_key: remoteData.openai_api_key || localData.openai_api_key,
      ai_analysis: remoteData.ai_analysis || localData.ai_analysis,
      ai_applied_suggestions: remoteData.ai_applied_suggestions || localData.ai_applied_suggestions,
      ai_dismissed_suggestions: remoteData.ai_dismissed_suggestions || localData.ai_dismissed_suggestions,
      pinned_insights: remoteData.pinned_insights || localData.pinned_insights,
      recurring_group_dividers: remoteData.recurring_group_dividers || localData.recurring_group_dividers || [],
      journal_entries: mergedJournalEntries,
    }

    // Update both local and remote with merged data
    this.setLocalData(mergedData)
    await this.saveToSupabase(mergedData)
  }
}

// Singleton instance
let syncInstance: SupabaseSync | null = null

export function getSyncInstance(supabase: SupabaseClient): SupabaseSync {
  if (!syncInstance) {
    syncInstance = new SupabaseSync(supabase)
  }
  return syncInstance
}

