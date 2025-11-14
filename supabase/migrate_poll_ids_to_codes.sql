-- Migration: Change betting_polls ID from UUID to 4-letter code
-- This migration creates new tables with the new schema and migrates data

-- Step 1: Drop the view that depends on the tables
DROP VIEW IF EXISTS betting_vote_counts;

-- Step 2: Create temporary function to generate random 4-letter uppercase codes
-- This version doesn't check for conflicts since we're migrating
CREATE OR REPLACE FUNCTION generate_poll_code_temp()
RETURNS TEXT AS $$
BEGIN
  -- Generate 4 random uppercase letters
  RETURN upper(
    chr(65 + floor(random() * 26)::int) ||
    chr(65 + floor(random() * 26)::int) ||
    chr(65 + floor(random() * 26)::int) ||
    chr(65 + floor(random() * 26)::int)
  );
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create new tables with TEXT id
CREATE TABLE betting_polls_new (
  id TEXT PRIMARY KEY DEFAULT generate_poll_code_temp(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  CONSTRAINT poll_id_length CHECK (length(id) = 4)
);

CREATE TABLE betting_options_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id TEXT NOT NULL REFERENCES betting_polls_new(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE betting_votes_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id TEXT NOT NULL REFERENCES betting_polls_new(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES betting_options_new(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, player_id)
);

-- Step 4: Migrate existing data (if any)
-- Note: This creates new poll codes for existing polls
INSERT INTO betting_polls_new (tournament_id, title, is_active, created_at, closed_at)
SELECT tournament_id, title, is_active, created_at, closed_at
FROM betting_polls;

-- Create mapping between old and new poll IDs
CREATE TEMP TABLE poll_id_mapping AS
SELECT
  old.id as old_id,
  new.id as new_id,
  ROW_NUMBER() OVER (ORDER BY old.created_at) as rn1,
  ROW_NUMBER() OVER (ORDER BY new.created_at) as rn2
FROM betting_polls old
CROSS JOIN betting_polls_new new
WHERE (SELECT COUNT(*) FROM betting_polls) = (SELECT COUNT(*) FROM betting_polls_new);

-- Migrate options using the mapping
INSERT INTO betting_options_new (id, poll_id, option_text, display_order, created_at)
SELECT
  bo.id,
  pim.new_id,
  bo.option_text,
  bo.display_order,
  bo.created_at
FROM betting_options bo
JOIN poll_id_mapping pim ON bo.poll_id::text = pim.old_id::text
WHERE pim.rn1 = pim.rn2;

-- Migrate votes using the mapping
INSERT INTO betting_votes_new (id, poll_id, option_id, player_id, created_at)
SELECT
  bv.id,
  pim.new_id,
  bv.option_id,
  bv.player_id,
  bv.created_at
FROM betting_votes bv
JOIN poll_id_mapping pim ON bv.poll_id::text = pim.old_id::text
WHERE pim.rn1 = pim.rn2;

-- Step 5: Drop old tables
DROP TABLE IF EXISTS betting_votes CASCADE;
DROP TABLE IF EXISTS betting_options CASCADE;
DROP TABLE IF EXISTS betting_polls CASCADE;

-- Step 6: Rename new tables
ALTER TABLE betting_polls_new RENAME TO betting_polls;
ALTER TABLE betting_options_new RENAME TO betting_options;
ALTER TABLE betting_votes_new RENAME TO betting_votes;

-- Step 7: Recreate indexes
CREATE INDEX idx_betting_votes_poll_id ON betting_votes(poll_id);
CREATE INDEX idx_betting_votes_option_id ON betting_votes(option_id);
CREATE INDEX idx_betting_options_poll_id ON betting_options(poll_id);
CREATE INDEX idx_betting_polls_tournament_id ON betting_polls(tournament_id);

-- Step 8: Enable RLS
ALTER TABLE betting_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE betting_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE betting_votes ENABLE ROW LEVEL SECURITY;

-- Step 9: Recreate policies
CREATE POLICY "Allow public read access to polls" ON betting_polls FOR SELECT USING (true);
CREATE POLICY "Allow public read access to options" ON betting_options FOR SELECT USING (true);
CREATE POLICY "Allow public read access to votes" ON betting_votes FOR SELECT USING (true);
CREATE POLICY "Allow public insert votes" ON betting_votes FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated insert polls" ON betting_polls
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update polls" ON betting_polls
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete polls" ON betting_polls
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert options" ON betting_options
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update options" ON betting_options
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete options" ON betting_options
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated update votes" ON betting_votes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete votes" ON betting_votes
  FOR DELETE TO authenticated USING (true);

-- Step 10: Recreate view
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

-- Step 11: Create the real function for future use (with conflict checking)
CREATE OR REPLACE FUNCTION generate_poll_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    code := upper(
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int)
    );

    SELECT COUNT(*) INTO exists_check
    FROM betting_polls
    WHERE id = code;

    EXIT WHEN exists_check = 0;
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Update the default on betting_polls to use the new function
ALTER TABLE betting_polls ALTER COLUMN id SET DEFAULT generate_poll_code();

-- Now we can drop the temporary function
DROP FUNCTION IF EXISTS generate_poll_code_temp();
