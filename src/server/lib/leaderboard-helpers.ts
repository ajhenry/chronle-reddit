import { getRedisClient } from './redis-provider';
import { RedisKeys, deserialize } from '../../shared/types/redis';
import { addScoreToLeaderboards, updateUserStats, getUserStats } from '../database/leaderboard';

/**
 * Calculate daily streak based on last game completion date
 */
async function calculateDailyStreak(
  userId: string,
  gameType: string | null = null
): Promise<number> {
  try {
    const redis = await getRedisClient();
    const userStats = await getUserStats(userId);

    if (!userStats) {
      return 1; // No previous stats, start with streak of 1
    }

    // For simplicity, we'll use the existing streak values from Redis
    // In a more complex implementation, you would track last completion dates
    const streakField =
      gameType === 'lettered' ? userStats.currentDailyLetteredStreak : userStats.currentDailyStreak;

    return streakField || 1;
  } catch (error) {
    console.error('Error calculating daily streak:', error);
    return 1;
  }
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

    // Calculate streaks
    const currentStreak = await calculateDailyStreak(userId, null);
    const bestStreak = Math.max(existingStats?.bestDailyStreak || 0, currentStreak);
    const currentLetteredStreak = await calculateDailyStreak(userId, 'lettered');
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

    // Update user stats in Redis
    await updateUserStats(userId, {
      totalGamesPlayed: userTotalGames,
      currentDailyStreak: currentStreak,
      bestDailyStreak: bestStreak,
      totalLetteredGamesPlayed: userLetteredGames,
      totalLetteredWins: userLetteredWins,
      totalLetteredLosses: userLetteredLosses,
      totalLetteredWinRate: userLetteredWinRate,
      currentDailyLetteredStreak: currentLetteredStreak,
      bestDailyLetteredStreak: bestLetteredStreak,
    });

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
      `Updated leaderboards for user ${userId}: moves=${movesUsed}, time=${timeElapsed}s, won=${won}, currentStreak=${currentStreak}`
    );
  } catch (error) {
    console.error('Error updating Lettered leaderboards:', error);
    throw error;
  }
}
