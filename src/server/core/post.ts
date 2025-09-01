import { context } from '@devvit/web/server';
import { reddit } from '../lib/reddit-provider';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'snoodle-dev',
    },
    subredditName: subredditName,
    title: 'snoodle-dev',
  });
};
