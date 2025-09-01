-- Create seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  game_type TEXT NOT NULL DEFAULT 'topx',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  is_won BOOLEAN DEFAULT false,
  time_to_complete INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seasons_active ON seasons(is_active);
CREATE INDEX IF NOT EXISTS idx_seasons_dates ON seasons(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_season_id ON game_sessions(season_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_score ON game_sessions(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_completed ON game_sessions(is_completed);
CREATE INDEX IF NOT EXISTS idx_game_sessions_date ON game_sessions(created_at);

-- Add updated_at trigger for seasons
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for seasons table (publicly readable, admin writable)
CREATE POLICY "Anyone can read seasons" ON seasons
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage seasons" ON seasons
  FOR ALL USING (true);

-- Create policies for game_sessions table
CREATE POLICY "Users can read their own game sessions" ON game_sessions
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id LIKE 'reddit_%');

CREATE POLICY "Users can create their own game sessions" ON game_sessions
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id LIKE 'reddit_%');

CREATE POLICY "Users can update their own game sessions" ON game_sessions
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id LIKE 'reddit_%');

CREATE POLICY "Service role can manage all game sessions" ON game_sessions
  FOR ALL USING (true);

-- Function to get season leaderboard with aggregated stats
CREATE OR REPLACE FUNCTION get_season_leaderboard(
  season_id UUID,
  result_limit INTEGER DEFAULT 50,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id TEXT,
  reddit_handle TEXT,
  total_score BIGINT,
  games_played BIGINT,
  games_won BIGINT,
  average_score NUMERIC,
  win_rate NUMERIC,
  best_score INTEGER,
  total_correct_answers BIGINT,
  average_attempts NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gs.user_id,
    u.reddit_handle,
    SUM(gs.score) as total_score,
    COUNT(*) as games_played,
    COUNT(*) FILTER (WHERE gs.is_won = true) as games_won,
    ROUND(AVG(gs.score), 2) as average_score,
    ROUND(
      (COUNT(*) FILTER (WHERE gs.is_won = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
      2
    ) as win_rate,
    MAX(gs.score) as best_score,
    SUM(gs.correct_answers) as total_correct_answers,
    ROUND(AVG(gs.attempts), 2) as average_attempts
  FROM game_sessions gs
  JOIN users u ON gs.user_id = u.id
  WHERE gs.season_id = get_season_leaderboard.season_id
  GROUP BY gs.user_id, u.reddit_handle
  ORDER BY total_score DESC, games_won DESC, average_score DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's rank in a season
CREATE OR REPLACE FUNCTION get_user_rank(
  user_id TEXT,
  season_id UUID
)
RETURNS TABLE (
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      gs.user_id,
      SUM(gs.score) as total_score,
      COUNT(*) FILTER (WHERE gs.is_won = true) as games_won,
      ROUND(AVG(gs.score), 2) as average_score
    FROM game_sessions gs
    WHERE gs.season_id = get_user_rank.season_id
    GROUP BY gs.user_id
  ),
  ranked_users AS (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (
        ORDER BY total_score DESC, games_won DESC, average_score DESC
      ) as user_rank
    FROM user_stats
  )
  SELECT ranked_users.user_rank
  FROM ranked_users
  WHERE ranked_users.user_id = get_user_rank.user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically manage season transitions
CREATE OR REPLACE FUNCTION manage_season_transitions()
RETURNS void AS $$
DECLARE
  current_season RECORD;
  new_season_start DATE;
  new_season_end DATE;
  new_season_name TEXT;
BEGIN
  -- Get current active season
  SELECT * INTO current_season
  FROM seasons
  WHERE is_active = true
  LIMIT 1;

  -- Check if current season has ended
  IF current_season.end_date < NOW() THEN
    -- Deactivate current season
    UPDATE seasons
    SET is_active = false
    WHERE id = current_season.id;

    -- Create new season (30 days from now)
    new_season_start := NOW()::DATE;
    new_season_end := (NOW() + INTERVAL '30 days')::DATE;
    new_season_name := 'Season ' || TO_CHAR(NOW(), 'YYYY-MM');

    -- Insert new season
    INSERT INTO seasons (name, start_date, end_date, is_active, game_type)
    VALUES (new_season_name, new_season_start, new_season_end, true, 'topx');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check if user can play today
CREATE OR REPLACE FUNCTION can_user_play_today(
  user_id TEXT,
  game_id TEXT,
  season_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  today_start TIMESTAMP;
  today_end TIMESTAMP;
  session_count INTEGER;
BEGIN
  -- Get today's date range in UTC
  today_start := DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC');
  today_end := today_start + INTERVAL '1 day';

  -- Count sessions for today
  SELECT COUNT(*) INTO session_count
  FROM game_sessions
  WHERE user_id = can_user_play_today.user_id
    AND game_id = can_user_play_today.game_id
    AND season_id = can_user_play_today.season_id
    AND created_at >= today_start
    AND created_at < today_end;

  -- User can play if they haven't played today
  RETURN session_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Insert a default active season if none exists
DO $$
DECLARE
  season_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO season_count FROM seasons WHERE is_active = true;
  
  IF season_count = 0 THEN
    INSERT INTO seasons (name, start_date, end_date, is_active, game_type)
    VALUES (
      'Season ' || TO_CHAR(NOW(), 'YYYY-MM'),
      NOW(),
      NOW() + INTERVAL '30 days',
      true,
      'topx'
    );
  END IF;
END $$;
