import { Router } from 'express';
import { StatusResponse } from '../../shared/types/api';
import { checkAndCreateTodaysGames } from '../lib/status-helpers';
import { logRouteInfo, logError } from '../lib/logging';

const router = Router();

// GET /api/status - Checks if games exist for today and creates them if needed
router.get('/api/status', async (_req, res): Promise<void> => {
  try {
    logRouteInfo('/api/status', { action: 'check_game_status' });

    const result = await checkAndCreateTodaysGames();

    if (!result.success) {
      logRouteInfo('/api/status', {
        result: 'error',
        statusCode: result.statusCode,
        error: result.error,
      });
      res.status(result.statusCode).json({
        status: 'error',
        message: result.error,
      });
      return;
    }

    const response: StatusResponse = {
      type: 'status',
      day: result.day,
    };

    logRouteInfo('/api/status', {
      result: 'success',
      day: result.day,
    });

    res.json(response);
  } catch (error) {
    logError('/api/status', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check game status',
    });
  }
});

export default router;
