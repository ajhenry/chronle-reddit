import { context } from '@devvit/web/server';
import { reddit } from '../lib/reddit-provider';
import { getOrCreateTodaysLetteredGame } from '../lib/lettered-game-helpers';
import { setPostToGameMapping } from '../database/redis';
import { getDailyGameTitle } from '../../shared/utils';

const splashConfig = {
  appDisplayName: 'Lettered',
  heading: 'Welcome to Lettered',
  description: 'The phrase-fitting puzzle game',
  appIconUri: 'lettered-logo.png',
  buttonLabel: 'Start Playing',
  entryUri: 'index.html',
};

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
    splash: splashConfig,
    subredditName: subredditName,
    title: getDailyGameTitle(),
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
