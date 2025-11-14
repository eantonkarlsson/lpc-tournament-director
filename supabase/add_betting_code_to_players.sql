-- Add betting_code column to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS betting_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_players_betting_code ON players(betting_code);

-- Function to generate memorable betting code (adjective-noun format)
CREATE OR REPLACE FUNCTION generate_betting_code()
RETURNS TRIGGER AS $$
DECLARE
  adjectives TEXT[] := ARRAY[
    'red', 'blue', 'wild', 'bold', 'cool', 'fast', 'slow', 'hot', 'cold', 'dark',
    'deep', 'high', 'low', 'big', 'tiny', 'mega', 'mini', 'rare', 'epic', 'neat',
    'wise', 'smart', 'brave', 'calm', 'swift', 'stark', 'crisp', 'sharp', 'solid', 'prime',
    'keen', 'slick', 'quick', 'noble', 'royal', 'vital', 'fresh', 'clean', 'clear', 'bright',
    'sunny', 'happy', 'lucky', 'magic', 'super', 'ultra', 'hyper', 'turbo', 'neon', 'pixel'
  ];
  nouns TEXT[] := ARRAY[
    'bear', 'lion', 'wolf', 'hawk', 'crow', 'owl', 'fox', 'lynx', 'puma', 'deer',
    'star', 'moon', 'fire', 'wind', 'wave', 'rock', 'tree', 'leaf', 'rain', 'snow',
    'king', 'ace', 'gem', 'coin', 'chip', 'card', 'dice', 'pawn', 'rook', 'sage',
    'peak', 'dawn', 'dusk', 'tide', 'fern', 'sage', 'pine', 'oak', 'ash', 'elm',
    'bolt', 'spark', 'flash', 'glow', 'beam', 'ray', 'echo', 'pulse', 'nova', 'quasar'
  ];
  new_code TEXT;
  max_attempts INT := 100;
  attempt INT := 0;
BEGIN
  IF NEW.betting_code IS NULL THEN
    LOOP
      -- Generate random adjective-noun combination
      new_code := adjectives[1 + floor(random() * array_length(adjectives, 1))] ||
                  '-' ||
                  nouns[1 + floor(random() * array_length(nouns, 1))];

      -- Check if code already exists
      IF NOT EXISTS (SELECT 1 FROM players WHERE betting_code = new_code) THEN
        NEW.betting_code := new_code;
        EXIT;
      END IF;

      attempt := attempt + 1;
      IF attempt >= max_attempts THEN
        -- Fallback to random code if we can't find a unique combination
        new_code := adjectives[1 + floor(random() * array_length(adjectives, 1))] ||
                    '-' ||
                    nouns[1 + floor(random() * array_length(nouns, 1))] ||
                    floor(random() * 100)::text;
        NEW.betting_code := new_code;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate betting code
DROP TRIGGER IF EXISTS trigger_generate_betting_code ON players;
CREATE TRIGGER trigger_generate_betting_code
  BEFORE INSERT ON players
  FOR EACH ROW
  EXECUTE FUNCTION generate_betting_code();

-- Generate betting codes for existing players without codes
DO $$
DECLARE
  player_record RECORD;
  adjectives TEXT[] := ARRAY[
    'red', 'blue', 'wild', 'bold', 'cool', 'fast', 'slow', 'hot', 'cold', 'dark',
    'deep', 'high', 'low', 'big', 'tiny', 'mega', 'mini', 'rare', 'epic', 'neat',
    'wise', 'smart', 'brave', 'calm', 'swift', 'stark', 'crisp', 'sharp', 'solid', 'prime',
    'keen', 'slick', 'quick', 'noble', 'royal', 'vital', 'fresh', 'clean', 'clear', 'bright',
    'sunny', 'happy', 'lucky', 'magic', 'super', 'ultra', 'hyper', 'turbo', 'neon', 'pixel'
  ];
  nouns TEXT[] := ARRAY[
    'bear', 'lion', 'wolf', 'hawk', 'crow', 'owl', 'fox', 'lynx', 'puma', 'deer',
    'star', 'moon', 'fire', 'wind', 'wave', 'rock', 'tree', 'leaf', 'rain', 'snow',
    'king', 'ace', 'gem', 'coin', 'chip', 'card', 'dice', 'pawn', 'rook', 'sage',
    'peak', 'dawn', 'dusk', 'tide', 'fern', 'sage', 'pine', 'oak', 'ash', 'elm',
    'bolt', 'spark', 'flash', 'glow', 'beam', 'ray', 'echo', 'pulse', 'nova', 'quasar'
  ];
  new_code TEXT;
  max_attempts INT := 100;
  attempt INT;
BEGIN
  FOR player_record IN
    SELECT id FROM players WHERE betting_code IS NULL
  LOOP
    attempt := 0;
    LOOP
      -- Generate random adjective-noun combination
      new_code := adjectives[1 + floor(random() * array_length(adjectives, 1))] ||
                  '-' ||
                  nouns[1 + floor(random() * array_length(nouns, 1))];

      -- Check if code already exists
      IF NOT EXISTS (SELECT 1 FROM players WHERE betting_code = new_code) THEN
        UPDATE players SET betting_code = new_code WHERE id = player_record.id;
        EXIT;
      END IF;

      attempt := attempt + 1;
      IF attempt >= max_attempts THEN
        -- Fallback to random code with number suffix
        new_code := adjectives[1 + floor(random() * array_length(adjectives, 1))] ||
                    '-' ||
                    nouns[1 + floor(random() * array_length(nouns, 1))] ||
                    floor(random() * 100)::text;
        UPDATE players SET betting_code = new_code WHERE id = player_record.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END $$;
