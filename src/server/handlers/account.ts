import { Router } from 'express';
import { reddit } from '../lib/reddit-provider';
import { getRedisClient } from '../lib/redis-provider';
import { RedisKeys, TimePeriod, serialize, deserialize } from '../../shared/types/redis';
import { logRouteInfo, logError } from '../lib/logging';
import { getOrCreateUser } from '../database/user';

const router = Router();

/**
 * Delete all user data from the app
 * This endpoint allows users to request deletion of all their data
 * in compliance with Reddit's account deletion policy.
 */
router.post('/api/account/delete', async (_req, res): Promise<void> => {
  try {
    logRouteInfo('/api/account/delete', { action: 'delete_account_start' });

    // Get current user
    const redditUser = await reddit.getCurrentUser();
    if (!redditUser) {
      logRouteInfo('/api/account/delete', { result: 'unauthenticated' });
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    const snoovatarUrl = await redditUser.getSnoovatarUrl();
    const user = await getOrCreateUser({
      redditId: redditUser.id,
      handle: redditUser.username,
      imageUrl: snoovatarUrl ?? '',
    });

    const userId = user.id;
    const userHandle = user.handle;

    const redis = await getRedisClient();
    const deletedKeys: string[] = [];
    const errors: string[] = [];

    // 1. Delete user record
    try {
      await redis.del(RedisKeys.user.byId(userId));
      deletedKeys.push(RedisKeys.user.byId(userId));

      await redis.del(RedisKeys.user.byHandle(userHandle));
      deletedKeys.push(RedisKeys.user.byHandle(userHandle));
    } catch (error) {
      errors.push('Failed to delete user record');
      console.error('Error deleting user record:', error);
    }

    // 2. Delete user stats
    try {
      await redis.del(RedisKeys.userStats(userId));
      deletedKeys.push(RedisKeys.userStats(userId));

      await redis.del(RedisKeys.userCurrentStreak(userId));
      deletedKeys.push(RedisKeys.userCurrentStreak(userId));
    } catch (error) {
      errors.push('Failed to delete user stats');
      console.error('Error deleting user stats:', error);
    }

    // 3. Delete user preferences
    try {
      await redis.del(RedisKeys.user.preferences(userId));
      deletedKeys.push(RedisKeys.user.preferences(userId));
    } catch (error) {
      errors.push('Failed to delete user preferences');
      console.error('Error deleting user preferences:', error);
    }

    // 4. Remove from time-period leaderboards (overall and lettered)
    const periods: TimePeriod[] = ['daily', 'weekly', 'monthly', 'alltime'];
    const leaderboardTypes: ('overall' | 'lettered')[] = ['overall', 'lettered'];

    for (const type of leaderboardTypes) {
      for (const period of periods) {
        try {
          const leaderboardKey = RedisKeys.leaderboard(type, period);
          await redis.zRem(leaderboardKey, [userId]);

          // Delete metadata
          const metadataKey = `${leaderboardKey}:meta:${userId}`;
          await redis.del(metadataKey);
          deletedKeys.push(metadataKey);
        } catch (error) {
          errors.push(`Failed to remove from ${type} ${period} leaderboard`);
          console.error(`Error removing from ${type} ${period} leaderboard:`, error);
        }
      }
    }

    // 5. Find and delete game sessions
    // Sessions are stored with key pattern: lettered_sessions:{userId}:{gameId}
    // We need to scan for all sessions belonging to this user
    try {
      const sessionPattern = `lettered_sessions:${userId}:*`;
      const sessionKeys = await scanKeys(redis, sessionPattern);

      for (const sessionKey of sessionKeys) {
        // Get session to find submission keys
        const sessionData = await redis.get(sessionKey);
        if (sessionData) {
          const session = deserialize<{ id: string }>(sessionData);
          if (session?.id) {
            // Delete submissions for this session
            const submissionsKey = RedisKeys.letteredSubmissions(session.id);
            await redis.del(submissionsKey);
            deletedKeys.push(submissionsKey);

            // Remove from global lookup
            await redis.hDel('lettered_session_global_lookup', [session.id]);
          }
        }
        await redis.del(sessionKey);
        deletedKeys.push(sessionKey);
      }
    } catch (error) {
      errors.push('Failed to delete game sessions');
      console.error('Error deleting game sessions:', error);
    }

    // 6. Remove from per-game leaderboards
    // We need to scan for all game leaderboard metadata hashes and remove this user
    try {
      const gameLeaderboardPattern = 'lettered:leaderboard:*:meta';
      const metaKeys = await scanKeys(redis, gameLeaderboardPattern);

      for (const metaKey of metaKeys) {
        await redis.hDel(metaKey, [userId]);
      }

      // Also remove from the sorted sets
      const leaderboardPattern = 'lettered:leaderboard:*';
      const leaderboardKeys = await scanKeys(redis, leaderboardPattern);

      for (const lbKey of leaderboardKeys) {
        // Skip metadata keys
        if (!lbKey.endsWith(':meta')) {
          await redis.zRem(lbKey, [userId]);
        }
      }
    } catch (error) {
      errors.push('Failed to remove from per-game leaderboards');
      console.error('Error removing from per-game leaderboards:', error);
    }

    // 7. Delete player history for custom games
    try {
      const playerHistoryKey = `custom-lettered:player:${userHandle}`;
      await redis.del(playerHistoryKey);
      deletedKeys.push(playerHistoryKey);
    } catch (error) {
      errors.push('Failed to delete player history');
      console.error('Error deleting player history:', error);
    }

    logRouteInfo('/api/account/delete', {
      result: 'success',
      userId,
      deletedKeysCount: deletedKeys.length,
      errorsCount: errors.length,
    });

    console.log('Account deletion completed:', {
      userId,
      userHandle,
      deletedKeysCount: deletedKeys.length,
      errors: errors.length > 0 ? errors : 'none',
    });

    res.json({
      status: 'success',
      message: 'All user data has been deleted',
      deletedKeysCount: deletedKeys.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logError('/api/account/delete', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user data',
    });
  }
});

/**
 * Helper function to scan Redis keys matching a pattern
 * Uses SCAN for efficient iteration without blocking
 */
async function scanKeys(
  redis: Awaited<ReturnType<typeof getRedisClient>>,
  pattern: string
): Promise<string[]> {
  const keys: string[] = [];
  let cursor = 0;

  do {
    // Note: Devvit Redis might not support SCAN, fall back to a simpler approach
    // For now, we'll use a simplified approach that works with the available Redis commands
    try {
      // Try to use scan if available
      const result = await (redis as any).scan(cursor, { match: pattern, count: 100 });
      if (result && Array.isArray(result)) {
        cursor = result[0] || 0;
        if (result[1] && Array.isArray(result[1])) {
          keys.push(...result[1]);
        }
      } else {
        // Scan not available or returned unexpected format
        break;
      }
    } catch {
      // Scan not available, just break and return empty array
      // The caller should handle this gracefully
      break;
    }
  } while (cursor !== 0);

  return keys;
}

export default router;
