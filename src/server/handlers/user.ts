import { Router } from 'express';
import { reddit } from '../lib/reddit-provider';
import { logRouteInfo, logError } from '../lib/logging';

import {
  createOrUpdateUser,
  getOrCreateUser,
  getUserPreferences,
  updateUserPreferences,
} from '../database/user';
import type { UserPreferences } from '../../shared/types/api';

const router = Router();

// User sync endpoint - creates/updates user in Redis
router.post('/api/sync-user', async (_req, res): Promise<void> => {
  try {
    logRouteInfo('/api/sync-user', { action: 'sync_user_start' });

    // Get Reddit username from Devvit context
    const redditUser = await reddit.getCurrentUser();
    if (!redditUser) {
      logRouteInfo('/api/sync-user', { result: 'unauthenticated' });
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

    logRouteInfo('/api/sync-user', {
      result: 'success',
      userId: user.id,
      handle: user.handle,
    });

    res.json({
      status: 'success',
      user,
    });
  } catch (error) {
    logError('/api/sync-user', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during user sync',
    });
  }
});

// Get current user info endpoint
router.get('/api/user', async (_req, res): Promise<void> => {
  try {
    logRouteInfo('/api/user', { action: 'get_user_info_start' });

    // Get Reddit username from Devvit context
    const redditUser = await reddit.getCurrentUser();
    if (!redditUser) {
      logRouteInfo('/api/user', { result: 'unauthenticated' });
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

    // Get user preferences
    const preferences = await getUserPreferences(user.id);

    logRouteInfo('/api/user', {
      result: 'success',
      userId: user.id,
      handle: user.handle,
    });

    res.json({
      status: 'success',
      user: {
        ...user,
        preferences,
      },
    });
  } catch (error) {
    logError('/api/user', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Update user preferences endpoint
router.post('/api/user/preferences', async (req, res): Promise<void> => {
  try {
    logRouteInfo('/api/user/preferences', { action: 'update_preferences_start' });

    // Get Reddit username from Devvit context
    const redditUser = await reddit.getCurrentUser();
    if (!redditUser) {
      logRouteInfo('/api/user/preferences', { result: 'unauthenticated' });
      res.status(400).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    // Get the user to get their ID
    const snoovatarUrl = await redditUser.getSnoovatarUrl();
    const user = await getOrCreateUser({
      redditId: redditUser.id,
      handle: redditUser.username,
      imageUrl: snoovatarUrl ?? '',
    });

    // Parse preferences updates from request body
    const updates: Partial<UserPreferences> = req.body;

    // Update preferences
    const updatedPreferences = await updateUserPreferences(user.id, updates);

    logRouteInfo('/api/user/preferences', {
      result: 'success',
      userId: user.id,
      updates,
    });

    res.json({
      status: 'success',
      preferences: updatedPreferences,
    });
  } catch (error) {
    logError('/api/user/preferences', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

export default router;
