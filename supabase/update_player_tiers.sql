-- Update buy_in_amount and selected_buyin_tier for all players
-- Premium players: 300 buy-in, tier B (21 players)
-- Standard players: 150 buy-in, tier A (17 players)

UPDATE registrations r
SET
    buy_in_amount = CASE
        WHEN p.full_name IN (
            'Shervin Shoravi',
            'Anders Kjerrgren ',
            'Dennis Engström',
            'Markus Jouko Ilmari Mäkelä',
            'Trotte Boman',
            'Felix Liu',
            'Elias Mahjoub',
            'Robert Forslund',
            'Martin Ståhl',
            'Olof Johansson',
            'Ask Ellingsen',
            'Max Larsson',
            'Christian Karlsson',
            'Eric Brolin',
            'Fredrik marcusson',
            'Carl Säflund ',
            'Gabriel Forsberg'
        ) THEN 300
        WHEN p.full_name IN (
            'Einar Lennelöv',
            'Andreas Furth',
            'Anton Karlsson',
            'Linn Odelius',
            'William Espander',
            'Mariam Bashir',
            'Anton Finnson',
            'Linus Shoravi',
            'Leo Lindén',
            'Klas Erninger',
            'Kaj Jonsson',
            'Evan Alsaleem',
            'Tesfu Woldai',
            'Sofia Swedberg',
            'Nils Pallarés',
            'Nora Odelius',
            'Anna Karlhede',
            'Assar Klingström ',
            'Alexander Gratner',
            'Sigge Ahlqvist ',
            'Magnus Lindblom '
        ) THEN 150
        ELSE r.buy_in_amount
    END,
    selected_buyin_tier = CASE
        WHEN p.full_name IN (
            'Shervin Shoravi',
            'Anders Kjerrgren ',
            'Dennis Engström',
            'Markus Jouko Ilmari Mäkelä',
            'Trotte Boman',
            'Felix Liu',
            'Elias Mahjoub',
            'Robert Forslund',
            'Martin Ståhl',
            'Olof Johansson',
            'Ask Ellingsen',
            'Max Larsson',
            'Christian Karlsson',
            'Eric Brolin',
            'Fredrik marcusson',
            'Carl Säflund ',
            'Gabriel Forsberg'
        ) THEN 'B'
        WHEN p.full_name IN (
            'Einar Lennelöv',
            'Andreas Furth',
            'Anton Karlsson',
            'Linn Odelius',
            'William Espander',
            'Mariam Bashir',
            'Anton Finnson',
            'Linus Shoravi',
            'Leo Lindén',
            'Klas Erninger',
            'Kaj Jonsson',
            'Evan Alsaleem',
            'Tesfu Woldai',
            'Sofia Swedberg',
            'Nils Pallarés',
            'Nora Odelius',
            'Anna Karlhede',
            'Assar Klingström ',
            'Alexander Gratner',
            'Sigge Ahlqvist ',
            'Magnus Lindblom '
        ) THEN 'A'
        ELSE r.selected_buyin_tier
    END
FROM players p
WHERE r.player_id = p.id;

-- Verify the update
SELECT
    p.full_name,
    r.buy_in_amount,
    r.selected_buyin_tier,
    CASE
        WHEN r.selected_buyin_tier = 'A' THEN 'Standard'
        WHEN r.selected_buyin_tier = 'B' THEN 'Premium'
        ELSE 'Not Set'
    END as tier_name
FROM registrations r
JOIN players p ON r.player_id = p.id
WHERE r.is_confirmed = true
ORDER BY r.buy_in_amount DESC, p.full_name;
