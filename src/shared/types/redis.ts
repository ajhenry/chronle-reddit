export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'alltime';

export interface TimeBasedKey {
  period: TimePeriod;
  date?: string;
}

/**
 * TTL constants for Redis keys (in seconds)
 * Used for compliance with Reddit's data retention policies
 */
export const RedisTTL = {
  /** 30 days - for per-game leaderboards */
  PER_GAME_LEADERBOARD: 60 * 60 * 24 * 30, // 2592000 seconds
  /** 7 days - for post-to-game mappings */
  POST_MAPPING: 60 * 60 * 24 * 7, // 604800 seconds
};

/**
 * Get the current period key for a given time period
 * @param period - The time period type
 * @param date - Optional date (defaults to now)
 * @returns Formatted period string
 */
export function getCurrentPeriod(period: TimePeriod, date?: Date): string {
  const d = date || new Date();

  switch (period) {
    case 'daily':
      return formatDailyKey(d);
    case 'weekly':
      return formatWeeklyKey(d);
    case 'monthly':
      return formatMonthlyKey(d);
    case 'alltime':
      return 'alltime';
  }
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDailyKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a date as YYYY-Www (ISO week number)
 */
export function formatWeeklyKey(date: Date): string {
  const year = date.getFullYear();
  const week = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Format a date as YYYY-MM
 */
export function formatMonthlyKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get ISO week number for a date
 */
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return weekNo;
}

/**
 * Format a Redis key for leaderboards
 */
export function formatLeaderboardKey(period: TimePeriod, date?: Date): string {
  const periodKey = getCurrentPeriod(period, date);
  const prefix = 'leaderboard';

  if (period === 'alltime') {
    return `${prefix}:${periodKey}`;
  }

  return `${prefix}:${period}:${periodKey}`;
}

/**
 * Helper to serialize objects to JSON for Redis storage
 */
export function serialize<T>(data: T): string {
  return JSON.stringify(data);
}

/**
 * Helper to deserialize JSON from Redis
 */
export function deserialize<T>(data: string | null): T | null {
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch (error) {
    console.error('Failed to deserialize Redis data:', error);
    return null;
  }
}

/**
 * Helper to generate Redis keys for users
 */
export const RedisKeys = {
  user: {
    byId: (userId: string) => `users:id:${userId}`,
    byHandle: (handle: string) => `users:handle:${handle}`,
    preferences: (userId: string) => `users:preferences:${userId}`,
  },
  chronleGame: {
    byId: (gameId: string) => `chronle_games:id:${gameId}`,
    all: () => 'chronle_games:all',
  },
  chronleSession: (userId: string, gameId: string) => `chronle_sessions:${userId}:${gameId}`,
  chronleGameLeaderboard: (gameId: string) => `chronle:leaderboard:${gameId}`,
  chronleGameLeaderboardMeta: (gameId: string) => `chronle:leaderboard:${gameId}:meta`,
  userStats: (userId: string) => `user_stats:${userId}`,
  // Separate key for current streak with TTL - expires if user doesn't play
  userCurrentStreak: (userId: string) => `user_streak:current:${userId}`,
  leaderboard: (period: TimePeriod, date?: Date) => formatLeaderboardKey(period, date),
  // Analytics keys
  analytics: {
    uniqueUsers: () => 'analytics:unique_users',
    screenSizes: () => 'analytics:screen_sizes',
    gamesAttempted: () => 'analytics:games_attempted',
    gamesCompleted: () => 'analytics:games_completed',
  },
};
