-- Fix available balance calculation to exclude resolved polls
-- Only count active bets (from polls that are not resolved)

CREATE OR REPLACE VIEW player_betting_stats AS
SELECT
  lbb.player_id,
  p.name as player_name,
  lbb.tournament_id,
  lbb.balance as current_balance,
  lbb.starting_balance,
  -- Only count bets from unresolved polls (where resolved_at IS NULL)
  COALESCE(SUM(CASE WHEN bp.resolved_at IS NULL THEN bv.bet_amount ELSE 0 END), 0) as total_active_bets,
  -- Available balance = current balance - bets in unresolved polls
  lbb.balance - COALESCE(SUM(CASE WHEN bp.resolved_at IS NULL THEN bv.bet_amount ELSE 0 END), 0) as available_balance,
  COUNT(bv.id) as total_votes
FROM lpc_bucks_balances lbb
JOIN players p ON lbb.player_id = p.id
LEFT JOIN betting_votes bv ON p.id = bv.player_id
LEFT JOIN betting_polls bp ON bv.poll_id = bp.id AND bp.tournament_id = lbb.tournament_id
GROUP BY lbb.player_id, p.name, lbb.tournament_id, lbb.balance, lbb.starting_balance;
