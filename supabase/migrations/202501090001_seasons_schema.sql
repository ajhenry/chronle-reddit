-- Create seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Seasons table indexes
CREATE INDEX IF NOT EXISTS idx_seasons_active ON seasons(is_active);
CREATE INDEX IF NOT EXISTS idx_seasons_dates ON seasons(start_date, end_date);

-- Add updated_at trigger for seasons
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
    INSERT INTO seasons (name, start_date, end_date, is_active)
    VALUES (new_season_name, new_season_start, new_season_end, true);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert a default active season if none exists
DO $$
DECLARE
  season_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO season_count FROM seasons WHERE is_active = true;
  
  IF season_count = 0 THEN
    INSERT INTO seasons (name, start_date, end_date, is_active)
    VALUES (
      'Season ' || TO_CHAR(NOW(), 'YYYY-MM'),
      NOW(),
      NOW() + INTERVAL '30 days',
      true
    );
  END IF;
END $$;
