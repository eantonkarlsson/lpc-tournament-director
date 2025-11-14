-- Add poll resolution system
-- Allows marking a winning option and distributing LPC Bucks to winners

-- Add winning_option_id to betting_polls
ALTER TABLE betting_polls ADD COLUMN IF NOT EXISTS winning_option_id UUID REFERENCES betting_options(id) ON DELETE SET NULL;
ALTER TABLE betting_polls ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Add winnings column to betting_votes to track what each player won
ALTER TABLE betting_votes ADD COLUMN IF NOT EXISTS winnings INTEGER DEFAULT 0;

-- Function to resolve a poll and distribute winnings
CREATE OR REPLACE FUNCTION resolve_poll(p_poll_id TEXT, p_winning_option_id UUID)
RETURNS TABLE (
  player_id UUID,
  player_name TEXT,
  bet_amount INTEGER,
  winnings INTEGER
) AS $$
DECLARE
  total_losing_bets INTEGER;
  total_winning_bets INTEGER;
  poll_tournament_id UUID;
BEGIN
  -- Get tournament_id from poll
  SELECT tournament_id INTO poll_tournament_id
  FROM betting_polls
  WHERE id = p_poll_id;

  -- Calculate total bets on losing options
  SELECT COALESCE(SUM(bv.bet_amount), 0) INTO total_losing_bets
  FROM betting_votes bv
  WHERE bv.poll_id = p_poll_id
    AND bv.option_id != p_winning_option_id;

  -- Calculate total bets on winning option
  SELECT COALESCE(SUM(bv.bet_amount), 0) INTO total_winning_bets
  FROM betting_votes bv
  WHERE bv.poll_id = p_poll_id
    AND bv.option_id = p_winning_option_id;

  -- If no winning bets, just mark as resolved and return empty
  IF total_winning_bets = 0 THEN
    UPDATE betting_polls
    SET winning_option_id = p_winning_option_id,
        resolved_at = now(),
        is_active = false
    WHERE id = p_poll_id;

    RETURN;
  END IF;

  -- Update each winning vote with their winnings
  -- Winners get their bet back + proportional share of losing pot
  UPDATE betting_votes bv
  SET winnings = CASE
    WHEN bv.option_id = p_winning_option_id THEN
      -- Get bet back + proportional share of losing bets
      bv.bet_amount + FLOOR((bv.bet_amount::NUMERIC / total_winning_bets::NUMERIC) * total_losing_bets)
    ELSE
      0
  END
  WHERE bv.poll_id = p_poll_id;

  -- Update player balances
  -- Add winnings to each player's balance
  UPDATE lpc_bucks_balances lbb
  SET balance = balance + COALESCE(
    (SELECT SUM(bv.winnings)
     FROM betting_votes bv
     WHERE bv.player_id = lbb.player_id
       AND bv.poll_id = p_poll_id),
    0
  ),
  updated_at = now()
  WHERE lbb.tournament_id = poll_tournament_id
    AND EXISTS (
      SELECT 1 FROM betting_votes bv
      WHERE bv.player_id = lbb.player_id
        AND bv.poll_id = p_poll_id
        AND bv.winnings > 0
    );

  -- Mark poll as resolved
  UPDATE betting_polls
  SET winning_option_id = p_winning_option_id,
      resolved_at = now(),
      is_active = false
  WHERE id = p_poll_id;

  -- Return winners list
  RETURN QUERY
  SELECT
    bv.player_id,
    p.name as player_name,
    bv.bet_amount,
    bv.winnings
  FROM betting_votes bv
  JOIN players p ON bv.player_id = p.id
  WHERE bv.poll_id = p_poll_id
    AND bv.option_id = p_winning_option_id
  ORDER BY bv.winnings DESC;
END;
$$ LANGUAGE plpgsql;

-- View for poll results with winnings
CREATE OR REPLACE VIEW poll_results AS
SELECT
  bp.id as poll_id,
  bp.title as poll_title,
  bp.tournament_id,
  bp.is_active,
  bp.winning_option_id,
  bp.resolved_at,
  bo.id as option_id,
  bo.option_text,
  COUNT(bv.id) as vote_count,
  COALESCE(SUM(bv.bet_amount), 0) as total_bet_amount,
  CASE WHEN bo.id = bp.winning_option_id THEN true ELSE false END as is_winning_option
FROM betting_polls bp
JOIN betting_options bo ON bp.id = bo.poll_id
LEFT JOIN betting_votes bv ON bo.id = bv.option_id
GROUP BY bp.id, bp.title, bp.tournament_id, bp.is_active, bp.winning_option_id, bp.resolved_at, bo.id, bo.option_text, bo.display_order
ORDER BY bp.created_at DESC, bo.display_order;

-- View for player vote history with results
CREATE OR REPLACE VIEW player_vote_history AS
SELECT
  bv.id as vote_id,
  bv.player_id,
  p.name as player_name,
  bp.id as poll_id,
  bp.title as poll_title,
  bp.tournament_id,
  bp.is_active as poll_is_active,
  bp.winning_option_id,
  bp.resolved_at,
  bo.option_text as voted_option,
  bv.option_id,
  bv.bet_amount,
  bv.winnings,
  bv.created_at as voted_at,
  CASE
    WHEN bp.winning_option_id IS NULL THEN 'pending'
    WHEN bv.option_id = bp.winning_option_id THEN 'won'
    ELSE 'lost'
  END as result
FROM betting_votes bv
JOIN players p ON bv.player_id = p.id
JOIN betting_polls bp ON bv.poll_id = bp.id
JOIN betting_options bo ON bv.option_id = bo.id
ORDER BY bv.created_at DESC;

-- Grant access to views
ALTER VIEW poll_results OWNER TO postgres;
ALTER VIEW player_vote_history OWNER TO postgres;
