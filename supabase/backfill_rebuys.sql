-- Backfill registrations.number_of_rebuys from tournament_results
-- This updates the registrations table with rebuy counts from tournament_results

UPDATE registrations r
SET number_of_rebuys = tr.number_of_rebuys
FROM tournament_results tr
WHERE r.tournament_id = tr.tournament_id
  AND r.player_id = tr.player_id
  AND r.number_of_rebuys IS DISTINCT FROM tr.number_of_rebuys;

-- Show what was updated
SELECT
  r.id,
  r.full_name,
  r.number_of_rebuys as current_rebuys,
  tr.number_of_rebuys as tournament_result_rebuys
FROM registrations r
JOIN tournament_results tr ON r.tournament_id = tr.tournament_id AND r.player_id = tr.player_id;
