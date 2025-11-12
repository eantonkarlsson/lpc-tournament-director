-- Add break_duration column to blind_structures table
-- break_duration indicates the break duration (in seconds) AFTER this level
-- A value of 0 or NULL means no break after this level

ALTER TABLE blind_structures
ADD COLUMN IF NOT EXISTS break_duration INTEGER DEFAULT 0;

-- Example: Add 10-minute break after level 4
-- UPDATE blind_structures
-- SET break_duration = 600
-- WHERE tournament_id = 'your-tournament-id' AND level = 4;

-- Verify the column was added
SELECT
  level,
  small_blind,
  big_blind,
  duration,
  break_duration
FROM blind_structures
ORDER BY level
LIMIT 10;
