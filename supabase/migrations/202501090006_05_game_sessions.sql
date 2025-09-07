-- Create new session tables for Lettered and TopX games

-- Create lettered_sessions table for Lettered game sessions
CREATE TABLE IF NOT EXISTS public.lettered_sessions (
    id TEXT DEFAULT ('letteredsession_' || generate_ksuid()) PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    daily_game_id TEXT NOT NULL REFERENCES public.daily_games(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    initial_score INTEGER DEFAULT 0 NOT NULL,
    final_score INTEGER DEFAULT 0 NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create topx_sessions table for TopX game sessions
CREATE TABLE IF NOT EXISTS public.topx_sessions (
    id TEXT DEFAULT ('topxsession_' || generate_ksuid()) PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    daily_game_id TEXT NOT NULL REFERENCES public.daily_games(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    initial_score INTEGER DEFAULT 0 NOT NULL,
    final_score INTEGER DEFAULT 0 NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_lettered_sessions_user_id ON public.lettered_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_lettered_sessions_daily_game_id ON public.lettered_sessions(daily_game_id);
CREATE INDEX IF NOT EXISTS idx_lettered_sessions_started_at ON public.lettered_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_lettered_sessions_is_completed ON public.lettered_sessions(is_completed);

CREATE INDEX IF NOT EXISTS idx_topx_sessions_user_id ON public.topx_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_topx_sessions_daily_game_id ON public.topx_sessions(daily_game_id);
CREATE INDEX IF NOT EXISTS idx_topx_sessions_started_at ON public.topx_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_topx_sessions_is_completed ON public.topx_sessions(is_completed);

-- Create triggers to automatically update updated_at
CREATE TRIGGER handle_lettered_sessions_updated_at
    BEFORE UPDATE ON public.lettered_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_topx_sessions_updated_at
    BEFORE UPDATE ON public.topx_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.lettered_sessions TO authenticated;
GRANT ALL ON public.lettered_sessions TO service_role;
GRANT ALL ON public.topx_sessions TO authenticated;
GRANT ALL ON public.topx_sessions TO service_role;
