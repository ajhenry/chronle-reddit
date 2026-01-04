import { Router } from 'express';
import { z } from 'zod';
import {
  LetteredDailyGameResponse,
  LetteredGameSessionResponse,
  GridPosition,
  LetterPiece,
  GridCell,
  LetteredPostGameResponse,
  LetteredGameData,
} from '../../shared/types/api';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';
import { getCurrentUTCTime, toUTCTimestamp } from '../lib/time';
import { updateLetteredLeaderboards } from '../lib/leaderboard-helpers';
import {
  getTodaysLetteredGame,
  getOrCreateLetteredSession,
  updateLetteredSession,
  getLatestLetteredSubmission,
  createLetteredSubmission,
  getTotalLetteredSubmissions,
  deleteLetteredSession,
  addToGameLeaderboard,
  getGameLeaderboard,
  getPlayerRankInGameLeaderboard,
  getGameLeaderboardTotalPlayers,
  calculateLeaderboardScore,
  hasUserCompletedGame,
  getUserGameLeaderboardEntry,
  updateGameLeaderboardEntry,
} from '../database/lettered';
import { generateAnonymousName } from '../lib/anonymous-names';
import { getRedisClient } from '../lib/redis-provider';
import { RedisKeys, deserialize, serialize } from '../../shared/types/redis';
import { RANDOM_LETTERED_PHRASES } from '../lib/phrase-lists';
import { generateMockGame } from '../lib/lettered-game-generator';
import { titleCase } from 'title-case';
import { context } from '@devvit/web/server';
import { reddit } from '../lib/reddit-provider';
import { setPostToGameMapping } from '../database/redis';
import {
  trackUniqueUser,
  trackScreenSize,
  incrementGamesAttempted,
  incrementGamesCompleted,
  type ScreenInfo,
} from '../database/analytics';

/**
 * Generate a welcome comment for custom puzzles
 */
const getCustomWelcomeComment = (creatorUsername: string): string => {
  return `Welcome to Lettered, the phrase-fitting puzzle game!

This is a custom puzzle created by u/${creatorUsername}.

**How to Play:**
1. Each puzzle contains a hidden phrase with empty spaces
2. Drag and drop the scattered letter pieces into the correct positions
3. Complete the phrase correctly to solve the puzzle

Race against the clock to climb the leaderboard, show off your skills in the comments, and challenge your friends!`;
};

// Zod schema for validating the payload
const gridPositionSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});

const gridCellSchema = z.object({
  letter: z.string().nullable(),
  isLetter: z.boolean(),
  isPreFilled: z.boolean(),
  isSpace: z.boolean(),
  isUnused: z.boolean(),
});

const boardStateSchema = z.object({
  grid: z.array(z.array(gridCellSchema)),
  placedPieces: z.record(z.string().min(1), gridPositionSchema),
});

const screenInfoSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  breakpoint: z.enum(['xs', 'sm', 'md', 'lg', 'xl']),
});

const letteredSessionPayloadSchema = z.object({
  boardState: boardStateSchema,
  timestamp: z.number().positive(),
  screenInfo: screenInfoSchema.optional(),
});

// Generate a unique signature for a piece based on its letters and shape
// Pieces with the same signature are interchangeable
const getPieceSignature = (piece: LetterPiece): string => {
  const letters = piece.letters.join('');
  const shapeStr = piece.shape
    .map((pos) => `${pos.row},${pos.col}`)
    .sort()
    .join(';');
  return `${letters}:${shapeStr}`;
};

// Check if player has won by comparing placed pieces with the solution
// Handles identical pieces that can be validly swapped
const checkPlayerHasWon = (
  placedPieces: Record<string, GridPosition>,
  gameGrid: GridCell[][],
  pieces: LetterPiece[],
  solution: Record<string, GridPosition>
): boolean => {
  const mainGridHeight = gameGrid.length;
  const mainGridWidth = gameGrid[0]?.length || 0;

  // Filter out pieces placed in the tray area (below main grid)
  const mainBoardPieces = Object.entries(placedPieces).filter(([, position]) => {
    return position.row < mainGridHeight && position.col < mainGridWidth;
  });

  // Check if all pieces are placed on the main board
  const totalPieces = pieces.length;
  const placedOnBoardCount = mainBoardPieces.length;

  if (placedOnBoardCount !== totalPieces) {
    console.log('Board validation: Not all pieces placed', {
      totalPieces,
      placedOnBoardCount,
    });
    return false;
  }

  // Group pieces by their signature (identical pieces can be swapped)
  const piecesBySignature = new Map<string, LetterPiece[]>();
  for (const piece of pieces) {
    const signature = getPieceSignature(piece);
    const group = piecesBySignature.get(signature) || [];
    group.push(piece);
    piecesBySignature.set(signature, group);
  }

  // For each group of identical pieces, check if placed positions match solution positions
  for (const [signature, groupPieces] of piecesBySignature) {
    // Get the solution positions for all pieces in this group
    const solutionPositions = groupPieces
      .map((piece) => {
        const pos = solution[piece.id];
        return pos ? `${pos.row},${pos.col}` : null;
      })
      .filter(Boolean)
      .sort();

    // Get the placed positions for all pieces in this group
    const placedPositions = groupPieces
      .map((piece) => {
        const pos = placedPieces[piece.id];
        // Only count positions within the main grid
        if (pos && pos.row < mainGridHeight && pos.col < mainGridWidth) {
          return `${pos.row},${pos.col}`;
        }
        return null;
      })
      .filter(Boolean)
      .sort();

    // Check if the sets of positions match (order doesn't matter for identical pieces)
    if (solutionPositions.length !== placedPositions.length) {
      console.log('Board validation: Position count mismatch for group', {
        signature,
        solutionCount: solutionPositions.length,
        placedCount: placedPositions.length,
      });
      return false;
    }

    for (let i = 0; i < solutionPositions.length; i++) {
      if (solutionPositions[i] !== placedPositions[i]) {
        console.log('Board validation: Position mismatch for identical pieces', {
          signature,
          solutionPositions,
          placedPositions,
        });
        return false;
      }
    }
  }

  console.log('Board validation: All pieces correctly placed!', {
    totalPieces,
    placedOnBoardCount,
  });

  return true;
};

const router = Router();

// GET /api/lettered/:gameId/game - Returns a specific lettered game by ID and the user's game session
router.get('/api/lettered/:gameId/game', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const userId = await ensureUserExistsAndGetId();

    // Get the lettered game by ID (works for daily date strings and custom game IDs)
    const redis = await getRedisClient();
    const gameDataRaw = await redis.get(RedisKeys.letteredGame.byId(gameId));

    if (!gameDataRaw) {
      res.status(404).json({
        status: 'error',
        message: 'Game not found',
      });
      return;
    }

    const letteredGame = deserialize<{
      id: string;
      postType: 'daily' | 'custom';
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
    }>(gameDataRaw);

    if (!letteredGame) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to parse game data',
      });
      return;
    }

    // Get or create user's session for this game
    const existingSession = await getOrCreateLetteredSession(userId, gameId);

    console.log('existingSession', existingSession);

    // Track analytics (fire-and-forget, silent on failure)
    try {
      void trackUniqueUser(userId);
      // Track game attempted only if this is a new session (no moves yet)
      if (existingSession.moves === 0 && !existingSession.isCompleted) {
        void incrementGamesAttempted();
      }
    } catch {
      // Silent failure for analytics
    }

    // User has an existing session, get the latest board state submission
    const latestSubmission = await getLatestLetteredSubmission(userId, gameId);

    // Calculate elapsed time
    const gameStartTime = toUTCTimestamp(existingSession.startedAt);
    const now = getCurrentUTCTime();
    const timeElapsedMs = Math.max(0, now - gameStartTime);

    const sessionData: LetteredGameSessionResponse = {
      type: 'lettered_game_session',
      sessionId: existingSession.id,
      timeElapsed: existingSession.isCompleted ? existingSession.timeElapsed : timeElapsedMs,
      isCompleted: existingSession.isCompleted,
      moves: existingSession.moves,
      pieces: latestSubmission?.boardState.placedPieces || {},
    };

    const response: LetteredDailyGameResponse = {
      type: 'lettered_game',
      game: {
        id: letteredGame.id,
        postType: letteredGame.postType,
        category: letteredGame.category,
        phrase: letteredGame.phrase,
        grid: letteredGame.grid as GridCell[][],
        rows: letteredGame.rows,
        cols: letteredGame.cols,
        pieces: letteredGame.pieces as LetterPiece[],
        initialPiecePositions: letteredGame.initialPiecePositions || {},
        solution: letteredGame.solution,
        seed: letteredGame.seed,
        createdAt: letteredGame.createdAt,
        updatedAt: letteredGame.updatedAt,
      },
      session: sessionData,
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/lettered/:gameId/game:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch lettered game',
    });
  }
});

// GET /api/lettered/game - Returns today's lettered game and the user's game session
router.get('/api/lettered/game', async (_req, res): Promise<void> => {
  try {
    const userId = await ensureUserExistsAndGetId();

    // Get or create today's daily lettered game
    const letteredGame = await getTodaysLetteredGame();

    // Get or create user's session for this game
    const existingSession = await getOrCreateLetteredSession(userId, letteredGame.id);

    console.log('existingSession', existingSession);

    // Track analytics (fire-and-forget, silent on failure)
    try {
      void trackUniqueUser(userId);
      // Track game attempted only if this is a new session (no moves yet)
      if (existingSession.moves === 0 && !existingSession.isCompleted) {
        void incrementGamesAttempted();
      }
    } catch {
      // Silent failure for analytics
    }

    // User has an existing session, get the latest board state submission
    const latestSubmission = await getLatestLetteredSubmission(userId, letteredGame.id);

    // Calculate elapsed time
    const gameStartTime = toUTCTimestamp(existingSession.startedAt);
    const now = getCurrentUTCTime();
    const timeElapsedMs = Math.max(0, now - gameStartTime);

    const sessionData: LetteredGameSessionResponse = {
      type: 'lettered_game_session',
      sessionId: existingSession.id,
      timeElapsed: existingSession.isCompleted ? existingSession.timeElapsed : timeElapsedMs,
      isCompleted: existingSession.isCompleted,
      moves: existingSession.moves,
      pieces: latestSubmission?.boardState.placedPieces || {},
    };

    const response: LetteredDailyGameResponse = {
      type: 'lettered_game',
      game: {
        id: letteredGame.id,
        postType: 'daily',
        category: letteredGame.category,
        phrase: letteredGame.phrase,
        grid: letteredGame.grid as GridCell[][],
        rows: letteredGame.rows,
        cols: letteredGame.cols,
        pieces: letteredGame.pieces as LetterPiece[],
        initialPiecePositions: letteredGame.initialPiecePositions || {},
        solution: letteredGame.solution,
        seed: letteredGame.seed,
        createdAt: letteredGame.createdAt,
        updatedAt: letteredGame.updatedAt,
      },
      session: sessionData,
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/lettered/game:', error);
    res.status(500).json({
      status: 'error',
      message: "Failed to fetch today's lettered game",
    });
  }
});

// POST /api/lettered/:gameId/session
router.post('/api/lettered/:gameId/session', async (req, res): Promise<void> => {
  console.log('POST /api/lettered/:gameId/session', {
    gameId: req.params.gameId,
    body: req.body,
    placedPieces: req.body.boardState.placedPieces,
  });
  try {
    const { gameId } = req.params;
    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      console.log('User not authenticated with Reddit');
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    // Validate payload with Zod
    const payloadValidation = letteredSessionPayloadSchema.safeParse(req.body);
    if (!payloadValidation.success) {
      console.error('Payload validation failed:', { error: payloadValidation.error });
      res.status(400).json({
        status: 'error',
        message: 'Invalid payload structure',
        errors: payloadValidation.error.issues,
      });
      return;
    }

    const { boardState, screenInfo } = payloadValidation.data;

    // Track screen size analytics (fire-and-forget, silent on failure)
    if (screenInfo) {
      try {
        void trackScreenSize(screenInfo);
      } catch {
        // Silent failure for analytics
      }
    }

    // Get the lettered game by ID (works for both daily and custom games)
    const redis = await getRedisClient();
    const gameDataRaw = await redis.get(RedisKeys.letteredGame.byId(gameId));
    if (!gameDataRaw) {
      res.status(404).json({
        status: 'error',
        message: 'Game not found',
      });
      return;
    }
    const dailyLetterGame = deserialize<{
      grid: GridCell[][];
      pieces: LetterPiece[];
      solution: Record<string, GridPosition>;
    }>(gameDataRaw);
    if (!dailyLetterGame) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to parse game data',
      });
      return;
    }

    // Get or create game session for this specific game
    const session = await getOrCreateLetteredSession(userId, gameId);

    // Calculate moves based on pieces placed on main board only
    const mainGridHeight = dailyLetterGame.grid.length;
    const mainGridWidth = dailyLetterGame.grid[0]?.length || 0;

    // Count pieces placed on the main board (not in tray)
    const mainBoardPiecesCount = Object.values(boardState.placedPieces).filter((position) => {
      return position.row < mainGridHeight && position.col < mainGridWidth;
    }).length;

    // Only increment moves if pieces were actually placed on the main board
    const movesIncrement = mainBoardPiecesCount > 0 ? 1 : 0;

    // Update session moves count
    const updatedSession = await updateLetteredSession(session.id, {
      moves: session.moves + movesIncrement,
    });

    console.log('Moves calculation:', {
      mainGridHeight,
      mainGridWidth,
      mainBoardPiecesCount,
      movesIncrement,
      sessionMovesBefore: session.moves,
      sessionMovesAfter: updatedSession.moves,
    });

    // Check if player has won
    const hasWon = checkPlayerHasWon(
      boardState.placedPieces,
      dailyLetterGame.grid,
      dailyLetterGame.pieces,
      dailyLetterGame.solution
    );
    console.log('Board validation result:', hasWon);

    let placedPieces: number;
    let boardStateStored: boolean;

    if (session.isCompleted) {
      console.log("Game is already complete, don't store anything but return success");
      // Game is already complete, don't store anything but return success
      placedPieces = Object.keys(boardState.placedPieces).length;
      boardStateStored = false;

      res.json({
        sessionId: session.id,
        accepted: true,
        timeElapsed: session.timeElapsed,
        placedPieces,
        moves: session.moves,
        boardStateStored,
        hasWon,
      });
      return;
    }

    // Store the complete board state as a submission

    // Calculate current score for this submission (using UTC consistently)
    const gameStartTime = toUTCTimestamp(session.startedAt);
    const placementTime = getCurrentUTCTime();
    const timeElapsedMs = Math.max(0, placementTime - gameStartTime);

    console.log('Storing submission', {
      gameStartTime,
      placementTime,
      timeElapsedMs,
    });

    // Store the complete board state as a single submission
    const submission = await createLetteredSubmission({
      gameSessionId: session.id,
      boardState,
    });

    console.log('Stored submission', submission);

    placedPieces = Object.keys(boardState.placedPieces).length;

    // Check if player has won and mark game as completed
    if (hasWon) {
      const completedAt = new Date(getCurrentUTCTime()).toISOString();

      await updateLetteredSession(session.id, {
        isCompleted: true,
        completedAt,
        timeElapsed: timeElapsedMs,
        moves: updatedSession.moves,
      });

      // Track game completion analytics (fire-and-forget, silent on failure)
      try {
        void incrementGamesCompleted();
      } catch {
        // Silent failure for analytics
      }

      // Update leaderboard tables with the final time and moves
      try {
        // Get user's reddit handle
        const redis = await getRedisClient();
        const userData = await redis.get(RedisKeys.user.byId(userId));
        const user = userData ? deserialize<{ handle: string }>(userData) : null;
        const redditHandle = user?.handle || 'unknown';

        // Add to per-game leaderboard
        const score = calculateLeaderboardScore(timeElapsedMs, updatedSession.moves);
        const alreadyCompleted = await hasUserCompletedGame(gameId, userId);

        if (!alreadyCompleted) {
          await addToGameLeaderboard(gameId, {
            userId,
            username: redditHandle,
            timeElapsed: timeElapsedMs,
            moves: updatedSession.moves,
            score,
            completedAt,
          });

          console.log('Added to per-game leaderboard:', {
            gameId,
            userId,
            username: redditHandle,
            score,
            timeElapsed: timeElapsedMs,
            moves: updatedSession.moves,
          });
        }

        // Update overall leaderboards
        await updateLetteredLeaderboards(
          userId,
          redditHandle,
          updatedSession.moves,
          timeElapsedMs / 1000 // Convert to seconds for leaderboard
        );

        console.log('Lettered leaderboard updated:', {
          userId,
          redditHandle,
          moves: updatedSession.moves,
          timeElapsed: timeElapsedMs / 1000,
        });
      } catch (leaderboardError) {
        // Don't fail the request if leaderboard update fails, just log it
        console.error('Error updating lettered leaderboard:', leaderboardError);
      }
    }

    const response = {
      sessionId: session.id,
      accepted: true,
      timeElapsed: timeElapsedMs,
      placedPieces,
      moves: updatedSession.moves,
      boardStateStored: true,
      hasWon,
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating game session:', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to update game session',
    });
  }
});

// GET /api/lettered/:gameId/session - Returns the current game session for a user
router.get('/api/lettered/:gameId/session', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    // Get the user's game session for this specific game (works for daily and custom)
    const session = await getOrCreateLetteredSession(userId, gameId);
    const latestSubmission = await getLatestLetteredSubmission(userId, gameId);

    const response: LetteredGameSessionResponse = {
      type: 'lettered_game_session',
      sessionId: session.id,
      timeElapsed: session.timeElapsed,
      isCompleted: session.isCompleted,
      moves: session.moves,
      pieces: latestSubmission?.boardState.placedPieces || {},
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting game session:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get game session',
    });
  }
});

// DELETE /api/lettered/:gameId/session - Deletes the current game session for a user (debug/dev only)
router.delete('/api/lettered/:gameId/session', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    console.log('DELETE /api/lettered/:gameId/session', { gameId, userId });

    // Delete the user's session for this game
    const deleted = await deleteLetteredSession(userId, gameId);

    if (deleted) {
      res.json({
        status: 'success',
        message: 'Session deleted successfully',
      });
    } else {
      res.json({
        status: 'success',
        message: 'No session found to delete',
      });
    }
  } catch (error) {
    console.error('Error deleting game session:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete game session',
    });
  }
});

// GET /api/lettered/:gameId/postgame - Returns the results that were validated on the server
router.get('/api/lettered/:gameId/postgame', async (req, res): Promise<void> => {
  console.log('GET /api/lettered/:gameId/postgame', {
    gameId: req.params.gameId,
  });
  try {
    const { gameId } = req.params;
    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      console.log('User not authenticated with Reddit');
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    // Get the game data (works for both daily and custom games)
    const redis = await getRedisClient();
    const gameDataRaw = await redis.get(RedisKeys.letteredGame.byId(gameId));
    if (!gameDataRaw) {
      res.status(404).json({
        status: 'error',
        message: 'Game not found',
      });
      return;
    }
    const game = deserialize<{
      id: string;
      postType: 'daily' | 'custom';
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
    }>(gameDataRaw);
    if (!game) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to parse game data',
      });
      return;
    }

    const session = await getOrCreateLetteredSession(userId, gameId);
    const latestSubmission = await getLatestLetteredSubmission(userId, gameId);

    if (!latestSubmission) {
      console.log('No submissions found for this game');
      res.status(404).json({
        status: 'error',
        message: 'No submissions found for this game',
      });
      return;
    }

    if (!session.isCompleted) {
      console.log('Game is not completed');
      res.status(400).json({
        status: 'error',
        message: 'Game is not completed',
      });
      return;
    }

    // Calculate player's score
    const score = calculateLeaderboardScore(session.timeElapsed, session.moves);

    // Get leaderboard data
    const leaderboardEntries = await getGameLeaderboard(gameId, 10);
    const playerRank = await getPlayerRankInGameLeaderboard(gameId, userId);
    const totalPlayers = await getGameLeaderboardTotalPlayers(gameId);

    // Format leaderboard entries for response
    // Use displayName instead of username when user is anonymous
    const leaderboard = leaderboardEntries.map((entry, index) => ({
      username: entry.isAnonymous && entry.displayName ? entry.displayName : entry.username,
      timeElapsed: entry.timeElapsed,
      moves: entry.moves,
      score: entry.score,
      rank: index + 1,
      isAnonymous: entry.isAnonymous,
      displayName: entry.displayName,
    }));

    // Get user's leaderboard entry to check their anonymous state
    const userLeaderboardEntry = await getUserGameLeaderboardEntry(gameId, userId);

    // If user is outside the top entries (top 5), include their entry separately
    let userEntry: (typeof leaderboard)[0] | undefined = undefined;
    if (playerRank && playerRank > 5) {
      const userDataRaw = await redis.hGet('users', userId);
      const userData = userDataRaw ? deserialize<{ handle: string }>(userDataRaw) : null;
      const isAnonymous = userLeaderboardEntry?.isAnonymous ?? false;
      const displayName = userLeaderboardEntry?.displayName;
      userEntry = {
        username: isAnonymous && displayName ? displayName : (userData?.handle || 'Anonymous'),
        timeElapsed: session.timeElapsed,
        moves: session.moves,
        score: calculateLeaderboardScore(session.timeElapsed, session.moves),
        rank: playerRank,
        isAnonymous,
        displayName,
      };
    }

    const response: LetteredPostGameResponse = {
      type: 'lettered_post_game',
      game: game,
      isValid: true,
      pieces: latestSubmission?.boardState.placedPieces || {},
      movesUsed: session.moves,
      timeElapsed: session.timeElapsed,
      score,
      totalPlayers,
      leaderboard,
      ...(playerRank !== null && { rank: playerRank }),
      ...(userEntry && { userEntry }),
    };

    console.log('Postgame response:', {
      gameId,
      userId,
      score,
      rank: playerRank,
      totalPlayers,
      leaderboardCount: leaderboard.length,
    });

    res.json(response);
  } catch (error) {
    console.error('Error getting postgame results:', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get postgame results',
    });
  }
});

// GET /api/lettered/:gameId/leaderboard - Returns the leaderboard for a game (no auth required)
// Can be viewed before completing the game
router.get('/api/lettered/:gameId/leaderboard', async (req, res): Promise<void> => {
  console.log('GET /api/lettered/:gameId/leaderboard', {
    gameId: req.params.gameId,
  });
  try {
    const { gameId } = req.params;

    // Get leaderboard data (no auth required)
    const leaderboardEntries = await getGameLeaderboard(gameId, 10);
    const totalPlayers = await getGameLeaderboardTotalPlayers(gameId);

    // Format leaderboard entries for response
    // Use displayName instead of username when user is anonymous
    const entries = leaderboardEntries.map((entry, index) => ({
      username: entry.isAnonymous && entry.displayName ? entry.displayName : entry.username,
      timeElapsed: entry.timeElapsed,
      moves: entry.moves,
      score: entry.score,
      rank: index + 1,
      isAnonymous: entry.isAnonymous,
      displayName: entry.displayName,
    }));

    // Check if user is authenticated and get their rank if they've completed the game
    let userRank: number | null = null;
    let userEntry: (typeof entries)[0] | undefined = undefined;
    const userId = await ensureUserExistsAndGetId();

    // Number of entries displayed in the UI leaderboard
    const DISPLAYED_ENTRIES = 5;

    if (userId) {
      const hasCompleted = await hasUserCompletedGame(gameId, userId);
      if (hasCompleted) {
        userRank = await getPlayerRankInGameLeaderboard(gameId, userId);

        // If user is outside the top displayed entries, find their specific entry
        if (userRank && userRank > DISPLAYED_ENTRIES) {
          // Get user's session data to build their entry
          const session = await getOrCreateLetteredSession(userId, gameId);
          const userLeaderboardEntry = await getUserGameLeaderboardEntry(gameId, userId);
          if (session.isCompleted) {
            userEntry = {
              username: 'You',
              timeElapsed: session.timeElapsed,
              moves: session.moves,
              score: calculateLeaderboardScore(session.timeElapsed, session.moves),
              rank: userRank,
              isAnonymous: userLeaderboardEntry?.isAnonymous,
              displayName: userLeaderboardEntry?.displayName,
            };
          }
        }
      }
    }

    console.log('Leaderboard response:', {
      gameId,
      entriesCount: entries.length,
      totalPlayers,
      userRank,
      hasUserEntry: !!userEntry,
    });

    res.json({
      entries,
      totalPlayers,
      userRank: userRank ?? undefined,
      userEntry,
    });
  } catch (error) {
    console.error('Error getting game leaderboard:', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get game leaderboard',
    });
  }
});

// POST /api/lettered/:gameId/leaderboard/anonymize - Toggle anonymous mode for user's leaderboard entry
router.post('/api/lettered/:gameId/leaderboard/anonymize', async (req, res): Promise<void> => {
  console.log('POST /api/lettered/:gameId/leaderboard/anonymize', {
    gameId: req.params.gameId,
    body: req.body,
  });

  try {
    const { gameId } = req.params;
    const { isAnonymous } = req.body as { isAnonymous: boolean };

    // Require authentication
    const userId = await ensureUserExistsAndGetId();
    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    // Check if user has completed the game
    const hasCompleted = await hasUserCompletedGame(gameId, userId);
    if (!hasCompleted) {
      res.status(400).json({
        status: 'error',
        message: 'User has not completed this game',
      });
      return;
    }

    // Get current entry to check existing state
    const currentEntry = await getUserGameLeaderboardEntry(gameId, userId);
    if (!currentEntry) {
      res.status(404).json({
        status: 'error',
        message: 'Leaderboard entry not found',
      });
      return;
    }

    // Generate or reuse display name
    let displayName = currentEntry.displayName;
    if (isAnonymous && !displayName) {
      // Generate a new anonymous name if enabling anonymous mode and none exists
      displayName = generateAnonymousName();
    }

    // Update the entry
    const updatedEntry = await updateGameLeaderboardEntry(gameId, userId, {
      isAnonymous,
      displayName,
    });

    if (!updatedEntry) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to update leaderboard entry',
      });
      return;
    }

    console.log('Updated leaderboard anonymity:', {
      gameId,
      userId,
      isAnonymous: updatedEntry.isAnonymous,
      displayName: updatedEntry.displayName,
    });

    res.json({
      status: 'success',
      isAnonymous: updatedEntry.isAnonymous ?? false,
      displayName: updatedEntry.displayName,
    });
  } catch (error) {
    console.error('Error toggling leaderboard anonymity:', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle anonymity',
    });
  }
});

// POST /api/lettered/random - Creates a new random game from the phrase list (does NOT create a Reddit post)
// The game can be shared later via POST /api/lettered/:gameId/share
router.post('/api/lettered/random', async (_req, res): Promise<void> => {
  try {
    // Pick a random phrase from the list
    const randomIndex = Math.floor(Math.random() * RANDOM_LETTERED_PHRASES.length);
    const phraseData = RANDOM_LETTERED_PHRASES[randomIndex]!;

    console.log(
      `Creating random game with phrase: "${phraseData.phrase}" from category: ${phraseData.category} (title cased)`
    );

    // Generate a new game using the server-side generator with a random seed
    const seed = Math.floor(Math.random() * 1000000);
    const titleCasedCategory = titleCase(phraseData.category);
    const gameData = generateMockGame(titleCasedCategory, phraseData.phrase, seed);

    // Create a unique game ID for this random game
    const gameId = `random-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const randomGame: LetteredGameData = {
      ...gameData,
      id: gameId,
      postType: 'custom', // Treat random games like custom games
      createdAt: now,
      updatedAt: now,
    };

    // Save to Redis
    const redis = await getRedisClient();
    await redis.set(RedisKeys.letteredGame.byId(gameId), serialize(randomGame));

    console.log('Successfully created random lettered game (no post yet):', {
      gameId,
      phrase: phraseData.phrase,
      category: titleCasedCategory,
      seed,
      piecesCount: randomGame.pieces.length,
    });

    res.json({
      status: 'success',
      gameId,
      phrase: phraseData.phrase,
      category: titleCasedCategory,
    });
  } catch (error) {
    console.error('Error creating random game:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create random game',
    });
  }
});

// POST /api/lettered/:gameId/share - Creates a Reddit post for an existing game
// Used when sharing a game that was created locally (e.g., via Play Again)
router.post('/api/lettered/:gameId/share', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;

    // Get the game data from Redis
    const redis = await getRedisClient();
    const gameDataRaw = await redis.get(RedisKeys.letteredGame.byId(gameId));

    if (!gameDataRaw) {
      res.status(404).json({
        status: 'error',
        message: 'Game not found',
      });
      return;
    }

    const gameData = deserialize<LetteredGameData>(gameDataRaw);

    if (!gameData) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to parse game data',
      });
      return;
    }

    // Get subreddit name from context
    const { subredditName } = context;
    if (!subredditName) {
      res.status(500).json({
        status: 'error',
        message: 'Subreddit context not available',
      });
      return;
    }

    // Create Reddit post with the game
    const post = await reddit.submitCustomPost({
      subredditName: subredditName,
      title: `Lettered - ${gameData.category}`,
      splash: {
        appDisplayName: 'Lettered',
      },
      webviewMetadata: {
        gameId: gameId,
        customGameId: gameId,
        gameType: 'lettered',
        postType: 'custom',
        autoLaunch: true,
        theme: gameData.category,
      },
    });

    console.log(`Created lettered post for game ${gameId}: ${post.id}`);
    console.log(`Post URL: ${post.url}`);

    // Store mapping from post ID to game ID in Redis for context detection
    await setPostToGameMapping(post.id, gameId);

    // Add stickied welcome comment to the post
    // Use creatorUsername from gameData if available, otherwise get current user
    let creatorUsername = 'Anonymous';
    if ('creatorUsername' in gameData && typeof gameData.creatorUsername === 'string') {
      creatorUsername = gameData.creatorUsername;
    } else {
      try {
        creatorUsername = (await reddit.getCurrentUsername()) || 'Anonymous';
      } catch {
        // Fall back to Anonymous if we can't get username
      }
    }

    try {
      await reddit.submitComment(post.id, getCustomWelcomeComment(creatorUsername), {
        sticky: true,
        distinguish: true,
      });
      console.log('Added welcome comment to shared post:', { postId: post.id });
    } catch (commentError) {
      // Log but don't fail post creation if comment fails
      console.error('Failed to add welcome comment to shared post:', commentError);
    }

    const postPermalink = `https://reddit.com/r/${subredditName}/comments/${post.id}`;

    res.json({
      status: 'success',
      gameId,
      postId: post.id,
      postPermalink,
    });
  } catch (error) {
    console.error('Error sharing game:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to share game',
    });
  }
});

export default router;
