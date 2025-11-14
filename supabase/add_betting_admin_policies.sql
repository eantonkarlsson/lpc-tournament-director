-- Add admin policies for betting tables
-- Run this after betting_polls.sql to add authenticated user policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated insert polls" ON betting_polls;
DROP POLICY IF EXISTS "Allow authenticated update polls" ON betting_polls;
DROP POLICY IF EXISTS "Allow authenticated delete polls" ON betting_polls;
DROP POLICY IF EXISTS "Allow authenticated insert options" ON betting_options;
DROP POLICY IF EXISTS "Allow authenticated update options" ON betting_options;
DROP POLICY IF EXISTS "Allow authenticated delete options" ON betting_options;
DROP POLICY IF EXISTS "Allow authenticated update votes" ON betting_votes;
DROP POLICY IF EXISTS "Allow authenticated delete votes" ON betting_votes;

-- Create policies for authenticated users (admin operations)
-- Polls
CREATE POLICY "Allow authenticated insert polls" ON betting_polls
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update polls" ON betting_polls
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete polls" ON betting_polls
  FOR DELETE
  TO authenticated
  USING (true);

-- Options
CREATE POLICY "Allow authenticated insert options" ON betting_options
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update options" ON betting_options
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete options" ON betting_options
  FOR DELETE
  TO authenticated
  USING (true);

-- Votes (authenticated can manage all votes for admin purposes)
CREATE POLICY "Allow authenticated update votes" ON betting_votes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete votes" ON betting_votes
  FOR DELETE
  TO authenticated
  USING (true);
