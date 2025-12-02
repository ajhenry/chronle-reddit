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

export type LetteredLeaderboardEntry = {
  rank: number;
  userId: string;
  redditHandle: string;
  totalPoints: number;
  gamesPlayed: number;
  averageScore: number | null;
  averageMoves: number | null;
  averageTime: number | null;
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

export type LetteredLeaderboardResponse = {
  type: 'lettered_leaderboard';
  period: 'daily' | 'weekly' | 'monthly' | 'alltime';
  periodKey: string;
  entries: LetteredLeaderboardEntry[];
  totalPlayers: number;
  userRank?: number;
  limit: number;
  offset: number;
};

// User statistics types
export type UserStats = {
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
  totalLetteredWinRate?: number;
  totalLetteredAverageScore?: number;
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

// Lettered Game Types
export type GridPosition = {
  row: number;
  col: number;
};

export type GridCell = {
  letter: string | null; // null for empty cells - only sent to client in secure mode
  isLetter: boolean; // true if cell contains a letter (secure mode)
  isPreFilled: boolean; // true for letters that start on the board
  isSpace: boolean; // true for word boundaries (gray squares)
  isUnused: boolean; // true for cells not part of the phrase (gray squares)
};

export type LetterPiece = {
  id: string;
  letters: string[];
  shape: GridPosition[]; // relative positions of each letter in the piece
  color: string; // for visual distinction
};

export type LetteredGameData = {
  id: string;
  category: string;
  phrase: string;
  grid: GridCell[][]; // NxM grid
  rows: number;
  cols: number;
  pieces: LetterPiece[];
  initialPiecePositions: Record<string, GridPosition>; // initial positions for pieces (pieceId -> position)
  solution?: Record<string, GridPosition>; // where each piece should be placed (pieceId -> correct position)
  solutionHash: string; // SHA256 hash of the solution for secure validation
  seed: number | null; // seed used for game generation
  createdAt: string;
  updatedAt: string;
};

export type LetteredGameResponse = {
  type: 'lettered_game';
  game: LetteredGameData;
};

export type LetteredDailyGameResponse = {
  type: 'lettered_daily_game';
  dailyGameId: string;
  game: LetteredGameData;
  day: string; // ISO date string
  session?: LetteredGameSessionResponse;
};

// Types for custom game scores
export interface CustomGameScore {
  username: string;
  gameId: string;
  phrase: string;
  score: number;
  completedAt: string;
  timeElapsed: number;
  moves: number;
  timestamp?: number; // Optional timestamp for sorting
}

export type LetteredCustomGameResponse = {
  type: 'lettered_custom_game';
  game: LetteredGameData;
  isCompleted: boolean;
  gameScore?: CustomGameScore;
};

export type LetteredSubmissionResponse = {
  type: 'lettered_submission';
  submissionId: string;
  accepted: boolean;
};

export type LetteredGameCompleteResponse = {
  type: 'lettered_game_complete';
  finalScore: number;
  isValid: boolean;
};

export type LetteredGameSessionResponse = {
  type: 'lettered_game_session';
  sessionId: string;
  currentScore: number;
  initialScore: number;
  isCompleted: boolean;
  moves: number;
  pieces: Record<string, GridPosition>;
};

export type StatusResponse = {
  type: 'status';
  day: string;
};

export type User = {
  id: string;
  redditId: string;
  handle: string;
  imageUrl: string | null;
  admin: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LetteredPostGameResponse = {
  type: 'lettered_post_game';
  dailyGame: LetteredGameData;
  finalScore: number;
  isValid: boolean;
  pieces: Record<string, GridPosition>;
  movesUsed: number;
  timeElapsed?: number;
  rank?: number;
  totalPlayers?: number;
  leaderboard?: Array<{
    username: string;
    score: number;
    rank?: number;
  }>;
};
