-- Migration to adapt existing schema for LPC Tournament Director
-- This adds only the missing tables and columns needed

-- Add foreign key to players table for proper relationship
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id) ON DELETE SET NULL;

-- Add elimination tracking columns to registrations (if not exists)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS placement INTEGER;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS eliminated_at TIMESTAMP WITH TIME ZONE;

-- Add buy-in amount to registrations for flexible buy-ins per player
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS buy_in_amount DECIMAL(10, 2);

-- Create index on player_id for better join performance
CREATE INDEX IF NOT EXISTS idx_registrations_player ON registrations(player_id);

-- Create blind_structures table (if not exists)
CREATE TABLE IF NOT EXISTS blind_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    small_blind INTEGER NOT NULL,
    big_blind INTEGER NOT NULL,
    ante INTEGER DEFAULT 0,
    duration INTEGER NOT NULL, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, level)
);

-- Create payout_structures table (if not exists)
CREATE TABLE IF NOT EXISTS payout_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    placement INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    amount_premium DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, placement)
);

-- Ensure tournament_results table exists (should already exist based on user's schema)
CREATE TABLE IF NOT EXISTS tournament_results (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    placement SMALLINT NOT NULL,
    number_of_rebuys SMALLINT DEFAULT 0,
    number_of_addons SMALLINT DEFAULT 0,
    UNIQUE(tournament_id, player_id)
);

-- Create function to calculate POY points using PokerStars reworked formula
-- Using NUMERIC instead of INTEGER/DECIMAL for better type compatibility
CREATE OR REPLACE FUNCTION calculate_poy_points(
    total_players NUMERIC,
    player_rank NUMERIC,
    buy_in NUMERIC,
    rebuys NUMERIC,
    addons NUMERIC,
    prize_money NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    sqrt_part NUMERIC;
    log_prize NUMERIC;
    log_buy_in NUMERIC;
    points NUMERIC;
BEGIN
    -- Calculate sqrt(players / rank)
    sqrt_part := SQRT(total_players / player_rank);

    -- Calculate log(prizeMoney / players + 0.25)
    log_prize := LN(prize_money / total_players + 0.25);

    -- Calculate log(buyIn + rebuys*buyIn + addons*buyIn + 0.25)
    log_buy_in := LN(buy_in + (rebuys * buy_in) + (addons * buy_in) + 0.25);

    -- Final formula: 10 * sqrt_part * (1 + log_prize)^2 / (1 + log_buy_in)
    points := 10 * sqrt_part * POWER(1 + log_prize, 2) / (1 + log_buy_in);

    RETURN ROUND(points, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for POY rankings that calculates points dynamically
CREATE OR REPLACE VIEW poy_rankings AS
WITH tournament_player_counts AS (
    -- Count total confirmed registrations per tournament
    SELECT
        tournament_id,
        COUNT(*) as total_players
    FROM registrations
    WHERE is_confirmed = true
    GROUP BY tournament_id
),
tournament_prize_pools AS (
    -- Calculate total prize pool per tournament from actual buy-ins including rebuys and addons from tournament_results
    SELECT
        tr.tournament_id,
        SUM(reg.buy_in_amount + (tr.number_of_rebuys * reg.buy_in_amount) + (tr.number_of_addons * reg.buy_in_amount)) as total_prize_pool
    FROM tournament_results tr
    JOIN registrations reg ON reg.tournament_id = tr.tournament_id AND reg.player_id = tr.player_id
    WHERE reg.is_confirmed = true
    GROUP BY tr.tournament_id
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
        -- Calculate points using the function
        calculate_poy_points(
            tpc.total_players,
            tr.placement,
            reg.buy_in_amount,
            tr.number_of_rebuys,
            tr.number_of_addons,
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
    ROUND(SUM(points), 2) as total_points,
    COUNT(DISTINCT tournament_id) as tournaments_played,
    ROUND(SUM(earnings), 2) as total_earnings
FROM player_points
GROUP BY player_id, player_name
ORDER BY total_points DESC;

-- Create indexes for better performance (if not exist)
CREATE INDEX IF NOT EXISTS idx_registrations_tournament ON registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_registrations_eliminated ON registrations(eliminated_at);
CREATE INDEX IF NOT EXISTS idx_blind_structures_tournament ON blind_structures(tournament_id);
CREATE INDEX IF NOT EXISTS idx_payout_structures_tournament ON payout_structures(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament ON tournament_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_player ON tournament_results(player_id);

-- Enable Row Level Security (if you want to add security later)
ALTER TABLE blind_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables (allowing all access for now)
DROP POLICY IF EXISTS "Enable read access for all users" ON blind_structures;
CREATE POLICY "Enable read access for all users" ON blind_structures FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON blind_structures;
CREATE POLICY "Enable insert for authenticated users only" ON blind_structures FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON blind_structures;
CREATE POLICY "Enable update for authenticated users only" ON blind_structures FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON blind_structures;
CREATE POLICY "Enable delete for authenticated users only" ON blind_structures FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON payout_structures;
CREATE POLICY "Enable read access for all users" ON payout_structures FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON payout_structures;
CREATE POLICY "Enable insert for authenticated users only" ON payout_structures FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON payout_structures;
CREATE POLICY "Enable update for authenticated users only" ON payout_structures FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON payout_structures;
CREATE POLICY "Enable delete for authenticated users only" ON payout_structures FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON tournament_results;
CREATE POLICY "Enable read access for all users" ON tournament_results FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON tournament_results;
CREATE POLICY "Enable insert for authenticated users only" ON tournament_results FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON tournament_results;
CREATE POLICY "Enable update for authenticated users only" ON tournament_results FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON tournament_results;
CREATE POLICY "Enable delete for authenticated users only" ON tournament_results FOR DELETE USING (true);

-- Enable Realtime for all relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE blind_structures;
ALTER PUBLICATION supabase_realtime ADD TABLE payout_structures;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_results;

-- Sample blind structure (optional - for testing)
-- INSERT INTO blind_structures (tournament_id, level, small_blind, big_blind, ante, duration)
-- SELECT id, 1, 25, 50, 0, 900 FROM tournaments LIMIT 1
-- ON CONFLICT DO NOTHING;

-- Sample payout structure (optional - for testing)
-- INSERT INTO payout_structures (tournament_id, placement, amount, amount_premium)
-- SELECT id, 1, 3000, 4500 FROM tournaments LIMIT 1
-- ON CONFLICT DO NOTHING;
