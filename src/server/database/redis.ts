import { getRedisClient } from '../lib/redis-provider';

// Post-to-Game Mapping (no TTL - mappings should persist indefinitely)
export async function setPostToGameMapping(postId: string, gameId: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    const postToGameKey = `chronle:post:${postId}`;
    await redis.set(postToGameKey, gameId);
    console.log(`Stored post-to-game mapping: ${postId} -> ${gameId}`);

    // Also store without t3_ prefix if it exists
    if (postId.startsWith('t3_')) {
      const shortId = postId.replace('t3_', '');
      const altKey = `chronle:post:${shortId}`;
      await redis.set(altKey, gameId);
      console.log(`Stored alternate mapping: ${shortId} -> ${gameId}`);
    }
  } catch (error) {
    console.error('Failed to store post-to-game mapping:', error);
    throw new Error('Failed to store post mapping');
  }
}

export async function getGameIdFromPost(postId: string): Promise<string | null> {
  try {
    const redis = await getRedisClient();
    const postToGameKey = `chronle:post:${postId}`;
    return (await redis.get(postToGameKey)) || null;
  } catch (error) {
    console.error('Failed to get game ID from post:', error);
    return null;
  }
}
