-- LPC Tournament Director - Supabase Schema
-- Run this SQL in your Supabase SQL Editor to create the database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    poy_points INTEGER DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
    buy_in DECIMAL(10, 2) NOT NULL,
    prize_pool DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament entries (players in tournaments)
CREATE TABLE IF NOT EXISTS tournament_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    placement INTEGER,
    eliminated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, player_id)
);

-- Blind structures
CREATE TABLE IF NOT EXISTS blind_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    small_blind INTEGER NOT NULL,
    big_blind INTEGER NOT NULL,
    ante INTEGER DEFAULT 0,
    duration INTEGER NOT NULL, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, level)
);

-- Payout structures
CREATE TABLE IF NOT EXISTS payout_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    placement INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    amount_premium DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, placement)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament ON tournament_entries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_player ON tournament_entries(player_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_eliminated ON tournament_entries(eliminated_at);
CREATE INDEX IF NOT EXISTS idx_blind_structures_tournament ON blind_structures(tournament_id);
CREATE INDEX IF NOT EXISTS idx_payout_structures_tournament ON payout_structures(tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_poy_points ON players(poy_points DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE blind_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_structures ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all operations for now - customize based on your auth needs)
-- Players policies
CREATE POLICY "Enable read access for all users" ON players FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON players FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON players FOR DELETE USING (true);

-- Tournaments policies
CREATE POLICY "Enable read access for all users" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON tournaments FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON tournaments FOR DELETE USING (true);

-- Tournament entries policies
CREATE POLICY "Enable read access for all users" ON tournament_entries FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON tournament_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON tournament_entries FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON tournament_entries FOR DELETE USING (true);

-- Blind structures policies
CREATE POLICY "Enable read access for all users" ON blind_structures FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON blind_structures FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON blind_structures FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON blind_structures FOR DELETE USING (true);

-- Payout structures policies
CREATE POLICY "Enable read access for all users" ON payout_structures FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON payout_structures FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON payout_structures FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON payout_structures FOR DELETE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_entries_updated_at BEFORE UPDATE ON tournament_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE blind_structures;
ALTER PUBLICATION supabase_realtime ADD TABLE payout_structures;

-- Sample data (optional - remove if you want to start fresh)
-- Insert sample players
INSERT INTO players (name, poy_points, total_earnings) VALUES
    ('John Smith', 150, 5000),
    ('Sarah Johnson', 120, 3500),
    ('Mike Williams', 100, 2800),
    ('Emily Brown', 90, 2200),
    ('David Davis', 80, 1800)
ON CONFLICT DO NOTHING;

-- Insert a sample tournament
INSERT INTO tournaments (id, name, date, status, buy_in, prize_pool) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Weekly Tournament', CURRENT_DATE, 'active', 100, 1000)
ON CONFLICT DO NOTHING;

-- Insert sample blind structure
INSERT INTO blind_structures (tournament_id, level, small_blind, big_blind, ante, duration) VALUES
    ('00000000-0000-0000-0000-000000000001', 1, 25, 50, 0, 900),
    ('00000000-0000-0000-0000-000000000001', 2, 50, 100, 0, 900),
    ('00000000-0000-0000-0000-000000000001', 3, 75, 150, 25, 900),
    ('00000000-0000-0000-0000-000000000001', 4, 100, 200, 25, 900),
    ('00000000-0000-0000-0000-000000000001', 5, 150, 300, 50, 900),
    ('00000000-0000-0000-0000-000000000001', 6, 200, 400, 50, 900),
    ('00000000-0000-0000-0000-000000000001', 7, 300, 600, 100, 900),
    ('00000000-0000-0000-0000-000000000001', 8, 400, 800, 100, 900)
ON CONFLICT DO NOTHING;

-- Insert sample payout structure
INSERT INTO payout_structures (tournament_id, placement, amount, amount_premium) VALUES
    ('00000000-0000-0000-0000-000000000001', 1, 500, 750),
    ('00000000-0000-0000-0000-000000000001', 2, 300, 450),
    ('00000000-0000-0000-0000-000000000001', 3, 200, 300)
ON CONFLICT DO NOTHING;
