-- Update payout_structures table to store percentages instead of fixed amounts
-- This allows dynamic calculation based on actual prize pool

-- Drop dependent views first
DROP VIEW IF EXISTS poy_rankings CASCADE;
DROP VIEW IF EXISTS poy_tournament_points CASCADE;

-- Drop the old columns and add new percentage columns
ALTER TABLE payout_structures DROP COLUMN IF EXISTS amount;
ALTER TABLE payout_structures DROP COLUMN IF EXISTS amount_premium;
ALTER TABLE payout_structures ADD COLUMN IF NOT EXISTS percentage DECIMAL(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE payout_structures ADD COLUMN IF NOT EXISTS percentage_premium DECIMAL(5, 2);

-- Recreate the poy_tournament_points view (it no longer needs the earnings/amount columns)
CREATE OR REPLACE VIEW poy_tournament_points AS
WITH tournament_player_counts AS (
    -- For active tournaments: use total confirmed registrations
    -- For finished tournaments: use players with results (actual player count)
    SELECT
        t.id as tournament_id,
        CASE
            WHEN t.active = true THEN (
                SELECT COUNT(*) FROM registrations r
                WHERE r.tournament_id = t.id AND r.is_confirmed = true
            )
            ELSE (
                SELECT COUNT(*) FROM tournament_results tr
                WHERE tr.tournament_id = t.id
            )
        END as total_players
    FROM tournaments t
),
tournament_prize_pools AS (
    -- Calculate total prize pool from confirmed registrations including current rebuys (excludes addons)
    SELECT
        tournament_id,
        SUM(buy_in_amount + (number_of_rebuys * buy_in_amount)) as total_prize_pool
    FROM registrations
    WHERE is_confirmed = true
    GROUP BY tournament_id
),
player_points AS (
    SELECT
        tr.player_id,
        p.name as player_name,
        tr.tournament_id,
        tr.placement,
        -- Get the player's actual buy-in from their registration
        reg.buy_in_amount as player_buy_in,
        tr.number_of_rebuys,
        tr.number_of_addons,
        -- Get total players from the CTE
        tpc.total_players,
        -- Use actual prize pool from all registrations
        tpp.total_prize_pool as prize_money,
        -- Calculate points using the function (addons excluded)
        calculate_poy_points(
            tpc.total_players,
            tr.placement,
            reg.buy_in_amount,
            tr.number_of_rebuys,
            tpp.total_prize_pool
        ) as points
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    JOIN players p ON tr.player_id = p.id
    JOIN tournament_player_counts tpc ON tr.tournament_id = tpc.tournament_id
    LEFT JOIN tournament_prize_pools tpp ON tpp.tournament_id = tr.tournament_id
    -- Join with registrations using proper foreign key
    LEFT JOIN registrations reg ON reg.tournament_id = tr.tournament_id
        AND reg.player_id = tr.player_id
)
SELECT
    player_id,
    player_name,
    tournament_id,
    placement,
    player_buy_in,
    number_of_rebuys,
    total_players,
    prize_money,
    ROUND(points, 2) as points
FROM player_points
ORDER BY tournament_id, placement;

-- Now insert the standard payout percentages for a tournament
-- Replace 'your-tournament-id' with actual tournament ID

DELETE FROM payout_structures WHERE tournament_id = 'your-tournament-id';

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
