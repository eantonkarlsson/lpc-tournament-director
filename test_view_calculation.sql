-- Test what the view would calculate for your scenario
-- Expected: 85.8 points

-- First, let's see what parameters the view would pass to the function
WITH test_data AS (
    SELECT
        15 as total_players,
        8 as placement,
        150 as buy_in_amount,
        1 as number_of_rebuys,
        0 as number_of_addons,
        -- Total prize pool: 24 players × 150 buy-in = 3600
        -- But with 1 rebuy total, could be different
        24 * 150 as total_prize_pool
)
SELECT
    total_players,
    placement,
    buy_in_amount,
    number_of_rebuys,
    number_of_addons,
    total_prize_pool,
    calculate_poy_points(
        total_players,
        placement,
        buy_in_amount,
        number_of_rebuys,
        number_of_addons,
        total_prize_pool
    ) as calculated_points
FROM test_data;

-- Now let's check: does "24 * 150" mean:
-- A) 24 total buy-ins (players) at 150 each = 3600
-- B) Or does it include rebuys? If 1 person did 1 rebuy: 23×150 + 1×300 = 3750

-- Test both scenarios:
SELECT '24 buy-ins only' as scenario, calculate_poy_points(15, 8, 150, 1, 0, 3600) as points
UNION ALL
SELECT '24 buy-ins with 1 rebuy included', calculate_poy_points(15, 8, 150, 1, 0, 3750);
