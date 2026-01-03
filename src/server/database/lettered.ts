import { GridCell, GridPosition, LetterPiece } from '../../shared/types/api';
import { getRedisClient } from '../lib/redis-provider';
import { RedisKeys, RedisTTL, serialize, deserialize } from '../../shared/types/redis';
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
  letteredGameId: string;
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
  lettered_game_id: string;
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
    letteredGameId: session.lettered_game_id,
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
    lettered_game_id: session.letteredGameId,
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
    const gameData = await getOrCreateTodaysLetteredGame();

    // Convert the API format to database format
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

export const getOrCreateLetteredSession = async (
  userId: string,
  gameId: string
): Promise<LetteredSession> => {
  try {
    const redis = await getRedisClient();
    const sessionData = await redis.get(RedisKeys.letteredSession(userId, gameId));

    if (!sessionData) {
      return await createLetteredSession(userId, gameId);
    }

    const data = deserialize<LetteredSessionStorage>(sessionData);
    if (!data) {
      return await createLetteredSession(userId, gameId);
    }

    return convertLetteredSession(data);
  } catch (error) {
    console.error('Failed to find lettered session:', { error });
    throw new Error('Failed to find lettered session');
  }
};

export const getOrCreateLetteredSessionForToday = async (
  userId: string
): Promise<LetteredSession> => {
  // For backwards compatibility - get today's game ID and create session for it
  const letteredGame = await getTodaysLetteredGame();
  return await getOrCreateLetteredSession(userId, letteredGame.id);
};

export const getLatestLetteredSubmission = async (
  userId: string,
  gameId: string
): Promise<LetteredSubmission | null> => {
  try {
    const letteredSession = await getOrCreateLetteredSession(userId, gameId);
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

export const getLatestLetteredSubmissionForToday = async (
  userId: string
): Promise<LetteredSubmission | null> => {
  // For backwards compatibility
  const letteredGame = await getTodaysLetteredGame();
  return await getLatestLetteredSubmission(userId, letteredGame.id);
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

export const createLetteredSession = async (
  userId: string,
  letteredGameId: string
): Promise<LetteredSession> => {
  console.log('createLetteredSession', { userId, letteredGameId });
  try {
    if (userId.includes('letteredsession_')) {
      throw new Error('User already has a lettered session');
    }

    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const session: LetteredSession = {
      id: sessionId,
      userId: userId,
      letteredGameId: letteredGameId,
      startedAt: now,
      completedAt: null,
      timeElapsed: 0,
      isCompleted: false,
      moves: 0,
    };

    const redis = await getRedisClient();
    const storageData = convertLetteredSessionToStorage(session);
    await redis.set(RedisKeys.letteredSession(userId, letteredGameId), serialize(storageData));

    // Maintain global lookup hash for finding sessions by ID
    const globalLookupKey = 'lettered_session_global_lookup';
    await redis.hSet(globalLookupKey, {
      [sessionId]: serialize({ userId, gameId: letteredGameId }),
    });

    // Maintain per-game lookup hash for finding sessions (using gameId as key)
    const sessionLookupKey = `lettered_session_lookup:${letteredGameId}`;
    await redis.hSet(sessionLookupKey, { [sessionId]: userId });

    // Track which games have sessions (for admin operations)
    const sessionGamesKey = 'lettered_session_games';
    await redis.zAdd(sessionGamesKey, { member: letteredGameId, score: Date.now() });

    console.log('Created lettered session:', { sessionId, userId, letteredGameId });

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
    const session = await findLetteredSessionById(sessionId);

    const updatedSession: LetteredSession = {
      ...session,
      ...updates,
    };

    const storageData = convertLetteredSessionToStorage(updatedSession);
    await redis.set(
      RedisKeys.letteredSession(session.userId, session.letteredGameId),
      serialize(storageData)
    );

    // Ensure global lookup hash is maintained (in case it was missing)
    const globalLookupKey = 'lettered_session_global_lookup';
    await redis.hSet(globalLookupKey, {
      [sessionId]: serialize({ userId: session.userId, gameId: session.letteredGameId }),
    });

    // Ensure per-game lookup hash is maintained (in case it was missing)
    const sessionLookupKey = `lettered_session_lookup:${session.letteredGameId}`;
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

    // First, look up the gameId and userId from the global session mapping
    const globalLookupKey = 'lettered_session_global_lookup';
    const lookupData = await redis.hGet(globalLookupKey, sessionId);

    if (!lookupData) {
      throw new Error('Lettered session not found');
    }

    const lookup = deserialize<{ userId: string; gameId: string }>(lookupData);
    if (!lookup) {
      throw new Error('Lettered session lookup data corrupted');
    }

    // Now we can get the session with the userId and gameId
    const sessionKey = RedisKeys.letteredSession(lookup.userId, lookup.gameId);
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

export const getTotalLetteredSubmissions = async (
  userId: string,
  gameId: string
): Promise<number> => {
  try {
    const session = await getOrCreateLetteredSession(userId, gameId);
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

export const getTotalLetteredSubmissionsForToday = async (userId: string): Promise<number> => {
  // For backwards compatibility
  const letteredGame = await getTodaysLetteredGame();
  return await getTotalLetteredSubmissions(userId, letteredGame.id);
};

export const deleteLetteredSession = async (userId: string, gameId: string): Promise<boolean> => {
  try {
    const redis = await getRedisClient();

    // Get the session first to get the sessionId
    const sessionData = await redis.get(RedisKeys.letteredSession(userId, gameId));

    if (!sessionData) {
      console.log('No session found to delete', { userId, gameId });
      return false;
    }

    const data = deserialize<LetteredSessionStorage>(sessionData);
    if (!data) {
      console.log('Failed to deserialize session data', { userId, gameId });
      return false;
    }

    const sessionId = data.id;

    // Delete the session
    await redis.del(RedisKeys.letteredSession(userId, gameId));

    // Delete the submissions
    await redis.del(RedisKeys.letteredSubmissions(sessionId));

    // Remove from global lookup hash
    const globalLookupKey = 'lettered_session_global_lookup';
    await redis.hDel(globalLookupKey, [sessionId]);

    // Remove from per-game lookup hash
    const sessionLookupKey = `lettered_session_lookup:${gameId}`;
    await redis.hDel(sessionLookupKey, [sessionId]);

    console.log('Deleted lettered session:', { sessionId, userId, gameId });

    return true;
  } catch (error) {
    console.error('Failed to delete lettered session:', { error });
    throw new Error('Failed to delete lettered session');
  }
};

// Per-game leaderboard types and functions
export interface GameLeaderboardEntry {
  userId: string;
  username: string;
  timeElapsed: number; // in milliseconds
  moves: number;
  score: number; // time in seconds + moves (lower is better)
  completedAt: string; // ISO timestamp for tiebreaking
  isAnonymous?: boolean; // Whether the user has chosen to hide their username
  displayName?: string; // Anonymous display name when isAnonymous is true
}

interface GameLeaderboardEntryStorage {
  user_id: string;
  username: string;
  time_elapsed: number;
  moves: number;
  score: number;
  completed_at: string;
  is_anonymous?: boolean;
  display_name?: string;
}

const convertGameLeaderboardEntry = (entry: GameLeaderboardEntryStorage): GameLeaderboardEntry => ({
  userId: entry.user_id,
  username: entry.username,
  timeElapsed: entry.time_elapsed,
  moves: entry.moves,
  score: entry.score,
  completedAt: entry.completed_at,
  isAnonymous: entry.is_anonymous,
  displayName: entry.display_name,
});

const convertGameLeaderboardEntryToStorage = (
  entry: GameLeaderboardEntry
): GameLeaderboardEntryStorage => ({
  user_id: entry.userId,
  username: entry.username,
  time_elapsed: entry.timeElapsed,
  moves: entry.moves,
  score: entry.score,
  completed_at: entry.completedAt,
  is_anonymous: entry.isAnonymous,
  display_name: entry.displayName,
});

/**
 * Calculate score for leaderboard ranking.
 * Score = time in seconds + moves (lower is better)
 */
export function calculateLeaderboardScore(timeElapsedMs: number, moves: number): number {
  const timeInSeconds = Math.floor(timeElapsedMs / 1000);
  return timeInSeconds + moves;
}

/**
 * Add a completed game entry to the per-game leaderboard.
 * Uses a Redis sorted set with composite score for proper sorting:
 * - Primary: score (time in seconds + moves), lower is better
 * - Tiebreaker: earlier completion time wins
 */
export const addToGameLeaderboard = async (
  gameId: string,
  entry: GameLeaderboardEntry
): Promise<void> => {
  try {
    const redis = await getRedisClient();
    const leaderboardKey = RedisKeys.letteredGameLeaderboard(gameId);
    const metadataKey = RedisKeys.letteredGameLeaderboardMeta(gameId);

    // Create a composite score for sorting:
    // We want lower scores first, and for ties, earlier completion times first.
    // Redis sorted sets are ascending by default when using ZRANGE.
    // Composite score: (score * 10^13) + timestamp_ms
    // This allows for scores up to ~900,000 while still having timestamp precision
    const completedAtMs = new Date(entry.completedAt).getTime();
    const compositeScore = entry.score * 1e13 + completedAtMs;

    // Add to sorted set (userId as member, composite score as score)
    await redis.zAdd(leaderboardKey, { member: entry.userId, score: compositeScore });

    // Store metadata for this user's entry
    const storageEntry = convertGameLeaderboardEntryToStorage(entry);
    await redis.hSet(metadataKey, { [entry.userId]: serialize(storageEntry) });

    // Set 30-day TTL on per-game leaderboard keys for data retention compliance
    await redis.expire(leaderboardKey, RedisTTL.PER_GAME_LEADERBOARD);
    await redis.expire(metadataKey, RedisTTL.PER_GAME_LEADERBOARD);

    console.log('Added to game leaderboard:', {
      gameId,
      userId: entry.userId,
      score: entry.score,
      compositeScore,
    });
  } catch (error) {
    console.error('Failed to add to game leaderboard:', { error });
    throw new Error('Failed to add to game leaderboard');
  }
};

/**
 * Get the leaderboard for a specific game.
 * Returns entries sorted by score (ascending - lower is better),
 * with ties broken by earlier completion time.
 */
export const getGameLeaderboard = async (
  gameId: string,
  limit: number = 10
): Promise<GameLeaderboardEntry[]> => {
  try {
    const redis = await getRedisClient();
    const leaderboardKey = RedisKeys.letteredGameLeaderboard(gameId);
    const metadataKey = RedisKeys.letteredGameLeaderboardMeta(gameId);

    // Get top entries (ascending order - lowest scores first)
    // Using 'by: rank' to get entries by their rank position (0-indexed)
    const rankings = await redis.zRange(leaderboardKey, 0, limit - 1, { by: 'rank' });

    if (!rankings || rankings.length === 0) {
      return [];
    }

    // Get metadata for all ranked users
    const entries: GameLeaderboardEntry[] = [];
    for (const ranking of rankings) {
      const userId = ranking.member as string;
      const metadataStr = await redis.hGet(metadataKey, userId);

      if (metadataStr) {
        const metadata = deserialize<GameLeaderboardEntryStorage>(metadataStr);
        if (metadata) {
          entries.push(convertGameLeaderboardEntry(metadata));
        }
      }
    }

    return entries;
  } catch (error) {
    console.error('Failed to get game leaderboard:', { error });
    throw new Error('Failed to get game leaderboard');
  }
};

/**
 * Get a user's leaderboard entry for a specific game.
 * Returns null if the user hasn't completed the game.
 */
export const getUserGameLeaderboardEntry = async (
  gameId: string,
  userId: string
): Promise<GameLeaderboardEntry | null> => {
  try {
    const redis = await getRedisClient();
    const metadataKey = RedisKeys.letteredGameLeaderboardMeta(gameId);

    const metadataStr = await redis.hGet(metadataKey, userId);
    if (!metadataStr) {
      return null;
    }

    const metadata = deserialize<GameLeaderboardEntryStorage>(metadataStr);
    if (!metadata) {
      return null;
    }

    return convertGameLeaderboardEntry(metadata);
  } catch (error) {
    console.error('Failed to get user game leaderboard entry:', { error });
    return null;
  }
};

/**
 * Update a user's leaderboard entry for a specific game.
 * Used primarily to toggle anonymous mode.
 */
export const updateGameLeaderboardEntry = async (
  gameId: string,
  userId: string,
  updates: Partial<Pick<GameLeaderboardEntry, 'isAnonymous' | 'displayName'>>
): Promise<GameLeaderboardEntry | null> => {
  try {
    const redis = await getRedisClient();
    const metadataKey = RedisKeys.letteredGameLeaderboardMeta(gameId);

    // Get existing entry
    const metadataStr = await redis.hGet(metadataKey, userId);
    if (!metadataStr) {
      console.error('User entry not found in leaderboard:', { gameId, userId });
      return null;
    }

    const existingMetadata = deserialize<GameLeaderboardEntryStorage>(metadataStr);
    if (!existingMetadata) {
      console.error('Failed to parse existing leaderboard entry:', { gameId, userId });
      return null;
    }

    // Apply updates
    const updatedMetadata: GameLeaderboardEntryStorage = {
      ...existingMetadata,
      is_anonymous: updates.isAnonymous ?? existingMetadata.is_anonymous,
      display_name: updates.displayName ?? existingMetadata.display_name,
    };

    // Save updated entry
    await redis.hSet(metadataKey, { [userId]: serialize(updatedMetadata) });

    console.log('Updated game leaderboard entry:', {
      gameId,
      userId,
      isAnonymous: updatedMetadata.is_anonymous,
      displayName: updatedMetadata.display_name,
    });

    return convertGameLeaderboardEntry(updatedMetadata);
  } catch (error) {
    console.error('Failed to update game leaderboard entry:', { error });
    throw new Error('Failed to update game leaderboard entry');
  }
};

/**
 * Get a player's rank in a specific game's leaderboard.
 * Returns 1-indexed rank, or null if player hasn't completed the game.
 */
export const getPlayerRankInGameLeaderboard = async (
  gameId: string,
  userId: string
): Promise<number | null> => {
  try {
    const redis = await getRedisClient();
    const leaderboardKey = RedisKeys.letteredGameLeaderboard(gameId);

    // zRank returns 0-indexed rank (ascending order), or null/undefined if member not found
    const rank = await redis.zRank(leaderboardKey, userId);

    // Check for both null and undefined (Redis client may return either)
    return rank != null ? rank + 1 : null;
  } catch (error) {
    console.error('Failed to get player rank in game:', { error });
    return null;
  }
};

/**
 * Get total number of players who completed a specific game.
 */
export const getGameLeaderboardTotalPlayers = async (gameId: string): Promise<number> => {
  try {
    const redis = await getRedisClient();
    const leaderboardKey = RedisKeys.letteredGameLeaderboard(gameId);

    const count = await redis.zCard(leaderboardKey);
    return count || 0;
  } catch (error) {
    console.error('Failed to get game leaderboard total players:', { error });
    return 0;
  }
};

/**
 * Game stats for splash screen display.
 */
export interface GameStats {
  totalCompletions: number;
  averageTimeMs: number; // average time in milliseconds
  averageMoves: number;
}

/**
 * Get aggregated stats for a game (total completions, average time, average moves).
 * Used for splash screen display.
 */
export const getGameStats = async (gameId: string): Promise<GameStats> => {
  try {
    const redis = await getRedisClient();
    const leaderboardKey = RedisKeys.letteredGameLeaderboard(gameId);
    const metadataKey = RedisKeys.letteredGameLeaderboardMeta(gameId);

    // Get total count
    const totalCompletions = await redis.zCard(leaderboardKey);

    if (!totalCompletions || totalCompletions === 0) {
      return {
        totalCompletions: 0,
        averageTimeMs: 0,
        averageMoves: 0,
      };
    }

    // Get all entries to calculate averages (limit to 1000 for performance)
    const rankings = await redis.zRange(leaderboardKey, 0, 999, { by: 'rank' });

    if (!rankings || rankings.length === 0) {
      return {
        totalCompletions,
        averageTimeMs: 0,
        averageMoves: 0,
      };
    }

    // Aggregate stats from metadata
    let totalTimeMs = 0;
    let totalMoves = 0;
    let validEntries = 0;

    for (const ranking of rankings) {
      const userId = ranking.member as string;
      const metadataStr = await redis.hGet(metadataKey, userId);

      if (metadataStr) {
        const metadata = deserialize<GameLeaderboardEntryStorage>(metadataStr);
        if (metadata) {
          totalTimeMs += metadata.time_elapsed;
          totalMoves += metadata.moves;
          validEntries++;
        }
      }
    }

    return {
      totalCompletions,
      averageTimeMs: validEntries > 0 ? Math.round(totalTimeMs / validEntries) : 0,
      averageMoves: validEntries > 0 ? Math.round(totalMoves / validEntries) : 0,
    };
  } catch (error) {
    console.error('Failed to get game stats:', { error });
    return {
      totalCompletions: 0,
      averageTimeMs: 0,
      averageMoves: 0,
    };
  }
};

/**
 * Check if a user already has an entry in a game's leaderboard.
 */
export const hasUserCompletedGame = async (gameId: string, userId: string): Promise<boolean> => {
  try {
    const redis = await getRedisClient();
    const leaderboardKey = RedisKeys.letteredGameLeaderboard(gameId);

    // zScore returns null/undefined if member doesn't exist
    const score = await redis.zScore(leaderboardKey, userId);
    return score != null;
  } catch (error) {
    console.error('Failed to check if user completed game:', { error });
    return false;
  }
};
