import { Router } from 'express';
import { reddit } from '../lib/reddit-provider';

import { createOrUpdateUser, getOrCreateUser } from '../database/user';

const router = Router();

// User sync endpoint - creates/updates user in Supabase
router.post('/api/sync-user', async (_req, res): Promise<void> => {
  try {
    // Get Reddit username from Devvit context
    const redditUser = await reddit.getCurrentUser();
    if (!redditUser) {
      res.status(400).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    const snoovatarUrl = await redditUser.getSnoovatarUrl();

    const user = await createOrUpdateUser({
      redditId: redditUser.id,
      handle: redditUser.username,
      imageUrl: snoovatarUrl ?? '',
    });

    res.json({
      status: 'success',
      user,
    });
  } catch (error) {
    console.error('User sync error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during user sync',
    });
  }
});

// Get current user info endpoint
router.get('/api/user', async (_req, res): Promise<void> => {
  try {
    // Get Reddit username from Devvit context
    const redditUser = await reddit.getCurrentUser();
    if (!redditUser) {
      res.status(400).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    const snoovatarUrl = await redditUser.getSnoovatarUrl();
    const user = await getOrCreateUser({
      redditId: redditUser.id,
      handle: redditUser.username,
      imageUrl: snoovatarUrl ?? '',
    });

    res.json({
      status: 'success',
      user,
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

export default router;
