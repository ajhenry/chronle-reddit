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

export type TopXGame = {
  id: string;
  prompt: string;
  // Only sent to client in development mode
  solution?: string[];
  category: string;
  count: number;
  maxAttempts: number;
  suggestions: string[];
  solutionHash: Record<string, boolean>; // Hash map of valid answer combinations
  createdAt: string;
  updatedAt: string;
};

export type TopXGameResponse = {
  type: 'topx_game';
  game: TopXGame;
};

export type TopXValidateResponse = {
  type: 'topx_validate';
  answer: string;
  isCorrect: boolean;
  position?: number; // For correct answers, which position it is
  attemptsRemaining: number;
};

export type TopXGamesResponse = {
  type: 'topx_games';
  games: TopXGame[];
};

export interface TopXSubmission {
  id: string;
  gameSessionId: string;
  answer: string;
  submittedAt: string;
  isCorrect: boolean;
  scoreAtSubmission: number;
  position?: number; // Position where the answer was placed (1-indexed, only for correct answers)
}

// Update in database/topx.ts if you change this
export interface TopXSession {
  id: string;
  userId: string;
  dailyGameId: string;
  startedAt: string;
  completedAt: string | null;
  initialScore: number;
  finalScore: number;
  currentScore?: number; // Only used in API responses
  isCompleted: boolean;
  attemptsLeft: number;
  submissions: TopXSubmission[];
  correctSolutionMap?: (string | null)[]; // Array where index is position-1, value is correct answer or null
  incorrectAnswers?: string[]; // Array of answers that were submitted but are incorrect
}

export type TopXDailyGameResponse = {
  type: 'topx_daily_game';
  dailyGameId: string;
  game: TopXGame;
  day: string; // ISO date string
  session: TopXSession;
};

export type TopXAttemptRequest = {
  answer: string;
  timestamp: number;
};

export type TopXSubmissionResponse = {
  type: 'topx_submission';
  submissionId: string;
  accepted: boolean; // Whether submission was recorded (not validation)
  attemptsLeft?: number; // Remaining attempts after this submission
  gameCompleted?: boolean; // Whether the game was completed by this submission
};

export type TopXGameCompleteResponse = {
  type: 'topx_game_complete';
  finalScore: number;
  correctAnswers: Array<{
    answer: string;
    position: number;
    points: number;
  }>;
  totalCorrect: number;
  isValid: boolean; // Whether the game session is valid
};

export type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  gameType: string; // 'topx', etc.
  createdAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  redditHandle: string;
  totalPoints: number;
  gamesPlayed: number;
  latestGame: string;
  averageScore: number;
};

export type SeasonResponse = {
  type: 'season';
  season: Season;
};

export type SeasonsResponse = {
  type: 'seasons';
  seasons: Season[];
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  entries: LeaderboardEntry[];
  totalPlayers: number;
};

export type UserLeaderboardPositionResponse = {
  type: 'user_leaderboard_position';
  rank: number;
  totalPoints: number;
  gamesPlayed: number;
  totalPlayers: number;
};

export type UserStatsResponse = {
  type: 'user_stats';
  userId: string;
  seasonId: string;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  rank: number;
  totalPlayers: number;
};

export type EraseTopXResultsResponse = {
  status: 'success' | 'error';
  message: string;
  data?: {
    submissionsDeleted: number;
    leaderboardEntriesDeleted: number;
    sessionDeleted: boolean;
  };
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
