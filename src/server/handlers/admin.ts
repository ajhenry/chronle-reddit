import { Router } from 'express';
import { supabase } from '../../shared/supabase-server';
import { reddit } from '../lib/reddit-provider';
import { getUserByRedditHandle } from '../database/user';

const router = Router();

// Admin check endpoint - returns 404 if user is not admin
router.get('/api/admin', async (_req, res): Promise<void> => {
  try {
    // Get Reddit username from Devvit context
    const redditUsername = await reddit.getCurrentUsername();

    if (!redditUsername) {
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    const user = await getUserByRedditHandle(redditUsername);

    // Check if user is admin
    if (!user.admin) {
      console.log('User is not admin', { user });
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    // User is admin, return success
    res.json({
      status: 'success',
      message: 'Admin access granted',
      user: {
        id: user.id,
        reddit_id: user.redditId,
        handle: user.handle,
        image_url: user.imageUrl,
        admin: user.admin,
      },
    });
  } catch (error) {
    console.error('Error checking admin status:', { error });
    res.status(404).json({
      status: 'error',
      message: 'Not found',
    });
  }
});

// Admin endpoint to clear all game sessions
router.post('/api/admin/clear/sessions', async (_req, res): Promise<void> => {
  try {
    // First check if user is admin
    const redditUsername = await reddit.getCurrentUsername();

    if (!redditUsername || redditUsername === 'anonymous') {
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    const user = await getUserByRedditHandle(redditUsername);

    if (!user || !user.admin) {
      console.log('User is not admin', { user });
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    // Clear all lettered sessions
    const { count: letteredSessionsDeleted, error: letteredError } = await supabase
      .from('lettered_sessions')
      .delete({ count: 'exact' })
      .neq('user_id', '0');

    if (letteredError) {
      console.error('Error deleting lettered sessions:', letteredError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to clear lettered sessions',
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'All game sessions cleared successfully',
      data: {
        letteredSessionsDeleted: letteredSessionsDeleted || 0,
        totalDeleted: letteredSessionsDeleted || 0,
      },
    });
  } catch (error) {
    console.error('Error clearing sessions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

export default router;
