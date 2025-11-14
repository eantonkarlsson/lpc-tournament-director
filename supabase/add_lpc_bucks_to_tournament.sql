-- Add 1000 LPC Bucks to all players registered in tournament 95c6fd8a-fba5-4ec2-babc-8ad055631e60

-- Insert LPC Bucks balances for all registered players in the tournament
INSERT INTO lpc_bucks_balances (player_id, tournament_id, balance, starting_balance)
SELECT
  r.player_id,
  '95c6fd8a-fba5-4ec2-babc-8ad055631e60'::UUID,
  1000,
  1000
FROM registrations r
WHERE r.tournament_id = '95c6fd8a-fba5-4ec2-babc-8ad055631e60'
ON CONFLICT (player_id, tournament_id)
DO UPDATE SET
  balance = 1000,
  starting_balance = 1000,
  created_at = now(),
  updated_at = now();
