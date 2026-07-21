-- Migration: Add phone and country fields to users table
-- Run this in your Supabase SQL Editor if the columns don't already exist

-- Add phone column (nullable)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add country column (nullable)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS country TEXT;

-- Optional: verify the columns were added
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;
