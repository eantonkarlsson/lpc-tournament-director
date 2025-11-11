-- Fix RLS policies for tournament_results to properly allow authenticated users
-- Run this in your Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON tournament_results;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON tournament_results;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON tournament_results;

-- Create policies that check for authenticated users (auth.uid() is not null)
CREATE POLICY "Allow insert for authenticated users" ON tournament_results
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON tournament_results
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users" ON tournament_results
  FOR DELETE
  TO authenticated
  USING (true);

-- If you want to allow anonymous access (not recommended for production), use this instead:
-- DROP POLICY IF EXISTS "Allow insert for authenticated users" ON tournament_results;
-- CREATE POLICY "Allow all inserts" ON tournament_results FOR INSERT WITH CHECK (true);
