import { getRedisClient } from '../lib/redis-provider';
import {
  TimePeriod,
  getCurrentPeriod,
  RedisKeys,
  serialize,
  deserialize,
} from '../../shared/types/redis';

// Types for leaderboard data
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  redditHandle: string;
  totalPoints: number;
  gamesPlayed: number;
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

interface UserStatsStorage {
  current_daily_streak: number;
  best_daily_streak: number;
  current_daily_lettered_streak: number;
  best_daily_lettered_streak: number;
  total_points: number;
  total_games_played: number;
  total_lettered_games_played: number;
  total_lettered_points: number;
  total_lettered_wins: number;
  total_lettered_losses: number;
  total_lettered_win_rate: number | null;
  total_lettered_average_score: number | null;
}

// Metadata stored alongside leaderboard scores
interface LeaderboardMetadata {
  userId: string;
  redditHandle: string;
  gamesPlayed: number;
  totalPoints: number;
  averageScore: number | null;
}

interface LetteredLeaderboardMetadata extends LeaderboardMetadata {
  averageMoves: number | null;
  averageTime: number | null;
}

const convertUserStats = (stats: UserStatsStorage): UserStats => ({
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

const convertUserStatsToStorage = (stats: UserStats): UserStatsStorage => ({
  current_daily_streak: stats.currentDailyStreak,
  best_daily_streak: stats.bestDailyStreak,
  current_daily_lettered_streak: stats.currentDailyLetteredStreak,
  best_daily_lettered_streak: stats.bestDailyLetteredStreak,
  total_points: stats.totalPoints,
  total_games_played: stats.totalGamesPlayed,
  total_lettered_games_played: stats.totalLetteredGamesPlayed,
  total_lettered_points: stats.totalLetteredPoints,
  total_lettered_wins: stats.totalLetteredWins,
  total_lettered_losses: stats.totalLetteredLosses,
  total_lettered_win_rate: stats.totalLetteredWinRate,
  total_lettered_average_score: stats.totalLetteredAverageScore,
});

// Overall leaderboard functions
export async function getLeaderboard(
  period: TimePeriod,
  limit: number = 10,
  offset: number = 0,
  date?: Date
): Promise<{ entries: LeaderboardEntry[]; totalPlayers: number }> {
  try {
    const redis = await getRedisClient();
    const leaderboardKey = RedisKeys.leaderboard('overall', period, date);

    // Get total count
    const totalPlayers = (await redis.zcard(leaderboardKey)) || 0;

    // Get rankings (descending order, highest score first)
    const rankings = await redis.zrevrange(leaderboardKey, offset, offset + limit - 1, 'WITHSCORES');

    const entries: LeaderboardEntry[] = [];

    // Rankings come back as [member, score, member, score, ...]
    for (let i = 0; i < rankings.length; i += 2) {
      const userId = rankings[i];
      const score = parseFloat(rankings[i + 1] || '0');

      if (!userId) continue;

      // Get user metadata
      const metadataKey = `${leaderboardKey}:meta:${userId}`;
      const metadataStr = await redis.get(metadataKey);
      const metadata = metadataStr ? deserialize<LeaderboardMetadata>(metadataStr) : null;

      if (metadata) {
        entries.push({
          rank: offset + (i / 2) + 1,
          userId: metadata.userId,
          redditHandle: metadata.redditHandle,
          totalPoints: metadata.totalPoints,
          gamesPlayed: metadata.gamesPlayed,
          averageScore: metadata.averageScore,
        });
      }
    }

    return { entries, totalPlayers };
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    throw new Error('Failed to fetch leaderboard');
  }
}

export async function getUserRank(
  period: TimePeriod,
  userId: string,
  date?: Date
): Promise<number | null> {
  try {
    const redis = await getRedisClient();
    const leaderboardKey = RedisKeys.leaderboard('overall', period, date);

    const rank = await redis.zrevrank(leaderboardKey, userId);

    return rank !== null ? rank + 1 : null;
  } catch (error) {
    console.error('Failed to get user rank:', error);
    return null;
  }
}

// Lettered leaderboard functions
export async function getLetteredLeaderboard(
  period: TimePeriod,
  limit: number = 10,
  offset: number = 0,
  date?: Date
): Promise<{ entries: LetteredLeaderboardEntry[]; totalPlayers: number }> {
  try {
    const redis = await getRedisClient();
    const leaderboardKey = RedisKeys.leaderboard('lettered', period, date);

    // Get total count
    const totalPlayers = (await redis.zcard(leaderboardKey)) || 0;

    // Get rankings (descending order, highest score first)
    const rankings = await redis.zrevrange(leaderboardKey, offset, offset + limit - 1, 'WITHSCORES');

    const entries: LetteredLeaderboardEntry[] = [];

    // Rankings come back as [member, score, member, score, ...]
    for (let i = 0; i < rankings.length; i += 2) {
      const userId = rankings[i];
      const score = parseFloat(rankings[i + 1] || '0');

      if (!userId) continue;

      // Get user metadata
      const metadataKey = `${leaderboardKey}:meta:${userId}`;
      const metadataStr = await redis.get(metadataKey);
      const metadata = metadataStr ? deserialize<LetteredLeaderboardMetadata>(metadataStr) : null;

      if (metadata) {
        entries.push({
          rank: offset + (i / 2) + 1,
          userId: metadata.userId,
          redditHandle: metadata.redditHandle,
          totalPoints: metadata.totalPoints,
          gamesPlayed: metadata.gamesPlayed,
          averageScore: metadata.averageScore,
          averageMoves: metadata.averageMoves,
          averageTime: metadata.averageTime,
        });
      }
    }

    return { entries, totalPlayers };
  } catch (error) {
    console.error('Failed to fetch Lettered leaderboard:', error);
    throw new Error('Failed to fetch Lettered leaderboard');
  }
}

export async function getUserLetteredRank(
  period: TimePeriod,
  userId: string,
  date?: Date
): Promise<number | null> {
  try {
    const redis = await getRedisClient();
    const leaderboardKey = RedisKeys.leaderboard('lettered', period, date);

    const rank = await redis.zrevrank(leaderboardKey, userId);

    return rank !== null ? rank + 1 : null;
  } catch (error) {
    console.error('Failed to get user Lettered rank:', error);
    return null;
  }
}

// Add score to all applicable leaderboards
export async function addScoreToLeaderboards(
  userId: string,
  redditHandle: string,
  score: number,
  isLettered: boolean,
  additionalData?: {
    moves?: number;
    time?: number;
  },
  date?: Date
): Promise<void> {
  try {
    const redis = await getRedisClient();
    const periods: TimePeriod[] = ['daily', 'weekly', 'monthly', 'alltime'];
    const leaderboardType = isLettered ? 'lettered' : 'overall';

    for (const period of periods) {
      const leaderboardKey = RedisKeys.leaderboard(leaderboardType, period, date);
      const metadataKey = `${leaderboardKey}:meta:${userId}`;

      // Get existing metadata
      const existingMetadataStr = await redis.get(metadataKey);
      const existingMetadata = existingMetadataStr
        ? deserialize<LetteredLeaderboardMetadata>(existingMetadataStr)
        : null;

      // Calculate new metadata
      const gamesPlayed = (existingMetadata?.gamesPlayed || 0) + 1;
      const totalPoints = (existingMetadata?.totalPoints || 0) + score;
      const averageScore = totalPoints / gamesPlayed;

      let metadata: LeaderboardMetadata | LetteredLeaderboardMetadata = {
        userId,
        redditHandle,
        gamesPlayed,
        totalPoints,
        averageScore,
      };

      // Add lettered-specific metadata
      if (isLettered && additionalData) {
        const existingMoves = (existingMetadata as LetteredLeaderboardMetadata)?.averageMoves || 0;
        const existingTime = (existingMetadata as LetteredLeaderboardMetadata)?.averageTime || 0;

        const newAverageMoves = additionalData.moves
          ? (existingMoves * (gamesPlayed - 1) + additionalData.moves) / gamesPlayed
          : existingMoves;

        const newAverageTime = additionalData.time
          ? (existingTime * (gamesPlayed - 1) + additionalData.time) / gamesPlayed
          : existingTime;

        metadata = {
          ...metadata,
          averageMoves: newAverageMoves,
          averageTime: newAverageTime,
        };
      }

      // Update leaderboard score
      await redis.zadd(leaderboardKey, totalPoints, userId);

      // Update metadata
      await redis.set(metadataKey, serialize(metadata));

      // Set expiration for time-based leaderboards (not for alltime)
      if (period !== 'alltime') {
        const ttl = period === 'daily' ? 60 * 60 * 24 * 7 : 60 * 60 * 24 * 90; // 7 days for daily, 90 days for others
        await redis.expire(leaderboardKey, ttl);
        await redis.expire(metadataKey, ttl);
      }
    }

    console.log('Added score to leaderboards:', { userId, score, isLettered });
  } catch (error) {
    console.error('Failed to add score to leaderboards:', error);
    throw new Error('Failed to add score to leaderboards');
  }
}

// User stats functions
export async function getUserStats(userId: string): Promise<UserStats | null> {
  try {
    const redis = await getRedisClient();
    const statsData = await redis.get(RedisKeys.userStats(userId));

    if (!statsData) {
      return null;
    }

    const stats = deserialize<UserStatsStorage>(statsData);
    return stats ? convertUserStats(stats) : null;
  } catch (error) {
    console.error('Failed to fetch user statistics:', error);
    throw new Error('Failed to fetch user statistics');
  }
}

export async function updateUserStats(userId: string, stats: Partial<UserStats>): Promise<void> {
  try {
    const redis = await getRedisClient();
    const existingStats = (await getUserStats(userId)) || {
      currentDailyStreak: 0,
      bestDailyStreak: 0,
      currentDailyLetteredStreak: 0,
      bestDailyLetteredStreak: 0,
      totalPoints: 0,
      totalGamesPlayed: 0,
      totalLetteredGamesPlayed: 0,
      totalLetteredPoints: 0,
      totalLetteredWins: 0,
      totalLetteredLosses: 0,
      totalLetteredWinRate: null,
      totalLetteredAverageScore: null,
    };

    const updatedStats: UserStats = {
      ...existingStats,
      ...stats,
    };

    const storageData = convertUserStatsToStorage(updatedStats);
    await redis.set(RedisKeys.userStats(userId), serialize(storageData));

    console.log('Updated user stats:', { userId });
  } catch (error) {
    console.error('Failed to update user statistics:', error);
    throw new Error('Failed to update user statistics');
  }
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
  period: TimePeriod,
  userId: string,
  date?: Date
): Promise<UserLeaderboardData | null> {
  try {
    const redis = await getRedisClient();

    // Get user rank
    const rank = await getUserRank(period, userId, date);

    // Get user stats
    const userStats = await getUserStats(userId);

    // Get user info
    const userData = await redis.get(RedisKeys.user.byId(userId));
    if (!userData) {
      return null;
    }

    const user = deserialize<{
      handle: string;
      image_url: string | null;
    }>(userData);

    if (!user) {
      return null;
    }

    return {
      userId,
      username: user.handle,
      imageUrl: user.image_url,
      rank,
      totalPoints: userStats?.totalPoints || 0,
      totalGamesPlayed: userStats?.totalGamesPlayed || 0,
    };
  } catch (error) {
    console.error('Failed to fetch user leaderboard data:', error);
    throw new Error('Failed to fetch user leaderboard data');
  }
}
