import { context } from '@devvit/web/server';
import { reddit } from '../lib/reddit-provider';
import { setPostToGameMapping } from '../database/redis';
import { getDailyGameTitle } from '../../shared/utils';
import { saveGameData } from '../database/chronle';
import { getPuzzleForDay, createTimelineFromSeed } from '../lib/puzzle-seeds';

const splashConfig = {
  appDisplayName: 'Chronle',
  heading: 'Welcome to Chronle',
  description: 'The timeline puzzle game',
  appIconUri: 'chronle-logo.png',
  buttonLabel: 'Start Playing',
  entryUri: 'index.html',
};

const WELCOME_COMMENT = `Welcome to Chronle, the timeline puzzle game!

**How to Play:**
1. Each puzzle contains historical events to put in order
2. Drag and drop the events from oldest to newest
3. Submit your answer to see how you did

Race against the clock to climb the leaderboard, show off your skills in the comments, and come back tomorrow for a fresh puzzle!`;

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  // Get today's date for the daily game
  const today = new Date().toISOString().split('T')[0]!;
  const gameId = `daily-${today}`;

  // Create today's game from seed
  const seed = getPuzzleForDay(today);
  const { timeline, shuffledEventIds } = createTimelineFromSeed(seed);

  const now = new Date().toISOString();

  const gameData = {
    id: gameId,
    postType: 'daily' as const,
    title: seed.title,
    description: seed.description,
    events: seed.events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      subject: event.subject,
      imageUrl: event.imageUrl,
      imageCreditName: event.imageCreditName,
      imageCreditUrl: event.imageCreditUrl,
      date: event.date,
    })),
    solution: timeline.solution,
    shuffledOrder: shuffledEventIds,
    createdAt: now,
    updatedAt: now,
    day: today,
  };

  await saveGameData(gameId, gameData);

  console.log('Creating post for daily game:', { gameId });

  const post = await reddit.submitCustomPost({
    splash: splashConfig,
    subredditName: subredditName,
    title: getDailyGameTitle(),
    webviewMetadata: {
      gameId: gameId,
      gameType: 'chronle',
      postType: 'daily',
    },
  });

  // Store Redis mapping from post ID to game ID
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
