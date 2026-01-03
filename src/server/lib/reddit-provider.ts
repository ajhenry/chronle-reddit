// Reddit provider - conditionally uses real or stubbed reddit API
//
// STUBBED API (uses mock data):
// - ENVIRONMENT=local
// - USE_REDDIT_STUB=true
// - LOCAL_MODE=true
//
// REAL API (uses actual Reddit data):
// - REDDIT_MODE=true (Reddit development mode)
// - Production mode (no environment variables set)

import { User } from '@devvit/web/server';
import { redditStub, RedditStub } from './reddit-stub';

/**
 * Union type for both stubbed and real Reddit providers
 * We use 'any' for the real API since we only use a subset of methods
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RedditProvider = RedditStub | any;

/**
 * Check if we should use stubbed Reddit API
 * Returns true ONLY when explicitly configured for stubbed/local development
 *
 * STUBBED API WHEN:
 * - LOCAL_MODE=true: Express server + stubbed Reddit API
 * - ENVIRONMENT=local: Explicit local environment
 * - USE_REDDIT_STUB=true: Force stubbed API
 *
 * REAL API WHEN:
 * - REDDIT_MODE=true: Reddit server + real Reddit API (development mode)
 * - Production: Reddit server + real Reddit API (production mode)
 */
const isLocalDevelopment = (): boolean => {
  // Only use stub in explicit local development scenarios
  if (
    process.env.LOCAL_MODE === 'true' ||
    process.env.ENVIRONMENT === 'local' ||
    process.env.USE_REDDIT_STUB === 'true'
  ) {
    return true;
  }

  return false;
};

/**
 * Get the appropriate reddit implementation based on environment
 * Returns stubbed version ONLY when isLocalDevelopment() is true, real version otherwise
 */
export const getRedditProvider = async () => {
  if (isLocalDevelopment()) {
    console.log('[REDDIT PROVIDER] Using stubbed reddit API for LOCAL development');
    return redditStub;
  } else {
    // Determine which mode we're in for better logging
    const mode = process.env.REDDIT_MODE === 'true' ? 'REDDIT development' : 'PRODUCTION';
    console.log(`[REDDIT PROVIDER] Using real reddit API (${mode} mode)`);
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
let cachedRedditProvider: RedditProvider | null = null;

/**
 * Get the reddit provider with caching
 */
const getCachedRedditProvider = async (): Promise<RedditProvider> => {
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
    splash?: Record<string, unknown>;
    webviewMetadata?: Record<string, unknown>;
  }): Promise<{ id: string; url: string }> {
    const provider = await getCachedRedditProvider();
    return provider.submitCustomPost(options);
  },

  async deletePost(postId: string): Promise<void> {
    if (isLocalDevelopment()) {
      console.log('[REDDIT PROVIDER] Mock delete post:', postId);
      return;
    }

    try {
      const { reddit: realReddit } = await import('@devvit/web/server');
      // Ensure postId has t3_ prefix
      const fullPostId = postId.startsWith('t3_') ? postId : `t3_${postId}`;
      const post = await realReddit.getPostById(fullPostId as `t3_${string}`);
      await post.delete();
      console.log('[REDDIT PROVIDER] Post deleted:', fullPostId);
    } catch (error) {
      console.error('[REDDIT PROVIDER] Failed to delete post:', error);
      throw error;
    }
  },
};

export default reddit;
