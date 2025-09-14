import { getCurrentActiveSeason } from '../database/season';
import { supabase } from '../../shared/supabase-server';

/**
 * Calculate daily streak based on last game completion date
 */
async function calculateDailyStreak(
  userId: string,
  gameType: string | null = null
): Promise<number> {
  try {
    let lastCompletionDate: Date | null = null;

    // Query the appropriate table(s) based on game type
    if (gameType === 'topx') {
      // Only consider TopX games
      const { data: topxLastCompletion, error } = await supabase
        .from('topx_sessions')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (!error && topxLastCompletion && topxLastCompletion.length > 0) {
        lastCompletionDate = new Date(topxLastCompletion[0].completed_at);
      }
    } else if (gameType === 'lettered') {
      // Only consider Lettered games
      const { data: letteredLastCompletion, error } = await supabase
        .from('lettered_sessions')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (!error && letteredLastCompletion && letteredLastCompletion.length > 0) {
        lastCompletionDate = new Date(letteredLastCompletion[0].completed_at);
      }
    } else {
      // Consider both game types (null gameType)
      const { data: topxLastCompletion, error: topxError } = await supabase
        .from('topx_sessions')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (!topxError && topxLastCompletion && topxLastCompletion.length > 0) {
        lastCompletionDate = new Date(topxLastCompletion[0].completed_at);
      }

      const { data: letteredLastCompletion, error: letteredError } = await supabase
        .from('lettered_sessions')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (!letteredError && letteredLastCompletion && letteredLastCompletion.length > 0) {
        const letteredDate = new Date(letteredLastCompletion[0].completed_at);
        if (!lastCompletionDate || letteredDate > lastCompletionDate) {
          lastCompletionDate = letteredDate;
        }
      }
    }

    if (!lastCompletionDate) {
      return 1; // No previous completion, start with streak of 1
    }

    // Use UTC dates for consistent timezone handling
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const yesterday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)
    );

    // Convert last completion date to UTC day
    const lastCompletionUTC = new Date(lastCompletionDate);
    const lastCompletionDay = new Date(
      Date.UTC(
        lastCompletionUTC.getUTCFullYear(),
        lastCompletionUTC.getUTCMonth(),
        lastCompletionUTC.getUTCDate()
      )
    );

    // If last completion was today, don't change streak (already counted)
    if (lastCompletionDay.getTime() === today.getTime()) {
      // Get current streak from user_stats
      const { data: userStats, error: statsError } = await supabase
        .from('user_stats')
        .select(
          gameType === 'topx'
            ? 'current_daily_topx_streak'
            : gameType === 'lettered'
              ? 'current_daily_lettered_streak'
              : 'current_daily_streak'
        )
        .eq('user_id', userId)
        .single();

      if (!statsError && userStats) {
        const streakField =
          gameType === 'topx'
            ? 'current_daily_topx_streak'
            : gameType === 'lettered'
              ? 'current_daily_lettered_streak'
              : 'current_daily_streak';
        return userStats[streakField] || 1;
      }
      return 1;
    }

    // If last completion was yesterday, increment streak
    if (lastCompletionDay.getTime() === yesterday.getTime()) {
      // Get current streak and increment
      const { data: userStats, error: statsError } = await supabase
        .from('user_stats')
        .select(
          gameType === 'topx'
            ? 'current_daily_topx_streak'
            : gameType === 'lettered'
              ? 'current_daily_lettered_streak'
              : 'current_daily_streak'
        )
        .eq('user_id', userId)
        .single();

      if (!statsError && userStats) {
        const streakField =
          gameType === 'topx'
            ? 'current_daily_topx_streak'
            : gameType === 'lettered'
              ? 'current_daily_lettered_streak'
              : 'current_daily_streak';
        return (userStats[streakField] || 0) + 1;
      }
      return 1;
    }

    // If last completion was more than 1 day ago, reset to 1
    return 1;
  } catch (error) {
    console.error('Error calculating daily streak:', error);
    return 1;
  }
}

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

    // Get existing leaderboard entries to calculate proper averages
    const { data: existingTopXEntry } = await supabase
      .from('topx_leaderboard')
      .select('*')
      .eq('season_id', currentSeason.id)
      .eq('user_id', userId)
      .single();

    const { data: existingSeasonEntry } = await supabase
      .from('season_leaderboard')
      .select('*')
      .eq('season_id', currentSeason.id)
      .eq('user_id', userId)
      .single();

    const { data: existingUserStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: existingSeasonStats } = await supabase
      .from('user_season_stats')
      .select('*')
      .eq('season_id', currentSeason.id)
      .eq('user_id', userId)
      .single();

    // Calculate new values for TopX leaderboard
    const topxGamesPlayed = (existingTopXEntry?.games_played || 0) + 1;
    const topxTotalPoints = (existingTopXEntry?.total_points || 0) + finalScore;
    const topxAverageScore = Math.round((topxTotalPoints / topxGamesPlayed) * 100) / 100;
    const topxAverageAttempts =
      Math.round(
        (((existingTopXEntry?.average_attempts_used || 0) * (topxGamesPlayed - 1) + attemptsUsed) /
          topxGamesPlayed) *
          100
      ) / 100;
    const topxAverageTime =
      Math.round(
        (((existingTopXEntry?.average_time || 0) * (topxGamesPlayed - 1) + timeElapsed) /
          topxGamesPlayed) *
          100
      ) / 100;

    // Update TopX leaderboard entry
    const { error: topxError } = await supabase.from('topx_leaderboard').upsert(
      {
        season_id: currentSeason.id,
        user_id: userId,
        total_points: topxTotalPoints,
        games_played: topxGamesPlayed,
        average_score: topxAverageScore,
        average_attempts_used: topxAverageAttempts,
        average_time: topxAverageTime,
      },
      {
        onConflict: 'season_id,user_id',
      }
    );

    if (topxError) {
      throw new Error(`Failed to upsert TopX leaderboard entry: ${topxError.message}`);
    }

    // Calculate new values for season leaderboard
    const seasonGamesPlayed = (existingSeasonEntry?.games_played || 0) + 1;
    const seasonTotalPoints = (existingSeasonEntry?.total_points || 0) + finalScore;
    const seasonAverageScore = Math.round((seasonTotalPoints / seasonGamesPlayed) * 100) / 100;
    const seasonTopxAverageScore =
      Math.round(
        (((existingSeasonEntry?.average_topx_score || 0) * (existingTopXEntry?.games_played || 0) +
          finalScore) /
          topxGamesPlayed) *
          100
      ) / 100;
    const seasonTopxAverageAttempts =
      Math.round(
        (((existingSeasonEntry?.average_topx_attempts_used || 0) *
          (existingTopXEntry?.games_played || 0) +
          attemptsUsed) /
          topxGamesPlayed) *
          100
      ) / 100;

    // Update season leaderboard entry
    const { error: seasonError } = await supabase.from('season_leaderboard').upsert(
      {
        season_id: currentSeason.id,
        user_id: userId,
        total_points: seasonTotalPoints,
        games_played: seasonGamesPlayed,
        average_topx_score: seasonTopxAverageScore,
        average_topx_attempts_used: seasonTopxAverageAttempts,
        average_score: seasonAverageScore,
      },
      {
        onConflict: 'season_id,user_id',
      }
    );

    if (seasonError) {
      throw new Error(`Failed to upsert season leaderboard entry: ${seasonError.message}`);
    }

    // Calculate streaks
    const currentStreak = await calculateDailyStreak(userId, null);
    const bestStreak = Math.max(existingUserStats?.best_daily_streak || 0, currentStreak);
    const currentTopxStreak = await calculateDailyStreak(userId, 'topx');
    const bestTopxStreak = Math.max(
      existingUserStats?.best_daily_topx_streak || 0,
      currentTopxStreak
    );

    // Calculate new values for user stats
    const userTotalGames = (existingUserStats?.total_games_played || 0) + 1;
    const userTotalPoints = (existingUserStats?.total_points || 0) + finalScore;
    const userTopxGames = (existingUserStats?.total_topx_games_played || 0) + 1;
    const userTopxPoints = (existingUserStats?.total_topx_points || 0) + finalScore;
    const userTopxWins = (existingUserStats?.total_topx_wins || 0) + (won ? 1 : 0);
    const userTopxLosses = (existingUserStats?.total_topx_losses || 0) + (won ? 0 : 1);
    const userTopxWinRate =
      userTopxGames > 0 ? Math.round((userTopxWins / userTopxGames) * 10000) / 100 : null;
    const userTopxAverageScore = Math.round((userTopxPoints / userTopxGames) * 100) / 100;

    // Update user stats
    const { error: userStatsError } = await supabase.from('user_stats').upsert(
      {
        user_id: userId,
        total_points: userTotalPoints,
        total_games_played: userTotalGames,
        current_daily_streak: currentStreak,
        best_daily_streak: bestStreak,
        total_topx_games_played: userTopxGames,
        total_topx_points: userTopxPoints,
        total_topx_wins: userTopxWins,
        total_topx_losses: userTopxLosses,
        total_topx_win_rate: userTopxWinRate,
        total_topx_average_score: userTopxAverageScore,
        current_daily_topx_streak: currentTopxStreak,
        best_daily_topx_streak: bestTopxStreak,
      },
      {
        onConflict: 'user_id',
      }
    );

    if (userStatsError) {
      throw new Error(`Failed to upsert user stats: ${userStatsError.message}`);
    }

    // Calculate new values for user season stats
    const seasonStatsTotalGames = (existingSeasonStats?.total_games_played || 0) + 1;
    const seasonStatsTotalPoints = (existingSeasonStats?.total_points || 0) + finalScore;
    const seasonStatsTopxGames = (existingSeasonStats?.total_topx_games_played || 0) + 1;
    const seasonStatsTopxPoints = (existingSeasonStats?.total_topx_points || 0) + finalScore;
    const seasonStatsTopxWins = (existingSeasonStats?.total_topx_wins || 0) + (won ? 1 : 0);
    const seasonStatsTopxLosses = (existingSeasonStats?.total_topx_losses || 0) + (won ? 0 : 1);
    const seasonStatsTopxWinRate =
      seasonStatsTopxGames > 0
        ? Math.round((seasonStatsTopxWins / seasonStatsTopxGames) * 10000) / 100
        : null;
    const seasonStatsTopxAverageScore =
      Math.round((seasonStatsTopxPoints / seasonStatsTopxGames) * 100) / 100;

    // Calculate season streaks
    const seasonCurrentStreak = await calculateDailyStreak(userId, null);
    const seasonBestStreak = Math.max(
      existingSeasonStats?.best_daily_streak || 0,
      seasonCurrentStreak
    );
    const seasonCurrentTopxStreak = await calculateDailyStreak(userId, 'topx');
    const seasonBestTopxStreak = Math.max(
      existingSeasonStats?.best_daily_topx_streak || 0,
      seasonCurrentTopxStreak
    );

    // Update user season stats
    const { error: userSeasonStatsError } = await supabase.from('user_season_stats').upsert(
      {
        season_id: currentSeason.id,
        user_id: userId,
        total_points: seasonStatsTotalPoints,
        total_games_played: seasonStatsTotalGames,
        current_daily_streak: seasonCurrentStreak,
        best_daily_streak: seasonBestStreak,
        total_topx_games_played: seasonStatsTopxGames,
        total_topx_points: seasonStatsTopxPoints,
        total_topx_wins: seasonStatsTopxWins,
        total_topx_losses: seasonStatsTopxLosses,
        total_topx_win_rate: seasonStatsTopxWinRate,
        total_topx_average_score: seasonStatsTopxAverageScore,
        current_daily_topx_streak: seasonCurrentTopxStreak,
        best_daily_topx_streak: seasonBestTopxStreak,
      },
      {
        onConflict: 'season_id,user_id',
      }
    );

    if (userSeasonStatsError) {
      throw new Error(`Failed to upsert user season stats: ${userSeasonStatsError.message}`);
    }

    console.log(
      `Updated leaderboards for user ${userId}: score=${finalScore}, attempts=${attemptsUsed}, won=${won}, currentStreak=${currentStreak}`
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

    // Get existing leaderboard entries to calculate proper averages
    const { data: existingLetteredEntry } = await supabase
      .from('lettered_leaderboard')
      .select('*')
      .eq('season_id', currentSeason.id)
      .eq('user_id', userId)
      .single();

    const { data: existingSeasonEntry } = await supabase
      .from('season_leaderboard')
      .select('*')
      .eq('season_id', currentSeason.id)
      .eq('user_id', userId)
      .single();

    const { data: existingUserStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: existingSeasonStats } = await supabase
      .from('user_season_stats')
      .select('*')
      .eq('season_id', currentSeason.id)
      .eq('user_id', userId)
      .single();

    // Calculate new values for Lettered leaderboard
    const letteredGamesPlayed = (existingLetteredEntry?.games_played || 0) + 1;
    const letteredTotalPoints = (existingLetteredEntry?.total_points || 0) + finalScore;
    const letteredAverageScore =
      Math.round((letteredTotalPoints / letteredGamesPlayed) * 100) / 100;
    const letteredAverageMoves =
      Math.round(
        (((existingLetteredEntry?.average_moves || 0) * (letteredGamesPlayed - 1) + movesUsed) /
          letteredGamesPlayed) *
          100
      ) / 100;
    const letteredAverageTime =
      Math.round(
        (((existingLetteredEntry?.average_time || 0) * (letteredGamesPlayed - 1) + timeElapsed) /
          letteredGamesPlayed) *
          100
      ) / 100;

    // Update Lettered leaderboard entry
    const { error: letteredError } = await supabase.from('lettered_leaderboard').upsert(
      {
        season_id: currentSeason.id,
        user_id: userId,
        total_points: letteredTotalPoints,
        games_played: letteredGamesPlayed,
        average_score: letteredAverageScore,
        average_moves: letteredAverageMoves,
        average_time: letteredAverageTime,
      },
      {
        onConflict: 'season_id,user_id',
      }
    );

    if (letteredError) {
      throw new Error(`Failed to upsert Lettered leaderboard entry: ${letteredError.message}`);
    }

    // Calculate new values for season leaderboard
    const seasonGamesPlayed = (existingSeasonEntry?.games_played || 0) + 1;
    const seasonTotalPoints = (existingSeasonEntry?.total_points || 0) + finalScore;
    const seasonAverageScore = Math.round((seasonTotalPoints / seasonGamesPlayed) * 100) / 100;
    const seasonLetteredAverageScore =
      Math.round(
        (((existingSeasonEntry?.average_lettered_score || 0) *
          (existingLetteredEntry?.games_played || 0) +
          finalScore) /
          letteredGamesPlayed) *
          100
      ) / 100;
    const seasonLetteredAverageMoves =
      Math.round(
        (((existingSeasonEntry?.average_lettered_moves_used || 0) *
          (existingLetteredEntry?.games_played || 0) +
          movesUsed) /
          letteredGamesPlayed) *
          100
      ) / 100;

    // Update season leaderboard entry
    const { error: seasonError } = await supabase.from('season_leaderboard').upsert(
      {
        season_id: currentSeason.id,
        user_id: userId,
        total_points: seasonTotalPoints,
        games_played: seasonGamesPlayed,
        average_lettered_score: seasonLetteredAverageScore,
        average_lettered_moves_used: seasonLetteredAverageMoves,
        average_score: seasonAverageScore,
      },
      {
        onConflict: 'season_id,user_id',
      }
    );

    if (seasonError) {
      throw new Error(`Failed to upsert season leaderboard entry: ${seasonError.message}`);
    }

    // Calculate streaks
    const currentStreak = await calculateDailyStreak(userId, null);
    const bestStreak = Math.max(existingUserStats?.best_daily_streak || 0, currentStreak);
    const currentLetteredStreak = await calculateDailyStreak(userId, 'lettered');
    const bestLetteredStreak = Math.max(
      existingUserStats?.best_daily_lettered_streak || 0,
      currentLetteredStreak
    );

    // Calculate new values for user stats
    const userTotalGames = (existingUserStats?.total_games_played || 0) + 1;
    const userTotalPoints = (existingUserStats?.total_points || 0) + finalScore;
    const userLetteredGames = (existingUserStats?.total_lettered_games_played || 0) + 1;
    const userLetteredPoints = (existingUserStats?.total_lettered_points || 0) + finalScore;
    const userLetteredWins = (existingUserStats?.total_lettered_wins || 0) + (won ? 1 : 0);
    const userLetteredLosses = (existingUserStats?.total_lettered_losses || 0) + (won ? 0 : 1);
    const userLetteredWinRate =
      userLetteredGames > 0
        ? Math.round((userLetteredWins / userLetteredGames) * 10000) / 100
        : null;
    const userLetteredAverageScore =
      Math.round((userLetteredPoints / userLetteredGames) * 100) / 100;

    // Update user stats
    const { error: userStatsError } = await supabase.from('user_stats').upsert(
      {
        user_id: userId,
        total_points: userTotalPoints,
        total_games_played: userTotalGames,
        current_daily_streak: currentStreak,
        best_daily_streak: bestStreak,
        total_lettered_games_played: userLetteredGames,
        total_lettered_points: userLetteredPoints,
        total_lettered_wins: userLetteredWins,
        total_lettered_losses: userLetteredLosses,
        total_lettered_win_rate: userLetteredWinRate,
        total_lettered_average_score: userLetteredAverageScore,
        current_daily_lettered_streak: currentLetteredStreak,
        best_daily_lettered_streak: bestLetteredStreak,
      },
      {
        onConflict: 'user_id',
      }
    );

    if (userStatsError) {
      throw new Error(`Failed to upsert user stats: ${userStatsError.message}`);
    }

    // Calculate new values for user season stats
    const seasonStatsTotalGames = (existingSeasonStats?.total_games_played || 0) + 1;
    const seasonStatsTotalPoints = (existingSeasonStats?.total_points || 0) + finalScore;
    const seasonStatsLetteredGames = (existingSeasonStats?.total_lettered_games_played || 0) + 1;
    const seasonStatsLetteredPoints =
      (existingSeasonStats?.total_lettered_points || 0) + finalScore;
    const seasonStatsLetteredWins = (existingSeasonStats?.total_lettered_wins || 0) + (won ? 1 : 0);
    const seasonStatsLetteredLosses =
      (existingSeasonStats?.total_lettered_losses || 0) + (won ? 0 : 1);
    const seasonStatsLetteredWinRate =
      seasonStatsLetteredGames > 0
        ? Math.round((seasonStatsLetteredWins / seasonStatsLetteredGames) * 10000) / 100
        : null;
    const seasonStatsLetteredAverageScore =
      Math.round((seasonStatsLetteredPoints / seasonStatsLetteredGames) * 100) / 100;

    // Calculate season streaks
    const seasonCurrentStreak = await calculateDailyStreak(userId, null);
    const seasonBestStreak = Math.max(
      existingSeasonStats?.best_daily_streak || 0,
      seasonCurrentStreak
    );
    const seasonCurrentLetteredStreak = await calculateDailyStreak(userId, 'lettered');
    const seasonBestLetteredStreak = Math.max(
      existingSeasonStats?.best_daily_lettered_streak || 0,
      seasonCurrentLetteredStreak
    );

    // Update user season stats
    const { error: userSeasonStatsError } = await supabase.from('user_season_stats').upsert(
      {
        season_id: currentSeason.id,
        user_id: userId,
        total_points: seasonStatsTotalPoints,
        total_games_played: seasonStatsTotalGames,
        current_daily_streak: seasonCurrentStreak,
        best_daily_streak: seasonBestStreak,
        total_lettered_games_played: seasonStatsLetteredGames,
        total_lettered_points: seasonStatsLetteredPoints,
        total_lettered_wins: seasonStatsLetteredWins,
        total_lettered_losses: seasonStatsLetteredLosses,
        total_lettered_win_rate: seasonStatsLetteredWinRate,
        total_lettered_average_score: seasonStatsLetteredAverageScore,
        current_daily_lettered_streak: seasonCurrentLetteredStreak,
        best_daily_lettered_streak: seasonBestLetteredStreak,
      },
      {
        onConflict: 'season_id,user_id',
      }
    );

    if (userSeasonStatsError) {
      throw new Error(`Failed to upsert user season stats: ${userSeasonStatsError.message}`);
    }

    console.log(
      `Updated leaderboards for user ${userId}: score=${finalScore}, moves=${movesUsed}, won=${won}, currentStreak=${currentStreak}`
    );
  } catch (error) {
    console.error('Error updating Lettered leaderboards:', error);
    throw error;
  }
}
