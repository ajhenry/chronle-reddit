import { getOrCreateUser } from '../database/user';
import { getRedditProvider } from './reddit-provider';

/**
 * Ensures user exists in database and returns their ID.
 * Creates user if they don't exist.
 * @returns User ID if authenticated and user exists/created, null otherwise
 */
export const ensureUserExistsAndGetId = async (): Promise<string> => {
  try {
    const reddit = await getRedditProvider();
    const redditUsername = await reddit.getCurrentUser();

    if (!redditUsername) {
      console.error('User not authenticated with Reddit in ensureUserExistsAndGetId');
      throw new Error('User not authenticated with Reddit');
    }

    const snoovatarUrl = await redditUsername.getSnoovatarUrl();

    // Try to get existing user first
    const user = await getOrCreateUser({
      redditId: redditUsername.id,
      handle: redditUsername.username,
      imageUrl: snoovatarUrl ?? '',
    });

    return user.id;
  } catch (error) {
    console.error('Error in ensureUserExistsAndGetId:', { error });
    throw error;
  }
};
