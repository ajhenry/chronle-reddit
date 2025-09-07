import { Router } from 'express';
import { z } from 'zod';
import { createHash } from 'crypto';
import {
  LetteredDailyGameResponse,
  LetteredGameCompleteResponse,
  LetteredGameSessionResponse,
  GridPosition,
  LetterPiece,
  GridCell,
  LetteredPostGameResponse,
} from '../../shared/types/api';
import { calculateDecayedScore } from '../../shared/score-decay';
import { supabase } from '../../shared/supabase-server';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';
import {
  getTodaysLetteredGame,
  getOrCreateUserLetteredSessionForToday,
  updateLetteredSession,
  getLatestLetteredSubmissionForToday,
  createLetteredSubmission,
  getTotalLetteredSubmissionsForToday,
} from '../database/lettered';
import { getOrCreateTodaysGame } from '../database/game';
import { recordLeaderboardEntry } from '../lib/leaderboard-helpers';

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

const letteredSessionPayloadSchema = z.object({
  boardState: boardStateSchema,
  timestamp: z.number().positive(),
});

// Create SHA256 hash of the board state for validation (matches client implementation)
const createBoardHash = (
  grid: GridCell[][],
  placedPieces: Record<string, GridPosition>,
  pieces: LetterPiece[]
): string => {
  // Reconstruct the complete grid by combining secure grid with placed pieces
  const completeGrid = grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      // Start with the secure cell data
      const completeCell = {
        letter: cell.letter,
        isLetter: cell.isLetter,
        isPreFilled: cell.isPreFilled,
        isSpace: cell.isSpace,
        isUnused: cell.isUnused,
      };

      // If this cell doesn't have a pre-filled letter, try to find it from placed pieces
      if (!cell.isPreFilled && !cell.letter) {
        // Check if any piece covers this position
        for (const [pieceId, position] of Object.entries(placedPieces)) {
          const piece = pieces.find((p) => p.id === pieceId);
          if (!piece?.letters?.length) continue;

          // Check if this piece covers the current cell
          const shape = piece.shape;
          if (!shape?.length) continue;

          for (let i = 0; i < shape.length; i++) {
            const shapePos = shape[i];
            if (!shapePos) continue;

            const pieceRow = position.row + shapePos.row;
            const pieceCol = position.col + shapePos.col;

            if (pieceRow === rowIndex && pieceCol === colIndex) {
              completeCell.letter = piece.letters[i] || null;
              break;
            }
          }

          if (completeCell.letter) break; // Found the letter, no need to check more pieces
        }
      }

      return completeCell;
    })
  );

  // Create hash of the complete grid
  const gridJson = JSON.stringify(completeGrid);
  const hash = createHash('sha256').update(gridJson).digest('hex');

  return hash;
};

// Check if player has won by validating the board state against the solution hash
const checkPlayerHasWon = (
  placedPieces: Record<string, GridPosition>,
  gameGrid: GridCell[][],
  pieces: LetterPiece[],
  solutionHash: string
): boolean => {
  // Check if all pieces are placed
  const totalPieces = pieces.length;
  const placedCount = Object.keys(placedPieces).length;

  if (placedCount !== totalPieces) {
    return false;
  }

  // Create hash of current board state and compare with solution hash
  const currentHash = createBoardHash(gameGrid, placedPieces, pieces);
  const isValid = currentHash === solutionHash;

  console.log('Board validation:', {
    currentHash: currentHash.substring(0, 16) + '...',
    solutionHash: solutionHash.substring(0, 16) + '...',
    isValid,
  });

  return isValid;
};

const router = Router();

// GET /api/lettered/game - Returns the current day's lettered game and the user's game session
router.get('/api/lettered/game', async (_req, res): Promise<void> => {
  try {
    const userId = await ensureUserExistsAndGetId();

    // Get or create today's daily lettered game using the helper
    const letteredGame = await getTodaysLetteredGame();
    const dailyGame = await getOrCreateTodaysGame();

    // First try to get existing session
    const existingSession = await getOrCreateUserLetteredSessionForToday(userId);

    // User has an existing session, get the latest board state submission
    const latestSubmission = await getLatestLetteredSubmissionForToday(existingSession.id);

    let currentScore = existingSession.initialScore;
    let placedPieces: Record<string, { pieceId: string; position: GridPosition }> = {};

    if (latestSubmission) {
      const boardState = latestSubmission.boardState;

      // Extract placed pieces from the board state
      placedPieces = Object.entries(boardState.placedPieces).reduce(
        (map, [pieceId, position]) => {
          map[pieceId] = {
            pieceId,
            position,
          };
          return map;
        },
        {} as Record<string, { pieceId: string; position: GridPosition }>
      );

      // Use the score from the latest submission if game is not completed
      if (!existingSession.isCompleted) {
        const elapsedSeconds = Math.max(
          0,
          (new Date().getTime() - new Date(existingSession.startedAt).getTime()) / 1000
        );
        currentScore = calculateDecayedScore({
          initialScore: existingSession.initialScore,
          elapsedSeconds: elapsedSeconds,
          gameType: 'lettered',
          placedPieces: Object.keys(placedPieces).length,
        });
      }
    }

    const sessionData: LetteredGameSessionResponse = {
      type: 'lettered_game_session',
      sessionId: existingSession.id,
      currentScore: existingSession.isCompleted ? existingSession.finalScore : currentScore,
      initialScore: existingSession.initialScore,
      isCompleted: existingSession.isCompleted,
      pieces: latestSubmission?.boardState.placedPieces || {},
    };

    const response: LetteredDailyGameResponse = {
      type: 'lettered_daily_game',
      dailyGameId: letteredGame.id,
      game: {
        id: letteredGame.id,
        category: letteredGame.category,
        phrase: letteredGame.phrase,
        grid: letteredGame.grid as GridCell[][],
        rows: letteredGame.rows,
        cols: letteredGame.cols,
        pieces: letteredGame.pieces as LetterPiece[],
        initialPiecePositions: letteredGame.initialPiecePositions || {},
        solutionHash: letteredGame.solutionHash,
        solution: letteredGame.solution || [],
        createdAt: letteredGame.createdAt,
        updatedAt: letteredGame.updatedAt,
      },
      day: dailyGame.day,
      session: sessionData,
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/lettered/game:', error);
    res.status(500).json({
      status: 'error',
      message: "Failed to fetch today's daily lettered game",
    });
  }
});

// POST /api/lettered/:gameId/session
router.post('/api/lettered/:dailyGameId/session', async (req, res): Promise<void> => {
  console.log('POST /api/lettered/:dailyGameId/session', {
    dailyGameId: req.params.dailyGameId,
    body: req.body,
    placedPieces: req.body.boardState.placedPieces,
  });
  try {
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

    const { boardState, timestamp } = payloadValidation.data;

    // Get today's daily lettered game
    const dailyLetterGame = await getTodaysLetteredGame();

    // Get or create game session
    const session = await getOrCreateUserLetteredSessionForToday(userId);

    // Check if player has won
    const hasWon = checkPlayerHasWon(
      boardState.placedPieces,
      dailyLetterGame.grid,
      dailyLetterGame.pieces,
      dailyLetterGame.solutionHash
    );
    console.log('Board validation result:', hasWon);

    let placedPieces: number;
    let boardStateStored: boolean;

    if (session.isCompleted) {
      console.log("Game is already complete, don't store anything but return success");
      // Game is already complete, don't store anything but return success
      const currentScore = session.finalScore;
      placedPieces = Object.keys(boardState.placedPieces).length;
      boardStateStored = false;

      res.json({
        sessionId: session.id,
        accepted: true,
        currentScore,
        placedPieces,
        boardStateStored,
        hasWon,
      });
      return;
    }

    // Store the complete board state as a submission

    // Calculate current score for this submission
    const gameStartTime = new Date(session.startedAt).getTime();
    const placementTime = new Date().getTime();
    const elapsedSeconds = Math.max(0, (placementTime - gameStartTime) / 1000);

    console.log('Calculating current score for submission', {
      initialScore: session.initialScore,
      gameStartTime,
      placementTime,
      elapsedSeconds,
    });

    // Count placed pieces for score decay calculation
    const placedCount = Object.keys(boardState.placedPieces).length;

    // Use shared decay calculation for submissions
    const currentScore = calculateDecayedScore({
      initialScore: session.initialScore,
      elapsedSeconds,
      gameType: 'lettered',
      placedPieces: placedCount,
    });

    console.log('Current score for submission', currentScore);
    // Store the complete board state as a single submission
    const submission = await createLetteredSubmission({
      gameSessionId: session.id,
      boardState,
      scoreAtSubmission: currentScore,
    });

    console.log('Stored submission', submission);

    placedPieces = Object.keys(boardState.placedPieces).length;

    // Check if player has won and mark game as completed
    if (hasWon) {
      await updateLetteredSession(session.id, {
        isCompleted: true,
        completedAt: new Date(timestamp).toISOString(),
        finalScore: currentScore,
      });

      // TODO: Record the points in the leaderboard
    }

    const response = {
      sessionId: session.id,
      accepted: true,
      currentScore,
      placedPieces,
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

    const dailyGame = await getTodaysLetteredGame();

    // Validate that the requested gameId matches today's game
    if (gameId !== dailyGame.id) {
      res.status(400).json({
        status: 'error',
        message: `Game session id is invalid for today's game`,
      });
      return;
    }

    // Get the user's game session
    const session = await getOrCreateUserLetteredSessionForToday(userId);
    const latestSubmission = await getLatestLetteredSubmissionForToday(session.id);

    const response: LetteredGameSessionResponse = {
      type: 'lettered_game_session',
      sessionId: session.id,
      currentScore: session.isCompleted ? session.finalScore : session.initialScore,
      initialScore: session.initialScore,
      isCompleted: session.isCompleted,
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

    const dailyGame = await getTodaysLetteredGame();

    if (gameId !== dailyGame.id) {
      res.status(400).json({
        status: 'error',
        message: "Game id is invalid for today's game",
      });
      return;
    }

    const session = await getOrCreateUserLetteredSessionForToday(userId);
    const latestSubmission = await getLatestLetteredSubmissionForToday(userId);
    const submissionsCount = await getTotalLetteredSubmissionsForToday(userId);

    if (!latestSubmission) {
      console.log('No submissions found for today');
      res.status(404).json({
        status: 'error',
        message: 'No submissions found for today',
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

    const response: LetteredPostGameResponse = {
      type: 'lettered_post_game',
      dailyGame: dailyGame,
      finalScore: session.finalScore,
      isValid: true,
      pieces: latestSubmission?.boardState.placedPieces || {},
      movesUsed: submissionsCount,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting postgame results:', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get postgame results',
    });
  }
});

export default router;
