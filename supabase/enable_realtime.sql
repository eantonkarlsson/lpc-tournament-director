-- Ensure Realtime is enabled for all relevant tables
-- Run this if realtime subscriptions are not working

-- First, check if tables are in the publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- Add tables to realtime publication (will error if already added, that's ok)
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE blind_structures;
ALTER PUBLICATION supabase_realtime ADD TABLE payout_structures;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_results;

-- Verify they were added
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
