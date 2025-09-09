-- Create topx_games table
CREATE TABLE IF NOT EXISTS topx_games (
  id TEXT DEFAULT ('topxgame_' || generate_ksuid()) PRIMARY KEY,
  prompt TEXT NOT NULL,
  suggestions TEXT[] NOT NULL, -- Array of search suggestions
  category TEXT NOT NULL,
  count INTEGER NOT NULL, -- Number of correct answers (e.g., "top 3", "top 5")
  max_attempts INTEGER NOT NULL DEFAULT 5, -- Maximum attempts allowed for this game
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
