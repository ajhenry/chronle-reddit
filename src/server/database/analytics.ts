import { getRedisClient } from '../lib/redis-provider';
import { RedisKeys, deserialize, serialize } from '../../shared/types/redis';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ScreenInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
}

export interface AnalyticsData {
  uniqueUsers: number;
  screenSizes: Record<string, number>;
  gamesAttempted: number;
  gamesCompleted: number;
}

/**
 * Track a unique user who has played the game.
 * Uses a Redis set to store unique user IDs.
 */
export async function trackUniqueUser(userId: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    const key = RedisKeys.analytics.uniqueUsers();
    // Use a set to track unique users
    await redis.zAdd(key, { member: userId, score: Date.now() });
  } catch (error) {
    console.error('Failed to track unique user:', error);
    // Silent failure - analytics should not break the app
  }
}

/**
 * Track screen size information from a user.
 * Stores counts per screen dimension and breakpoint combination.
 */
export async function trackScreenSize(screenInfo: ScreenInfo): Promise<void> {
  try {
    const redis = await getRedisClient();
    const key = RedisKeys.analytics.screenSizes();

    // Create a key for this screen size combination
    const sizeKey = `${screenInfo.width}x${screenInfo.height}:${screenInfo.breakpoint}`;

    // Get existing count and increment
    const existingCount = await redis.hGet(key, sizeKey);
    const count = existingCount ? parseInt(existingCount, 10) + 1 : 1;
    await redis.hSet(key, { [sizeKey]: count.toString() });
  } catch (error) {
    console.error('Failed to track screen size:', error);
    // Silent failure - analytics should not break the app
  }
}

/**
 * Increment the count of games attempted.
 * A game is "attempted" when a user first loads/starts a game.
 */
export async function incrementGamesAttempted(): Promise<void> {
  try {
    const redis = await getRedisClient();
    const key = RedisKeys.analytics.gamesAttempted();

    // Get existing count and increment
    const existingValue = await redis.get(key);
    const count = existingValue ? parseInt(existingValue, 10) + 1 : 1;
    await redis.set(key, count.toString());
  } catch (error) {
    console.error('Failed to increment games attempted:', error);
    // Silent failure - analytics should not break the app
  }
}

/**
 * Increment the count of games completed.
 * A game is "completed" when a user successfully finishes a game.
 */
export async function incrementGamesCompleted(): Promise<void> {
  try {
    const redis = await getRedisClient();
    const key = RedisKeys.analytics.gamesCompleted();

    // Get existing count and increment
    const existingValue = await redis.get(key);
    const count = existingValue ? parseInt(existingValue, 10) + 1 : 1;
    await redis.set(key, count.toString());
  } catch (error) {
    console.error('Failed to increment games completed:', error);
    // Silent failure - analytics should not break the app
  }
}

/**
 * Get all analytics data for the admin dashboard.
 */
export async function getAnalytics(): Promise<AnalyticsData> {
  try {
    const redis = await getRedisClient();

    // Get unique users count (size of the set)
    const uniqueUsersKey = RedisKeys.analytics.uniqueUsers();
    const uniqueUsersCount = await redis.zCard(uniqueUsersKey);

    // Get screen sizes hash
    const screenSizesKey = RedisKeys.analytics.screenSizes();
    const screenSizesRaw = await redis.hGetAll(screenSizesKey);
    const screenSizes: Record<string, number> = {};
    for (const [key, value] of Object.entries(screenSizesRaw)) {
      screenSizes[key] = parseInt(value, 10);
    }

    // Get games attempted count
    const gamesAttemptedKey = RedisKeys.analytics.gamesAttempted();
    const gamesAttemptedRaw = await redis.get(gamesAttemptedKey);
    const gamesAttempted = gamesAttemptedRaw ? parseInt(gamesAttemptedRaw, 10) : 0;

    // Get games completed count
    const gamesCompletedKey = RedisKeys.analytics.gamesCompleted();
    const gamesCompletedRaw = await redis.get(gamesCompletedKey);
    const gamesCompleted = gamesCompletedRaw ? parseInt(gamesCompletedRaw, 10) : 0;

    return {
      uniqueUsers: uniqueUsersCount,
      screenSizes,
      gamesAttempted,
      gamesCompleted,
    };
  } catch (error) {
    console.error('Failed to get analytics:', error);
    // Return empty analytics on error
    return {
      uniqueUsers: 0,
      screenSizes: {},
      gamesAttempted: 0,
      gamesCompleted: 0,
    };
  }
}

