-- Fix the validate_bet_amount trigger to resolve ambiguous column reference

CREATE OR REPLACE FUNCTION validate_bet_amount()
RETURNS TRIGGER AS $$
DECLARE
  player_balance INTEGER;
  poll_tournament_id UUID;
  player_total_bets INTEGER;
  available_balance INTEGER;
BEGIN
  -- Get tournament_id from the poll
  SELECT bp.tournament_id INTO poll_tournament_id
  FROM betting_polls bp
  WHERE bp.id = NEW.poll_id;

  -- Get or create player's balance for this tournament
  player_balance := get_or_create_balance(NEW.player_id, poll_tournament_id);

  -- Get player's total active bets in this tournament (excluding this poll if updating)
  SELECT COALESCE(SUM(bv.bet_amount), 0) INTO player_total_bets
  FROM betting_votes bv
  JOIN betting_polls bp ON bv.poll_id = bp.id
  WHERE bv.player_id = NEW.player_id
    AND bp.tournament_id = poll_tournament_id
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
