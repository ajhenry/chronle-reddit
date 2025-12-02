import { GridCell, GridPosition, LetterPiece } from '../../shared/types/api';
import { getTodayEST } from '../lib/time';
import { getOrCreateTodaysGame } from './game';
import { getRedisClient } from '../lib/redis-provider';
import { RedisKeys, serialize, deserialize } from '../../shared/types/redis';
import { getOrCreateTodaysLetteredGame } from '../lib/lettered-game-helpers';

export interface LetteredGame {
  id: string;
  category: string;
  phrase: string;
  grid: GridCell[][];
  rows: number;
  cols: number;
  pieces: LetterPiece[];
  initialPiecePositions: Record<string, GridPosition>;
  solution: Record<string, GridPosition>;
  seed: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LetteredSession {
  id: string;
  userId: string;
  dailyGameId: string;
  startedAt: string;
  completedAt: string | null;
  timeElapsed: number;
  isCompleted: boolean;
  moves: number;
}

export interface LetteredSubmission {
  id: string;
  gameSessionId: string;
  boardState: {
    grid: GridCell[][];
    placedPieces: Record<string, GridPosition>;
  };
  submittedAt: string;
}

interface LetteredGameStorage {
  id: string;
  category: string;
  phrase: string;
  grid: GridCell[][];
  rows: number;
  cols: number;
  pieces: LetterPiece[];
  initial_piece_positions: Record<string, GridPosition>;
  solution: Record<string, GridPosition>;
  seed: number | null;
  created_at: string;
  updated_at: string;
}

interface LetteredSessionStorage {
  id: string;
  user_id: string;
  daily_game_id: string;
  started_at: string;
  completed_at: string | null;
  time_elapsed: number;
  is_completed: boolean;
  moves: number;
}

interface LetteredSubmissionStorage {
  id: string;
  game_session_id: string;
  board_state: {
    grid: GridCell[][];
    placedPieces: Record<string, GridPosition>;
  };
  submitted_at: string;
}

const convertLetteredSubmission = (submission: LetteredSubmissionStorage): LetteredSubmission => {
  return {
    id: submission.id,
    gameSessionId: submission.game_session_id,
    boardState: submission.board_state,
    submittedAt: submission.submitted_at,
  };
};

const convertLetteredSubmissionToStorage = (
  submission: LetteredSubmission
): LetteredSubmissionStorage => {
  return {
    id: submission.id,
    game_session_id: submission.gameSessionId,
    board_state: submission.boardState,
    submitted_at: submission.submittedAt,
  };
};

const convertLetteredSession = (session: LetteredSessionStorage): LetteredSession => {
  return {
    id: session.id,
    userId: session.user_id,
    dailyGameId: session.daily_game_id,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    timeElapsed: session.time_elapsed ?? 0,
    isCompleted: session.is_completed,
    moves: session.moves ?? 0,
  };
};

const convertLetteredSessionToStorage = (session: LetteredSession): LetteredSessionStorage => {
  return {
    id: session.id,
    user_id: session.userId,
    daily_game_id: session.dailyGameId,
    started_at: session.startedAt,
    completed_at: session.completedAt,
    time_elapsed: session.timeElapsed,
    is_completed: session.isCompleted,
    moves: session.moves,
  };
};

const convertLetteredGame = (game: LetteredGameStorage): LetteredGame => {
  return {
    id: game.id,
    category: game.category,
    phrase: game.phrase,
    grid: game.grid,
    rows: game.rows,
    cols: game.cols,
    pieces: game.pieces,
    initialPiecePositions: game.initial_piece_positions,
    solution: game.solution,
    seed: game.seed,
    createdAt: game.created_at,
    updatedAt: game.updated_at,
  };
};

const convertLetteredGameToStorage = (game: LetteredGame): LetteredGameStorage => {
  return {
    id: game.id,
    category: game.category,
    phrase: game.phrase,
    grid: game.grid,
    rows: game.rows,
    cols: game.cols,
    pieces: game.pieces,
    initial_piece_positions: game.initialPiecePositions,
    solution: game.solution,
    seed: game.seed,
    created_at: game.createdAt,
    updated_at: game.updatedAt,
  };
};

export const createLetteredGame = async (game: LetteredGame): Promise<LetteredGame> => {
  try {
    const redis = await getRedisClient();
    const gameId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newGame: LetteredGame = {
      ...game,
      id: gameId,
      createdAt: now,
      updatedAt: now,
    };

    const storageData = convertLetteredGameToStorage(newGame);
    await redis.set(RedisKeys.letteredGame.byId(gameId), serialize(storageData));

    // Add to sorted set of all game IDs for random selection (using timestamp as score)
    await redis.zAdd(RedisKeys.letteredGame.all(), { member: gameId, score: Date.now() });

    console.log('Created lettered game:', { gameId });

    return newGame;
  } catch (error) {
    console.error('Failed to create lettered game:', { error });
    throw new Error('Failed to create lettered game');
  }
};

export const findLetteredGameById = async (id: string): Promise<LetteredGame> => {
  try {
    const redis = await getRedisClient();
    const gameData = await redis.get(RedisKeys.letteredGame.byId(id));

    if (!gameData) {
      throw new Error('Lettered game not found');
    }

    const data = deserialize<LetteredGameStorage>(gameData);
    if (!data) {
      throw new Error('Failed to deserialize lettered game data');
    }

    return convertLetteredGame(data);
  } catch (error) {
    console.error('Failed to find lettered game:', { error });
    throw new Error('Failed to find lettered game');
  }
};

/**
 * Finds a random lettered game from the pool of created games.
 * Note: This requires games to be pre-populated in the sorted set.
 * For daily games, use getOrCreateTodaysLetteredGame() instead, which creates games on-demand using phrases.
 */
export const findRandomLetteredGame = async (): Promise<LetteredGame> => {
  try {
    const redis = await getRedisClient();

    // Get all game IDs from the sorted set
    const games = await redis.zRange(RedisKeys.letteredGame.all(), 0, -1);

    if (!games || games.length === 0) {
      throw new Error('No lettered games found in pool');
    }

    // Select a random game ID
    const randomIndex = Math.floor(Math.random() * games.length);
    const gameId = games[randomIndex]?.member;

    if (!gameId) {
      throw new Error('No lettered games found in pool');
    }

    return await findLetteredGameById(gameId);
  } catch (error) {
    console.error('Failed to find random lettered game:', { error });
    throw new Error('Failed to find random lettered game');
  }
};

export const getTodaysLetteredGame = async (): Promise<LetteredGame> => {
  try {
    const result = await getOrCreateTodaysLetteredGame();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get or create todays lettered game');
    }

    // Convert the API format back to database format
    const gameData = result.data.gameData;
    const letteredGame: LetteredGame = {
      id: gameData.id,
      category: gameData.category,
      phrase: gameData.phrase,
      grid: gameData.grid,
      rows: gameData.rows,
      cols: gameData.cols,
      pieces: gameData.pieces,
      initialPiecePositions: gameData.initialPiecePositions,
      solution: gameData.solution,
      seed: gameData.seed,
      createdAt: gameData.createdAt,
      updatedAt: gameData.updatedAt,
    };

    return letteredGame;
  } catch (error) {
    console.error('Failed to find todays lettered game:', { error });
    throw new Error('Failed to find todays lettered game');
  }
};

export const getOrCreateLetteredSessionForToday = async (
  userId: string
): Promise<LetteredSession> => {
  // Ensure today's game exists
  await getOrCreateTodaysGame();
  const today = getTodayEST();

  try {
    const redis = await getRedisClient();
    const sessionData = await redis.get(RedisKeys.letteredSession(userId, today));

    if (!sessionData) {
      return await createLetteredSession(userId);
    }

    const data = deserialize<LetteredSessionStorage>(sessionData);
    if (!data) {
      return await createLetteredSession(userId);
    }

    return convertLetteredSession(data);
  } catch (error) {
    console.error('Failed to find todays lettered session:', { error });
    throw new Error('Failed to find todays lettered session');
  }
};

export const getLatestLetteredSubmissionForToday = async (
  userId: string
): Promise<LetteredSubmission | null> => {
  try {
    const letteredSession = await getOrCreateLetteredSessionForToday(userId);
    const redis = await getRedisClient();

    const submissionsData = await redis.get(RedisKeys.letteredSubmissions(letteredSession.id));

    if (!submissionsData) {
      return null;
    }

    const submissions = deserialize<LetteredSubmissionStorage[]>(submissionsData);
    if (!submissions || submissions.length === 0) {
      return null;
    }

    // Return the last submission (latest)
    return convertLetteredSubmission(submissions[submissions.length - 1]!);
  } catch (error) {
    console.error('Failed to find latest lettered submission:', { error });
    throw new Error('Failed to find latest lettered submission');
  }
};

export const getLetteredSubmissionsForToday = async (
  userId: string
): Promise<LetteredSubmission[]> => {
  try {
    const letteredSession = await getOrCreateLetteredSessionForToday(userId);
    const redis = await getRedisClient();

    const submissionsData = await redis.get(RedisKeys.letteredSubmissions(letteredSession.id));

    if (!submissionsData) {
      return [];
    }

    const submissions = deserialize<LetteredSubmissionStorage[]>(submissionsData);
    if (!submissions) {
      return [];
    }

    return submissions.map(convertLetteredSubmission);
  } catch (error) {
    console.error('Failed to find lettered submissions:', { error });
    throw new Error('Failed to find lettered submissions');
  }
};

export const getOrCreateUserLetteredSessionForToday = async (
  userId: string
): Promise<LetteredSession> => {
  console.log('getOrCreateUserLetteredSessionForToday', { userId });
  return await getOrCreateLetteredSessionForToday(userId);
};

export const createLetteredSession = async (userId: string): Promise<LetteredSession> => {
  console.log('createLetteredSession', { userId });
  try {
    const dailyGame = await getOrCreateTodaysGame();
    const today = getTodayEST();

    if (userId.includes('letteredsession_')) {
      throw new Error('User already has a lettered session');
    }

    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const session: LetteredSession = {
      id: sessionId,
      userId: userId,
      dailyGameId: dailyGame.id,
      startedAt: now,
      completedAt: null,
      timeElapsed: 0,
      isCompleted: false,
      moves: 0,
    };

    const redis = await getRedisClient();
    const storageData = convertLetteredSessionToStorage(session);
    await redis.set(RedisKeys.letteredSession(userId, today), serialize(storageData));

    // Maintain lookup hash for finding sessions by ID (needed because Devvit Redis doesn't support key listing)
    const sessionLookupKey = `lettered_session_lookup:${today}`;
    await redis.hSet(sessionLookupKey, { [sessionId]: userId });

    // Track which days have sessions (for admin operations)
    const sessionDaysKey = 'lettered_session_days';
    await redis.zAdd(sessionDaysKey, { member: today, score: Date.now() });

    console.log('Created lettered session:', { sessionId, userId, day: today });

    return session;
  } catch (error) {
    console.error('Failed to create lettered session:', { error });
    throw new Error('Failed to create lettered session');
  }
};

export const updateLetteredSession = async (
  sessionId: string,
  updates: Partial<Pick<LetteredSession, 'completedAt' | 'timeElapsed' | 'isCompleted' | 'moves'>>
): Promise<LetteredSession> => {
  try {
    const redis = await getRedisClient();

    // First, find the session by ID
    // We need to search through all possible session keys
    // Since we store by userId:day, we need to get the session first to know the key
    const session = await findLetteredSessionById(sessionId);

    const updatedSession: LetteredSession = {
      ...session,
      ...updates,
    };

    const today = getTodayEST();
    const storageData = convertLetteredSessionToStorage(updatedSession);
    await redis.set(RedisKeys.letteredSession(session.userId, today), serialize(storageData));

    // Ensure lookup hash is maintained (in case it was missing)
    const sessionLookupKey = `lettered_session_lookup:${today}`;
    await redis.hSet(sessionLookupKey, { [sessionId]: session.userId });

    console.log('Updated lettered session:', { sessionId });

    return updatedSession;
  } catch (error) {
    console.error('Failed to update lettered session:', { error });
    throw new Error('Failed to update lettered session');
  }
};

export const findLetteredSessionById = async (sessionId: string): Promise<LetteredSession> => {
  try {
    const redis = await getRedisClient();
    const today = getTodayEST();

    // Since Devvit Redis doesn't support key pattern matching, we need to maintain
    // a sorted set that tracks session IDs to user IDs for lookup
    const sessionLookupKey = `lettered_session_lookup:${today}`;

    // Try to find the userId from the lookup
    const userId = await redis.hGet(sessionLookupKey, sessionId);

    if (!userId) {
      throw new Error('Lettered session not found');
    }

    // Now we can get the session with the userId
    const sessionKey = RedisKeys.letteredSession(userId, today);
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      throw new Error('Lettered session not found');
    }

    const data = deserialize<LetteredSessionStorage>(sessionData);
    if (!data || data.id !== sessionId) {
      throw new Error('Lettered session not found');
    }

    return convertLetteredSession(data);
  } catch (error) {
    console.error('Failed to find lettered session:', { error });
    throw new Error('Failed to find lettered session');
  }
};

export const createLetteredSubmission = async (
  submission: Pick<LetteredSubmission, 'gameSessionId' | 'boardState'>
): Promise<LetteredSubmission> => {
  try {
    const redis = await getRedisClient();
    const submissionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newSubmission: LetteredSubmission = {
      id: submissionId,
      gameSessionId: submission.gameSessionId,
      boardState: submission.boardState,
      submittedAt: now,
    };

    // Get existing submissions
    const submissionsData = await redis.get(
      RedisKeys.letteredSubmissions(submission.gameSessionId)
    );
    const submissions = submissionsData
      ? deserialize<LetteredSubmissionStorage[]>(submissionsData) || []
      : [];

    // Add new submission
    submissions.push(convertLetteredSubmissionToStorage(newSubmission));

    // Store updated submissions
    await redis.set(
      RedisKeys.letteredSubmissions(submission.gameSessionId),
      serialize(submissions)
    );

    console.log('Created lettered submission:', {
      submissionId,
      sessionId: submission.gameSessionId,
    });

    return newSubmission;
  } catch (error) {
    console.error('Failed to create lettered submission:', { error });
    throw new Error('Failed to create lettered submission');
  }
};

export const getTotalLetteredSubmissionsForToday = async (userId: string): Promise<number> => {
  try {
    const session = await getOrCreateUserLetteredSessionForToday(userId);
    const redis = await getRedisClient();

    const submissionsData = await redis.get(RedisKeys.letteredSubmissions(session.id));

    if (!submissionsData) {
      return 0;
    }

    const submissions = deserialize<LetteredSubmissionStorage[]>(submissionsData);
    return submissions?.length ?? 0;
  } catch (error) {
    console.error('Failed to find total lettered submissions:', { error });
    throw new Error('Failed to find total lettered submissions');
  }
};
