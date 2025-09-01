import { Router } from 'express';
import { createDailyGame, getTodayEST } from '../lib/daily-game-helpers';
import type { TopXDailyGameResponse } from '../../shared/types/api';
import { supabase } from '../../shared/supabase-server';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';

const router = Router();

// Example admin endpoint to create a daily game for a specific date
// POST /api/admin/daily-game
router.post('/api/admin/daily-game', async (req, res): Promise<void> => {
  try {
    const { date, gameId } = req.body;

    // Validate date format if provided
    let targetDate: string | undefined;
    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        res.status(400).json({
          status: 'error',
          message: 'Date must be in YYYY-MM-DD format',
        });
        return;
      }
      targetDate = date;
    }

    // Create the daily game using the helper
    const result = await createDailyGame(targetDate, gameId);

    if (!result.success) {
      res.status(result.statusCode).json({
        status: 'error',
        message: result.error,
      });
      return;
    }

    const { dailyGame, gameData } = result.data;

    const response: TopXDailyGameResponse = {
      type: 'topx_daily_game',
      dailyGameId: dailyGame.id,
      game: gameData,
      day: dailyGame.day,
    };

    res.json({
      status: 'success',
      message: `Daily game created for ${dailyGame.day}`,
      data: response,
    });
  } catch (error) {
    console.error('Error in admin daily game creation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Example admin endpoint to create today's daily game with a specific game
// POST /api/admin/daily-game/today
router.post('/api/admin/daily-game/today', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.body;

    if (!gameId) {
      res.status(400).json({
        status: 'error',
        message: 'gameId is required',
      });
      return;
    }

    const todayEST = getTodayEST();
    const result = await createDailyGame(todayEST, gameId);

    if (!result.success) {
      res.status(result.statusCode).json({
        status: 'error',
        message: result.error,
      });
      return;
    }

    const { dailyGame, gameData } = result.data;

    const response: TopXDailyGameResponse = {
      type: 'topx_daily_game',
      dailyGameId: dailyGame.id,
      game: gameData,
      day: dailyGame.day,
    };

    res.json({
      status: 'success',
      message: `Today's daily game created with game ID ${gameId}`,
      data: response,
    });
  } catch (error) {
    console.error('Error in admin today daily game creation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Example admin endpoint to create daily games for multiple dates
// POST /api/admin/daily-game/bulk
router.post('/api/admin/daily-game/bulk', async (req, res): Promise<void> => {
  try {
    const { dates, gameIds } = req.body;

    if (!Array.isArray(dates) || dates.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'dates array is required and must not be empty',
      });
      return;
    }

    if (gameIds && !Array.isArray(gameIds)) {
      res.status(400).json({
        status: 'error',
        message: 'gameIds must be an array if provided',
      });
      return;
    }

    if (gameIds && gameIds.length !== dates.length) {
      res.status(400).json({
        status: 'error',
        message: 'gameIds array length must match dates array length if provided',
      });
      return;
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const gameId = gameIds ? gameIds[i] : undefined;

      try {
        const result = await createDailyGame(date, gameId);

        if (result.success) {
          results.push({
            date,
            dailyGameId: result.data.dailyGame.id,
            gameId: result.data.topxGame.id,
            status: 'success',
          });
        } else {
          errors.push({
            date,
            error: result.error,
            statusCode: result.statusCode,
          });
        }
      } catch (error) {
        errors.push({
          date,
          error: 'Unexpected error occurred',
          statusCode: 500,
        });
      }
    }

    res.json({
      status: errors.length === 0 ? 'success' : 'partial',
      message: `Created ${results.length} daily games with ${errors.length} errors`,
      data: {
        successful: results,
        errors,
        totalRequested: dates.length,
        totalSuccessful: results.length,
        totalErrors: errors.length,
      },
    });
  } catch (error) {
    console.error('Error in admin bulk daily game creation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Admin endpoint to erase topx game results for current user
// POST /api/admin/erase-topx-results
router.post('/api/admin/erase-topx-results', async (_req, res): Promise<void> => {
  try {
    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    // Get today's daily game
    const { data: dailyGameResult, error: dailyGameError } =
      await supabase.rpc('get_todays_daily_game');

    if (dailyGameError || !dailyGameResult || dailyGameResult.length === 0) {
      console.error("Error fetching today's daily game:", dailyGameError);
      res.status(404).json({
        status: 'error',
        message: 'No daily game available for today',
      });
      return;
    }

    const dailyGame = dailyGameResult[0];

    // Get the user's game session for today
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('daily_game_id', dailyGame.id)
      .single();

    if (sessionError && sessionError.code !== 'PGRST116') {
      console.error('Error fetching game session:', sessionError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch game session',
      });
      return;
    }

    if (!session) {
      res.json({
        status: 'success',
        message: 'No game session found to erase',
        data: {
          submissionsDeleted: 0,
          leaderboardEntriesDeleted: 0,
          sessionDeleted: false,
        },
      });
      return;
    }

    // Delete all topx submissions for this session
    const { count: submissionsDeleted, error: submissionsError } = await supabase
      .from('topx_submissions')
      .delete({ count: 'exact' })
      .eq('game_session_id', session.id);

    if (submissionsError) {
      console.error('Error deleting submissions:', submissionsError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete submissions',
      });
      return;
    }

    // Delete leaderboard entry for this session
    const { count: leaderboardDeleted, error: leaderboardError } = await supabase
      .from('leaderboard')
      .delete({ count: 'exact' })
      .eq('game_session_id', session.id);

    if (leaderboardError) {
      console.error('Error deleting leaderboard entry:', leaderboardError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete leaderboard entry',
      });
      return;
    }

    // Delete the game session itself
    const { error: sessionDeleteError } = await supabase
      .from('game_sessions')
      .delete()
      .eq('id', session.id);

    if (sessionDeleteError) {
      console.error('Error deleting game session:', sessionDeleteError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete game session',
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'TopX game results erased successfully',
      data: {
        submissionsDeleted: submissionsDeleted || 0,
        leaderboardEntriesDeleted: leaderboardDeleted || 0,
        sessionDeleted: true,
      },
    });
  } catch (error) {
    console.error('Error erasing TopX results:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

export default router;
