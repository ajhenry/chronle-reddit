import { context } from '@devvit/web/server';
import { reddit } from '../lib/reddit-provider';
import { getOrCreateTodaysLetteredGame } from '../lib/lettered-game-helpers';
import { setPostToGameMapping } from '../database/redis';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  // Get today's lettered game to store its ID in the post metadata
  const letteredGame = await getOrCreateTodaysLetteredGame();
  const gameId = letteredGame.id; // This will be the ISO date string (e.g., '2025-12-02')

  console.log('Creating post for daily game:', { gameId });

  const post = await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'podium-dev',
    },
    subredditName: subredditName,
    // Convert the date to a string in the EST timezone with the format of Day of week, month, day, year
    // Example: "September 18, 2025"
    title: `Podium Game for ${new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' })}`,
    webviewMetadata: {
      gameId: gameId,
      gameType: 'lettered',
      postType: 'daily',
    },
  });

  // Store Redis mapping from post ID to game ID (same as custom games)
  await setPostToGameMapping(post.id, gameId);
  console.log('Stored post-to-game mapping for daily game:', { postId: post.id, gameId });

  return post;
};
