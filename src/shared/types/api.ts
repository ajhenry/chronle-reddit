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
