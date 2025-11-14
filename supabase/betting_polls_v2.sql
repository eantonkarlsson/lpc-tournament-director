-- Create betting_polls table with 4-letter code IDs
-- This is the updated schema - use this for fresh installations

-- Function to generate random 4-letter uppercase codes
CREATE OR REPLACE FUNCTION generate_poll_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 4 random uppercase letters
    code := upper(
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int)
    );

    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check
    FROM betting_polls
    WHERE id = code;

    -- If code doesn't exist, return it
    EXIT WHEN exists_check = 0;
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create betting_polls table
CREATE TABLE IF NOT EXISTS betting_polls (
  id TEXT PRIMARY KEY DEFAULT generate_poll_code(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  CONSTRAINT poll_id_length CHECK (length(id) = 4)
);

-- Create betting_options table
CREATE TABLE IF NOT EXISTS betting_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id TEXT NOT NULL REFERENCES betting_polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create betting_votes table
CREATE TABLE IF NOT EXISTS betting_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id TEXT NOT NULL REFERENCES betting_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES betting_options(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, player_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_betting_votes_poll_id ON betting_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_betting_votes_option_id ON betting_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_betting_options_poll_id ON betting_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_betting_polls_tournament_id ON betting_polls(tournament_id);

-- Enable RLS
ALTER TABLE betting_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE betting_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE betting_votes ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to polls" ON betting_polls FOR SELECT USING (true);
CREATE POLICY "Allow public read access to options" ON betting_options FOR SELECT USING (true);
CREATE POLICY "Allow public read access to votes" ON betting_votes FOR SELECT USING (true);

-- Create policies for public insert access (voting)
CREATE POLICY "Allow public insert votes" ON betting_votes FOR INSERT WITH CHECK (true);

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

-- Create view for vote counts
CREATE OR REPLACE VIEW betting_vote_counts AS
SELECT
  bo.id as option_id,
  bo.poll_id,
  bo.option_text,
  bo.display_order,
  COUNT(bv.id) as vote_count
FROM betting_options bo
LEFT JOIN betting_votes bv ON bo.id = bv.option_id
GROUP BY bo.id, bo.poll_id, bo.option_text, bo.display_order
ORDER BY bo.poll_id, bo.display_order;
