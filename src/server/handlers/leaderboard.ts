import { Router } from 'express';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';
import { logRouteInfo, logError } from '../lib/logging';
import {
  getLeaderboard,
  getUserRank,
  getLetteredLeaderboard,
  getUserLetteredRank,
  getUserStats,
  getUserLeaderboardData,
} from '../database/leaderboard';
import { TimePeriod, getCurrentPeriod } from '../../shared/types/redis';

const router = Router();

// GET /api/leaderboard - Returns overall leaderboard rankings
router.get('/api/leaderboard', async (req, res): Promise<void> => {
  try {
    const { limit = 10, offset = 0, period = 'alltime' } = req.query;

    const limitNum = Math.min(Math.max(1, parseInt(limit as string) || 10), 50);
    const offsetNum = Math.max(0, parseInt(offset as string) || 0);
    const periodValue = (period as TimePeriod) || 'alltime';

    logRouteInfo('/api/leaderboard', {
      action: 'fetch_overall_leaderboard',
      limit: limitNum,
      offset: offsetNum,
      period: periodValue,
    });

    // Get overall leaderboard rankings for the specified period
    const { entries, totalPlayers } = await getLeaderboard(periodValue, limitNum, offsetNum);

    // Get current user's position if authenticated
    let userRank: number | null = null;
    const userId = await ensureUserExistsAndGetId();
    if (userId) {
      userRank = await getUserRank(periodValue, userId);
    }

    const response = {
      type: 'leaderboard',
      period: periodValue,
      periodKey: getCurrentPeriod(periodValue),
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
    const { limit = 10, offset = 0, period = 'alltime' } = req.query;

    const limitNum = Math.min(Math.max(1, parseInt(limit as string) || 10), 50);
    const offsetNum = Math.max(0, parseInt(offset as string) || 0);
    const periodValue = (period as TimePeriod) || 'alltime';

    logRouteInfo('/api/leaderboard/lettered', {
      action: 'fetch_lettered_leaderboard',
      limit: limitNum,
      offset: offsetNum,
      period: periodValue,
    });

    // Get Lettered leaderboard rankings for the specified period
    const { entries, totalPlayers } = await getLetteredLeaderboard(
      periodValue,
      limitNum,
      offsetNum
    );

    // Get current user's position if authenticated
    let userRank: number | null = null;
    const userId = await ensureUserExistsAndGetId();
    if (userId) {
      userRank = await getUserLetteredRank(periodValue, userId);
    }

    const response = {
      type: 'lettered_leaderboard',
      period: periodValue,
      periodKey: getCurrentPeriod(periodValue),
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

// GET /api/leaderboard/user - Returns current user's leaderboard position and stats
router.get('/api/leaderboard/user', async (req, res): Promise<void> => {
  try {
    const { period = 'alltime' } = req.query;
    const periodValue = (period as TimePeriod) || 'alltime';

    logRouteInfo('/api/leaderboard/user', {
      action: 'fetch_user_leaderboard_position',
      period: periodValue,
    });

    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      logRouteInfo('/api/leaderboard/user', { result: 'unauthenticated' });
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    // Get user's leaderboard data for the specified period
    const userLeaderboardData = await getUserLeaderboardData(periodValue, userId);

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
