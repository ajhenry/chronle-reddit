import { Router } from 'express';
import { getRedisClient } from '../lib/redis-provider';
import { RedisKeys } from '../../shared/types/redis';
import { logRouteInfo, logError } from '../lib/logging';

const router = Router();

/**
 * Handle PostDelete trigger
 * Cleans up data associated with deleted posts:
 * - Post-to-game mapping
 * - Custom game data (if applicable)
 * - Per-game leaderboard and metadata
 */
router.post('/internal/triggers/post-delete', async (req, res): Promise<void> => {
  try {
    const post = req.body.post;
    const postId = post?.id;

    logRouteInfo('/internal/triggers/post-delete', {
      action: 'post_delete_triggered',
      postId,
    });

    if (!postId) {
      logRouteInfo('/internal/triggers/post-delete', { result: 'no_post_id' });
      res.status(200).json({ status: 'ok', message: 'No post ID provided' });
      return;
    }

    const redis = await getRedisClient();
    const deletedKeys: string[] = [];

    // Get the game ID from the post mapping
    const postToGameKey = `chronle:post:${postId}`;
    const gameId = await redis.get(postToGameKey);

    // Delete post-to-game mapping
    await redis.del(postToGameKey);
    deletedKeys.push(postToGameKey);

    // Also try with t3_ prefix variants
    if (postId.startsWith('t3_')) {
      const shortId = postId.replace('t3_', '');
      const altKey = `chronle:post:${shortId}`;
      await redis.del(altKey);
      deletedKeys.push(altKey);
    } else {
      const fullId = `t3_${postId}`;
      const altKey = `chronle:post:${fullId}`;
      await redis.del(altKey);
      deletedKeys.push(altKey);
    }

    // If we found a game ID, clean up game-related data
    if (gameId) {
      // Delete custom game data
      const gameKey = RedisKeys.chronleGame.byId(gameId);
      await redis.del(gameKey);
      deletedKeys.push(gameKey);

      // Delete per-game leaderboard
      const leaderboardKey = RedisKeys.chronleGameLeaderboard(gameId);
      await redis.del(leaderboardKey);
      deletedKeys.push(leaderboardKey);

      // Delete per-game leaderboard metadata
      const metadataKey = RedisKeys.chronleGameLeaderboardMeta(gameId);
      await redis.del(metadataKey);
      deletedKeys.push(metadataKey);

      logRouteInfo('/internal/triggers/post-delete', {
        result: 'game_data_deleted',
        gameId,
        deletedKeysCount: deletedKeys.length,
      });
    }

    console.log('PostDelete trigger completed:', {
      postId,
      gameId: gameId || 'none',
      deletedKeys,
    });

    res.status(200).json({
      status: 'ok',
      message: 'Post deletion cleanup completed',
      deletedKeysCount: deletedKeys.length,
    });
  } catch (error) {
    logError('/internal/triggers/post-delete', error);
    // Still return 200 to acknowledge the trigger was received
    res.status(200).json({
      status: 'error',
      message: 'Error during post deletion cleanup',
    });
  }
});

/**
 * Handle CommentDelete trigger
 * Currently the app does not store comment-specific data,
 * but this handler is in place for future compliance needs.
 */
router.post('/internal/triggers/comment-delete', async (req, res): Promise<void> => {
  try {
    const comment = req.body.comment;
    const commentId = comment?.id;

    logRouteInfo('/internal/triggers/comment-delete', {
      action: 'comment_delete_triggered',
      commentId,
    });

    // Currently no comment-specific data is stored
    // This handler exists for compliance and future extensibility

    console.log('CommentDelete trigger completed:', {
      commentId,
      message: 'No comment-specific data to clean up',
    });

    res.status(200).json({
      status: 'ok',
      message: 'Comment deletion acknowledged (no data to clean up)',
    });
  } catch (error) {
    logError('/internal/triggers/comment-delete', error);
    // Still return 200 to acknowledge the trigger was received
    res.status(200).json({
      status: 'error',
      message: 'Error during comment deletion handling',
    });
  }
});

export default router;
