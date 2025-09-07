import { supabase } from '../../shared/supabase-server';
import { getRedditProvider } from './reddit-provider';
import type { UserInsert } from '../../shared/types/supabase';

/**
 * Ensures user exists in database and returns their ID.
 * Creates user if they don't exist.
 * @returns User ID if authenticated and user exists/created, null otherwise
 */
export const ensureUserExistsAndGetId = async (): Promise<string> => {
  try {
    const reddit = await getRedditProvider();
    const redditUsername = await reddit.getCurrentUsername();
    if (!redditUsername || redditUsername === 'anonymous') {
      throw new Error('User not authenticated with Reddit');
    }

    // Try to get existing user first
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('reddit_id', redditUsername)
      .single();

    if (existingUser) {
      return existingUser.id;
    }

    // User doesn't exist, create them
    const userData: UserInsert = {
      reddit_id: redditUsername,
      handle: redditUsername,
    };

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(userData)
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating user:', { error: createError });
      throw createError;
    }

    console.log('Created new user:', redditUsername, 'with ID:', newUser.id);
    return newUser.id;
  } catch (error) {
    console.error('Error in ensureUserExistsAndGetId:', { error });
    throw error;
  }
};

/**
 * Gets user ID without creating user if they don't exist.
 * @returns User ID if authenticated and user exists, null otherwise
 */
export const getUserId = async (): Promise<string | null> => {
  try {
    const reddit = await getRedditProvider();
    const redditUsername = await reddit.getCurrentUsername();
    if (!redditUsername || redditUsername === 'anonymous') {
      return null;
    }

    // Try to get existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('reddit_id', redditUsername)
      .single();

    return existingUser?.id || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};
