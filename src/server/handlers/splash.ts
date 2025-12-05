import { Router, type Router as RouterType } from 'express';
import { getRedisClient } from '../lib/redis-provider';
import { RedisKeys, deserialize } from '../../shared/types/redis';
import { getGameStats } from '../database/lettered';
import { SplashStatsResponse, LetteredGameData } from '../../shared/types/api';

const router: RouterType = Router();

/**
 * Format a date string like "December 2nd, 2025"
 */
function formatDateWithOrdinal(dateStr: string): string {
  const date = new Date(dateStr);

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  // Get ordinal suffix
  const getOrdinalSuffix = (n: number): string => {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
}

/**
 * Check if a game ID represents a daily game (date format: YYYY-MM-DD)
 */
function isDailyGameId(gameId: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(gameId);
}

// GET /api/splash/:gameId - Get splash screen data for a game
router.get('/api/splash/:gameId', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      res.status(400).json({
        status: 'error',
        message: 'Game ID is required',
      });
      return;
    }

    // Get game data from Redis
    const redis = await getRedisClient();
    const gameDataRaw = await redis.get(RedisKeys.letteredGame.byId(gameId));

    if (!gameDataRaw) {
      res.status(404).json({
        status: 'error',
        message: 'Game not found',
      });
      return;
    }

    const gameData = deserialize<LetteredGameData>(gameDataRaw);
    if (!gameData) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to parse game data',
      });
      return;
    }

    // Get aggregated stats
    const stats = await getGameStats(gameId);

    // Determine if daily or custom game
    const isDaily = isDailyGameId(gameId) || gameData.postType === 'daily';

    const response: SplashStatsResponse = {
      gameId,
      postType: isDaily ? 'daily' : 'custom',
      totalCompletions: stats.totalCompletions,
      averageTimeMs: stats.averageTimeMs,
      averageMoves: stats.averageMoves,
    };

    // Add type-specific fields
    if (isDaily) {
      // For daily games, format the date from the game ID (which is the date string)
      response.formattedDate = formatDateWithOrdinal(gameId);
    } else {
      // For custom games, include creator info
      response.title = gameData.category;
      response.creatorUsername = gameData.creatorUsername!;
      response.creatorIconUrl = gameData.creatorIconUrl!;
    }

    res.json(response);
  } catch (error) {
    console.error('Error getting splash data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get splash data',
    });
  }
});

export default router;
