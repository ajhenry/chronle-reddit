import { supabase } from '../../shared/supabase-server';
import { Database } from '../../shared/types/supabase';

// Database types
type SeasonLeaderboardRow = Database['public']['Tables']['season_leaderboard']['Row'];
type TopXLeaderboardRow = Database['public']['Tables']['topx_leaderboard']['Row'];
type LetteredLeaderboardRow = Database['public']['Tables']['lettered_leaderboard']['Row'];
type UserStatsRow = Database['public']['Tables']['user_stats']['Row'];
type UserSeasonStatsRow = Database['public']['Tables']['user_season_stats']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

// Joined types for leaderboard queries
type SeasonLeaderboardEntryWithUser = SeasonLeaderboardRow & { users: Pick<UserRow, 'handle'> };
type TopXLeaderboardEntryWithUser = TopXLeaderboardRow & { users: Pick<UserRow, 'handle'> };
type LetteredLeaderboardEntryWithUser = LetteredLeaderboardRow & { users: Pick<UserRow, 'handle'> };

// Types for leaderboard data
export interface SeasonLeaderboardEntry {
  rank: number;
  userId: string;
  redditHandle: string;
  totalPoints: number;
  gamesPlayed: number;
  averageTopxScore: number | null;
  averageTopxAttemptsUsed: number | null;
  averageLetteredScore: number | null;
  averageLetteredMovesUsed: number | null;
  averageScore: number | null;
}

export interface TopXLeaderboardEntry {
  rank: number;
  userId: string;
  redditHandle: string;
  totalPoints: number;
  gamesPlayed: number;
  averageScore: number | null;
  averageAttemptsUsed: number | null;
  averageTime: number | null;
}

export interface LetteredLeaderboardEntry {
  rank: number;
  userId: string;
  redditHandle: string;
  totalPoints: number;
  gamesPlayed: number;
  averageScore: number | null;
  averageMoves: number | null;
  averageTime: number | null;
}

export interface UserStats {
  currentDailyStreak: number;
  bestDailyStreak: number;
  currentDailyLetteredStreak: number;
  bestDailyLetteredStreak: number;
  currentDailyTopxStreak: number;
  bestDailyTopxStreak: number;
  totalPoints: number;
  totalGamesPlayed: number;
  totalTopxGamesPlayed: number;
  totalLetteredGamesPlayed: number;
  totalTopxPoints: number;
  totalLetteredPoints: number;
  totalTopxWins: number;
  totalLetteredWins: number;
  totalTopxLosses: number;
  totalLetteredLosses: number;
  totalTopxWinRate: number | null;
  totalLetteredWinRate: number | null;
  totalTopxAverageScore: number | null;
  totalLetteredAverageScore: number | null;
}

export interface UserSeasonStats extends UserStats {
  seasonId: string;
}

// Converter functions
const convertSeasonLeaderboardEntry = (
  entry: SeasonLeaderboardEntryWithUser,
  rank: number
): SeasonLeaderboardEntry => ({
  rank,
  userId: entry.user_id,
  redditHandle: entry.users.handle,
  totalPoints: entry.total_points,
  gamesPlayed: entry.games_played,
  averageTopxScore: entry.average_topx_score,
  averageTopxAttemptsUsed: entry.average_topx_attempts_used,
  averageLetteredScore: entry.average_lettered_score,
  averageLetteredMovesUsed: entry.average_lettered_moves_used,
  averageScore: entry.average_score,
});

const convertTopXLeaderboardEntry = (
  entry: TopXLeaderboardEntryWithUser,
  rank: number
): TopXLeaderboardEntry => ({
  rank,
  userId: entry.user_id,
  redditHandle: entry.users.handle,
  totalPoints: entry.total_points,
  gamesPlayed: entry.games_played,
  averageScore: entry.average_score,
  averageAttemptsUsed: entry.average_attempts_used,
  averageTime: entry.average_time,
});

const convertLetteredLeaderboardEntry = (
  entry: LetteredLeaderboardEntryWithUser,
  rank: number
): LetteredLeaderboardEntry => ({
  rank,
  userId: entry.user_id,
  redditHandle: entry.users.handle,
  totalPoints: entry.total_points,
  gamesPlayed: entry.games_played,
  averageScore: entry.average_score,
  averageMoves: entry.average_moves,
  averageTime: entry.average_time,
});

const convertUserStats = (stats: UserStatsRow): UserStats => ({
  currentDailyStreak: stats.current_daily_streak,
  bestDailyStreak: stats.best_daily_streak,
  currentDailyLetteredStreak: stats.current_daily_lettered_streak,
  bestDailyLetteredStreak: stats.best_daily_lettered_streak,
  currentDailyTopxStreak: stats.current_daily_topx_streak,
  bestDailyTopxStreak: stats.best_daily_topx_streak,
  totalPoints: stats.total_points,
  totalGamesPlayed: stats.total_games_played,
  totalTopxGamesPlayed: stats.total_topx_games_played,
  totalLetteredGamesPlayed: stats.total_lettered_games_played,
  totalTopxPoints: stats.total_topx_points,
  totalLetteredPoints: stats.total_lettered_points,
  totalTopxWins: stats.total_topx_wins,
  totalLetteredWins: stats.total_lettered_wins,
  totalTopxLosses: stats.total_topx_losses,
  totalLetteredLosses: stats.total_lettered_losses,
  totalTopxWinRate: stats.total_topx_win_rate,
  totalLetteredWinRate: stats.total_lettered_win_rate,
  totalTopxAverageScore: stats.total_topx_average_score,
  totalLetteredAverageScore: stats.total_lettered_average_score,
});

const convertUserSeasonStats = (stats: UserSeasonStatsRow): UserSeasonStats => ({
  seasonId: stats.season_id,
  currentDailyStreak: stats.current_daily_streak,
  bestDailyStreak: stats.best_daily_streak,
  currentDailyLetteredStreak: stats.current_daily_lettered_streak,
  bestDailyLetteredStreak: stats.best_daily_lettered_streak,
  currentDailyTopxStreak: stats.current_daily_topx_streak,
  bestDailyTopxStreak: stats.best_daily_topx_streak,
  totalPoints: stats.total_points,
  totalGamesPlayed: stats.total_games_played,
  totalTopxGamesPlayed: stats.total_topx_games_played,
  totalLetteredGamesPlayed: stats.total_lettered_games_played,
  totalTopxPoints: stats.total_topx_points,
  totalLetteredPoints: stats.total_lettered_points,
  totalTopxWins: stats.total_topx_wins,
  totalLetteredWins: stats.total_lettered_wins,
  totalTopxLosses: stats.total_topx_losses,
  totalLetteredLosses: stats.total_lettered_losses,
  totalTopxWinRate: stats.total_topx_win_rate,
  totalLetteredWinRate: stats.total_lettered_win_rate,
  totalTopxAverageScore: stats.total_topx_average_score,
  totalLetteredAverageScore: stats.total_lettered_average_score,
});

// Season leaderboard functions
export async function getSeasonLeaderboard(
  seasonId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ entries: SeasonLeaderboardEntry[]; totalPlayers: number }> {
  const { data: rankings, error } = await supabase
    .from('season_leaderboard')
    .select(
      `
      *,
      users!inner(handle)
    `
    )
    .eq('season_id', seasonId)
    .order('total_points', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch season leaderboard: ${error.message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: totalPlayers, error: countError } = await (supabase as any)
    .from('season_leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId);

  if (countError) {
    throw new Error(`Failed to count season players: ${countError.message}`);
  }

  return {
    entries: (rankings || []).map((entry, index) =>
      convertSeasonLeaderboardEntry(entry, offset + index + 1)
    ),
    totalPlayers: totalPlayers || 0,
  };
}

export async function getUserSeasonRank(seasonId: string, userId: string): Promise<number | null> {
  const { data: userEntry, error: userError } = await supabase
    .from('season_leaderboard')
    .select('total_points')
    .eq('season_id', seasonId)
    .eq('user_id', userId)
    .single();

  if (userError || !userEntry) {
    return null;
  }

  const { data: rankData, error: rankError } = await supabase
    .from('season_leaderboard')
    .select('total_points', { count: 'exact' })
    .eq('season_id', seasonId)
    .gt('total_points', userEntry.total_points);

  if (rankError) {
    return null;
  }

  return (rankData?.length || 0) + 1;
}

// TopX leaderboard functions
export async function getTopXLeaderboard(
  seasonId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ entries: TopXLeaderboardEntry[]; totalPlayers: number }> {
  const { data: rankings, error } = await supabase
    .from('topx_leaderboard')
    .select(
      `
      *,
      users!inner(handle)
    `
    )
    .eq('season_id', seasonId)
    .order('total_points', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch TopX leaderboard: ${error.message}`);
  }

  const { count: totalPlayers, error: countError } = await supabase
    .from('topx_leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId);

  if (countError) {
    throw new Error(`Failed to count TopX players: ${countError.message}`);
  }

  return {
    entries: (rankings || []).map((entry, index) =>
      convertTopXLeaderboardEntry(entry, offset + index + 1)
    ),
    totalPlayers: totalPlayers || 0,
  };
}

export async function getUserTopXRank(seasonId: string, userId: string): Promise<number | null> {
  const { data: userEntry, error: userError } = await supabase
    .from('topx_leaderboard')
    .select('total_points')
    .eq('season_id', seasonId)
    .eq('user_id', userId)
    .single();

  if (userError || !userEntry) {
    return null;
  }

  const { data: rankData, error: rankError } = await supabase
    .from('topx_leaderboard')
    .select('total_points', { count: 'exact' })
    .eq('season_id', seasonId)
    .gt('total_points', userEntry.total_points);

  if (rankError) {
    return null;
  }

  return (rankData?.length || 0) + 1;
}

// Lettered leaderboard functions
export async function getLetteredLeaderboard(
  seasonId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ entries: LetteredLeaderboardEntry[]; totalPlayers: number }> {
  const { data: rankings, error } = await supabase
    .from('lettered_leaderboard')
    .select(
      `
      *,
      users!inner(handle)
    `
    )
    .eq('season_id', seasonId)
    .order('total_points', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch Lettered leaderboard: ${error.message}`);
  }

  const { count: totalPlayers, error: countError } = await supabase
    .from('lettered_leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId);

  if (countError) {
    throw new Error(`Failed to count Lettered players: ${countError.message}`);
  }

  return {
    entries: (rankings || []).map((entry, index) =>
      convertLetteredLeaderboardEntry(entry, offset + index + 1)
    ),
    totalPlayers: totalPlayers || 0,
  };
}

export async function getUserLetteredRank(
  seasonId: string,
  userId: string
): Promise<number | null> {
  const { data: userEntry, error: userError } = await supabase
    .from('lettered_leaderboard')
    .select('total_points')
    .eq('season_id', seasonId)
    .eq('user_id', userId)
    .single();

  if (userError || !userEntry) {
    return null;
  }

  const { data: rankData, error: rankError } = await supabase
    .from('lettered_leaderboard')
    .select('total_points', { count: 'exact' })
    .eq('season_id', seasonId)
    .gt('total_points', userEntry.total_points);

  if (rankError) {
    return null;
  }

  return (rankData?.length || 0) + 1;
}

// User stats functions
export async function getUserStats(userId: string): Promise<UserStats | null> {
  const { data: userStats, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch user statistics: ${error.message}`);
  }

  return userStats ? convertUserStats(userStats) : null;
}

export async function getUserSeasonStats(
  userId: string,
  seasonId: string
): Promise<UserSeasonStats | null> {
  const { data: seasonStats, error } = await supabase
    .from('user_season_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('season_id', seasonId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch user season statistics: ${error.message}`);
  }

  return seasonStats ? convertUserSeasonStats(seasonStats) : null;
}
