-- Create leaderboard table to track user points after each game completion
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id TEXT DEFAULT ('leaderboard_' || generate_ksuid()) PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    daily_game_id TEXT NOT NULL REFERENCES public.daily_games(id) ON DELETE CASCADE,
    game_session_id TEXT NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    points_earned INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one leaderboard entry per user per daily game
    UNIQUE(user_id, daily_game_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_leaderboard_user_id ON public.leaderboard(user_id);
CREATE INDEX idx_leaderboard_daily_game_id ON public.leaderboard(daily_game_id);
CREATE INDEX idx_leaderboard_completed_at ON public.leaderboard(completed_at DESC);
CREATE INDEX idx_leaderboard_points_earned ON public.leaderboard(points_earned DESC);

-- Create a composite index for leaderboard rankings (user_id + completed_at for calculating totals)
CREATE INDEX idx_leaderboard_user_totals ON public.leaderboard(user_id, completed_at ASC);

-- No RLS policies - using service role for all operations

-- Create a function to get current leaderboard rankings
CREATE OR REPLACE FUNCTION get_leaderboard_rankings(
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    rank BIGINT,
    user_id TEXT,
    reddit_handle TEXT,
    total_points BIGINT,
    games_played BIGINT,
    latest_game TIMESTAMP WITH TIME ZONE,
    average_score NUMERIC
) 
LANGUAGE SQL
STABLE
AS $$
    WITH user_stats AS (
        SELECT 
            l.user_id,
            u.handle as reddit_handle,
            SUM(l.points_earned) as total_points,
            COUNT(*) as games_played,
            MAX(l.completed_at) as latest_game,
            ROUND(AVG(l.points_earned), 2) as average_score
        FROM public.leaderboard l
        JOIN public.users u ON l.user_id = u.id
        GROUP BY l.user_id, u.handle
    )
    SELECT 
        ROW_NUMBER() OVER (ORDER BY total_points DESC, latest_game ASC) as rank,
        user_id,
        reddit_handle,
        total_points,
        games_played,
        latest_game,
        average_score
    FROM user_stats
    ORDER BY total_points DESC, latest_game ASC
    LIMIT limit_count
    OFFSET offset_count;
$$;

-- Create a function to get user's current leaderboard position
CREATE OR REPLACE FUNCTION get_user_leaderboard_position(target_user_id TEXT)
RETURNS TABLE (
    rank BIGINT,
    total_points BIGINT,
    games_played BIGINT,
    total_players BIGINT
) 
LANGUAGE SQL
STABLE
AS $$
    WITH user_rankings AS (
        SELECT 
            l.user_id,
            SUM(l.points_earned) as total_points,
            COUNT(*) as games_played,
            ROW_NUMBER() OVER (ORDER BY SUM(l.points_earned) DESC, MAX(l.completed_at) ASC) as rank
        FROM public.leaderboard l
        GROUP BY l.user_id
    ),
    total_count AS (
        SELECT COUNT(DISTINCT user_id) as total_players
        FROM public.leaderboard
    )
    SELECT 
        ur.rank,
        ur.total_points,
        ur.games_played,
        tc.total_players
    FROM user_rankings ur
    CROSS JOIN total_count tc
    WHERE ur.user_id = target_user_id;
$$;

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_leaderboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leaderboard_updated_at
    BEFORE UPDATE ON public.leaderboard
    FOR EACH ROW
    EXECUTE FUNCTION update_leaderboard_updated_at();

-- Grant permissions (service role will handle all operations, no RLS needed)
