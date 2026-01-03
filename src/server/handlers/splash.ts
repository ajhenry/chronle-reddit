import { Router, type Router as RouterType } from 'express';
import { context } from '@devvit/web/server';
import { getRedisClient } from '../lib/redis-provider';
import { reddit } from '../lib/reddit-provider';
import { RedisKeys, deserialize } from '../../shared/types/redis';
import { getGameStats } from '../database/lettered';
import { SplashStatsResponse, LetteredGameData } from '../../shared/types/api';
import { getLetteredGameNumber, isDevelopment } from '../../shared/utils';

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
      // Include the game number (e.g., "December 23rd, 2025 (#21)")
      const gameNumber = getLetteredGameNumber(gameId);
      response.formattedDate = `${formatDateWithOrdinal(gameId)} (#${gameNumber})`;
    } else {
      // For custom games, include creator info
      response.title = gameData.category;
      response.creatorUsername = gameData.creatorUsername!;
      response.creatorIconUrl = gameData.creatorIconUrl!;

      // Check if current user is the creator
      try {
        const currentUser = await reddit.getCurrentUser();
        if (currentUser && gameData.creatorUsername) {
          response.isCreator = currentUser.username === gameData.creatorUsername;
        }
      } catch (err) {
        // If we can't get the current user, just don't set isCreator
        console.log('Could not check creator status:', err);
      }
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

// DELETE /api/splash/:gameId - Delete a custom puzzle (creator only)
router.delete('/api/splash/:gameId', async (req, res): Promise<void> => {
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

    // Check if this is a daily game (can't delete daily games)
    const isDaily = isDailyGameId(gameId) || gameData.postType === 'daily';
    if (isDaily) {
      res.status(403).json({
        status: 'error',
        message: 'Cannot delete daily games',
      });
      return;
    }

    // Verify the current user is the creator
    const currentUser = await reddit.getCurrentUser();
    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    if (currentUser.username !== gameData.creatorUsername) {
      res.status(403).json({
        status: 'error',
        message: 'Only the puzzle creator can delete this puzzle',
      });
      return;
    }

    // Get the post ID from context
    const postId = isDevelopment() ? 'mock_post_id' : context.postId;

    // Delete the Reddit post
    if (postId) {
      try {
        await reddit.deletePost(postId);
        console.log('Reddit post deleted:', postId);
      } catch (error) {
        console.error('Failed to delete Reddit post:', error);
        // Continue with deleting game data even if post deletion fails
      }
    }

    // Delete the game data
    await redis.del(RedisKeys.letteredGame.byId(gameId));

    // Delete the per-game leaderboard
    await redis.del(RedisKeys.letteredGameLeaderboard(gameId));
    await redis.del(RedisKeys.letteredGameLeaderboardMeta(gameId));

    // Delete custom game leaderboard (legacy format)
    await redis.del(`custom-lettered:leaderboard:${gameId}`);

    // Delete post-to-game mappings
    if (postId) {
      await redis.del(`custom-lettered:post:${postId}`);
      // Also try without/with t3_ prefix
      if (postId.startsWith('t3_')) {
        await redis.del(`custom-lettered:post:${postId.replace('t3_', '')}`);
      } else {
        await redis.del(`custom-lettered:post:t3_${postId}`);
      }
    }

    console.log('Custom puzzle deleted:', {
      gameId,
      postId,
      deletedBy: currentUser.username,
      creator: gameData.creatorUsername,
    });

    res.json({
      status: 'success',
      message: 'Puzzle and post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting puzzle:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete puzzle',
    });
  }
});

export default router;
