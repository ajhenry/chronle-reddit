-- Create daily_games table for managing daily TopX and Lettered games
CREATE TABLE IF NOT EXISTS public.daily_games (
    id TEXT PRIMARY KEY DEFAULT ('dailygame_' || generate_ksuid()),
    day DATE NOT NULL,
    topx_game_id TEXT REFERENCES public.topx_games(id) ON DELETE CASCADE,
    lettered_game_id TEXT REFERENCES public.lettered_games(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Ensure only one game per day per type
    UNIQUE(day, topx_game_id),
    UNIQUE(day, lettered_game_id)
);

-- Create index for efficient day-based queries
CREATE INDEX IF NOT EXISTS idx_daily_games_day ON public.daily_games(day);
CREATE INDEX IF NOT EXISTS idx_daily_games_topx_game_id ON public.daily_games(topx_game_id);
CREATE INDEX IF NOT EXISTS idx_daily_games_lettered_game_id ON public.daily_games(lettered_game_id);

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

-- Create function to get today's daily game based on EST timezone
CREATE OR REPLACE FUNCTION public.get_todays_daily_game()
RETURNS TABLE (
    id TEXT,
    day DATE,
    topx_game_id TEXT,
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
        dg.topx_game_id,
        dg.lettered_game_id,
        CASE
            WHEN dg.topx_game_id IS NOT NULL THEN to_jsonb(tg.*)
            WHEN dg.lettered_game_id IS NOT NULL THEN to_jsonb(lg.*)
        END as game_data
    FROM public.daily_games dg
    LEFT JOIN public.topx_games tg ON dg.topx_game_id = tg.id
    LEFT JOIN public.lettered_games lg ON dg.lettered_game_id = lg.id
    WHERE dg.day = today_est;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get today's TopX daily game based on EST timezone
CREATE OR REPLACE FUNCTION public.get_todays_topx_daily_game()
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
    WHERE dg.day = today_est AND dg.topx_game_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
GRANT EXECUTE ON FUNCTION public.get_todays_daily_game() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_todays_daily_game() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_todays_topx_daily_game() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_todays_topx_daily_game() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_todays_lettered_daily_game() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_todays_lettered_daily_game() TO service_role;
