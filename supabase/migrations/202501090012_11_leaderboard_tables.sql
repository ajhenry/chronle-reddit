-- Create new leaderboard tables as specified in leaderboard.md
-- These tables replace the old leaderboard system with separate tables for different types of rankings

-- Season Leaderboard - Overall season rankings
CREATE TABLE public.season_leaderboard (
    id TEXT PRIMARY KEY DEFAULT CONCAT('season_leaderboard_', generate_ksuid()),
    season_id TEXT NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    total_points INTEGER NOT NULL DEFAULT 0,
    games_played INTEGER NOT NULL DEFAULT 0,
    average_topx_score DECIMAL(10,2) DEFAULT NULL,
    average_topx_attempts_used DECIMAL(10,2) DEFAULT NULL,
    average_lettered_score DECIMAL(10,2) DEFAULT NULL,
    average_lettered_moves_used DECIMAL(10,2) DEFAULT NULL,
    average_score DECIMAL(10,2) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(season_id, user_id)
);

-- Lettered Game Leaderboard - Rankings for lettered games
CREATE TABLE public.lettered_leaderboard (
    id TEXT PRIMARY KEY DEFAULT CONCAT('lettered_leaderboard_', generate_ksuid()),
    season_id TEXT NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    total_points INTEGER NOT NULL DEFAULT 0,
    games_played INTEGER NOT NULL DEFAULT 0,
    average_score DECIMAL(10,2) DEFAULT NULL,
    average_moves DECIMAL(10,2) DEFAULT NULL,
    average_time DECIMAL(10,2) DEFAULT NULL, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(season_id, user_id)
);

-- TopX Game Leaderboard - Rankings for topx games
CREATE TABLE public.topx_leaderboard (
    id TEXT PRIMARY KEY DEFAULT CONCAT('topx_leaderboard_', generate_ksuid()),
    season_id TEXT NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    total_points INTEGER NOT NULL DEFAULT 0,
    games_played INTEGER NOT NULL DEFAULT 0,
    average_score DECIMAL(10,2) DEFAULT NULL,
    average_attempts_used DECIMAL(10,2) DEFAULT NULL,
    average_time DECIMAL(10,2) DEFAULT NULL, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(season_id, user_id)
);

-- User Stats - Overall user statistics
CREATE TABLE public.user_stats (
    id TEXT PRIMARY KEY DEFAULT CONCAT('user_stats_', generate_ksuid()),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    current_daily_streak INTEGER NOT NULL DEFAULT 0,
    best_daily_streak INTEGER NOT NULL DEFAULT 0,
    current_daily_lettered_streak INTEGER NOT NULL DEFAULT 0,
    best_daily_lettered_streak INTEGER NOT NULL DEFAULT 0,
    current_daily_topx_streak INTEGER NOT NULL DEFAULT 0,
    best_daily_topx_streak INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    total_games_played INTEGER NOT NULL DEFAULT 0,
    total_topx_games_played INTEGER NOT NULL DEFAULT 0,
    total_lettered_games_played INTEGER NOT NULL DEFAULT 0,
    total_topx_points INTEGER NOT NULL DEFAULT 0,
    total_lettered_points INTEGER NOT NULL DEFAULT 0,
    total_topx_wins INTEGER NOT NULL DEFAULT 0,
    total_lettered_wins INTEGER NOT NULL DEFAULT 0,
    total_topx_losses INTEGER NOT NULL DEFAULT 0,
    total_lettered_losses INTEGER NOT NULL DEFAULT 0,
    total_topx_win_rate DECIMAL(5,2) DEFAULT NULL,
    total_lettered_win_rate DECIMAL(5,2) DEFAULT NULL,
    total_topx_average_score DECIMAL(10,2) DEFAULT NULL,
    total_lettered_average_score DECIMAL(10,2) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Season Stats - Season-specific user statistics
CREATE TABLE public.user_season_stats (
    id TEXT PRIMARY KEY DEFAULT CONCAT('user_season_stats_', generate_ksuid()),
    season_id TEXT NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    current_daily_streak INTEGER NOT NULL DEFAULT 0,
    best_daily_streak INTEGER NOT NULL DEFAULT 0,
    current_daily_lettered_streak INTEGER NOT NULL DEFAULT 0,
    best_daily_lettered_streak INTEGER NOT NULL DEFAULT 0,
    current_daily_topx_streak INTEGER NOT NULL DEFAULT 0,
    best_daily_topx_streak INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    total_games_played INTEGER NOT NULL DEFAULT 0,
    total_topx_games_played INTEGER NOT NULL DEFAULT 0,
    total_lettered_games_played INTEGER NOT NULL DEFAULT 0,
    total_topx_points INTEGER NOT NULL DEFAULT 0,
    total_lettered_points INTEGER NOT NULL DEFAULT 0,
    total_topx_wins INTEGER NOT NULL DEFAULT 0,
    total_lettered_wins INTEGER NOT NULL DEFAULT 0,
    total_topx_losses INTEGER NOT NULL DEFAULT 0,
    total_lettered_losses INTEGER NOT NULL DEFAULT 0,
    total_topx_win_rate DECIMAL(5,2) DEFAULT NULL,
    total_lettered_win_rate DECIMAL(5,2) DEFAULT NULL,
    total_topx_average_score DECIMAL(10,2) DEFAULT NULL,
    total_lettered_average_score DECIMAL(10,2) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(season_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_season_leaderboard_season_user ON public.season_leaderboard(season_id, user_id);
CREATE INDEX idx_season_leaderboard_total_points ON public.season_leaderboard(total_points DESC);
CREATE INDEX idx_lettered_leaderboard_season_user ON public.lettered_leaderboard(season_id, user_id);
CREATE INDEX idx_lettered_leaderboard_total_points ON public.lettered_leaderboard(total_points DESC);
CREATE INDEX idx_topx_leaderboard_season_user ON public.topx_leaderboard(season_id, user_id);
CREATE INDEX idx_topx_leaderboard_total_points ON public.topx_leaderboard(total_points DESC);
CREATE INDEX idx_user_stats_user ON public.user_stats(user_id);
CREATE INDEX idx_user_season_stats_season_user ON public.user_season_stats(season_id, user_id);

-- Create triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_season_leaderboard_updated_at BEFORE UPDATE ON public.season_leaderboard FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lettered_leaderboard_updated_at BEFORE UPDATE ON public.lettered_leaderboard FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_topx_leaderboard_updated_at BEFORE UPDATE ON public.topx_leaderboard FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public.user_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_season_stats_updated_at BEFORE UPDATE ON public.user_season_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.season_leaderboard IS 'Overall season rankings combining both game types';
COMMENT ON TABLE public.lettered_leaderboard IS 'Rankings for lettered games within a season';
COMMENT ON TABLE public.topx_leaderboard IS 'Rankings for topx games within a season';
COMMENT ON TABLE public.user_stats IS 'Overall user statistics across all seasons';
COMMENT ON TABLE public.user_season_stats IS 'User statistics for a specific season';
