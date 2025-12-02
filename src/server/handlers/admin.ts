import { Router } from 'express';
import { reddit } from '../lib/reddit-provider';
import { getUserByRedditHandle } from '../database/user';
import { getRedisClient } from '../lib/redis-provider';

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

    // Clear all lettered sessions from Redis
    // Note: Since Devvit Redis doesn't support key listing, we track active session days
    // in a sorted set and clear those explicitly
    const redis = await getRedisClient();
    const sessionDaysKey = 'lettered_session_days';
    
    // Get all days that have sessions
    const days = await redis.zRange(sessionDaysKey, 0, -1);
    
    let letteredSessionsDeleted = 0;
    for (const day of days) {
      const dayStr = day.member;
      const lookupKey = `lettered_session_lookup:${dayStr}`;
      
      // Get all sessionId -> userId mappings for this day
      const sessionMap = await redis.hGetAll(lookupKey);
      
      // Delete each session
      for (const [sessionId, userId] of Object.entries(sessionMap)) {
        const sessionKey = `lettered_sessions:${userId}:${dayStr}`;
        await redis.del(sessionKey);
        letteredSessionsDeleted++;
      }
      
      // Clear the lookup hash for this day
      await redis.del(lookupKey);
    }
    
    // Clear the session days tracker
    await redis.del(sessionDaysKey);

    console.log('Cleared lettered sessions:', { count: letteredSessionsDeleted });

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
