import { supabase } from '../../shared/supabase-server';
import type { LeaderboardInsert } from '../../shared/types/supabase';
import { getCurrentUTCISOString } from './time';

/**
 * Records a user's points in the leaderboard after completing a game
 */
export async function recordLeaderboardEntry(
  userId: string,
  dailyGameId: string,
  gameSessionId: string,
  pointsEarned: number,
  sessionType?: 'lettered' | 'topx'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create the leaderboard entry (no running total, just the points earned for this game)
    const leaderboardEntry: LeaderboardInsert = {
      user_id: userId,
      daily_game_id: dailyGameId,
      game_session_id: gameSessionId,
      points_earned: pointsEarned,
      completed_at: getCurrentUTCISOString(),
      session_type: sessionType,
    };

    const { error: insertError } = await supabase.from('leaderboard').insert(leaderboardEntry);

    if (insertError) {
      // Check if this is a duplicate entry (user already has a leaderboard entry for this daily game)
      if (insertError.code === '23505') {
        // Unique constraint violation
        // Update the existing entry instead
        const { error: updateError } = await supabase
          .from('leaderboard')
          .update({
            points_earned: pointsEarned,
            completed_at: getCurrentUTCISOString(),
            session_type: sessionType,
          })
          .eq('user_id', userId)
          .eq('daily_game_id', dailyGameId);

        if (updateError) {
          console.error('Error updating leaderboard entry:', updateError);
          return { success: false, error: updateError.message };
        }
      } else {
        console.error('Error inserting leaderboard entry:', insertError);
        return { success: false, error: insertError.message };
      }
    }

    console.log(`Recorded leaderboard entry for user ${userId}: ${pointsEarned} points`);
    return { success: true };
  } catch (error) {
    console.error('Error recording leaderboard entry:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Gets a user's current total points from the leaderboard by summing all their game scores
 */
export async function getUserTotalPoints(userId: string): Promise<number> {
  try {
    const { data: entries } = await supabase
      .from('leaderboard')
      .select('points_earned')
      .eq('user_id', userId);

    if (!entries || entries.length === 0) {
      return 0;
    }

    return entries.reduce((total, entry) => total + entry.points_earned, 0);
  } catch (error) {
    console.error('Error getting user total points:', error);
    return 0;
  }
}

/**
 * No longer needed since we don't store running totals - totals are calculated on-the-fly
 * This function is kept for backwards compatibility but does nothing
 */
export async function recalculateUserLeaderboard(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`Recalculation not needed for user ${userId} - totals are calculated on-the-fly`);
  return { success: true };
}
