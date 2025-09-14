import { User } from '@devvit/web/server';

/**
 * Reddit API stub for local development with multi-user testing support
 *
 * This file provides mock implementations of the @devvit/web/server reddit functions
 * and includes utilities for switching between multiple test users to test leaderboards.
 *
 * Usage Examples:
 * ```typescript
 * import { setTestUser, switchToNextTestUser, getCurrentTestUser, listTestUsers } from './reddit-stub';
 *
 * // Switch to a specific test user (0-5)
 * setTestUser(1); // Switch to test_user_2
 *
 * // Cycle through users
 * switchToNextTestUser(); // Go to next user
 *
 * // Check current user
 * const current = getCurrentTestUser();
 * console.log(`Current user: ${current.displayName} (${current.username})`);
 *
 * // List all available users
 * const users = listTestUsers();
 * console.log('Available test users:', users);
 * ```
 */

// Local storage for mock user data (server-side replacement for sessionStorage)
const mockStorage: { [key: string]: string } = {};

// Predefined test users for leaderboard testing
export const TEST_USERS = [
  {
    id: 't2_test_user_1',
    username: 'test_user_1',
    displayName: 'Test User 1',
  },
  {
    id: 't2_test_user_2',
    username: 'test_user_2',
    displayName: 'Test User 2',
  },
  {
    id: 't2_test_user_3',
    username: 'test_user_3',
    displayName: 'Test User 3',
  },
  {
    id: 't2_test_user_4',
    username: 'test_user_4',
    displayName: 'Test User 4',
  },
  {
    id: 't2_test_user_5',
    username: 'test_user_5',
    displayName: 'Test User 5',
  },
  {
    id: 't2_ajhenrydev',
    username: 'ajhenrydev',
    displayName: 'Andrew Henry (Dev)',
  },
] as const;

export type TestUserIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface RedditStub {
  getCurrentUser(): Promise<User>;
  getCurrentUsername(): Promise<string>;
  submitCustomPost(options: {
    title?: string;
    subredditName: string;
    height?: number;
    width?: number;
    splash?: Record<string, unknown>;
    webviewMetadata?: Record<string, unknown>;
  }): Promise<{ id: string; url: string }>;
}

/**
 * Mock Reddit API for local development
 * Returns predictable data for testing purposes
 */
export const redditStub: RedditStub = {
  async getCurrentUser(): Promise<User> {
    const currentUserIndex = getCurrentTestUserIndex();
    const currentUser = TEST_USERS[currentUserIndex];

    return {
      id: currentUser.id,
      username: currentUser.username,
      createdAt: new Date(),
      linkKarma: 0,
      commentKarma: 0,
      nsfw: false,
      isAdmin: false,
      modPermissions: new Map(),
      url: `https://reddit.com/u/${currentUser.username}`,
      permalink: `https://reddit.com/u/${currentUser.username}`,
      hasVerifiedEmail: false,
      getSnoovatarUrl: () =>
        'https://plus.unsplash.com/premium_photo-1736613836139-7ca3e7eea856?q=80&w=1084&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      toJSON: () => ({
        id: currentUser.id,
        username: currentUser.username,
        createdAt: new Date(),
        linkKarma: 0,
        commentKarma: 0,
        nsfw: false,
        isAdmin: false,
        modPermissions: new Map(),
        url: `https://reddit.com/u/${currentUser.username}`,
        permalink: `https://reddit.com/u/${currentUser.username}`,
        hasVerifiedEmail: false,
      }),
    } as unknown as User;
  },
  /**
   * Mock getCurrentUsername - returns the current test user's username
   */
  async getCurrentUsername(): Promise<string> {
    const currentUserIndex = getCurrentTestUserIndex();
    const currentUser = TEST_USERS[currentUserIndex];

    console.log(
      `[REDDIT STUB] Current mock user: ${currentUser.displayName} (${currentUser.username})`
    );
    return currentUser.username;
  },

  /**
   * Mock submitCustomPost - returns a fake post response
   */
  async submitCustomPost(options: {
    title?: string;
    subredditName: string;
    height?: number;
    width?: number;
    splash?: Record<string, unknown>;
    webviewMetadata?: Record<string, unknown>;
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
 * Get the current test user index from storage, defaulting to 0
 */
function getCurrentTestUserIndex(): TestUserIndex {
  return 0;
}

/**
 * Set the current test user by index
 * @param index - The index of the test user (0-5)
 */
export const setTestUser = (index: TestUserIndex): void => {
  mockStorage['mock_reddit_user_index'] = index.toString();
  const user = TEST_USERS[index];
  console.log(`[REDDIT STUB] Switched to test user: ${user.displayName} (${user.username})`);
};

/**
 * Switch to the next test user (cycles through all users)
 */
export const switchToNextTestUser = (): void => {
  const currentIndex = getCurrentTestUserIndex();
  const nextIndex = ((currentIndex + 1) % TEST_USERS.length) as TestUserIndex;
  setTestUser(nextIndex);
};

/**
 * Switch to the previous test user (cycles through all users)
 */
export const switchToPreviousTestUser = (): void => {
  const currentIndex = getCurrentTestUserIndex();
  const prevIndex = ((currentIndex - 1 + TEST_USERS.length) % TEST_USERS.length) as TestUserIndex;
  setTestUser(prevIndex);
};

/**
 * Get information about the current test user
 */
export const getCurrentTestUser = () => {
  const index = getCurrentTestUserIndex();
  return {
    index,
    ...TEST_USERS[index],
  };
};

/**
 * List all available test users
 */
export const listTestUsers = () => {
  return TEST_USERS.map((user, index) => ({
    index,
    ...user,
  }));
};

/**
 * Development utility to set a specific mock username (legacy)
 * Useful for testing specific scenarios
 * @deprecated Use setTestUser() instead for better user management
 */
export const setMockUsername = (username: string): void => {
  // Find the user by username
  const userIndex = TEST_USERS.findIndex((user) => user.username === username);
  if (userIndex !== -1) {
    setTestUser(userIndex as TestUserIndex);
  } else {
    console.warn(
      `[REDDIT STUB] Username '${username}' not found in test users. Available users:`,
      TEST_USERS.map((u) => u.username)
    );
  }
};

/**
 * Development utility to clear the mock username (legacy)
 * Forces default user (index 0) on next call
 * @deprecated Use setTestUser(0) instead
 */
export const clearMockUsername = (): void => {
  setTestUser(0);
  console.log('[REDDIT STUB] Mock username cleared (switched to default user)');
};

export default redditStub;
