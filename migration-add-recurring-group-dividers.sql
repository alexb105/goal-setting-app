-- Migration: Add recurring_group_dividers column to user_data table
-- Run this SQL in your Supabase SQL Editor (SQL tab in dashboard)
-- This migration adds support for organizing recurring task groups with dividers

-- Add the recurring_group_dividers column if it doesn't exist
ALTER TABLE user_data 
ADD COLUMN IF NOT EXISTS recurring_group_dividers JSONB DEFAULT '[]'::jsonb;

-- Verify the column was added (optional - you can check in the table editor)
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_data' AND column_name = 'recurring_group_dividers';
