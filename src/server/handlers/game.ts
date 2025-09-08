import { Router } from 'express';
import { StatusResponse } from '../../shared/types/api';
import { checkAndCreateTodaysGames } from '../lib/status-helpers';

const router = Router();

// GET /api/status - Checks if games exist for today and creates them if needed
router.get('/api/status', async (_req, res): Promise<void> => {
  console.log('GET /api/status');
  try {
    const result = await checkAndCreateTodaysGames();

    if (!result.success) {
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

    res.json(response);
  } catch (error) {
    console.error('Error in /api/status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check game status',
    });
  }
});

export default router;
