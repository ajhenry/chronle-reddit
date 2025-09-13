import { Router } from 'express';
import { context } from '@devvit/web/server';
import { redis } from '@devvit/redis';

const router = Router();

// Get post context and metadata
router.get('/api/context', async (_req, res): Promise<void> => {
  console.log(`/api/context`);
  try {
    // Access the post context to get metadata
    const postContext = context;

    // console.log('=== CONTEXT DEBUG START ===');
    // console.log('Full post context:', JSON.stringify(postContext, null, 2));
    // console.log('Context keys:', Object.keys(postContext || {}));
    // console.log('=== CONTEXT DEBUG END ===');

    // Get the post ID
    const postId = postContext.postId;

    let customGameId = null;

    if (postId) {
      console.log('Found post ID:', postId);
      // Look up game ID from post ID
      const postToGameKey = `custom-lettered:post:${postId}`;
      customGameId = await redis.get(postToGameKey);
      console.log('Found custom game ID for post:', customGameId);

      // Also try without the t3_ prefix if it exists
      if (!customGameId && postId.startsWith('t3_')) {
        const shortPostId = postId.replace('t3_', '');
        const altKey = `custom-lettered:post:${shortPostId}`;
        customGameId = await redis.get(altKey);
        console.log('Tried alternate key:', altKey, 'result:', customGameId);
      }
    }

    // Check if this is a custom game post
    const metadata = (postContext as any).webviewMetadata || {};
    console.log('Extracted metadata:', metadata);

    // Use either the mapped game ID or metadata game ID
    const gameId = customGameId || metadata.customGameId;

    res.json({
      status: 'success',
      context: {
        subredditName: postContext.subredditName,
        metadata: {
          ...metadata,
          customGameId: gameId,
          gameType: gameId ? 'lettered' : metadata.gameType,
        },
        debug: {
          postId: postId,
          foundGameId: customGameId,
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
