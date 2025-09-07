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
  getUserLetteredSessionForToday,
  createLetteredSession,
  updateLetteredSession,
} from '../database/lettered';
import { getOrCreateTodaysGame } from '../database/game';

// Zod schema for validating the payload
const gridPositionSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});

const placedPieceSchema = z.object({
  pieceId: z.string().min(1),
  position: gridPositionSchema,
  placedAt: z.string().datetime(),
});

const letteredSessionPayloadSchema = z.object({
  placedPieces: z.record(z.string().min(1), placedPieceSchema),
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

    let sessionData: LetteredGameSessionResponse | null = null;

    // If user is authenticated, get or create their game session
    if (userId) {
      try {
        // First try to get existing session
        const existingSession = await getUserLetteredSessionForToday(userId);

        if (existingSession) {
          // User has an existing session, get submissions and calculate current score
          const { data: submissions } = await supabase
            .from('lettered_submissions')
            .select('piece_id, position, placed_at')
            .eq('game_session_id', existingSession.id);

          // Calculate current score using same algorithm as client
          const gameStartTime = new Date(existingSession.startedAt).getTime();
          const now = Date.now();
          // TODO: WE NEED TO SYNC THIS CALCULATION WITH THE CLIENT
          const elapsedSeconds = Math.max(0, (now - gameStartTime) / 1000);

          // Count placed pieces for score decay calculation
          const placedCount = (submissions || []).length;

          // Calculate current score using same algorithm as client
          const decayMultiplier = Math.pow(1.1, placedCount); // Less aggressive decay for lettered games
          const scoreDecay = Math.floor(elapsedSeconds * decayMultiplier);
          const currentScore = Math.max(0, existingSession.initialScore - scoreDecay);

          sessionData = {
            type: 'lettered_game_session',
            sessionId: existingSession.id,
            currentScore: existingSession.isCompleted ? existingSession.finalScore : currentScore,
            initialScore: existingSession.initialScore,
            isCompleted: existingSession.isCompleted,
            pieces: (submissions || []).reduce(
              (map: Record<string, { pieceId: string; position: GridPosition }>, sub) => {
                map[sub.piece_id] = {
                  pieceId: sub.piece_id,
                  position: sub.position as GridPosition,
                };
                return map;
              },
              {}
            ),
          };
        } else {
          // No existing session, create a new one
          try {
            const newSession = await createLetteredSession(userId);
            sessionData = {
              type: 'lettered_game_session',
              sessionId: newSession.id,
              currentScore: 5000,
              initialScore: 5000,
              isCompleted: false,
              pieces: {},
            };
          } catch (createError) {
            console.error('Error creating lettered session:', createError);
            // Continue without session data
          }
        }
      } catch (sessionError) {
        console.error('Error handling lettered session:', sessionError);
        // Continue without session data
      }
    }

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
        solution: letteredGame.solution as GridPosition[][],
        solutionHash: letteredGame.solutionHash,
        created_at: letteredGame.createdAt,
        updated_at: letteredGame.updatedAt,
      },
      day: dailyGame.day,
      ...(sessionData && { session: sessionData }),
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
router.post('/api/lettered/:gameId/session', async (req, res): Promise<void> => {
  console.log('POST /api/lettered/:gameId/session', { gameId: req.params.gameId, body: req.body });
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

    const { placedPieces, timestamp } = payloadValidation.data;

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
    let session = null;
    try {
      session = await getUserLetteredSessionForToday(userId);
    } catch (sessionError) {
      console.error('Error fetching lettered session:', sessionError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch game session',
      });
      return;
    }

    // Create session if it doesn't exist
    if (!session) {
      try {
        session = await createLetteredSession(userId, dailyGame.id);
      } catch (createError) {
        console.error('Error creating lettered session:', createError);
        res.status(500).json({
          status: 'error',
          message: 'Failed to create game session',
        });
        return;
      }
    }

    if (!session) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to create or retrieve game session',
      });
      return;
    }

    if (session.isCompleted) {
      res.status(400).json({
        status: 'error',
        message: 'Game session is already completed',
      });
      return;
    }

    // Process the placed pieces data and update the database
    // First, get existing submissions to compare and update
    const { data: existingSubmissions, error: submissionsError } = await supabase
      .from('lettered_submissions')
      .select('piece_id, position')
      .eq('game_session_id', session.id);

    if (submissionsError) {
      console.error('Error fetching existing submissions:', submissionsError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch existing submissions',
      });
      return;
    }

    // Create a map of existing submissions for quick lookup
    const existingPiecesMap = new Map<string, { row: number; col: number }>();
    (existingSubmissions || []).forEach((sub) => {
      existingPiecesMap.set(sub.piece_id, sub.position);
    });

    // Identify new or moved pieces
    const piecesToInsert: Array<{
      game_session_id: string;
      piece_id: string;
      position: { row: number; col: number };
      placed_at: string;
      score_at_placement: number;
    }> = [];

    const piecesToUpdate: Array<{
      piece_id: string;
      position: { row: number; col: number };
    }> = [];

    // Calculate time-based score decay
    const gameStartTime = new Date(session.startedAt).getTime();
    const placementTime = timestamp;
    const elapsedSeconds = Math.max(0, (placementTime - gameStartTime) / 1000);

    // Count existing placements for score decay calculation
    const placedCount = existingSubmissions?.length || 0;

    // Scoring algorithm: Start at 5000, decay over time, faster decay with more pieces placed
    const decayMultiplier = Math.pow(1.1, placedCount);
    const scoreDecay = Math.floor(elapsedSeconds * decayMultiplier);
    const currentScore = Math.max(0, session.initialScore - scoreDecay);

    // Process each placed piece from the map
    for (const [pieceId, pieceData] of Object.entries(placedPieces) as [
      string,
      { pieceId: string; position: GridPosition; placedAt: string },
    ][]) {
      const existingPosition = existingPiecesMap.get(pieceId);

      if (!existingPosition) {
        // New piece placement
        piecesToInsert.push({
          game_session_id: session.id,
          piece_id: pieceId,
          position: pieceData.position,
          placed_at: pieceData.placedAt,
          score_at_placement: currentScore,
        });
      } else if (
        existingPosition.row !== pieceData.position.row ||
        existingPosition.col !== pieceData.position.col
      ) {
        // Piece moved to new position
        piecesToUpdate.push({
          piece_id: pieceId,
          position: pieceData.position,
        });
      }
      // If position is the same, no action needed
    }

    // Execute database operations
    if (piecesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('lettered_submissions')
        .insert(piecesToInsert);

      if (insertError) {
        console.error('Error inserting new submissions:', insertError);
        res.status(500).json({
          status: 'error',
          message: 'Failed to save piece placements',
        });
        return;
      }
    }

    // Update moved pieces
    for (const update of piecesToUpdate) {
      // Get the placedAt timestamp from the client data
      const pieceData = (
        placedPieces as Record<
          string,
          { pieceId: string; position: GridPosition; placedAt: string }
        >
      )[update.piece_id];
      const placedAt = pieceData ? pieceData.placedAt : new Date(timestamp).toISOString();

      const { error: updateError } = await supabase
        .from('lettered_submissions')
        .update({
          position: update.position,
          placed_at: placedAt,
          score_at_placement: currentScore,
        })
        .eq('game_session_id', session.id)
        .eq('piece_id', update.piece_id);

      if (updateError) {
        console.error('Error updating piece position:', updateError);
        // Continue with other updates rather than failing completely
      }
    }

    const response = {
      sessionId: session.id,
      accepted: true,
      currentScore,
      placedPieces: Object.keys(placedPieces).length,
      newPlacements: piecesToInsert.length,
      updatedPlacements: piecesToUpdate.length,
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
      session = await getUserLetteredSessionForToday(userId);
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

    // Get the user's submissions for this session
    const { data: submissions, error: submissionsError } = await supabase
      .from('lettered_submissions')
      .select('piece_id, position, placed_at, score_at_placement')
      .eq('game_session_id', session.id);

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
    if (!session.isCompleted) {
      const gameStartTime = new Date(session.startedAt).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.max(0, (now - gameStartTime) / 1000);

      const placedCount = (submissions || []).length;
      const decayMultiplier = Math.pow(1.1, placedCount);
      const scoreDecay = Math.floor(elapsedSeconds * decayMultiplier);
      currentScore = Math.max(0, session.initialScore - scoreDecay);
    }

    const response = {
      id: session.id,
      startedAt: session.startedAt,
      currentScore,
      initialScore: session.initialScore,
      isCompleted: session.isCompleted,
      placedPieces: (submissions || []).map(
        (sub: {
          piece_id: string;
          position: { row: number; col: number };
          placed_at: string;
          score_at_placement: number;
        }) => ({
          pieceId: sub.piece_id,
          position: sub.position,
          placedAt: sub.placed_at,
          scoreAtPlacement: sub.score_at_placement,
        })
      ),
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
      session = await getUserLetteredSessionForToday(userId);
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
      // Get all piece placements for this session
      const { data: placements, error: placementsError } = await supabase
        .from('lettered_submissions')
        .select('*')
        .eq('game_session_id', session.id)
        .order('placed_at', { ascending: true });

      if (placementsError) {
        console.error('Error fetching placements:', placementsError);
        res.status(500).json({
          status: 'error',
          message: 'Failed to fetch piece placements',
        });
        return;
      }

      // Get the daily game data
      const dailyGame = await getTodaysLetteredGame();
      const game = dailyGame;

      // For lettered games, completion is determined by having placed all pieces
      // The score is the final score when the last piece is placed
      const allPiecesPlaced = placements && placements.length === (game as any).pieces?.length;
      const finalScore = allPiecesPlaced ? placements[placements.length - 1].score_at_placement : 0;

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
        finalScore: session.final_score,
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
