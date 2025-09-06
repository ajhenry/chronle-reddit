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

export type TopXGameData = {
  id: string;
  prompt: string;
  solution: string[]; // Changed from correctAnswers
  suggestions: string[]; // Changed from searchSuggestions
  category: string;
  count: number; // Changed from number
  created_at: string; // Changed from createdAt
  updated_at: string; // Added updated_at
};

export type TopXGameResponse = {
  type: 'topx_game';
  game: TopXGameData;
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
  games: TopXGameData[];
};

export type TopXDailyGameResponse = {
  type: 'topx_daily_game';
  dailyGameId: string;
  game: TopXGameData;
  day: string; // ISO date string
  session?: {
    id: string;
    startedAt: string;
    currentScore: number;
    initialScore: number;
    isCompleted: boolean;
    submissions: Array<{
      answer: string;
      submittedAt: string;
      isCorrect: boolean;
      position?: number;
      scoreAtSubmission: number;
    }>;
  };
};

export type TopXAttemptRequest = {
  userId: string;
  answer: string;
  timestamp: number;
};

export type TopXSubmissionResponse = {
  type: 'topx_submission';
  submissionId: string;
  accepted: boolean; // Whether submission was recorded (not validation)
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
  letter: string | null; // null for empty cells
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
  grid: GridCell[][]; // 8x8 grid
  rows: number;
  cols: number;
  pieces: LetterPiece[];
  solution: GridPosition[][]; // where each piece should be placed
  created_at: string;
  updated_at: string;
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
  session?: {
    id: string;
    startedAt: string;
    currentScore: number;
    initialScore: number;
    isCompleted: boolean;
    placedPieces: Array<{
      pieceId: string;
      position: GridPosition;
      placedAt: string;
    }>;
  };
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
