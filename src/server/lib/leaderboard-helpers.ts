import { addScoreToLeaderboards, updateUserStats, getUserStats } from '../database/leaderboard';
import { getESTDateString, getPreviousESTDateString, getStreakExpirationTTL } from '../../shared/utils';
import { getRedisClient } from './redis-provider';
import { RedisKeys } from '../../shared/types/redis';

/**
 * Calculate the new daily streak based on last game completion date.
 * Streak rules:
 * - Same day: keep current streak (already played today)
 * - Previous day: increment streak by 1
 * - More than 1 day gap or no previous date: reset streak to 1
 */
function calculateNewStreak(
  currentStreak: number,
  lastGameCompletedDate: string | null,
  todayEST: string
): number {
  // No previous completion date - start fresh at 1
  if (!lastGameCompletedDate) {
    return 1;
  }

  // Same day - already played today, keep streak
  if (lastGameCompletedDate === todayEST) {
    return currentStreak;
  }

  // Check if last game was yesterday (previous EST day)
  const yesterdayEST = getPreviousESTDateString();
  if (lastGameCompletedDate === yesterdayEST) {
    return currentStreak + 1;
  }

  // More than 1 day gap - reset streak
  return 1;
}

/**
 * Store the current streak in a separate Redis key with TTL.
 * This key automatically expires if the user doesn't play, clearing their streak.
 */
async function setCurrentStreakWithTTL(userId: string, streak: number): Promise<void> {
  const redis = await getRedisClient();
  const streakKey = RedisKeys.userCurrentStreak(userId);
  const ttl = getStreakExpirationTTL();

  // Set the streak value with expiration
  await redis.set(streakKey, streak.toString());
  await redis.expire(streakKey, ttl);

  console.log(`Set current streak for user ${userId}: ${streak} (TTL: ${ttl}s)`);
}

/**
 * Updates leaderboard tables when a Lettered game is completed
 * Uses Redis sorted sets for leaderboards
 */
export async function updateLetteredLeaderboards(
  userId: string,
  redditHandle: string,
  movesUsed: number,
  timeElapsed: number // in seconds
): Promise<void> {
  try {
    // For lettered games, winning means they completed the puzzle
    const won = movesUsed > 0;

    // Get existing user stats
    const existingStats = await getUserStats(userId);

    // Get current EST date for streak calculation
    const todayEST = getESTDateString();
    const lastGameCompletedDate = existingStats?.lastGameCompletedDate || null;

    // Calculate new streak values based on date comparison
    const currentStreak = calculateNewStreak(
      existingStats?.currentDailyStreak || 0,
      lastGameCompletedDate,
      todayEST
    );
    const bestStreak = Math.max(existingStats?.bestDailyStreak || 0, currentStreak);

    // For now, lettered streak uses the same date tracking (same field)
    // If separate tracking is needed later, add lastLetteredGameCompletedDate
    const currentLetteredStreak = calculateNewStreak(
      existingStats?.currentDailyLetteredStreak || 0,
      lastGameCompletedDate,
      todayEST
    );
    const bestLetteredStreak = Math.max(
      existingStats?.bestDailyLetteredStreak || 0,
      currentLetteredStreak
    );

    // Calculate new values for user stats (removed score-based tracking)
    const userTotalGames = (existingStats?.totalGamesPlayed || 0) + 1;
    const userLetteredGames = (existingStats?.totalLetteredGamesPlayed || 0) + 1;
    const userLetteredWins = (existingStats?.totalLetteredWins || 0) + (won ? 1 : 0);
    const userLetteredLosses = (existingStats?.totalLetteredLosses || 0) + (won ? 0 : 1);
    const userLetteredWinRate =
      userLetteredGames > 0 ? Math.round((userLetteredWins / userLetteredGames) * 10000) / 100 : null;

    // Update user stats in Redis with new streak and date
    await updateUserStats(userId, {
      totalGamesPlayed: userTotalGames,
      currentDailyStreak: currentStreak,
      bestDailyStreak: bestStreak,
      lastGameCompletedDate: todayEST,
      totalLetteredGamesPlayed: userLetteredGames,
      totalLetteredWins: userLetteredWins,
      totalLetteredLosses: userLetteredLosses,
      totalLetteredWinRate: userLetteredWinRate,
      currentDailyLetteredStreak: currentLetteredStreak,
      bestDailyLetteredStreak: bestLetteredStreak,
    });

    // Store current streak in separate key with TTL for automatic expiration
    await setCurrentStreakWithTTL(userId, currentStreak);

    // Add to leaderboards with time/moves data
    await addScoreToLeaderboards(
      userId,
      redditHandle,
      0, // No score, using time/moves instead
      true, // isLettered
      {
        moves: movesUsed,
        time: timeElapsed,
      }
    );

    console.log(
      `Updated leaderboards for user ${userId}: moves=${movesUsed}, time=${timeElapsed}s, won=${won}, currentStreak=${currentStreak}, bestStreak=${bestStreak}`
    );
  } catch (error) {
    console.error('Error updating Lettered leaderboards:', error);
    throw error;
  }
}

/**
 * Updates just the daily streak for any game type (including custom games).
 * Call this when a user completes any game to maintain their streak.
 */
export async function updateDailyStreak(userId: string): Promise<void> {
  try {
    // Get existing user stats
    const existingStats = await getUserStats(userId);

    // Get current EST date for streak calculation
    const todayEST = getESTDateString();
    const lastGameCompletedDate = existingStats?.lastGameCompletedDate || null;

    // Calculate new streak values based on date comparison
    const currentStreak = calculateNewStreak(
      existingStats?.currentDailyStreak || 0,
      lastGameCompletedDate,
      todayEST
    );
    const bestStreak = Math.max(existingStats?.bestDailyStreak || 0, currentStreak);

    // Update user stats in Redis with new streak and date
    await updateUserStats(userId, {
      currentDailyStreak: currentStreak,
      bestDailyStreak: bestStreak,
      lastGameCompletedDate: todayEST,
    });

    // Store current streak in separate key with TTL for automatic expiration
    await setCurrentStreakWithTTL(userId, currentStreak);

    console.log(
      `Updated daily streak for user ${userId}: currentStreak=${currentStreak}, bestStreak=${bestStreak}`
    );
  } catch (error) {
    console.error('Error updating daily streak:', error);
    throw error;
  }
}
