// Reddit provider - conditionally uses real or stubbed reddit API
//
// To use the stubbed reddit API for local development, set one of:
// - NODE_ENV=local
// - ENVIRONMENT=local
// - USE_REDDIT_STUB=true
// - NODE_ENV=development with HOST=localhost (default for local dev)

import { User } from '@devvit/web/server';
import { redditStub } from './reddit-stub';

/**
 * Check if we're running in local development mode specifically
 * This is more restrictive than general development mode
 */
const isLocalDevelopment = (): boolean => {
  // Only use stub in explicit local development scenarios
  if (process.env.LOCAL_MODE === 'true') {
    return true;
  }

  return false;
};

/**
 * Get the appropriate reddit implementation based on environment
 * Returns stubbed version ONLY in local development, real version everywhere else
 */
export const getRedditProvider = async () => {
  if (isLocalDevelopment()) {
    console.log('[REDDIT PROVIDER] Using stubbed reddit API for LOCAL development');
    return redditStub;
  } else {
    console.log('[REDDIT PROVIDER] Using real reddit API');
    try {
      // Dynamically import the real reddit API
      const { reddit } = await import('@devvit/web/server');
      return reddit;
    } catch (error) {
      console.error('[REDDIT PROVIDER] Failed to load real reddit API:', error);
      throw new Error('Reddit API not available and not in local development mode');
    }
  }
};

/**
 * Cached reddit provider instance
 */
let cachedRedditProvider: any = null;

/**
 * Get the reddit provider with caching
 */
const getCachedRedditProvider = async () => {
  if (!cachedRedditProvider) {
    cachedRedditProvider = await getRedditProvider();
  }
  return cachedRedditProvider;
};

/**
 * Reddit API wrapper that conditionally uses stub or real implementation
 */
export const reddit = {
  async getCurrentUser(): Promise<User | undefined> {
    const provider = await getCachedRedditProvider();
    return provider.getCurrentUser();
  },

  async getCurrentUsername(): Promise<string | undefined> {
    const provider = await getCachedRedditProvider();
    return provider.getCurrentUsername();
  },

  async submitCustomPost(options: {
    title?: string;
    subredditName: string;
    height?: number;
    width?: number;
    splash?: any;
    webviewMetadata?: any;
  }): Promise<{ id: string; url: string }> {
    const provider = await getCachedRedditProvider();
    return provider.submitCustomPost(options);
  },
};

export default reddit;
