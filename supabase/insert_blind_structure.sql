-- Insert blind structure for tournament
-- Replace {TOURNAMENT_ID} with the actual tournament UUID

-- Clear existing blind structure for this tournament (optional)
-- DELETE FROM blind_structures WHERE tournament_id = '{TOURNAMENT_ID}';

INSERT INTO blind_structures (tournament_id, level, small_blind, big_blind, ante, duration)
VALUES
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 1, 75, 150, 0, 1380),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 2, 100, 200, 0, 1380),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 3, 150, 300, 0, 1380),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 4, 200, 400, 0, 1380),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 5, 300, 600, 0, 1380),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 6, 400, 800, 0, 1380),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 7, 500, 1000, 0, 1380),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 8, 700, 1400, 0, 1380),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 9, 1000, 2000, 0, 1380),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 10, 1500, 3000, 0, 1380),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 11, 2000, 4000, 0, 1380),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 12, 3000, 6000, 0, 1380),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 13, 4000, 8000, 0, 1380),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 14, 6000, 12000, 0, 1200),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 15, 8000, 16000, 0, 1200),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 16, 10000, 20000, 0, 1200),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 17, 15000, 30000, 0, 900),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 18, 20000, 40000, 0, 900),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 19, 30000, 60000, 0, 900),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 20, 40000, 80000, 0, 900),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 21, 50000, 100000, 0, 900),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 22, 60000, 120000, 0, 900),
  ('95c6fd8a-fba5-4ec2-babc-8ad055631e60', 23, 75000, 150000, 0, 900)
ON CONFLICT (tournament_id, level) DO UPDATE SET
  small_blind = EXCLUDED.small_blind,
  big_blind = EXCLUDED.big_blind,
  ante = EXCLUDED.ante,
  duration = EXCLUDED.duration;
