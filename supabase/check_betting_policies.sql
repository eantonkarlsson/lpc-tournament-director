-- Check existing RLS policies for betting tables
-- Run this to see what policies are currently active

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('betting_polls', 'betting_options', 'betting_votes')
ORDER BY tablename, policyname;
