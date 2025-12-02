import { Router } from 'express';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';
import { logRouteInfo, logError } from '../lib/logging';
import { getCurrentActiveSeason } from '../database/season';
import {
  getSeasonLeaderboard,
  getUserSeasonRank,
  getLetteredLeaderboard,
  getUserLetteredRank,
  getUserStats,
  getUserSeasonStats,
  getUserLeaderboardData,
} from '../database/leaderboard';

const router = Router();

// GET /api/leaderboard - Returns overall season leaderboard rankings
router.get('/api/leaderboard', async (req, res): Promise<void> => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const limitNum = Math.min(Math.max(1, parseInt(limit as string) || 10), 50);
    const offsetNum = Math.max(0, parseInt(offset as string) || 0);

    logRouteInfo('/api/leaderboard', {
      action: 'fetch_overall_leaderboard',
      limit: limitNum,
      offset: offsetNum,
    });

    // Get current active season
    const currentSeason = await getCurrentActiveSeason();

    // Get overall season leaderboard rankings
    const { entries, totalPlayers } = await getSeasonLeaderboard(
      currentSeason.id,
      limitNum,
      offsetNum
    );

    // Get current user's position if authenticated
    let userRank: number | null = null;
    const userId = await ensureUserExistsAndGetId();
    if (userId) {
      userRank = await getUserSeasonRank(currentSeason.id, userId);
    }

    const response = {
      type: 'leaderboard',
      seasonId: currentSeason.id,
      seasonName: currentSeason.name,
      entries,
      totalPlayers,
      userRank,
      limit: limitNum,
      offset: offsetNum,
    };

    logRouteInfo('/api/leaderboard', {
      result: 'success',
      entriesCount: response.entries.length,
      totalPlayers: response.totalPlayers,
      userRank,
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

// GET /api/leaderboard/lettered - Returns Lettered game leaderboard rankings
router.get('/api/leaderboard/lettered', async (req, res): Promise<void> => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const limitNum = Math.min(Math.max(1, parseInt(limit as string) || 10), 50);
    const offsetNum = Math.max(0, parseInt(offset as string) || 0);

    logRouteInfo('/api/leaderboard/lettered', {
      action: 'fetch_lettered_leaderboard',
      limit: limitNum,
      offset: offsetNum,
    });

    // Get current active season
    const currentSeason = await getCurrentActiveSeason();

    // Get Lettered leaderboard rankings
    const { entries, totalPlayers } = await getLetteredLeaderboard(
      currentSeason.id,
      limitNum,
      offsetNum
    );

    // Get current user's position if authenticated
    let userRank: number | null = null;
    const userId = await ensureUserExistsAndGetId();
    if (userId) {
      userRank = await getUserLetteredRank(currentSeason.id, userId);
    }

    const response = {
      type: 'lettered_leaderboard',
      seasonId: currentSeason.id,
      seasonName: currentSeason.name,
      entries,
      totalPlayers,
      userRank,
      limit: limitNum,
      offset: offsetNum,
    };

    logRouteInfo('/api/leaderboard/lettered', {
      result: 'success',
      entriesCount: response.entries.length,
      totalPlayers: response.totalPlayers,
      userRank,
    });

    res.json(response);
  } catch (error) {
    logError('/api/leaderboard/lettered', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Lettered leaderboard',
    });
  }
});

// GET /api/stats/user - Returns current user's total statistics
router.get('/api/stats/user', async (_req, res): Promise<void> => {
  try {
    logRouteInfo('/api/stats/user', { action: 'fetch_user_stats' });

    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      logRouteInfo('/api/stats/user', { result: 'unauthenticated' });
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    // Get user's overall stats
    const userStats = await getUserStats(userId);

    const response = {
      type: 'user_stats',
      userId,
      stats: userStats || {
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        currentDailyLetteredStreak: 0,
        bestDailyLetteredStreak: 0,
        totalPoints: 0,
        totalGamesPlayed: 0,
        totalLetteredGamesPlayed: 0,
        totalLetteredPoints: 0,
        totalLetteredWins: 0,
        totalLetteredLosses: 0,
        totalLetteredWinRate: null,
        totalLetteredAverageScore: null,
      },
    };

    logRouteInfo('/api/stats/user', {
      result: 'success',
      userId,
      totalPoints: response.stats.totalPoints,
      totalGamesPlayed: response.stats.totalGamesPlayed,
    });

    res.json(response);
  } catch (error) {
    logError('/api/stats/user', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user statistics',
    });
  }
});

// GET /api/stats/user/season/:seasonId - Returns user's season statistics
router.get('/api/stats/user/season/:seasonId', async (req, res): Promise<void> => {
  try {
    const { seasonId } = req.params;

    logRouteInfo('/api/stats/user/season/:seasonId', {
      action: 'fetch_user_season_stats',
      seasonId,
    });

    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      logRouteInfo('/api/stats/user/season/:seasonId', { result: 'unauthenticated' });
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    // Get user's season-specific stats
    const seasonStats = await getUserSeasonStats(userId, seasonId);

    const response = {
      type: 'user_season_stats',
      userId,
      seasonId,
      stats: seasonStats || {
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        currentDailyLetteredStreak: 0,
        bestDailyLetteredStreak: 0,
        totalPoints: 0,
        totalGamesPlayed: 0,
        totalLetteredGamesPlayed: 0,
        totalLetteredPoints: 0,
        totalLetteredWins: 0,
        totalLetteredLosses: 0,
        totalLetteredWinRate: null,
        totalLetteredAverageScore: null,
      },
    };

    logRouteInfo('/api/stats/user/season/:seasonId', {
      result: 'success',
      userId,
      seasonId,
      totalPoints: response.stats.totalPoints,
      totalGamesPlayed: response.stats.totalGamesPlayed,
    });

    res.json(response);
  } catch (error) {
    logError('/api/stats/user/season/:seasonId', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user season statistics',
    });
  }
});

// GET /api/leaderboard/user - Returns current user's leaderboard position and stats
router.get('/api/leaderboard/user', async (_req, res): Promise<void> => {
  try {
    logRouteInfo('/api/leaderboard/user', { action: 'fetch_user_leaderboard_position' });

    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      logRouteInfo('/api/leaderboard/user', { result: 'unauthenticated' });
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    // Get current active season
    const currentSeason = await getCurrentActiveSeason();

    // Get user's leaderboard data
    const userLeaderboardData = await getUserLeaderboardData(currentSeason.id, userId);

    if (!userLeaderboardData) {
      logRouteInfo('/api/leaderboard/user', { result: 'no_data' });
      res.status(404).json({
        status: 'error',
        message: 'User leaderboard data not found',
      });
      return;
    }

    const response = {
      type: 'user_leaderboard_position',
      ...userLeaderboardData,
    };

    logRouteInfo('/api/leaderboard/user', {
      result: 'success',
      userId,
      rank: userLeaderboardData.rank,
      totalPoints: userLeaderboardData.totalPoints,
    });

    res.json(response);
  } catch (error) {
    logError('/api/leaderboard/user', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user leaderboard position',
    });
  }
});

export default router;
