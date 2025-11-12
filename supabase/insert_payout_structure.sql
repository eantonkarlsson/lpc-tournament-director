-- Insert payout structure for a tournament
-- Replace 'your-tournament-id' with the actual tournament ID

-- First, clear existing payout structures for this tournament (if any)
DELETE FROM payout_structures WHERE tournament_id = '95c6fd8a-fba5-4ec2-babc-8ad055631e60';

-- Get the tournament's buy-in amount to calculate payouts
-- Assuming buy-in is stored in tournaments table or we'll calculate from registrations

WITH tournament_info AS (
  -- Calculate total prize pool from confirmed registrations
  SELECT
    tournament_id,
    SUM(buy_in_amount + (number_of_rebuys * buy_in_amount)) as total_prize_pool
  FROM registrations
  WHERE tournament_id = '95c6fd8a-fba5-4ec2-babc-8ad055631e60'
    AND is_confirmed = true
  GROUP BY tournament_id
)
INSERT INTO payout_structures (tournament_id, placement, amount, amount_premium)
SELECT
  '95c6fd8a-fba5-4ec2-babc-8ad055631e60',
  placement,
  ROUND((total_prize_pool * percentage / 100.0)::numeric, 2) as amount,
  ROUND((total_prize_pool * percentage_premium / 100.0)::numeric, 2) as amount_premium
FROM tournament_info,
LATERAL (VALUES
  (1, 32.00, 37.00),
  (2, 18.00, 25.00),
  (3, 12.50, 15.00),
  (4, 10.50, 12.00),
  (5, 8.30, 11.00),
  (6, 7.30, NULL),
  (7, 6.20, NULL),
  (8, 5.20, NULL)
) AS payouts(placement, percentage, percentage_premium);

-- Verify the inserted payouts
SELECT
  placement,
  amount as standard_payout,
  amount_premium as premium_payout
FROM payout_structures
WHERE tournament_id = 'your-tournament-id'
ORDER BY placement;
