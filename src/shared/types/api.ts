export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

// Time-based leaderboard types
export type LeaderboardEntry = {
  rank: number;
  userId: string;
  redditHandle: string;
  totalPoints: number;
  gamesPlayed: number;
  averageScore: number | null;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  period: 'daily' | 'weekly' | 'monthly' | 'alltime';
  periodKey: string;
  entries: LeaderboardEntry[];
  totalPlayers: number;
  userRank?: number;
  limit: number;
  offset: number;
};

// User statistics types
export type UserStats = {
  currentDailyStreak: number;
  bestDailyStreak: number;
  lastGameCompletedDate: string | null;
  totalPoints: number;
  totalGamesPlayed: number;
  // Chronle-specific stats
  totalChronleGamesPlayed: number;
  totalChronleWins: number;
  totalChronleLosses: number;
  chronleWinRate: number;
};

export type UserStatsResponse = {
  type: 'user_stats';
  userId: string;
  stats: UserStats;
};

export type UserLeaderboardPositionResponse = {
  type: 'user_leaderboard_position';
  userId: string;
  username: string;
  imageUrl: string | null;
  rank: number | null;
  totalPoints: number;
  totalGamesPlayed: number;
};

export type StatusResponse = {
  type: 'status';
  day: string;
};

// User preferences for app settings and tutorial state
export interface UserPreferences {
  tutorialCompleted: boolean;
}

export type User = {
  id: string;
  redditId: string;
  handle: string;
  imageUrl: string | null;
  admin: boolean;
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferences;
};

// Splash screen stats response
export interface SplashStatsResponse {
  gameId: string;
  postType: 'daily' | 'custom';
  // For daily games
  formattedDate?: string; // e.g., "December 2nd, 2025"
  // For custom games
  title?: string; // category/theme
  creatorUsername?: string;
  creatorIconUrl?: string;
  isCreator?: boolean; // true if current user is the puzzle creator
  // Stats
  totalCompletions: number;
  averageTimeMs: number; // average time in milliseconds
  averageMoves: number;
}
