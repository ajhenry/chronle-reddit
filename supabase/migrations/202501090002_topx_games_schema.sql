-- Create topx_games table
CREATE TABLE IF NOT EXISTS topx_games (
  id TEXT DEFAULT generate_ksuid() PRIMARY KEY,
  prompt TEXT NOT NULL,
  suggestions TEXT[] NOT NULL, -- Array of search suggestions
  category TEXT NOT NULL,
  count INTEGER NOT NULL, -- Number of correct answers (e.g., "top 3", "top 5")
  solution TEXT[] NOT NULL, -- Array of correct answers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_topx_games_category ON topx_games(category);
CREATE INDEX IF NOT EXISTS idx_topx_games_created_at ON topx_games(created_at);

-- Add updated_at trigger for topx_games
CREATE TRIGGER update_topx_games_updated_at BEFORE UPDATE ON topx_games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert seed data from the existing hardcoded games
INSERT INTO topx_games (id, prompt, suggestions, category, count, solution) VALUES
(
  'game_001',
  'Name the top 3 states that eat the most peanut butter',
  ARRAY[
    'Georgia', 'Alabama', 'North Carolina', 'Texas', 'California', 'Florida',
    'New York', 'Pennsylvania', 'Illinois', 'Ohio', 'Virginia', 'Tennessee',
    'Louisiana', 'Mississippi', 'Arkansas'
  ],
  'states',
  3,
  ARRAY['Georgia', 'Alabama', 'North Carolina']
),
(
  'game_002',
  'Name the top 5 programming languages by popularity',
  ARRAY[
    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Swift',
    'Go', 'Rust', 'TypeScript', 'Kotlin', 'Scala', 'R', 'Dart'
  ],
  'programming languages',
  5,
  ARRAY['JavaScript', 'Python', 'Java', 'C++', 'C#']
),
(
  'game_003',
  'Name the top 4 social media platforms by users',
  ARRAY[
    'Facebook', 'YouTube', 'WhatsApp', 'Instagram', 'TikTok', 'WeChat',
    'Snapchat', 'Twitter', 'LinkedIn', 'Pinterest', 'Reddit', 'Telegram'
  ],
  'social media platforms',
  4,
  ARRAY['Facebook', 'YouTube', 'WhatsApp', 'Instagram']
);
