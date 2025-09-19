import { context } from '@devvit/web/server';
import { reddit } from '../lib/reddit-provider';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'podium-dev',
    },
    subredditName: subredditName,
    // Convert the date to a string in the EST timezone with the format of Day of week, month, day, year
    // Example: "September 18, 2025"
    title: `Podium Game for ${new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' })}`,
  });
};
