-- Insert correct payout structure for tournament
-- Standard: 8 places (32%, 18%, 12.5%, 10.5%, 8.3%, 7.3%, 6.2%, 5.2%)
-- Premium: 5 places (37%, 25%, 15%, 12%, 11%)

-- Replace 'your-tournament-id' with actual tournament ID
-- Get the tournament ID by running: SELECT id, name FROM tournaments;

-- First, clear existing payout structures for this tournament
DELETE FROM payout_structures WHERE tournament_id = 'your-tournament-id';

-- Insert payout percentages
INSERT INTO payout_structures (tournament_id, placement, percentage, percentage_premium)
VALUES
  ('your-tournament-id', 1, 32.00, 37.00),
  ('your-tournament-id', 2, 18.00, 25.00),
  ('your-tournament-id', 3, 12.50, 15.00),
  ('your-tournament-id', 4, 10.50, 12.00),
  ('your-tournament-id', 5, 8.30, 11.00),
  ('your-tournament-id', 6, 7.30, NULL),
  ('your-tournament-id', 7, 6.20, NULL),
  ('your-tournament-id', 8, 5.20, NULL);

-- Verify the inserted percentages
SELECT
  placement,
  percentage as standard_percentage,
  percentage_premium as premium_percentage
FROM payout_structures
WHERE tournament_id = 'your-tournament-id'
ORDER BY placement;
