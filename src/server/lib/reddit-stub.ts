import { isDevelopment } from '../../shared/utils';

// Reddit API stub for local development
// This file provides mock implementations of the @devvit/web/server reddit functions

// Local storage for mock user data (server-side replacement for sessionStorage)
const mockStorage: { [key: string]: string } = {};

export interface RedditStub {
  getCurrentUsername(): Promise<string>;
  submitCustomPost(options: {
    title?: string;
    subredditName: string;
    height?: number;
    width?: number;
    splash?: any;
  }): Promise<{ id: string; url: string }>;
}

/**
 * Mock Reddit API for local development
 * Returns predictable data for testing purposes
 */
export const redditStub: RedditStub = {
  /**
   * Mock getCurrentUsername - returns a test username
   */
  async getCurrentUsername(): Promise<string> {
    if (isDevelopment()) {
      return 'mock_reddit_user';
    }
    // Return a consistent test username for development
    const testUsernames = [
      'dev_user_1',
      'test_player',
      'snoodle_tester',
      'local_dev_user',
      'mock_reddit_user',
    ];

    // Return a random username from the list, but consistent per session
    const sessionUser = mockStorage['mock_reddit_user'];
    if (sessionUser) {
      return sessionUser;
    }

    const randomUser = testUsernames[Math.floor(Math.random() * testUsernames.length)];

    // Store in local mock storage
    mockStorage['mock_reddit_user'] = randomUser!;

    console.log('[REDDIT STUB] Mock user:', randomUser);
    return randomUser!;
  },

  /**
   * Mock submitCustomPost - returns a fake post response
   */
  async submitCustomPost(options: {
    title?: string;
    subredditName: string;
    height?: number;
    width?: number;
    splash?: any;
  }): Promise<{ id: string; url: string }> {
    // Generate a mock post ID
    const mockPostId = `mock_post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockUrl = `https://reddit.com/r/${options.subredditName}/comments/${mockPostId}`;

    console.log('[REDDIT STUB] Mock post created:', {
      id: mockPostId,
      title: options.title || 'Untitled Post',
      subreddit: options.subredditName,
      url: mockUrl,
      splash: options.splash,
      dimensions: {
        width: options.width || 320,
        height: options.height || 512,
      },
    });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      id: mockPostId,
      url: mockUrl,
    };
  },
};

/**
 * Development utility to set a specific mock username
 * Useful for testing specific scenarios
 */
export const setMockUsername = (username: string): void => {
  mockStorage['mock_reddit_user'] = username;
  console.log('[REDDIT STUB] Mock username set to:', username);
};

/**
 * Development utility to clear the mock username
 * Forces a new random username on next call
 */
export const clearMockUsername = (): void => {
  delete mockStorage['mock_reddit_user'];
  console.log('[REDDIT STUB] Mock username cleared');
};

export default redditStub;
