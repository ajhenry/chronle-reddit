import { getRedisClient } from '../lib/redis-provider';
import {
  ChronleRedisKeys,
  type ChronleAttempt,
  type ChronleGameSession,
  type Timeline,
  type ChronleEvent,
} from '../../shared/types/chronle';

// Timeline/Puzzle Management

export async function saveTimeline(id: string, timeline: Timeline): Promise<void> {
  const redis = await getRedisClient();
  const key = ChronleRedisKeys.timeline.byId(id);
  await redis.set(key, JSON.stringify(timeline));
}

export async function getTimeline(id: string): Promise<Timeline | null> {
  const redis = await getRedisClient();
  const key = ChronleRedisKeys.timeline.byId(id);
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function saveTimelineForDay(day: string, timeline: Timeline): Promise<void> {
  const redis = await getRedisClient();
  const key = ChronleRedisKeys.timeline.byDay(day);
  await redis.set(key, JSON.stringify(timeline));
  // Also save by ID for direct access
  await saveTimeline(timeline.id, timeline);
}

export async function getTimelineForDay(day: string): Promise<Timeline | null> {
  const redis = await getRedisClient();
  const key = ChronleRedisKeys.timeline.byDay(day);
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

// Post to Game Mapping

export async function setPostToGameMapping(postId: string, gameId: string): Promise<void> {
  const redis = await getRedisClient();
  const key = ChronleRedisKeys.timeline.postMapping(postId);
  await redis.set(key, gameId);

  // Also store without t3_ prefix if it exists
  if (postId.startsWith('t3_')) {
    const shortId = postId.replace('t3_', '');
    const altKey = ChronleRedisKeys.timeline.postMapping(shortId);
    await redis.set(altKey, gameId);
  }
}

export async function getGameIdFromPost(postId: string): Promise<string | null> {
  const redis = await getRedisClient();
  const key = ChronleRedisKeys.timeline.postMapping(postId);
  return (await redis.get(key)) || null;
}

// Game Sessions

export async function saveSession(session: ChronleGameSession): Promise<void> {
  const redis = await getRedisClient();
  const key = ChronleRedisKeys.session.byUserAndGame(session.userId, session.gameId);
  await redis.set(key, JSON.stringify(session));
}

export async function getSession(
  userId: string,
  gameId: string
): Promise<ChronleGameSession | null> {
  const redis = await getRedisClient();
  const key = ChronleRedisKeys.session.byUserAndGame(userId, gameId);
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(userId: string, gameId: string): Promise<void> {
  const redis = await getRedisClient();
  const key = ChronleRedisKeys.session.byUserAndGame(userId, gameId);
  await redis.del(key);
}

// Attempts

export async function saveAttempt(
  timelineId: string,
  attempt: ChronleAttempt
): Promise<{ totalCount: number; attempt: ChronleAttempt }> {
  const redis = await getRedisClient();

  // Save the last attempt
  const lastAttemptKey = ChronleRedisKeys.attempt.last(timelineId, attempt.userId);
  await redis.set(lastAttemptKey, JSON.stringify(attempt));

  // Increment attempt count for user
  const userCountKey = ChronleRedisKeys.attempt.count(timelineId, attempt.userId);
  const totalCount = await redis.incrBy(userCountKey, 1);

  // Increment total attempts for timeline
  const totalCountKey = ChronleRedisKeys.attempt.totalCount(timelineId);
  await redis.incrBy(totalCountKey, 1);

  // Check if solved
  const solved = attempt.correct.every((c) => c);

  // If game is finished (solved or max attempts), add to leaderboard
  if (totalCount >= 6 || solved) {
    const statsKey = ChronleRedisKeys.stats.allPlayers(timelineId);
    await redis.zAdd(statsKey, { score: totalCount, member: attempt.userId });
  }

  return { totalCount, attempt };
}

export async function getLastAttempt(
  timelineId: string,
  userId: string
): Promise<{ attempt: ChronleAttempt | null; attemptCount: number }> {
  const redis = await getRedisClient();

  const lastAttemptKey = ChronleRedisKeys.attempt.last(timelineId, userId);
  const attemptData = await redis.get(lastAttemptKey);

  const userCountKey = ChronleRedisKeys.attempt.count(timelineId, userId);
  const countData = await redis.get(userCountKey);

  return {
    attempt: attemptData ? JSON.parse(attemptData) : null,
    attemptCount: countData ? Number(countData) : 0,
  };
}

export async function clearAttempts(timelineId: string, userId: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(ChronleRedisKeys.attempt.last(timelineId, userId));
  await redis.del(ChronleRedisKeys.attempt.count(timelineId, userId));
  
  // Also remove from leaderboard stats
  const statsKey = ChronleRedisKeys.stats.allPlayers(timelineId);
  await redis.zRem(statsKey, [userId]);
}

// Stats and Leaderboard

export async function getAllPlayerStats(timelineId: string): Promise<Record<string, number>> {
  const redis = await getRedisClient();
  const statsKey = ChronleRedisKeys.stats.allPlayers(timelineId);
  const allPlayerStats = await redis.zRange(statsKey, 0, -1);

  // Convert to attempt distribution: { attemptCount: numberOfPlayers }
  return allPlayerStats.reduce(
    (acc, { score }) => {
      const attemptCount = String(score);
      acc[attemptCount] = (acc[attemptCount] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}

export async function getTotalPlayers(timelineId: string): Promise<number> {
  const redis = await getRedisClient();
  const statsKey = ChronleRedisKeys.stats.allPlayers(timelineId);
  const allPlayers = await redis.zRange(statsKey, 0, -1);
  return allPlayers.length;
}

export async function getTotalSolved(timelineId: string): Promise<number> {
  const redis = await getRedisClient();
  const statsKey = ChronleRedisKeys.stats.allPlayers(timelineId);
  // Players who solved have attempts 1-6, those who failed have 7 (or more if we track that way)
  const solvedPlayers = await redis.zRangeByScore(statsKey, 1, 6);
  return solvedPlayers.length;
}

export async function getAverageAttempts(timelineId: string): Promise<number> {
  const redis = await getRedisClient();
  const statsKey = ChronleRedisKeys.stats.allPlayers(timelineId);
  const allPlayers = await redis.zRange(statsKey, 0, -1);

  if (allPlayers.length === 0) return 0;

  const totalAttempts = allPlayers.reduce((sum, { score }) => sum + score, 0);
  return totalAttempts / allPlayers.length;
}

export async function getLeaderboard(
  timelineId: string,
  limit: number = 10
): Promise<Array<{ rank: number; score: number; member: string }>> {
  const redis = await getRedisClient();
  const statsKey = ChronleRedisKeys.stats.allPlayers(timelineId);
  const entries = await redis.zRange(statsKey, 0, limit - 1);

  return entries.map((entry, index) => ({
    rank: index + 1,
    score: entry.score,
    member: entry.member,
  }));
}

export async function getUserRank(timelineId: string, userId: string): Promise<number | null> {
  const redis = await getRedisClient();
  const statsKey = ChronleRedisKeys.stats.allPlayers(timelineId);
  const rank = await redis.zRank(statsKey, userId);
  return rank !== null ? rank + 1 : null; // zRank is 0-indexed
}

// User Streaks

export async function getUserStreak(userId: string): Promise<{ current: number; best: number }> {
  const redis = await getRedisClient();
  const streakKey = ChronleRedisKeys.user.streak(userId);
  const data = await redis.get(streakKey);
  return data ? JSON.parse(data) : { current: 0, best: 0 };
}

export async function updateUserStreak(
  userId: string,
  solved: boolean,
  gameDay: string
): Promise<{ current: number; best: number }> {
  const redis = await getRedisClient();
  const streakKey = ChronleRedisKeys.user.streak(userId);
  const lastPlayedKey = ChronleRedisKeys.user.lastPlayed(userId);

  const currentStreak = await getUserStreak(userId);
  const lastPlayed = await redis.get(lastPlayedKey);

  const today = new Date(gameDay);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newCurrent = currentStreak.current;
  let newBest = currentStreak.best;

  if (solved) {
    if (lastPlayed === yesterdayStr) {
      // Consecutive day - increment streak
      newCurrent = currentStreak.current + 1;
    } else if (lastPlayed !== gameDay) {
      // New streak or gap - reset to 1
      newCurrent = 1;
    }
    // If already played today, don't change streak

    newBest = Math.max(newBest, newCurrent);
  } else {
    // Failed - reset current streak
    newCurrent = 0;
  }

  await redis.set(streakKey, JSON.stringify({ current: newCurrent, best: newBest }));
  await redis.set(lastPlayedKey, gameDay);

  return { current: newCurrent, best: newBest };
}

// Game data storage (full game info including shuffled order)

export interface StoredGameData {
  id: string;
  postType: 'daily' | 'custom';
  title: string;
  description: string;
  events: ChronleEvent[];
  solution: string[]; // Correct order of event IDs
  shuffledOrder: string[]; // Initial shuffled order
  createdAt: string;
  updatedAt: string;
  creatorUsername?: string;
  creatorIconUrl?: string;
  day?: string; // For daily games
}

export async function saveGameData(gameId: string, data: StoredGameData): Promise<void> {
  const redis = await getRedisClient();
  const key = `chronle:game:${gameId}`;
  await redis.set(key, JSON.stringify(data));
}

export async function getGameData(gameId: string): Promise<StoredGameData | null> {
  const redis = await getRedisClient();
  const key = `chronle:game:${gameId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function deleteGameData(gameId: string): Promise<void> {
  const redis = await getRedisClient();
  const key = `chronle:game:${gameId}`;
  await redis.del(key);
}

