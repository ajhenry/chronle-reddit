import { Router } from 'express';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';
import { logRouteInfo, logError } from '../lib/logging';
import { getRedisClient } from '../lib/redis-provider';
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

    // Get leaderboard from Redis
    const redis = await getRedisClient();
    const leaderboardKey = `leaderboard:${periodValue}`;
    
    const entries = await redis.zRange(leaderboardKey, offsetNum, offsetNum + limitNum - 1, {
      reverse: true,
      by: 'score',
    });

    const totalCount = await redis.zCard(leaderboardKey);

    // Get current user's position if authenticated
    let userRank: number | null = null;
    const userId = await ensureUserExistsAndGetId();
    if (userId) {
      const rank = await redis.zRank(leaderboardKey, userId);
      userRank = rank !== null ? totalCount - rank : null;
    }

    // Format entries
    const formattedEntries = await Promise.all(
      entries.map(async (entry, index) => {
        const userData = await redis.get(`user:${entry.member}`);
        const user = userData ? JSON.parse(userData) : null;
        return {
          rank: offsetNum + index + 1,
          userId: entry.member,
          redditHandle: user?.handle || 'Anonymous',
          totalPoints: entry.score,
          gamesPlayed: 0,
          averageScore: null,
        };
      })
    );

    const response = {
      type: 'leaderboard',
      period: periodValue,
      periodKey: getCurrentPeriod(periodValue),
      entries: formattedEntries,
      totalPlayers: totalCount,
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

    // Get user's stats from Redis
    const redis = await getRedisClient();
    const statsData = await redis.get(`user_stats:${userId}`);
    const rawStats = statsData ? JSON.parse(statsData) : null;

    // Map Redis fields to API response fields
    const response = {
      type: 'user_stats',
      userId,
      stats: {
        currentDailyStreak: rawStats?.currentDailyStreak ?? 0,
        bestDailyStreak: rawStats?.bestDailyStreak ?? 0,
        lastGameCompletedDate: rawStats?.lastGameCompletedDate ?? null,
        totalPoints: rawStats?.totalPoints ?? 0,
        totalGamesPlayed: rawStats?.totalGamesPlayed ?? 0,
        // Chronle-specific stats (stored as "Lettered" in Redis)
        totalChronleGamesPlayed: rawStats?.totalLetteredGamesPlayed ?? 0,
        totalChronleWins: rawStats?.totalLetteredWins ?? 0,
        totalChronleLosses: rawStats?.totalLetteredLosses ?? 0,
        chronleWinRate: rawStats?.totalLetteredWinRate ?? 0,
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

    // Get user data
    const redis = await getRedisClient();
    const userData = await redis.get(`user:${userId}`);
    const user = userData ? JSON.parse(userData) : null;
    
    const leaderboardKey = `leaderboard:${periodValue}`;
    const totalCount = await redis.zCard(leaderboardKey);
    const rankResult = await redis.zRank(leaderboardKey, userId);
    const rank = rankResult !== null ? totalCount - rankResult : null;
    const score = await redis.zScore(leaderboardKey, userId);

    const response = {
      type: 'user_leaderboard_position',
      userId,
      username: user?.handle || 'Anonymous',
      imageUrl: user?.imageUrl || null,
      rank,
      totalPoints: score || 0,
      totalGamesPlayed: 0,
    };

    logRouteInfo('/api/leaderboard/user', {
      result: 'success',
      userId,
      rank: response.rank,
      totalPoints: response.totalPoints,
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
