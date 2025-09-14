import { getCurrentActiveSeason } from '../database/season';
import { supabase } from '../../shared/supabase-server';

/**
 * Updates leaderboard tables when a TopX game is completed
 * Uses direct SQL operations instead of RPC calls
 */
export async function updateTopxLeaderboards(
  userId: string,
  finalScore: number,
  attemptsUsed: number,
  timeElapsed: number // in seconds
): Promise<void> {
  try {
    const currentSeason = await getCurrentActiveSeason();

    // Calculate if user won (finished with attempts remaining)
    const maxAttempts = 6; // This should be configurable, but hardcoded for now
    const won = attemptsUsed < maxAttempts;

    // Update TopX leaderboard entry using direct SQL
    const { error: topxError } = await supabase.from('topx_leaderboard').upsert(
      {
        season_id: currentSeason.id,
        user_id: userId,
        total_points: finalScore,
        games_played: 1,
        average_score: finalScore,
        average_attempts_used: attemptsUsed,
        average_time: timeElapsed,
      },
      {
        onConflict: 'season_id,user_id',
      }
    );

    if (topxError) {
      throw new Error(`Failed to upsert TopX leaderboard entry: ${topxError.message}`);
    }

    // Update season leaderboard entry using direct SQL
    const { error: seasonError } = await supabase.from('season_leaderboard').upsert(
      {
        season_id: currentSeason.id,
        user_id: userId,
        total_points: finalScore,
        games_played: 1,
        average_topx_score: finalScore,
        average_topx_attempts_used: attemptsUsed,
        average_score: finalScore,
      },
      {
        onConflict: 'season_id,user_id',
      }
    );

    if (seasonError) {
      throw new Error(`Failed to upsert season leaderboard entry: ${seasonError.message}`);
    }

    // Update user stats using direct SQL
    const { error: userStatsError } = await supabase.from('user_stats').upsert(
      {
        user_id: userId,
        total_points: finalScore,
        total_games_played: 1,
        total_topx_games_played: 1,
        total_topx_points: finalScore,
        total_topx_wins: won ? 1 : 0,
        total_topx_losses: won ? 0 : 1,
        total_topx_win_rate: won ? 1.0 : 0.0,
        total_topx_average_score: finalScore,
      },
      {
        onConflict: 'user_id',
      }
    );

    if (userStatsError) {
      throw new Error(`Failed to upsert user stats: ${userStatsError.message}`);
    }

    // Update user season stats using direct SQL
    const { error: userSeasonStatsError } = await supabase.from('user_season_stats').upsert(
      {
        season_id: currentSeason.id,
        user_id: userId,
        total_points: finalScore,
        total_games_played: 1,
        total_topx_games_played: 1,
        total_topx_points: finalScore,
        total_topx_wins: won ? 1 : 0,
        total_topx_losses: won ? 0 : 1,
        total_topx_win_rate: won ? 1.0 : 0.0,
        total_topx_average_score: finalScore,
      },
      {
        onConflict: 'season_id,user_id',
      }
    );

    if (userSeasonStatsError) {
      throw new Error(`Failed to upsert user season stats: ${userSeasonStatsError.message}`);
    }

    console.log(
      `Updated leaderboards for user ${userId}: score=${finalScore}, attempts=${attemptsUsed}, won=${won}`
    );
  } catch (error) {
    console.error('Error updating TopX leaderboards:', error);
    throw error;
  }
}

/**
 * Updates leaderboard tables when a Lettered game is completed
 * Uses direct SQL operations instead of RPC calls
 */
export async function updateLetteredLeaderboards(
  userId: string,
  finalScore: number,
  movesUsed: number,
  timeElapsed: number // in seconds
): Promise<void> {
  try {
    const currentSeason = await getCurrentActiveSeason();

    // For lettered games, winning means they completed the puzzle
    const won = movesUsed > 0; // If they made moves, they at least tried

    // Update Lettered leaderboard entry using direct SQL
    const { error: letteredError } = await supabase.from('lettered_leaderboard').upsert(
      {
        season_id: currentSeason.id,
        user_id: userId,
        total_points: finalScore,
        games_played: 1,
        average_score: finalScore,
        average_moves: movesUsed,
        average_time: timeElapsed,
      },
      {
        onConflict: 'season_id,user_id',
      }
    );

    if (letteredError) {
      throw new Error(`Failed to upsert Lettered leaderboard entry: ${letteredError.message}`);
    }

    // Update season leaderboard entry using direct SQL
    const { error: seasonError } = await supabase.from('season_leaderboard').upsert(
      {
        season_id: currentSeason.id,
        user_id: userId,
        total_points: finalScore,
        games_played: 1,
        average_lettered_score: finalScore,
        average_lettered_moves_used: movesUsed,
        average_score: finalScore,
      },
      {
        onConflict: 'season_id,user_id',
      }
    );

    if (seasonError) {
      throw new Error(`Failed to upsert season leaderboard entry: ${seasonError.message}`);
    }

    // Update user stats using direct SQL
    const { error: userStatsError } = await supabase.from('user_stats').upsert(
      {
        user_id: userId,
        total_points: finalScore,
        total_games_played: 1,
        total_lettered_games_played: 1,
        total_lettered_points: finalScore,
        total_lettered_wins: won ? 1 : 0,
        total_lettered_losses: won ? 0 : 1,
        total_lettered_win_rate: won ? 1.0 : 0.0,
        total_lettered_average_score: finalScore,
      },
      {
        onConflict: 'user_id',
      }
    );

    if (userStatsError) {
      throw new Error(`Failed to upsert user stats: ${userStatsError.message}`);
    }

    // Update user season stats using direct SQL
    const { error: userSeasonStatsError } = await supabase.from('user_season_stats').upsert(
      {
        season_id: currentSeason.id,
        user_id: userId,
        total_points: finalScore,
        total_games_played: 1,
        total_lettered_games_played: 1,
        total_lettered_points: finalScore,
        total_lettered_wins: won ? 1 : 0,
        total_lettered_losses: won ? 0 : 1,
        total_lettered_win_rate: won ? 1.0 : 0.0,
        total_lettered_average_score: finalScore,
      },
      {
        onConflict: 'season_id,user_id',
      }
    );

    if (userSeasonStatsError) {
      throw new Error(`Failed to upsert user season stats: ${userSeasonStatsError.message}`);
    }

    console.log(
      `Updated leaderboards for user ${userId}: score=${finalScore}, moves=${movesUsed}, won=${won}`
    );
  } catch (error) {
    console.error('Error updating Lettered leaderboards:', error);
    throw error;
  }
}
