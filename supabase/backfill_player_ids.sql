-- Backfill player_id in registrations table
-- This script matches registrations to players by name and updates the player_id foreign key

-- Step 1: Show what will be updated (preview)
-- Uncomment to preview before running the update:
/*
SELECT
    r.id as registration_id,
    r.full_name,
    r.player_id as current_player_id,
    p.id as matched_player_id,
    p.name as matched_player_name
FROM registrations r
LEFT JOIN players p ON LOWER(TRIM(r.full_name)) = LOWER(TRIM(p.name))
WHERE r.player_id IS NULL
ORDER BY r.created_at DESC;
*/

-- Step 2: Update registrations with matching player_id
UPDATE registrations r
SET player_id = p.id
FROM players p
WHERE LOWER(TRIM(r.full_name)) = LOWER(TRIM(p.name))
  AND r.player_id IS NULL;

-- Step 3: Show results
SELECT
    COUNT(*) FILTER (WHERE player_id IS NOT NULL) as matched_registrations,
    COUNT(*) FILTER (WHERE player_id IS NULL) as unmatched_registrations,
    COUNT(*) as total_registrations
FROM registrations;

-- Step 4: Show unmatched registrations (these need manual attention)
SELECT
    id,
    full_name,
    tournament_id,
    created_at
FROM registrations
WHERE player_id IS NULL
ORDER BY created_at DESC;

-- Optional Step 5: Create missing players for unmatched registrations
-- Uncomment if you want to automatically create player records for unmatched registrations:
/*
INSERT INTO players (name, phone_number)
SELECT DISTINCT
    r.full_name,
    r.phone_number
FROM registrations r
WHERE r.player_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM players p
    WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(r.full_name))
  )
ON CONFLICT (name) DO NOTHING;

-- Then run the update again to link them:
UPDATE registrations r
SET player_id = p.id
FROM players p
WHERE LOWER(TRIM(r.full_name)) = LOWER(TRIM(p.name))
  AND r.player_id IS NULL;
*/
