import { Router } from 'express';
import { z } from 'zod';
import {
  LetteredDailyGameResponse,
  LetteredGameCompleteResponse,
  LetteredGameSessionResponse,
  GridPosition,
  LetterPiece,
  GridCell,
} from '../../shared/types/api';
import { supabase } from '../../shared/supabase-server';
import { recordLeaderboardEntry } from '../lib/leaderboard-helpers';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';
import {
  getTodaysLetteredGame,
  getOrCreateUserLetteredSessionForToday,
  createLetteredSession,
  updateLetteredSession,
  getLetteredSubmissionsForToday,
  getLatestLetteredSubmissionForToday,
} from '../database/lettered';
import { getOrCreateTodaysGame } from '../database/game';

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

const router = Router();

// GET /api/lettered/game - Returns the current day's lettered game and the user's game session
router.get('/api/lettered/game', async (_req, res): Promise<void> => {
  console.log('GET /api/lettered/game');
  try {
    const userId = await ensureUserExistsAndGetId();

    // Get or create today's daily lettered game using the helper
    const letteredGame = await getTodaysLetteredGame();
    const dailyGame = await getOrCreateTodaysGame();

    // First try to get existing session
    const existingSession = await getOrCreateUserLetteredSessionForToday(userId);

    // User has an existing session, get the latest board state submission
    const latestSubmission = await getLatestLetteredSubmissionForToday(existingSession.id);
    console.log('latestSubmission', latestSubmission);

    let currentScore = existingSession.initialScore;
    let placedPieces: Record<string, { pieceId: string; position: GridPosition }> = {};

    if (latestSubmission) {
      const boardState = latestSubmission.boardState as {
        grid: GridCell[][];
        placedPieces: Record<string, GridPosition>;
      };

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
        currentScore = latestSubmission.scoreAtSubmission;
      }
    }

    const sessionData: LetteredGameSessionResponse = {
      type: 'lettered_game_session',
      sessionId: existingSession.id,
      currentScore: existingSession.isCompleted ? existingSession.finalScore : currentScore,
      initialScore: existingSession.initialScore,
      isCompleted: existingSession.isCompleted,
      pieces: placedPieces,
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
        created_at: letteredGame.createdAt,
        updated_at: letteredGame.updatedAt,
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
    const { dailyGameId } = req.params;
    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    // Validate payload with Zod
    const payloadValidation = letteredSessionPayloadSchema.safeParse(req.body);
    if (!payloadValidation.success) {
      console.error('Payload validation failed:', payloadValidation.error);
      res.status(400).json({
        status: 'error',
        message: 'Invalid payload structure',
        errors: payloadValidation.error.issues,
      });
      return;
    }

    const { boardState, timestamp } = payloadValidation.data;

    // Get today's daily lettered game
    const dailyGame = await getTodaysLetteredGame();

    if (!dailyGame) {
      res.status(404).json({
        status: 'error',
        message: 'No daily lettered game available for today',
      });
      return;
    }

    // Get or create game session
    const session = await getOrCreateUserLetteredSessionForToday(userId);

    if (session.isCompleted) {
      res.status(400).json({
        status: 'error',
        message: 'Game session is already completed',
      });
      return;
    }

    // Store the complete board state as a submission

    // Calculate current score for this submission
    const gameStartTime = new Date(session.startedAt).getTime();
    const placementTime = timestamp;
    const elapsedSeconds = Math.max(0, (placementTime - gameStartTime) / 1000);

    // Count placed pieces for score decay calculation
    const placedCount = Object.keys(boardState.placedPieces).length;

    // Scoring algorithm: Start at 5000, decay over time, faster decay with more pieces placed
    const decayMultiplier = Math.pow(1.1, placedCount);
    const scoreDecay = Math.floor(elapsedSeconds * decayMultiplier);
    const currentScore = Math.max(0, session.initialScore - scoreDecay);

    // Store the complete board state as a single submission
    const { error: insertError } = await (supabase as any).from('lettered_submissions').insert({
      game_session_id: session.id,
      board_state: boardState,
      submitted_at: new Date(timestamp).toISOString(),
      score_at_submission: currentScore,
    });

    if (insertError) {
      console.error('Error inserting board state submission:', insertError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to save board state',
      });
      return;
    }

    const response = {
      sessionId: session.id,
      accepted: true,
      currentScore,
      placedPieces: Object.keys(boardState.placedPieces).length,
      boardStateStored: true,
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

    // Get today's daily lettered game
    const { data: dailyGameResult, error: dailyGameError } = await supabase.rpc(
      'get_todays_lettered_daily_game'
    );

    if (dailyGameError || !dailyGameResult || dailyGameResult.length === 0) {
      console.error("Error fetching today's daily lettered game:", dailyGameError);
      res.status(404).json({
        status: 'error',
        message: 'No daily lettered game available for today',
      });
      return;
    }

    const dailyGame = dailyGameResult[0];

    // Validate that the requested gameId matches today's game
    if (gameId !== dailyGame.id) {
      res.status(400).json({
        status: 'error',
        message: `Game session id ${gameId} is for ${dailyGame.day} but current game id ${dailyGame.id} for ${dailyGame.day}`,
      });
      return;
    }

    // Get the user's game session
    let session;
    try {
      session = await getOrCreateUserLetteredSessionForToday(userId);
    } catch (sessionError) {
      console.error('Error fetching lettered session:', sessionError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch game session',
      });
      return;
    }

    if (!session) {
      // No session exists yet
      res.status(404).json({
        status: 'error',
        message: 'No game session found for today',
      });
      return;
    }

    // Get the latest board state submission for this session
    const { data: submissions, error: submissionsError } = await supabase
      .from('lettered_submissions')
      .select('board_state, submitted_at, score_at_submission')
      .eq('game_session_id', session.id)
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch submissions',
      });
      return;
    }

    // Calculate current score if game is not completed
    let currentScore = session.finalScore;
    let placedPieces: Array<{
      pieceId: string;
      position: GridPosition;
      placedAt: string;
      scoreAtPlacement: number;
    }> = [];

    if (!session.isCompleted && submissions && submissions.length > 0) {
      const latestSubmission = submissions[0];
      if (latestSubmission && 'board_state' in latestSubmission) {
        const boardState = (latestSubmission as any).board_state as {
          grid: GridCell[][];
          placedPieces: Record<string, GridPosition>;
        };

        // Extract placed pieces from the board state
        placedPieces = Object.entries(boardState.placedPieces).map(([pieceId, position]) => ({
          pieceId,
          position,
          placedAt: (latestSubmission as any).submitted_at,
          scoreAtPlacement: (latestSubmission as any).score_at_submission,
        }));

        currentScore = (latestSubmission as any).score_at_submission;
      }
    }

    const response = {
      id: session.id,
      startedAt: session.startedAt,
      currentScore,
      initialScore: session.initialScore,
      isCompleted: session.isCompleted,
      placedPieces,
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

    // Get today's daily lettered game
    const { data: dailyGameResult, error: dailyGameError } = await supabase.rpc(
      'get_todays_lettered_daily_game'
    );

    if (dailyGameError || !dailyGameResult || dailyGameResult.length === 0) {
      console.error("Error fetching today's daily lettered game:", dailyGameError);
      res.status(404).json({
        status: 'error',
        message: 'No daily lettered game available for today',
      });
      return;
    }

    const dailyGame = dailyGameResult[0];

    // Validate that the requested gameId matches today's game
    if (gameId !== dailyGame.id) {
      res.status(400).json({
        status: 'error',
        message: `Game session id ${gameId} is for ${dailyGame.day} but current game id ${dailyGame.id} for ${dailyGame.day}`,
      });
      return;
    }

    // Get the user's game session
    let session;
    try {
      session = await getOrCreateUserLetteredSessionForToday(userId);
    } catch (sessionError) {
      console.error('Error fetching lettered session:', sessionError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch game session',
      });
      return;
    }

    if (!session) {
      res.status(404).json({
        status: 'error',
        message: 'No game session found for today',
      });
      return;
    }

    // If not completed, validate and complete the game now
    if (!session.isCompleted) {
      // Get the latest board state submission for this session
      const { data: submissions, error: submissionsError } = await supabase
        .from('lettered_submissions')
        .select('board_state, score_at_submission')
        .eq('game_session_id', session.id)
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (submissionsError) {
        console.error('Error fetching board state:', submissionsError);
        res.status(500).json({
          status: 'error',
          message: 'Failed to fetch board state',
        });
        return;
      }

      // Get the daily game data
      const dailyGame = await getTodaysLetteredGame();
      const game = dailyGame;

      // For lettered games, completion is determined by having placed all pieces
      // Check if all pieces are placed in the latest board state
      let allPiecesPlaced = false;
      let finalScore = 0;

      if (submissions && submissions.length > 0) {
        const latestSubmission = submissions[0];
        if (latestSubmission && 'board_state' in latestSubmission) {
          const boardState = (latestSubmission as any).board_state as {
            grid: GridCell[][];
            placedPieces: Record<string, GridPosition>;
          };

          const placedCount = Object.keys(boardState.placedPieces).length;
          allPiecesPlaced = placedCount === (game as any).pieces?.length;
          finalScore = allPiecesPlaced ? (latestSubmission as any).score_at_submission : 0;
        }
      }

      if (allPiecesPlaced) {
        // Mark session as completed
        await updateLetteredSession(session.id, {
          isCompleted: true,
          completedAt: new Date().toISOString(),
          finalScore,
        });

        // Record the points in the leaderboard
        const leaderboardResult = await recordLeaderboardEntry(
          userId,
          dailyGame.id,
          session.id,
          finalScore,
          'lettered'
        );

        if (!leaderboardResult.success) {
          console.error('Failed to record leaderboard entry:', leaderboardResult.error);
          // Continue with the response even if leaderboard recording fails
        }

        const response: LetteredGameCompleteResponse = {
          type: 'lettered_game_complete',
          finalScore,
          isValid: true,
        };

        res.json(response);
      } else {
        // Game not yet completed
        res.status(400).json({
          status: 'error',
          message: 'Game not yet completed',
        });
      }
    } else {
      // Game already completed, return the stored results
      const response: LetteredGameCompleteResponse = {
        type: 'lettered_game_complete',
        finalScore: session.finalScore,
        isValid: true,
      };

      res.json(response);
    }
  } catch (error) {
    console.error('Error getting postgame results:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get postgame results',
    });
  }
});

export default router;
