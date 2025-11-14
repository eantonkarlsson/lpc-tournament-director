-- Add LPC Bucks betting currency system
-- Each player gets a balance per tournament and can bet amounts on polls

-- Create table to track LPC Bucks balances per player per tournament
CREATE TABLE IF NOT EXISTS lpc_bucks_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 1000,
  starting_balance INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, tournament_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lpc_bucks_player_tournament ON lpc_bucks_balances(player_id, tournament_id);

-- Add bet_amount column to betting_votes table
ALTER TABLE betting_votes ADD COLUMN IF NOT EXISTS bet_amount INTEGER DEFAULT 0;

-- Add constraint to ensure valid bet amounts
ALTER TABLE betting_votes ADD CONSTRAINT positive_bet_amount CHECK (bet_amount >= 0);

-- Create function to get or create player balance for a tournament
CREATE OR REPLACE FUNCTION get_or_create_balance(p_player_id UUID, p_tournament_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Try to get existing balance
  SELECT balance INTO current_balance
  FROM lpc_bucks_balances
  WHERE player_id = p_player_id AND tournament_id = p_tournament_id;

  -- If no balance exists, create one with starting amount
  IF current_balance IS NULL THEN
    INSERT INTO lpc_bucks_balances (player_id, tournament_id, balance, starting_balance)
    VALUES (p_player_id, p_tournament_id, 1000, 1000)
    RETURNING balance INTO current_balance;
  END IF;

  RETURN current_balance;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate bet amount before insert
CREATE OR REPLACE FUNCTION validate_bet_amount()
RETURNS TRIGGER AS $$
DECLARE
  player_balance INTEGER;
  tournament_id UUID;
  player_total_bets INTEGER;
  available_balance INTEGER;
BEGIN
  -- Get tournament_id from the poll
  SELECT bp.tournament_id INTO tournament_id
  FROM betting_polls bp
  WHERE bp.id = NEW.poll_id;

  -- Get or create player's balance for this tournament
  player_balance := get_or_create_balance(NEW.player_id, tournament_id);

  -- Get player's total active bets in this tournament (excluding this poll if updating)
  SELECT COALESCE(SUM(bv.bet_amount), 0) INTO player_total_bets
  FROM betting_votes bv
  JOIN betting_polls bp ON bv.poll_id = bp.id
  WHERE bv.player_id = NEW.player_id
    AND bp.tournament_id = tournament_id
    AND bv.poll_id != NEW.poll_id;

  -- Calculate available balance
  available_balance := player_balance - player_total_bets;

  -- Check if player has enough balance
  IF NEW.bet_amount > available_balance THEN
    RAISE EXCEPTION 'Insufficient LPC Bucks balance. Available: %, Requested: %', available_balance, NEW.bet_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate bets
DROP TRIGGER IF EXISTS validate_bet_before_insert ON betting_votes;
CREATE TRIGGER validate_bet_before_insert
  BEFORE INSERT OR UPDATE ON betting_votes
  FOR EACH ROW
  EXECUTE FUNCTION validate_bet_amount();

-- Update the vote counts view to include bet totals
DROP VIEW IF EXISTS betting_vote_counts;
CREATE OR REPLACE VIEW betting_vote_counts AS
SELECT
  bo.id as option_id,
  bo.poll_id,
  bo.option_text,
  bo.display_order,
  COUNT(bv.id) as vote_count,
  COALESCE(SUM(bv.bet_amount), 0) as total_bet_amount
FROM betting_options bo
LEFT JOIN betting_votes bv ON bo.id = bv.option_id
GROUP BY bo.id, bo.poll_id, bo.option_text, bo.display_order
ORDER BY bo.poll_id, bo.display_order;

-- Create view for player balances with bet tracking per tournament
CREATE OR REPLACE VIEW player_betting_stats AS
SELECT
  lbb.player_id,
  p.name as player_name,
  lbb.tournament_id,
  lbb.balance as current_balance,
  lbb.starting_balance,
  COALESCE(SUM(bv.bet_amount), 0) as total_active_bets,
  lbb.balance - COALESCE(SUM(bv.bet_amount), 0) as available_balance,
  COUNT(bv.id) as total_votes
FROM lpc_bucks_balances lbb
JOIN players p ON lbb.player_id = p.id
LEFT JOIN betting_votes bv ON p.id = bv.player_id
LEFT JOIN betting_polls bp ON bv.poll_id = bp.id AND bp.tournament_id = lbb.tournament_id
GROUP BY lbb.player_id, p.name, lbb.tournament_id, lbb.balance, lbb.starting_balance;

-- Create view for poll leaderboard (who bet the most on each option)
CREATE OR REPLACE VIEW betting_poll_leaderboard AS
SELECT
  bv.poll_id,
  bv.option_id,
  bo.option_text,
  p.name as player_name,
  bv.bet_amount,
  ROW_NUMBER() OVER (PARTITION BY bv.poll_id, bv.option_id ORDER BY bv.bet_amount DESC) as rank
FROM betting_votes bv
JOIN betting_options bo ON bv.option_id = bo.id
JOIN players p ON bv.player_id = p.id
WHERE bv.bet_amount > 0
ORDER BY bv.poll_id, bv.option_id, bv.bet_amount DESC;

-- Enable RLS on lpc_bucks_balances
ALTER TABLE lpc_bucks_balances ENABLE ROW LEVEL SECURITY;

-- Create policies for lpc_bucks_balances
CREATE POLICY "Allow public read access to balances" ON lpc_bucks_balances FOR SELECT USING (true);
CREATE POLICY "Allow authenticated update balances" ON lpc_bucks_balances
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated insert balances" ON lpc_bucks_balances
  FOR INSERT TO authenticated WITH CHECK (true);
