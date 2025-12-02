import { supabase } from '../../shared/supabase-server';
import { Database } from '../../shared/types/supabase';

// Database types
type SeasonLeaderboardRow = Database['public']['Tables']['season_leaderboard']['Row'];
type LetteredLeaderboardRow = Database['public']['Tables']['lettered_leaderboard']['Row'];
type UserStatsRow = Database['public']['Tables']['user_stats']['Row'];
type UserSeasonStatsRow = Database['public']['Tables']['user_season_stats']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

// Joined types for leaderboard queries
type SeasonLeaderboardEntryWithUser = SeasonLeaderboardRow & { users: Pick<UserRow, 'handle'> };
type LetteredLeaderboardEntryWithUser = LetteredLeaderboardRow & { users: Pick<UserRow, 'handle'> };

// Types for leaderboard data
export interface SeasonLeaderboardEntry {
  rank: number;
  userId: string;
  redditHandle: string;
  totalPoints: number;
  gamesPlayed: number;
  averageLetteredScore: number | null;
  averageLetteredMovesUsed: number | null;
  averageScore: number | null;
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
  totalPoints: number;
  totalGamesPlayed: number;
  totalLetteredGamesPlayed: number;
  totalLetteredPoints: number;
  totalLetteredWins: number;
  totalLetteredLosses: number;
  totalLetteredWinRate: number | null;
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
  averageLetteredScore: entry.average_lettered_score,
  averageLetteredMovesUsed: entry.average_lettered_moves_used,
  averageScore: entry.average_score,
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
  totalPoints: stats.total_points,
  totalGamesPlayed: stats.total_games_played,
  totalLetteredGamesPlayed: stats.total_lettered_games_played,
  totalLetteredPoints: stats.total_lettered_points,
  totalLetteredWins: stats.total_lettered_wins,
  totalLetteredLosses: stats.total_lettered_losses,
  totalLetteredWinRate: stats.total_lettered_win_rate,
  totalLetteredAverageScore: stats.total_lettered_average_score,
});

const convertUserSeasonStats = (stats: UserSeasonStatsRow): UserSeasonStats => ({
  seasonId: stats.season_id,
  currentDailyStreak: stats.current_daily_streak,
  bestDailyStreak: stats.best_daily_streak,
  currentDailyLetteredStreak: stats.current_daily_lettered_streak,
  bestDailyLetteredStreak: stats.best_daily_lettered_streak,
  totalPoints: stats.total_points,
  totalGamesPlayed: stats.total_games_played,
  totalLetteredGamesPlayed: stats.total_lettered_games_played,
  totalLetteredPoints: stats.total_lettered_points,
  totalLetteredWins: stats.total_lettered_wins,
  totalLetteredLosses: stats.total_lettered_losses,
  totalLetteredWinRate: stats.total_lettered_win_rate,
  totalLetteredAverageScore: stats.total_lettered_average_score,
});

// Season leaderboard functions
export async function getSeasonLeaderboard(
  seasonId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ entries: SeasonLeaderboardEntry[]; totalPlayers: number }> {
  // First, get the leaderboard entries
  const { data: rankings, error } = await supabase
    .from('season_leaderboard')
    .select('*')
    .eq('season_id', seasonId)
    .order('total_points', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch season leaderboard: ${error.message}`);
  }

  // Get user handles for the leaderboard entries
  const userIds = rankings?.map((entry) => entry.user_id) || [];
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, handle')
    .in('id', userIds);

  if (usersError) {
    throw new Error(`Failed to fetch user handles: ${usersError.message}`);
  }

  // Create a map of user IDs to handles
  const userHandleMap = new Map(users?.map((user) => [user.id, user.handle]) || []);

  // Get total count
  const { count: totalPlayers, error: countError } = await supabase
    .from('season_leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId);

  if (countError) {
    throw new Error(`Failed to count season players: ${countError.message}`);
  }

  // Combine the data
  return {
    entries: (rankings || []).map((entry, index) => {
      const handle = userHandleMap.get(entry.user_id) || 'Unknown User';
      return convertSeasonLeaderboardEntry({ ...entry, users: { handle } }, offset + index + 1);
    }),
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

// Lettered leaderboard functions
export async function getLetteredLeaderboard(
  seasonId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ entries: LetteredLeaderboardEntry[]; totalPlayers: number }> {
  // First, get the leaderboard entries
  const { data: rankings, error } = await supabase
    .from('lettered_leaderboard')
    .select('*')
    .eq('season_id', seasonId)
    .order('total_points', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch Lettered leaderboard: ${error.message}`);
  }

  // Get user handles for the leaderboard entries
  const userIds = rankings?.map((entry) => entry.user_id) || [];
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, handle')
    .in('id', userIds);

  if (usersError) {
    throw new Error(`Failed to fetch user handles: ${usersError.message}`);
  }

  // Create a map of user IDs to handles
  const userHandleMap = new Map(users?.map((user) => [user.id, user.handle]) || []);

  // Get total count
  const { count: totalPlayers, error: countError } = await supabase
    .from('lettered_leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId);

  if (countError) {
    throw new Error(`Failed to count Lettered players: ${countError.message}`);
  }

  // Combine the data
  return {
    entries: (rankings || []).map((entry, index) => {
      const handle = userHandleMap.get(entry.user_id) || 'Unknown User';
      return convertLetteredLeaderboardEntry({ ...entry, users: { handle } }, offset + index + 1);
    }),
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

  if ((error && error.code === 'PGRST116') || error?.message.includes('PGRST116')) {
    return null;
  }

  if (error) {
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

export interface UserLeaderboardData {
  userId: string;
  username: string;
  imageUrl: string | null;
  rank: number | null;
  totalPoints: number;
  totalGamesPlayed: number;
}

export async function getUserLeaderboardData(
  seasonId: string,
  userId: string
): Promise<UserLeaderboardData | null> {
  // Get user rank
  const rank = await getUserSeasonRank(seasonId, userId);

  // Get user stats
  const userStats = await getUserStats(userId);

  // Get user info
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('handle, image_url')
    .eq('id', userId)
    .single();

  if (userError) {
    throw new Error(`Failed to fetch user information: ${userError.message}`);
  }

  return {
    userId,
    username: userData.handle,
    imageUrl: userData.image_url,
    rank,
    totalPoints: userStats?.totalPoints || 0,
    totalGamesPlayed: userStats?.totalGamesPlayed || 0,
  };
}
