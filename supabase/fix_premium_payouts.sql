-- Fix premium payouts to have NULL for places 6-8
-- First, find your tournament ID

-- Step 1: Get tournament ID
SELECT id, name, created_at FROM tournaments ORDER BY created_at DESC LIMIT 5;

-- Step 2: Copy the tournament ID and replace it below
-- Then run the UPDATE statements

-- Set tournament ID here:
-- Replace this with your actual tournament ID from the SELECT above
DO $$
DECLARE
    tournament_id_var UUID := 'your-tournament-id-here'; -- REPLACE THIS
BEGIN
    -- Update places 6-8 to have NULL premium percentage
    UPDATE payout_structures
    SET percentage_premium = NULL
    WHERE tournament_id = tournament_id_var
      AND placement IN (6, 7, 8);

    RAISE NOTICE 'Updated % rows', (SELECT COUNT(*) FROM payout_structures WHERE tournament_id = tournament_id_var AND placement IN (6, 7, 8));
END $$;

-- Verify the fix
SELECT
  placement,
  percentage as standard_percentage,
  percentage_premium as premium_percentage
FROM payout_structures
WHERE tournament_id = 'your-tournament-id-here' -- REPLACE THIS
ORDER BY placement;
