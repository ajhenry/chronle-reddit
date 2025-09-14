import { Router } from 'express';
import { LeaderboardResponse, UserLeaderboardPositionResponse } from '../../shared/types/api';
import { supabase } from '../../shared/supabase-server';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';
import { logRouteInfo, logError } from '../lib/logging';

const router = Router();

// GET /api/leaderboard - Returns the current leaderboard rankings
router.get('/api/leaderboard', async (req, res): Promise<void> => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    // Validate query parameters
    const limitNum = Math.min(Math.max(1, parseInt(limit as string) || 50), 100);
    const offsetNum = Math.max(0, parseInt(offset as string) || 0);

    logRouteInfo('/api/leaderboard', {
      action: 'fetch_leaderboard',
      limit: limitNum,
      offset: offsetNum,
    });

    // Get leaderboard rankings using the database function
    const { data: rankings, error } = await supabase.rpc('get_leaderboard_rankings', {
      limit_count: limitNum,
      offset_count: offsetNum,
    });

    if (error) {
      logError('/api/leaderboard', error, { context: 'fetching_rankings' });
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch leaderboard rankings',
      });
      return;
    }

    // Get total number of players
    const { count: totalPlayers, error: countError } = await supabase
      .from('leaderboard')
      .select('user_id', { count: 'exact', head: true });

    if (countError) {
      logError('/api/leaderboard', countError, { context: 'counting_players' });
    }

    const response: LeaderboardResponse = {
      type: 'leaderboard',
      entries: (rankings || []).map((entry: any) => ({
        rank: Number(entry.rank),
        userId: entry.user_id,
        redditHandle: entry.reddit_handle,
        totalPoints: entry.total_points,
        gamesPlayed: Number(entry.games_played),
        latestGame: entry.latest_game,
        averageScore: Number(entry.average_score),
      })),
      totalPlayers: totalPlayers || 0,
    };

    logRouteInfo('/api/leaderboard', {
      result: 'success',
      entriesCount: response.entries.length,
      totalPlayers: response.totalPlayers,
    });

    res.json(response);
  } catch (error) {
    logError('/api/leaderboard', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch leaderboard',
    });
  }
});

// GET /api/leaderboard/position - Returns the current user's leaderboard position
router.get('/api/leaderboard/position', async (_req, res): Promise<void> => {
  try {
    logRouteInfo('/api/leaderboard/position', { action: 'fetch_user_position' });

    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      logRouteInfo('/api/leaderboard/position', { result: 'unauthenticated' });
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    // Get user's leaderboard position using the database function
    const { data: position, error } = await supabase.rpc('get_user_leaderboard_position', {
      target_user_id: userId,
    });

    if (error) {
      logError('/api/leaderboard/position', error, { userId });
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch leaderboard position',
      });
      return;
    }

    if (!position || position.length === 0) {
      // User hasn't completed any games yet
      logRouteInfo('/api/leaderboard/position', {
        result: 'no_games_played',
        userId,
      });
      res.json({
        type: 'user_leaderboard_position',
        rank: 0,
        totalPoints: 0,
        gamesPlayed: 0,
        totalPlayers: 0,
      });
      return;
    }

    const userPosition = position[0];
    const response: UserLeaderboardPositionResponse = {
      type: 'user_leaderboard_position',
      rank: Number(userPosition.rank),
      totalPoints: userPosition.total_points,
      gamesPlayed: Number(userPosition.games_played),
      totalPlayers: Number(userPosition.total_players),
    };

    logRouteInfo('/api/leaderboard/position', {
      result: 'success',
      userId,
      rank: response.rank,
      totalPoints: response.totalPoints,
      gamesPlayed: response.gamesPlayed,
    });

    res.json(response);
  } catch (error) {
    logError('/api/leaderboard/position', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch leaderboard position',
    });
  }
});

export default router;
