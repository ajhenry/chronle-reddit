import { Router } from 'express';
import { LetteredDailyGameResponse, LetteredGameCompleteResponse } from '../../shared/types/api';
import { supabase } from '../../shared/supabase-server';
import { getOrCreateTodaysLetteredGame } from '../lib/lettered-game-helpers';
import { recordLeaderboardEntry } from '../lib/leaderboard-helpers';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';

const router = Router();

// GET /api/lettered/game - Returns the current day's lettered game
router.get('/api/lettered/game', async (_req, res): Promise<void> => {
  console.log('GET /api/lettered/game');
  try {
    const userId = await ensureUserExistsAndGetId();
    console.log('userId', { userId });

    // Get or create today's daily lettered game using the helper
    const result = await getOrCreateTodaysLetteredGame();

    if (!result.success) {
      res.status(result.statusCode || 500).json({
        status: 'error',
        message: result.error,
      });
      return;
    }

    if (!result.data) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to get game data',
      });
      return;
    }

    const { dailyGame, gameData } = result.data;

    let sessionData: {
      id: string;
      startedAt: string;
      currentScore: number;
      initialScore: number;
      isCompleted: boolean;
      placedPieces: Array<{
        pieceId: string;
        position: { row: number; col: number };
        placedAt: string;
      }>;
    } | null = null;

    // If user is authenticated, get or create their game session
    if (userId) {
      // First try to get existing session
      const { data: existingSession } = await supabase
        .from('game_sessions')
        .select(
          `
          id,
          started_at,
          completed_at,
          initial_score,
          final_score,
          is_completed,
          lettered_submissions(
            piece_id,
            position,
            placed_at
          )
        `
        )
        .eq('user_id', userId)
        .eq('daily_game_id', dailyGame.id)
        .single();

      if (existingSession) {
        // User has an existing session, calculate current score
        const gameStartTime = new Date(existingSession.started_at).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.max(0, (now - gameStartTime) / 1000);

        // Count placed pieces for score decay calculation
        const placedCount = (existingSession.lettered_submissions || []).length;

        // Calculate current score using same algorithm as client
        const decayMultiplier = Math.pow(1.1, placedCount); // Less aggressive decay for lettered games
        const scoreDecay = Math.floor(elapsedSeconds * decayMultiplier);
        const currentScore = Math.max(0, existingSession.initial_score - scoreDecay);

        sessionData = {
          id: existingSession.id,
          startedAt: existingSession.started_at,
          currentScore: existingSession.is_completed ? existingSession.final_score : currentScore,
          initialScore: existingSession.initial_score,
          isCompleted: existingSession.is_completed,
          placedPieces: (existingSession.lettered_submissions || []).map(
            (sub: {
              piece_id: string;
              position: { row: number; col: number };
              placed_at: string;
            }) => ({
              pieceId: sub.piece_id,
              position: sub.position,
              placedAt: sub.placed_at,
            })
          ),
        };
      } else {
        // No existing session, create a new one
        const { data: newSession, error: createError } = await supabase
          .from('game_sessions')
          .insert({
            user_id: userId,
            daily_game_id: dailyGame.id,
            initial_score: 5000,
            final_score: 5000,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating game session:', createError);
          // Continue without session data
        } else {
          sessionData = {
            id: newSession.id,
            startedAt: newSession.started_at,
            currentScore: 5000,
            initialScore: 5000,
            isCompleted: false,
            placedPieces: [],
          };
        }
      }
    }

    const response: LetteredDailyGameResponse = {
      type: 'lettered_daily_game',
      dailyGameId: dailyGame.id,
      game: gameData,
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

// POST /api/lettered/:gameId/session - Creates or updates a game session with the current grid state
router.post('/api/lettered/:gameId/session', async (req, res): Promise<void> => {
  console.log('POST /api/lettered/:gameId/session', { gameId: req.params.gameId, body: req.body });
  try {
    const { gameId } = req.params;
    const { grid, timestamp } = req.body;
    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    if (!grid || !Array.isArray(grid) || !timestamp) {
      res.status(400).json({
        status: 'error',
        message: 'Grid state and timestamp are required',
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

    // Get or create game session
    let session: {
      id: string;
      user_id: string;
      daily_game_id: string;
      started_at: string;
      completed_at: string | null;
      initial_score: number;
      final_score: number;
      is_completed: boolean;
    } | null = null;
    const { data: existingSession, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('daily_game_id', dailyGame.id)
      .single();

    if (sessionError && sessionError.code !== 'PGRST116') {
      // PGRST116 is "not found"
      console.error('Error fetching game session:', sessionError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch game session',
      });
      return;
    }

    session = existingSession;

    // Create session if it doesn't exist
    if (!session) {
      const { data: newSession, error: createError } = await supabase
        .from('game_sessions')
        .insert({
          user_id: userId,
          daily_game_id: dailyGame.id,
          initial_score: 5000,
          final_score: 5000,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating game session:', createError);
        res.status(500).json({
          status: 'error',
          message: 'Failed to create game session',
        });
        return;
      }

      session = newSession;
    }

    if (!session) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to create or retrieve game session',
      });
      return;
    }

    if (session.is_completed) {
      res.status(400).json({
        status: 'error',
        message: 'Game session is already completed',
      });
      return;
    }

    // Process the grid state to extract piece placements
    // This is a simplified implementation - you might need more complex logic
    // to properly validate and process the grid state
    const placedPieces: Array<{ pieceId: string; position: { row: number; col: number } }> = [];

    // For now, we'll assume the grid contains the current state and we need to
    // compare it with existing submissions to find new placements
    // This is a placeholder implementation that would need to be enhanced

    // Calculate time-based score decay
    const gameStartTime = new Date(session.started_at).getTime();
    const placementTime = timestamp;
    const elapsedSeconds = Math.max(0, (placementTime - gameStartTime) / 1000);

    // Count existing placements for score decay calculation
    const { count: placementCount, error: countError } = await supabase
      .from('lettered_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('game_session_id', session.id);

    if (countError) {
      console.error('Error counting placements:', countError);
    }

    const placedCount = placementCount || 0;

    // Scoring algorithm: Start at 5000, decay over time, faster decay with more pieces placed
    const decayMultiplier = Math.pow(1.1, placedCount);
    const scoreDecay = Math.floor(elapsedSeconds * decayMultiplier);
    const currentScore = Math.max(0, session.initial_score - scoreDecay);

    // For now, return a basic response - this would need to be enhanced to properly
    // process the grid state and record piece placements
    const response = {
      sessionId: session.id,
      accepted: true,
      currentScore,
      placedPieces: placedPieces.length,
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating game session:', error);
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
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select(
        `
        id,
        started_at,
        completed_at,
        initial_score,
        final_score,
        is_completed,
        lettered_submissions(
          piece_id,
          position,
          placed_at,
          score_at_placement
        )
      `
      )
      .eq('user_id', userId)
      .eq('daily_game_id', dailyGame.id)
      .single();

    if (sessionError && sessionError.code !== 'PGRST116') {
      // PGRST116 is "not found"
      console.error('Error fetching game session:', sessionError);
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

    // Calculate current score if game is not completed
    let currentScore = session.final_score;
    if (!session.is_completed) {
      const gameStartTime = new Date(session.started_at).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.max(0, (now - gameStartTime) / 1000);

      const placedCount = (session.lettered_submissions || []).length;
      const decayMultiplier = Math.pow(1.1, placedCount);
      const scoreDecay = Math.floor(elapsedSeconds * decayMultiplier);
      currentScore = Math.max(0, session.initial_score - scoreDecay);
    }

    const response = {
      id: session.id,
      startedAt: session.started_at,
      currentScore,
      initialScore: session.initial_score,
      isCompleted: session.is_completed,
      placedPieces: (session.lettered_submissions || []).map(
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
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select(
        `
        *,
        daily_games!inner(
          id,
          day,
          lettered_game_id,
          lettered_games!inner(*)
        )
      `
      )
      .eq('user_id', userId)
      .eq('daily_game_id', dailyGame.id)
      .single();

    if (sessionError || !session) {
      console.error('Error fetching game session:', sessionError);
      res.status(404).json({
        status: 'error',
        message: 'No game session found for today',
      });
      return;
    }

    // If not completed, validate and complete the game now
    if (!session.is_completed) {
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

      const game = session.daily_games.lettered_games;

      // For lettered games, completion is determined by having placed all pieces
      // The score is the final score when the last piece is placed
      const allPiecesPlaced = placements && placements.length === game.pieces.length;
      const finalScore = allPiecesPlaced ? placements[placements.length - 1].score_at_placement : 0;

      if (allPiecesPlaced) {
        // Mark session as completed
        await supabase
          .from('game_sessions')
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
            final_score: finalScore,
          })
          .eq('id', session.id);

        // Record the points in the leaderboard
        const leaderboardResult = await recordLeaderboardEntry(
          userId,
          dailyGame.id,
          session.id,
          finalScore
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
