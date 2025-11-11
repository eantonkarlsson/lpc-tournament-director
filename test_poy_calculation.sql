-- Test POY calculation with your parameters (addons removed from formula)
-- rank: 8, expected points: 85.8, players: 15, buy-in: 150, rebuys: 1, prize_money: 24*150 = 3600

SELECT calculate_poy_points(
    15,    -- total_players
    8,     -- player_rank
    150,   -- buy_in
    1,     -- rebuys
    3600   -- prize_money (24 * 150)
) as calculated_points;

-- Expected: 85.8 (should now match sthlm-poker calculation)
