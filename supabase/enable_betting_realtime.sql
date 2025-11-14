-- Enable Realtime for betting tables
-- This allows the display page to receive real-time updates when votes are placed

-- Add betting tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE betting_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE betting_options;
ALTER PUBLICATION supabase_realtime ADD TABLE betting_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE lpc_bucks_balances;

-- Verify they were added
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('betting_polls', 'betting_options', 'betting_votes', 'lpc_bucks_balances')
ORDER BY tablename;
