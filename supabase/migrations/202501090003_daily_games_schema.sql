-- Create daily_games table for managing daily TopX games
CREATE TABLE IF NOT EXISTS public.daily_games (
    id TEXT PRIMARY KEY DEFAULT generate_ksuid(),
    day DATE NOT NULL,
    topx_game_id TEXT NOT NULL REFERENCES public.topx_games(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure only one game per day
    UNIQUE(day)
);

-- Create index for efficient day-based queries
CREATE INDEX IF NOT EXISTS idx_daily_games_day ON public.daily_games(day);
CREATE INDEX IF NOT EXISTS idx_daily_games_topx_game_id ON public.daily_games(topx_game_id);

-- No RLS policies needed

-- Create game_sessions table for tracking user progress and scoring
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id TEXT PRIMARY KEY DEFAULT generate_ksuid(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    daily_game_id TEXT NOT NULL REFERENCES public.daily_games(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    initial_score INTEGER DEFAULT 5000 NOT NULL,
    final_score INTEGER DEFAULT 0 NOT NULL,
    attempts JSONB DEFAULT '[]'::jsonb NOT NULL, -- Array of user attempts with timestamps
    correct_answers JSONB DEFAULT '[]'::jsonb NOT NULL, -- Array of correct answers found
    is_completed BOOLEAN DEFAULT false NOT NULL,
    
    -- Ensure one session per user per daily game
    UNIQUE(user_id, daily_game_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_daily_game_id ON public.game_sessions(daily_game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_completed_at ON public.game_sessions(completed_at);

-- No RLS policies needed

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER handle_daily_games_updated_at
    BEFORE UPDATE ON public.daily_games
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create function to get today's game based on EST timezone
CREATE OR REPLACE FUNCTION public.get_todays_daily_game()
RETURNS TABLE (
    id TEXT,
    day DATE,
    topx_game_id TEXT,
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
        dg.topx_game_id,
        to_jsonb(tg.*) as game_data
    FROM public.daily_games dg
    JOIN public.topx_games tg ON dg.topx_game_id = tg.id
    WHERE dg.day = today_est;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create topx_submissions table for tracking individual answer submissions
CREATE TABLE IF NOT EXISTS public.topx_submissions (
    id TEXT PRIMARY KEY DEFAULT generate_ksuid(),
    game_session_id TEXT NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    position INTEGER, -- Position in the solution array if correct (1-indexed)
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    score_at_submission INTEGER NOT NULL, -- Score when this answer was submitted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_topx_submissions_game_session_id ON public.topx_submissions(game_session_id);
CREATE INDEX IF NOT EXISTS idx_topx_submissions_submitted_at ON public.topx_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_topx_submissions_is_correct ON public.topx_submissions(is_correct);

-- No RLS policies needed

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_todays_daily_game() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_todays_daily_game() TO service_role;
