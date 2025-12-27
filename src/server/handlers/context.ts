import { Router } from 'express';
import { context } from '@devvit/web/server';
import { getRedisClient } from '../lib/redis-provider';
import { isDevelopment } from '../../shared/utils';
import { setPostToGameMapping } from '../database/redis';

const router = Router();

/**
 * Get today's game ID in ISO format (YYYY-MM-DD)
 * This matches the format used by getOrCreateTodaysLetteredGame
 */
function getTodaysGameId(): string {
  const today = new Date();
  return today.toISOString().split('T')[0]!;
}

// Get post context and metadata
router.get('/api/context', async (_req, res): Promise<void> => {
  console.log(`/api/context`);

  if (isDevelopment()) {
    res.json({
      status: 'success',
      context: {
        subredditName: 'test',
        postId: 't3_test123',
        metadata: {
          postId: 't3_test123',
          subredditName: 'test',
        },
      },
    });
    return;
  }
  try {
    // Access the post context to get metadata
    const postContext = context;

    // console.log('=== CONTEXT DEBUG START ===');
    // console.log('Full post context:', JSON.stringify(postContext, null, 2));
    // console.log('Context keys:', Object.keys(postContext || {}));
    // console.log('=== CONTEXT DEBUG END ===');

    // Get the post ID
    const postId = postContext.postId;

    let gameIdFromRedis = null;

    if (postId) {
      console.log('Found post ID:', postId);
      // Look up game ID from post ID (works for both daily and custom games)
      const redis = await getRedisClient();
      const postToGameKey = `custom-lettered:post:${postId}`;
      gameIdFromRedis = await redis.get(postToGameKey);
      console.log('Found game ID for post from Redis:', gameIdFromRedis);

      // Also try without the t3_ prefix if it exists
      if (!gameIdFromRedis && postId.startsWith('t3_')) {
        const shortPostId = postId.replace('t3_', '');
        const altKey = `custom-lettered:post:${shortPostId}`;
        gameIdFromRedis = await redis.get(altKey);
        console.log('Tried alternate key:', altKey, 'result:', gameIdFromRedis);
      }
    }

    // Check post metadata
    const metadata = (postContext as any).webviewMetadata || {};
    console.log('Extracted metadata:', metadata);

    // Primary: Use Redis mapping (most reliable, works for both daily and custom)
    // Fallback: Use metadata fields (for backwards compatibility)
    let gameId = gameIdFromRedis || metadata.gameId || metadata.customGameId;

    // Final fallback: If no game ID found and this isn't a custom game post,
    // fall back to today's daily game. This handles:
    // 1. Posts created before the post-to-game mapping feature
    // 2. Posts whose mappings expired (7-day TTL)
    // 3. Legacy posts without proper metadata
    if (!gameId && !metadata.customGameId) {
      const todaysGameId = getTodaysGameId();
      console.log('No game ID found, falling back to today\'s daily game:', todaysGameId);
      gameId = todaysGameId;

      // Store the mapping for future requests (fire-and-forget)
      if (postId) {
        void setPostToGameMapping(postId, todaysGameId).catch((err) => {
          console.error('Failed to store fallback post-to-game mapping:', err);
        });
      }
    }

    res.json({
      status: 'success',
      context: {
        subredditName: postContext.subredditName,
        postId: postId,
        metadata: {
          ...metadata,
          postId: postId, // Post ID for sharing
          subredditName: postContext.subredditName, // Subreddit name for sharing
          gameId: gameId, // Unified game ID (from Redis or metadata)
          customGameId: metadata.customGameId, // Keep for backwards compatibility
          gameType: gameId ? 'lettered' : metadata.gameType,
          postType: metadata.postType || (gameId ? 'lettered' : 'daily'),
        },
        debug: {
          postId: postId,
          gameIdFromRedis: gameIdFromRedis,
          gameIdFromMetadata: metadata.gameId || metadata.customGameId,
          finalGameId: gameId,
          contextKeys: Object.keys(postContext || {}),
          fullContext: postContext,
          hasWebviewMetadata: !!(postContext as any).webviewMetadata,
        },
      },
    });
  } catch (error) {
    console.error('Error getting context:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to get context',
    });
  }
});

export default router;
