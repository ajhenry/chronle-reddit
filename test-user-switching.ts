#!/usr/bin/env tsx

/**
 * Test script to demonstrate user switching functionality for leaderboard testing
 *
 * Run this script to see how to switch between different test users:
 * npx tsx test-user-switching.ts
 */

import {
  setTestUser,
  switchToNextTestUser,
  switchToPreviousTestUser,
  getCurrentTestUser,
  listTestUsers,
  redditStub,
} from './src/server/lib/reddit-stub';

async function testUserSwitching() {
  console.log('=== Reddit Stub User Switching Test ===\n');

  // List all available test users
  console.log('Available test users:');
  const users = listTestUsers();
  users.forEach((user) => {
    console.log(`  ${user.index}: ${user.displayName} (${user.username})`);
  });
  console.log();

  // Test setting specific user
  console.log('Testing setTestUser():');
  setTestUser(1);
  let current = getCurrentTestUser();
  console.log(`Current user: ${current.displayName} (${current.username})`);

  setTestUser(3);
  current = getCurrentTestUser();
  console.log(`Current user: ${current.displayName} (${current.username})`);
  console.log();

  // Test cycling through users
  console.log('Testing switchToNextTestUser():');
  for (let i = 0; i < 3; i++) {
    switchToNextTestUser();
    current = getCurrentTestUser();
    console.log(`Current user: ${current.displayName} (${current.username})`);
  }
  console.log();

  console.log('Testing switchToPreviousTestUser():');
  for (let i = 0; i < 3; i++) {
    switchToPreviousTestUser();
    current = getCurrentTestUser();
    console.log(`Current user: ${current.displayName} (${current.username})`);
  }
  console.log();

  // Test Reddit API calls
  console.log('Testing Reddit API calls:');
  const username = await redditStub.getCurrentUsername();
  console.log(`Reddit username: ${username}`);

  const user = await redditStub.getCurrentUser();
  console.log(`Reddit user: ${user.username} (ID: ${user.id})`);
  console.log();

  console.log('=== Test Complete ===');
  console.log('\nTo use this in your development:');
  console.log('1. Import the functions in your server code');
  console.log('2. Call setTestUser(index) to switch users');
  console.log('3. Make API calls to test leaderboards with different users');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testUserSwitching().catch(console.error);
}

export { testUserSwitching };
