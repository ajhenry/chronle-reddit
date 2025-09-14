-- Create database functions for leaderboard UPSERT operations
-- These functions ensure proper aggregation calculations and maintain one row per user per leaderboard

-- TopX Leaderboard UPSERT function
CREATE OR REPLACE FUNCTION upsert_topx_leaderboard_entry(
    p_season_id TEXT,
    p_user_id TEXT,
    p_score INTEGER,
    p_attempts_used INTEGER,
    p_time_elapsed DECIMAL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.topx_leaderboard (
        season_id,
        user_id,
        total_points,
        games_played,
        average_score,
        average_attempts_used,
        average_time
    ) VALUES (
        p_season_id,
        p_user_id,
        p_score,
        1,
        p_score,
        p_attempts_used,
        p_time_elapsed
    )
    ON CONFLICT (season_id, user_id)
    DO UPDATE SET
        total_points = topx_leaderboard.total_points + p_score,
        games_played = topx_leaderboard.games_played + 1,
        average_score = ROUND(((topx_leaderboard.total_points + p_score)::DECIMAL / (topx_leaderboard.games_played + 1)), 2),
        average_attempts_used = ROUND((((COALESCE(topx_leaderboard.average_attempts_used, 0) * topx_leaderboard.games_played) + p_attempts_used)::DECIMAL / (topx_leaderboard.games_played + 1)), 2),
        average_time = ROUND((((COALESCE(topx_leaderboard.average_time, 0) * topx_leaderboard.games_played) + p_time_elapsed)::DECIMAL / (topx_leaderboard.games_played + 1)), 2),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Lettered Leaderboard UPSERT function
CREATE OR REPLACE FUNCTION upsert_lettered_leaderboard_entry(
    p_season_id TEXT,
    p_user_id TEXT,
    p_score INTEGER,
    p_moves_used INTEGER,
    p_time_elapsed DECIMAL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.lettered_leaderboard (
        season_id,
        user_id,
        total_points,
        games_played,
        average_score,
        average_moves,
        average_time
    ) VALUES (
        p_season_id,
        p_user_id,
        p_score,
        1,
        p_score,
        p_moves_used,
        p_time_elapsed
    )
    ON CONFLICT (season_id, user_id)
    DO UPDATE SET
        total_points = lettered_leaderboard.total_points + p_score,
        games_played = lettered_leaderboard.games_played + 1,
        average_score = ROUND(((lettered_leaderboard.total_points + p_score)::DECIMAL / (lettered_leaderboard.games_played + 1)), 2),
        average_moves = ROUND((((COALESCE(lettered_leaderboard.average_moves, 0) * lettered_leaderboard.games_played) + p_moves_used)::DECIMAL / (lettered_leaderboard.games_played + 1)), 2),
        average_time = ROUND((((COALESCE(lettered_leaderboard.average_time, 0) * lettered_leaderboard.games_played) + p_time_elapsed)::DECIMAL / (lettered_leaderboard.games_played + 1)), 2),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Season Leaderboard UPSERT function
CREATE OR REPLACE FUNCTION upsert_season_leaderboard_entry(
    p_season_id TEXT,
    p_user_id TEXT,
    p_score INTEGER,
    p_game_type TEXT,
    p_attempts_or_moves INTEGER
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.season_leaderboard (
        season_id,
        user_id,
        total_points,
        games_played,
        average_score,
        average_topx_score,
        average_topx_attempts_used,
        average_lettered_score,
        average_lettered_moves_used
    ) VALUES (
        p_season_id,
        p_user_id,
        p_score,
        1,
        p_score,
        CASE WHEN p_game_type = 'topx' THEN p_score ELSE NULL END,
        CASE WHEN p_game_type = 'topx' THEN p_attempts_or_moves ELSE NULL END,
        CASE WHEN p_game_type = 'lettered' THEN p_score ELSE NULL END,
        CASE WHEN p_game_type = 'lettered' THEN p_attempts_or_moves ELSE NULL END
    )
    ON CONFLICT (season_id, user_id)
    DO UPDATE SET
        total_points = season_leaderboard.total_points + p_score,
        games_played = season_leaderboard.games_played + 1,
        average_score = ROUND(((season_leaderboard.total_points + p_score)::DECIMAL / (season_leaderboard.games_played + 1)), 2),
        average_topx_score = CASE 
            WHEN p_game_type = 'topx' THEN ROUND(((COALESCE(season_leaderboard.average_topx_score, 0) * COALESCE((SELECT COUNT(*) FROM topx_leaderboard tl WHERE tl.season_id = p_season_id AND tl.user_id = p_user_id), 0)) + p_score)::DECIMAL / (COALESCE((SELECT games_played FROM topx_leaderboard tl WHERE tl.season_id = p_season_id AND tl.user_id = p_user_id), 0) + 1), 2)
            ELSE season_leaderboard.average_topx_score
        END,
        average_topx_attempts_used = CASE 
            WHEN p_game_type = 'topx' THEN ROUND(((COALESCE(season_leaderboard.average_topx_attempts_used, 0) * COALESCE((SELECT games_played FROM topx_leaderboard tl WHERE tl.season_id = p_season_id AND tl.user_id = p_user_id), 0)) + p_attempts_or_moves)::DECIMAL / (COALESCE((SELECT games_played FROM topx_leaderboard tl WHERE tl.season_id = p_season_id AND tl.user_id = p_user_id), 0) + 1), 2)
            ELSE season_leaderboard.average_topx_attempts_used
        END,
        average_lettered_score = CASE 
            WHEN p_game_type = 'lettered' THEN ROUND(((COALESCE(season_leaderboard.average_lettered_score, 0) * COALESCE((SELECT games_played FROM lettered_leaderboard ll WHERE ll.season_id = p_season_id AND ll.user_id = p_user_id), 0)) + p_score)::DECIMAL / (COALESCE((SELECT games_played FROM lettered_leaderboard ll WHERE ll.season_id = p_season_id AND ll.user_id = p_user_id), 0) + 1), 2)
            ELSE season_leaderboard.average_lettered_score
        END,
        average_lettered_moves_used = CASE 
            WHEN p_game_type = 'lettered' THEN ROUND(((COALESCE(season_leaderboard.average_lettered_moves_used, 0) * COALESCE((SELECT games_played FROM lettered_leaderboard ll WHERE ll.season_id = p_season_id AND ll.user_id = p_user_id), 0)) + p_attempts_or_moves)::DECIMAL / (COALESCE((SELECT games_played FROM lettered_leaderboard ll WHERE ll.season_id = p_season_id AND ll.user_id = p_user_id), 0) + 1), 2)
            ELSE season_leaderboard.average_lettered_moves_used
        END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- User Stats UPSERT function
CREATE OR REPLACE FUNCTION upsert_user_stats_entry(
    p_user_id TEXT,
    p_game_type TEXT,
    p_score INTEGER,
    p_won BOOLEAN
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_stats (
        user_id,
        total_points,
        total_games_played,
        current_daily_streak,
        best_daily_streak,
        total_topx_games_played,
        total_lettered_games_played,
        total_topx_points,
        total_lettered_points,
        total_topx_wins,
        total_topx_losses,
        total_lettered_wins,
        total_lettered_losses,
        total_topx_win_rate,
        total_lettered_win_rate,
        total_topx_average_score,
        total_lettered_average_score,
        current_daily_topx_streak,
        best_daily_topx_streak,
        current_daily_lettered_streak,
        best_daily_lettered_streak
    ) VALUES (
        p_user_id,
        p_score,
        1,
        1,
        1,
        CASE WHEN p_game_type = 'topx' THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'lettered' THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'topx' THEN p_score ELSE 0 END,
        CASE WHEN p_game_type = 'lettered' THEN p_score ELSE 0 END,
        CASE WHEN p_game_type = 'topx' AND p_won THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'topx' AND NOT p_won THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'lettered' AND p_won THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'lettered' AND NOT p_won THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'topx' THEN (CASE WHEN p_won THEN 100.0 ELSE 0.0 END) ELSE NULL END,
        CASE WHEN p_game_type = 'lettered' THEN (CASE WHEN p_won THEN 100.0 ELSE 0.0 END) ELSE NULL END,
        CASE WHEN p_game_type = 'topx' THEN p_score ELSE NULL END,
        CASE WHEN p_game_type = 'lettered' THEN p_score ELSE NULL END,
        CASE WHEN p_game_type = 'topx' THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'topx' THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'lettered' THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'lettered' THEN 1 ELSE 0 END
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_points = user_stats.total_points + p_score,
        total_games_played = user_stats.total_games_played + 1,
        total_topx_games_played = CASE WHEN p_game_type = 'topx' THEN user_stats.total_topx_games_played + 1 ELSE user_stats.total_topx_games_played END,
        total_lettered_games_played = CASE WHEN p_game_type = 'lettered' THEN user_stats.total_lettered_games_played + 1 ELSE user_stats.total_lettered_games_played END,
        total_topx_points = CASE WHEN p_game_type = 'topx' THEN user_stats.total_topx_points + p_score ELSE user_stats.total_topx_points END,
        total_lettered_points = CASE WHEN p_game_type = 'lettered' THEN user_stats.total_lettered_points + p_score ELSE user_stats.total_lettered_points END,
        total_topx_wins = CASE WHEN p_game_type = 'topx' AND p_won THEN user_stats.total_topx_wins + 1 ELSE user_stats.total_topx_wins END,
        total_topx_losses = CASE WHEN p_game_type = 'topx' AND NOT p_won THEN user_stats.total_topx_losses + 1 ELSE user_stats.total_topx_losses END,
        total_lettered_wins = CASE WHEN p_game_type = 'lettered' AND p_won THEN user_stats.total_lettered_wins + 1 ELSE user_stats.total_lettered_wins END,
        total_lettered_losses = CASE WHEN p_game_type = 'lettered' AND NOT p_won THEN user_stats.total_lettered_losses + 1 ELSE user_stats.total_lettered_losses END,
        total_topx_win_rate = CASE 
            WHEN p_game_type = 'topx' THEN ROUND(((CASE WHEN p_won THEN user_stats.total_topx_wins + 1 ELSE user_stats.total_topx_wins END)::DECIMAL / (user_stats.total_topx_games_played + 1)) * 100, 2)
            ELSE user_stats.total_topx_win_rate 
        END,
        total_lettered_win_rate = CASE 
            WHEN p_game_type = 'lettered' THEN ROUND(((CASE WHEN p_won THEN user_stats.total_lettered_wins + 1 ELSE user_stats.total_lettered_wins END)::DECIMAL / (user_stats.total_lettered_games_played + 1)) * 100, 2)
            ELSE user_stats.total_lettered_win_rate 
        END,
        total_topx_average_score = CASE 
            WHEN p_game_type = 'topx' THEN ROUND(((user_stats.total_topx_points + p_score)::DECIMAL / (user_stats.total_topx_games_played + 1)), 2)
            ELSE user_stats.total_topx_average_score 
        END,
        total_lettered_average_score = CASE 
            WHEN p_game_type = 'lettered' THEN ROUND(((user_stats.total_lettered_points + p_score)::DECIMAL / (user_stats.total_lettered_games_played + 1)), 2)
            ELSE user_stats.total_lettered_average_score 
        END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- User Season Stats UPSERT function
CREATE OR REPLACE FUNCTION upsert_user_season_stats_entry(
    p_season_id TEXT,
    p_user_id TEXT,
    p_game_type TEXT,
    p_score INTEGER,
    p_won BOOLEAN
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_season_stats (
        season_id,
        user_id,
        total_points,
        total_games_played,
        current_daily_streak,
        best_daily_streak,
        total_topx_games_played,
        total_lettered_games_played,
        total_topx_points,
        total_lettered_points,
        total_topx_wins,
        total_topx_losses,
        total_lettered_wins,
        total_lettered_losses,
        total_topx_win_rate,
        total_lettered_win_rate,
        total_topx_average_score,
        total_lettered_average_score,
        current_daily_topx_streak,
        best_daily_topx_streak,
        current_daily_lettered_streak,
        best_daily_lettered_streak
    ) VALUES (
        p_season_id,
        p_user_id,
        p_score,
        1,
        1,
        1,
        CASE WHEN p_game_type = 'topx' THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'lettered' THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'topx' THEN p_score ELSE 0 END,
        CASE WHEN p_game_type = 'lettered' THEN p_score ELSE 0 END,
        CASE WHEN p_game_type = 'topx' AND p_won THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'topx' AND NOT p_won THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'lettered' AND p_won THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'lettered' AND NOT p_won THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'topx' THEN (CASE WHEN p_won THEN 100.0 ELSE 0.0 END) ELSE NULL END,
        CASE WHEN p_game_type = 'lettered' THEN (CASE WHEN p_won THEN 100.0 ELSE 0.0 END) ELSE NULL END,
        CASE WHEN p_game_type = 'topx' THEN p_score ELSE NULL END,
        CASE WHEN p_game_type = 'lettered' THEN p_score ELSE NULL END,
        CASE WHEN p_game_type = 'topx' THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'topx' THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'lettered' THEN 1 ELSE 0 END,
        CASE WHEN p_game_type = 'lettered' THEN 1 ELSE 0 END
    )
    ON CONFLICT (season_id, user_id)
    DO UPDATE SET
        total_points = user_season_stats.total_points + p_score,
        total_games_played = user_season_stats.total_games_played + 1,
        total_topx_games_played = CASE WHEN p_game_type = 'topx' THEN user_season_stats.total_topx_games_played + 1 ELSE user_season_stats.total_topx_games_played END,
        total_lettered_games_played = CASE WHEN p_game_type = 'lettered' THEN user_season_stats.total_lettered_games_played + 1 ELSE user_season_stats.total_lettered_games_played END,
        total_topx_points = CASE WHEN p_game_type = 'topx' THEN user_season_stats.total_topx_points + p_score ELSE user_season_stats.total_topx_points END,
        total_lettered_points = CASE WHEN p_game_type = 'lettered' THEN user_season_stats.total_lettered_points + p_score ELSE user_season_stats.total_lettered_points END,
        total_topx_wins = CASE WHEN p_game_type = 'topx' AND p_won THEN user_season_stats.total_topx_wins + 1 ELSE user_season_stats.total_topx_wins END,
        total_topx_losses = CASE WHEN p_game_type = 'topx' AND NOT p_won THEN user_season_stats.total_topx_losses + 1 ELSE user_season_stats.total_topx_losses END,
        total_lettered_wins = CASE WHEN p_game_type = 'lettered' AND p_won THEN user_season_stats.total_lettered_wins + 1 ELSE user_season_stats.total_lettered_wins END,
        total_lettered_losses = CASE WHEN p_game_type = 'lettered' AND NOT p_won THEN user_season_stats.total_lettered_losses + 1 ELSE user_season_stats.total_lettered_losses END,
        total_topx_win_rate = CASE 
            WHEN p_game_type = 'topx' THEN ROUND(((CASE WHEN p_won THEN user_season_stats.total_topx_wins + 1 ELSE user_season_stats.total_topx_wins END)::DECIMAL / (user_season_stats.total_topx_games_played + 1)) * 100, 2)
            ELSE user_season_stats.total_topx_win_rate 
        END,
        total_lettered_win_rate = CASE 
            WHEN p_game_type = 'lettered' THEN ROUND(((CASE WHEN p_won THEN user_season_stats.total_lettered_wins + 1 ELSE user_season_stats.total_lettered_wins END)::DECIMAL / (user_season_stats.total_lettered_games_played + 1)) * 100, 2)
            ELSE user_season_stats.total_lettered_win_rate 
        END,
        total_topx_average_score = CASE 
            WHEN p_game_type = 'topx' THEN ROUND(((user_season_stats.total_topx_points + p_score)::DECIMAL / (user_season_stats.total_topx_games_played + 1)), 2)
            ELSE user_season_stats.total_topx_average_score 
        END,
        total_lettered_average_score = CASE 
            WHEN p_game_type = 'lettered' THEN ROUND(((user_season_stats.total_lettered_points + p_score)::DECIMAL / (user_season_stats.total_lettered_games_played + 1)), 2)
            ELSE user_season_stats.total_lettered_average_score 
        END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION upsert_topx_leaderboard_entry IS 'UPSERT function for TopX leaderboard to ensure one row per user per season';
COMMENT ON FUNCTION upsert_lettered_leaderboard_entry IS 'UPSERT function for Lettered leaderboard to ensure one row per user per season';
COMMENT ON FUNCTION upsert_season_leaderboard_entry IS 'UPSERT function for Season leaderboard to ensure one row per user per season';
COMMENT ON FUNCTION upsert_user_stats_entry IS 'UPSERT function for User stats to ensure one row per user';
COMMENT ON FUNCTION upsert_user_season_stats_entry IS 'UPSERT function for User season stats to ensure one row per user per season';
