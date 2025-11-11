-- Fix POY calculation for active tournaments
-- This recreates the view to handle active vs finished tournaments correctly

DROP VIEW IF EXISTS poy_tournament_points;

CREATE OR REPLACE VIEW poy_tournament_points AS
WITH tournament_stats AS (
    -- Get both completed player count and total registrations for each tournament
    SELECT
        t.id as tournament_id,
        COUNT(DISTINCT tr.id) as players_with_results,
        COUNT(DISTINCT r.id) FILTER (WHERE r.is_confirmed = true) as total_registrations
    FROM tournaments t
    LEFT JOIN tournament_results tr ON tr.tournament_id = t.id
    LEFT JOIN registrations r ON r.tournament_id = t.id
    GROUP BY t.id
),
tournament_player_counts AS (
    -- For active tournaments (not all players have results): use total registrations
    -- For finished tournaments (all players have results): use players_with_results
    -- Heuristic: if players_with_results >= total_registrations * 0.8, consider it finished
    SELECT
        tournament_id,
        CASE
            WHEN players_with_results >= total_registrations * 0.8 THEN players_with_results
            ELSE total_registrations
        END as total_players
    FROM tournament_stats
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
        ) as points,
        -- Get payout amount for this placement (use premium if player selected tier B)
        CASE
            WHEN reg.selected_buyin_tier = 'B' THEN ps.amount_premium
            ELSE ps.amount
        END as earnings
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    JOIN players p ON tr.player_id = p.id
    JOIN tournament_player_counts tpc ON tr.tournament_id = tpc.tournament_id
    LEFT JOIN tournament_prize_pools tpp ON tpp.tournament_id = tr.tournament_id
    -- Join with registrations using proper foreign key
    LEFT JOIN registrations reg ON reg.tournament_id = tr.tournament_id
        AND reg.player_id = tr.player_id
    LEFT JOIN payout_structures ps ON ps.tournament_id = tr.tournament_id
        AND ps.placement = tr.placement
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
    ROUND(points, 2) as points,
    earnings
FROM player_points
ORDER BY tournament_id, placement;
