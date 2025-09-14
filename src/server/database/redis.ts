import { redis } from '@devvit/redis';
import { CustomGameScore, LetteredGameData } from '../../shared/types/api';

export interface CustomGameSession {
  gameId: string;
  username: string;
  startedAt: string;
  isCompleted: boolean;
  finalScore?: number;
  moves: number;
  timeElapsed?: number;
}

// Game Data Management
export async function setCustomGame(gameId: string, gameData: LetteredGameData): Promise<void> {
  try {
    await redis.set(gameId, JSON.stringify(gameData));
    await redis.expire(gameId, 60 * 60 * 24 * 7); // Expire in 7 days
    console.log(`Stored custom game in Redis with ID: ${gameId}`);
  } catch (error) {
    console.error('Failed to store game in Redis:', error);
    throw new Error('Failed to store game data');
  }
}

export async function getCustomGame(gameId: string): Promise<LetteredGameData | null> {
  try {
    const gameDataStr = await redis.get(gameId);
    if (!gameDataStr) {
      return null;
    }
    return JSON.parse(gameDataStr);
  } catch (error) {
    console.error('Failed to retrieve game from Redis:', error);
    throw new Error('Failed to retrieve game data');
  }
}

export async function deleteCustomGame(gameId: string): Promise<void> {
  try {
    await redis.del(gameId);
  } catch (error) {
    console.error('Failed to delete game from Redis:', error);
    throw new Error('Failed to delete game data');
  }
}

// Post-to-Game Mapping
export async function setPostToGameMapping(postId: string, gameId: string): Promise<void> {
  try {
    const postToGameKey = `custom-lettered:post:${postId}`;
    await redis.set(postToGameKey, gameId);
    await redis.expire(postToGameKey, 60 * 60 * 24 * 7); // Same expiration as game data
    console.log(`Stored post-to-game mapping: ${postId} -> ${gameId}`);

    // Also store without t3_ prefix if it exists
    if (postId.startsWith('t3_')) {
      const shortId = postId.replace('t3_', '');
      const altKey = `custom-lettered:post:${shortId}`;
      await redis.set(altKey, gameId);
      await redis.expire(altKey, 60 * 60 * 24 * 7);
      console.log(`Stored alternate mapping: ${shortId} -> ${gameId}`);
    }
  } catch (error) {
    console.error('Failed to store post-to-game mapping:', error);
    throw new Error('Failed to store post mapping');
  }
}

export async function getGameIdFromPost(postId: string): Promise<string | null> {
  try {
    const postToGameKey = `custom-lettered:post:${postId}`;
    return (await redis.get(postToGameKey)) || null;
  } catch (error) {
    console.error('Failed to get game ID from post:', error);
    return null;
  }
}

// Leaderboard Management
export async function getGameLeaderboard(gameId: string): Promise<CustomGameScore[]> {
  try {
    const gameLeaderboardKey = `custom-lettered:leaderboard:${gameId}`;
    const existingScoresStr = (await redis.get(gameLeaderboardKey)) || '[]';
    return JSON.parse(existingScoresStr);
  } catch (error) {
    console.error('Failed to get game leaderboard:', error);
    throw new Error('Failed to get leaderboard');
  }
}

export async function addScoreToGameLeaderboard(
  gameId: string,
  scoreEntry: CustomGameScore
): Promise<void> {
  try {
    const gameLeaderboardKey = `custom-lettered:leaderboard:${gameId}`;
    const existingScoresStr = (await redis.get(gameLeaderboardKey)) || '[]';
    const existingScores = JSON.parse(existingScoresStr);
    existingScores.push({ ...scoreEntry, timestamp: Date.now() });

    // Keep top 100 scores for each game
    const sortedScores = existingScores
      .sort((a: CustomGameScore, b: CustomGameScore) => b.score - a.score)
      .slice(0, 100);

    await redis.set(gameLeaderboardKey, JSON.stringify(sortedScores));
    await redis.expire(gameLeaderboardKey, 60 * 60 * 24 * 30); // Keep for 30 days
  } catch (error) {
    console.error('Failed to add score to game leaderboard:', error);
    throw new Error('Failed to update leaderboard');
  }
}

// Player History Management
export async function getPlayerHistory(username: string): Promise<CustomGameScore[]> {
  try {
    const playerHistoryKey = `custom-lettered:player:${username}`;
    const historyStr = (await redis.get(playerHistoryKey)) || '[]';
    return JSON.parse(historyStr);
  } catch (error) {
    console.error('Failed to get player history:', error);
    throw new Error('Failed to get player history');
  }
}

export async function addScoreToPlayerHistory(
  username: string,
  scoreEntry: CustomGameScore
): Promise<void> {
  try {
    const playerHistoryKey = `custom-lettered:player:${username}`;
    const playerHistoryStr = (await redis.get(playerHistoryKey)) || '[]';
    const playerHistory = JSON.parse(playerHistoryStr);
    playerHistory.push({ ...scoreEntry, timestamp: Date.now() });

    // Keep last 100 games for each player
    const trimmedHistory = playerHistory.slice(-100);
    await redis.set(playerHistoryKey, JSON.stringify(trimmedHistory));
    await redis.expire(playerHistoryKey, 60 * 60 * 24 * 30); // Keep for 30 days
  } catch (error) {
    console.error('Failed to add score to player history:', error);
    throw new Error('Failed to update player history');
  }
}

// Global Leaderboard Management
export async function getGlobalLeaderboard(): Promise<CustomGameScore[]> {
  try {
    const globalLeaderboardKey = 'custom-lettered:global-leaderboard';
    const existingGlobalStr = (await redis.get(globalLeaderboardKey)) || '[]';
    return JSON.parse(existingGlobalStr);
  } catch (error) {
    console.error('Failed to get global leaderboard:', error);
    throw new Error('Failed to get global leaderboard');
  }
}

export async function addScoreToGlobalLeaderboard(scoreEntry: CustomGameScore): Promise<void> {
  try {
    const globalLeaderboardKey = 'custom-lettered:global-leaderboard';
    const existingGlobalStr = (await redis.get(globalLeaderboardKey)) || '[]';
    const existingGlobal = JSON.parse(existingGlobalStr);
    existingGlobal.push({ ...scoreEntry, timestamp: Date.now() });

    // Keep top 1000 scores globally
    const sortedGlobal = existingGlobal
      .sort((a: CustomGameScore, b: CustomGameScore) => b.score - a.score)
      .slice(0, 1000);

    await redis.set(globalLeaderboardKey, JSON.stringify(sortedGlobal));
    await redis.expire(globalLeaderboardKey, 60 * 60 * 24 * 30); // Keep for 30 days
  } catch (error) {
    console.error('Failed to add score to global leaderboard:', error);
    throw new Error('Failed to update global leaderboard');
  }
}

// Utility function to get player's score for a specific game
export async function getPlayerScoreForGame(
  username: string,
  gameId: string
): Promise<CustomGameScore | null> {
  try {
    const playerHistory = await getPlayerHistory(username);

    // Find the latest score for this game ID
    const playerScore = playerHistory
      .filter((score) => score.gameId === gameId)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];

    return playerScore || null;
  } catch (error) {
    console.error('Failed to get player score for game:', error);
    return null;
  }
}

// Utility function to get player's rank in a game leaderboard
export async function getPlayerRankInGame(username: string, gameId: string): Promise<number> {
  try {
    const leaderboard = await getGameLeaderboard(gameId);
    const sortedScores = leaderboard.sort((a, b) => b.score - a.score);
    const playerRank = sortedScores.findIndex((score) => score.username === username) + 1;
    return playerRank;
  } catch (error) {
    console.error('Failed to get player rank:', error);
    return 0;
  }
}
