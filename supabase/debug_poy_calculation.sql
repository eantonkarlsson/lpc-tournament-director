-- Debug POY calculation for a specific player
-- Check what values are being used in the calculation

WITH tournament_player_counts AS (
    SELECT
        tournament_id,
        COUNT(*) as total_players
    FROM tournament_results
    GROUP BY tournament_id
),
tournament_prize_pools AS (
    SELECT
        tr.tournament_id,
        SUM(reg.buy_in_amount + (reg.number_of_rebuys * reg.buy_in_amount)) as total_prize_pool
    FROM tournament_results tr
    JOIN registrations reg ON reg.tournament_id = tr.tournament_id AND reg.player_id = tr.player_id
    WHERE reg.is_confirmed = true
    GROUP BY tr.tournament_id
)
SELECT
    tr.tournament_id,
    p.name as player_name,
    tr.placement,
    reg.buy_in_amount as player_buy_in,
    tr.number_of_rebuys,
    tpc.total_players,
    tpp.total_prize_pool,
    -- Show the calculation breakdown
    SQRT(tpc.total_players::numeric / tr.placement::numeric) as sqrt_part,
    LN(tpp.total_prize_pool / tpc.total_players + 0.25) as log_prize,
    LN(reg.buy_in_amount + (tr.number_of_rebuys * reg.buy_in_amount) + 0.25) as log_buy_in,
    -- Final points
    calculate_poy_points(
        tpc.total_players,
        tr.placement,
        reg.buy_in_amount,
        tr.number_of_rebuys,
        tpp.total_prize_pool
    ) as calculated_points
FROM tournament_results tr
JOIN tournaments t ON tr.tournament_id = t.id
JOIN players p ON tr.player_id = p.id
JOIN tournament_player_counts tpc ON tr.tournament_id = tpc.tournament_id
LEFT JOIN tournament_prize_pools tpp ON tpp.tournament_id = tr.tournament_id
LEFT JOIN registrations reg ON reg.tournament_id = tr.tournament_id AND reg.player_id = tr.player_id
WHERE tr.placement = 36  -- The player you just eliminated
ORDER BY tr.created_at DESC
LIMIT 5;

-- Also check: total registrations vs players with results
SELECT
    t.id as tournament_id,
    t.title,
    COUNT(DISTINCT r.id) FILTER (WHERE r.is_confirmed = true) as confirmed_registrations,
    COUNT(DISTINCT tr.id) as players_with_results
FROM tournaments t
LEFT JOIN registrations r ON r.tournament_id = t.id
LEFT JOIN tournament_results tr ON tr.tournament_id = t.id
GROUP BY t.id, t.title
ORDER BY t.date DESC
LIMIT 1;
