-- Create lettered_games table for storing lettered game data
CREATE TABLE IF NOT EXISTS public.lettered_games (
    id TEXT DEFAULT ('lettered_' || generate_ksuid()) PRIMARY KEY,
    category TEXT NOT NULL,
    phrase TEXT NOT NULL,
    grid JSONB NOT NULL, -- NxM grid as JSON
    rows INTEGER NOT NULL, -- Number of rows in the grid
    cols INTEGER NOT NULL, -- Number of columns in the grid
    pieces JSONB NOT NULL, -- Array of letter pieces as JSON
    solution JSONB NOT NULL, -- Solution positions for each piece as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_lettered_games_category ON public.lettered_games(category);
CREATE INDEX IF NOT EXISTS idx_lettered_games_board_size ON public.lettered_games(rows, cols);

-- Create trigger to automatically update updated_at
CREATE TRIGGER handle_lettered_games_updated_at
    BEFORE UPDATE ON public.lettered_games
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Extend daily_games table to support lettered games
ALTER TABLE public.daily_games
ADD COLUMN IF NOT EXISTS lettered_game_id TEXT REFERENCES public.lettered_games(id) ON DELETE CASCADE;

-- Make topx_game_id nullable to allow lettered games
ALTER TABLE public.daily_games
ALTER COLUMN topx_game_id DROP NOT NULL;

-- Create index for lettered game queries
CREATE INDEX IF NOT EXISTS idx_daily_games_lettered_game_id ON public.daily_games(lettered_game_id);

-- Remove the unique constraint on day to allow multiple games per day (TopX and Lettered)
ALTER TABLE public.daily_games DROP CONSTRAINT IF EXISTS daily_games_day_key;

-- Create lettered_submissions table for tracking individual piece placements
CREATE TABLE IF NOT EXISTS public.lettered_submissions (
    id TEXT PRIMARY KEY DEFAULT generate_ksuid(),
    game_session_id TEXT NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    piece_id TEXT NOT NULL,
    position JSONB NOT NULL, -- {row, col} position as JSON
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    score_at_placement INTEGER NOT NULL, -- Score when this piece was placed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_lettered_submissions_game_session_id ON public.lettered_submissions(game_session_id);
CREATE INDEX IF NOT EXISTS idx_lettered_submissions_placed_at ON public.lettered_submissions(placed_at);

-- Create function to get today's lettered daily game based on EST timezone
CREATE OR REPLACE FUNCTION public.get_todays_lettered_daily_game()
RETURNS TABLE (
    id TEXT,
    day DATE,
    lettered_game_id TEXT,
    game_data JSONB
) AS $$
DECLARE
    today_est DATE;
BEGIN
    -- Calculate today's date in EST
    today_est := (timezone('America/New_York', now()))::date;

    RETURN QUERY
    SELECT
        dg.id,
        dg.day,
        dg.lettered_game_id,
        to_jsonb(lg.*) as game_data
    FROM public.daily_games dg
    JOIN public.lettered_games lg ON dg.lettered_game_id = lg.id
    WHERE dg.day = today_est AND dg.lettered_game_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_todays_lettered_daily_game() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_todays_lettered_daily_game() TO service_role;
