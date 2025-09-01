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
  correctAnswers: string[];
  searchSuggestions: string[];
  category: string;
  number: number;
  createdAt: string;
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

export type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  gameType: string; // 'topx', etc.
  createdAt: string;
};

export type GameSession = {
  id: string;
  userId: string;
  gameId: string;
  seasonId: string;
  score: number;
  completedAt: string | null;
  attempts: number;
  correctAnswers: number;
  totalAnswers: number;
  isCompleted: boolean;
  isWon: boolean;
  timeToComplete?: number; // in seconds
  createdAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  redditHandle: string;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  averageScore: number;
  winRate: number;
  bestScore: number;
  totalCorrectAnswers: number;
  averageAttempts: number;
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
  seasonId: string;
  totalPlayers: number;
};

export type GameSessionResponse = {
  type: 'game_session';
  session: GameSession;
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
