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

const WELCOME_COMMENT = `Welcome to Lettered, the phrase-fitting puzzle game!

**How to Play:**
1. Each puzzle contains a hidden phrase with empty spaces
2. Drag and drop the scattered letter pieces into the correct positions
3. Complete the phrase correctly to solve the puzzle

Race against the clock to climb the leaderboard, show off your skills in the comments, and come back tomorrow for a fresh puzzle!`;

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

  // Add stickied welcome comment to the post
  try {
    await reddit.submitComment(post.id, WELCOME_COMMENT, { sticky: true, distinguish: true });
    console.log('Added welcome comment to post:', { postId: post.id });
  } catch (error) {
    // Log but don't fail post creation if comment fails
    console.error('Failed to add welcome comment to post:', error);
  }

  return post;
};
