-- GoalRitual Supabase Schema
-- Run this SQL in your Supabase SQL Editor (SQL tab in dashboard)

-- Enable Row Level Security (RLS)
-- This ensures users can only access their own data

-- Create the user_data table to store all user data
CREATE TABLE IF NOT EXISTS user_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Goals data (array of goal objects)
  goals JSONB DEFAULT '[]'::jsonb,
  
  -- Group order (array of group names in display order)
  group_order JSONB DEFAULT '[]'::jsonb,
  
  -- Daily todos
  daily_todos JSONB DEFAULT '[]'::jsonb,
  daily_todos_last_reset TEXT,
  
  -- Recurring tasks (standalone, not goal-related)
  recurring_tasks JSONB DEFAULT '[]'::jsonb,
  
  -- Pinned milestone tasks
  pinned_milestone_tasks JSONB DEFAULT '[]'::jsonb,
  
  -- Life purpose
  life_purpose TEXT,
  
  -- OpenAI settings
  openai_api_key TEXT,
  
  -- AI analysis data
  ai_analysis JSONB,
  ai_applied_suggestions JSONB DEFAULT '[]'::jsonb,
  ai_dismissed_suggestions JSONB DEFAULT '[]'::jsonb,
  
  -- Pinned insights
  pinned_insights JSONB DEFAULT '[]'::jsonb,
  
  -- Recurring group dividers (for organizing recurring task groups)
  recurring_group_dividers JSONB DEFAULT '[]'::jsonb,
  
  -- Journal entries
  journal_entries JSONB DEFAULT '[]'::jsonb,
  
  -- Daily tasks streak score and tracking
  daily_tasks_score INTEGER DEFAULT 0,
  daily_tasks_score_updated_at TEXT,  -- Date when score was last adjusted (to prevent double adjustments)
  daily_tasks_snapshot JSONB,  -- Snapshot of yesterday's task completion for score calculation
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);

-- Enable Row Level Security
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own data
CREATE POLICY "Users can view own data" ON user_data
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own data
CREATE POLICY "Users can insert own data" ON user_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON user_data
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own data
CREATE POLICY "Users can delete own data" ON user_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on every update
DROP TRIGGER IF EXISTS update_user_data_updated_at ON user_data;
CREATE TRIGGER update_user_data_updated_at
  BEFORE UPDATE ON user_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migration: Add recurring_group_dividers column to existing databases
-- Run this if you already have a user_data table:
-- ALTER TABLE user_data ADD COLUMN IF NOT EXISTS recurring_group_dividers JSONB DEFAULT '[]'::jsonb;

-- Migration: Add journal_entries column to existing databases
-- Run this if you already have a user_data table:
-- ALTER TABLE user_data ADD COLUMN IF NOT EXISTS journal_entries JSONB DEFAULT '[]'::jsonb;

-- Migration: Add daily_tasks_score columns to existing databases
-- Run this if you already have a user_data table:
-- ALTER TABLE user_data ADD COLUMN IF NOT EXISTS daily_tasks_score INTEGER DEFAULT 0;
-- ALTER TABLE user_data ADD COLUMN IF NOT EXISTS daily_tasks_score_updated_at TEXT;
-- ALTER TABLE user_data ADD COLUMN IF NOT EXISTS daily_tasks_snapshot JSONB;

