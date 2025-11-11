-- Check player counts per tournament: registrations vs tournament_results

SELECT
    t.id as tournament_id,
    t.title as tournament_name,
    t.date,
    COUNT(DISTINCT r.id) as registered_players,
    COUNT(DISTINCT r.id) FILTER (WHERE r.is_confirmed = true) as confirmed_registrations,
    COUNT(DISTINCT tr.id) as players_with_results,
    COUNT(DISTINCT r.id) FILTER (WHERE r.is_confirmed = true) - COUNT(DISTINCT tr.id) as no_shows
FROM tournaments t
LEFT JOIN registrations r ON r.tournament_id = t.id
LEFT JOIN tournament_results tr ON tr.tournament_id = t.id
GROUP BY t.id, t.title, t.date
ORDER BY t.date DESC;
