// Chronle Timeline Game Types

// A historical event in a timeline puzzle
export interface ChronleEvent {
  id: string;
  title: string;
  description: string;
  subject: string;
  imageUrl: string;
  imageCreditName: string;
  imageCreditUrl: string;
  date: string; // ISO date string
}

// A timeline event wrapper (includes relationship to timeline)
export interface TimelineEvent {
  id: string;
  timelineId: string;
  eventId: string;
  event: ChronleEvent;
}

// A timeline puzzle containing events to be ordered
export interface Timeline {
  id: string;
  title: string;
  description: string;
  solution: string[]; // Array of event IDs in correct chronological order
  events: TimelineEvent[];
}

// A day's puzzle data
export interface DayPuzzle {
  id: string;
  day: string; // Date string like "2025-01-04"
  description: string;
  timelineId: string;
  timeline: Timeline;
  createdAt: string;
  updatedAt: string;
}

// Full day timeline response
export interface DayTimeline {
  day: DayPuzzle;
}

// User's attempt at solving a timeline
export interface ChronleAttempt {
  timelineId: string;
  attempt: string[]; // Array of event IDs in user's order
  userId: string;
  correct: boolean[]; // Which positions are correct
}

// Game session data for saving/restoring progress
export interface ChronleGameSession {
  sessionId: string;
  gameId: string;
  userId: string;
  currentOrder: string[]; // Current event order
  attempts: ChronleAttempt[];
  attemptCount: number;
  isCompleted: boolean;
  isSolved: boolean;
  startedAt: string;
  completedAt?: string;
}

// Game data returned to client
export interface ChronleGameData {
  id: string;
  postType: 'daily' | 'custom';
  title: string;
  description: string;
  events: ChronleEvent[]; // Shuffled events (without solution info)
  createdAt: string;
  updatedAt: string;
  // Creator info for custom games
  creatorUsername?: string;
  creatorIconUrl?: string;
}

// API Response Types

export interface ChronleGameResponse {
  type: 'chronle_game';
  game: ChronleGameData;
  session?: ChronleSessionResponse;
}

export interface ChronleSessionResponse {
  type: 'chronle_session';
  sessionId: string;
  currentOrder: string[];
  attemptCount: number;
  lastAttempt?: {
    attempt: string[];
    correct: boolean[];
  };
  isCompleted: boolean;
  isSolved: boolean;
}

export interface ChronleSubmitResponse {
  type: 'chronle_submit';
  attempt: ChronleAttempt;
  attemptCount: number;
  isSolved: boolean;
  isFinished: boolean; // true if solved or out of attempts
  correctOrder?: string[]; // Only sent when game is finished
}

export interface ChronlePostGameResponse {
  type: 'chronle_post_game';
  game: ChronleGameData;
  correctOrder: ChronleEvent[]; // Events in correct order with dates
  attemptCount: number;
  isSolved: boolean;
  // Stats
  allPlayerStats: Record<string, number>; // attempt count -> number of players
  totalPlayers: number;
  userAttemptCount: number;
}

export interface ChronleLeaderboardEntry {
  rank: number;
  username: string;
  attemptCount: number; // Number of attempts to solve (lower is better)
  isSolved: boolean;
  isAnonymous?: boolean;
  displayName?: string;
}

export interface ChronleLeaderboardResponse {
  type: 'chronle_leaderboard';
  entries: ChronleLeaderboardEntry[];
  totalPlayers: number;
  userRank?: number;
  userEntry?: ChronleLeaderboardEntry;
}

// Splash screen stats for Chronle
export interface ChronleSplashStatsResponse {
  gameId: string;
  postType: 'daily' | 'custom';
  formattedDate?: string; // For daily games
  title?: string; // Timeline title/theme
  description?: string;
  creatorUsername?: string;
  creatorIconUrl?: string;
  isCreator?: boolean;
  totalCompletions: number;
  totalSolved: number;
  averageAttempts: number;
}

// Puzzle seed data structure (for pre-made puzzles)
export interface PuzzleSeed {
  id: string;
  title: string;
  description: string;
  events: Array<{
    id: string;
    title: string;
    description: string;
    subject: string;
    imageUrl: string;
    imageCreditName: string;
    imageCreditUrl: string;
    date: string; // ISO date
  }>;
}

// Custom puzzle creation request
export interface CreateChronlePuzzleRequest {
  title: string;
  description: string;
  events: Array<{
    title: string;
    description: string;
    subject: string;
    imageUrl: string;
    imageCreditName: string;
    imageCreditUrl: string;
    date: string;
  }>;
}

// Redis key constants for Chronle
export const ChronleRedisKeys = {
  // Timeline/puzzle storage
  timeline: {
    byId: (id: string) => `chronle:timeline:${id}`,
    byDay: (day: string) => `chronle:day:${day}`,
    postMapping: (postId: string) => `chronle:post:${postId}`,
  },
  // Game sessions
  session: {
    byUserAndGame: (userId: string, gameId: string) => `chronle:session:${userId}:${gameId}`,
  },
  // Attempts
  attempt: {
    last: (timelineId: string, userId: string) => `chronle:attempt:${timelineId}:${userId}`,
    count: (timelineId: string, userId: string) => `chronle:attempt_count:${timelineId}:${userId}`,
    totalCount: (timelineId: string) => `chronle:attempt_count:${timelineId}`,
  },
  // Stats and leaderboard
  stats: {
    allPlayers: (timelineId: string) => `chronle:all_player_stats:${timelineId}`,
  },
  // User streaks
  user: {
    streak: (userId: string) => `chronle:user:${userId}:streak`,
    lastPlayed: (userId: string) => `chronle:user:${userId}:last_played`,
  },
};

