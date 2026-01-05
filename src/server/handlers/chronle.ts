import { Router } from 'express';
import {
  type ChronleGameResponse,
  type ChronleSessionResponse,
  type ChronleSubmitResponse,
  type ChronlePostGameResponse,
  type ChronleLeaderboardEntry,
  type ChronleLeaderboardResponse,
  type ChronleEvent,
} from '../../shared/types/chronle';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';
import {
  getGameData,
  saveGameData,
  getSession,
  saveSession,
  deleteSession,
  saveAttempt,
  getLastAttempt,
  clearAttempts,
  getAllPlayerStats,
  getTotalPlayers,
  getLeaderboard,
  getUserRank,
  updateUserStreak,
  setPostToGameMapping,
  type StoredGameData,
} from '../database/chronle';
import { getPuzzleForDay, createTimelineFromSeed, shuffleArray } from '../lib/puzzle-seeds';
import { getRedisClient } from '../lib/redis-provider';
import { generateAnonymousName } from '../lib/anonymous-names';
import { context } from '@devvit/web/server';
import { reddit } from '../lib/reddit-provider';

const router = Router();

// Helper to get today's date string in YYYY-MM-DD format
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]!;
}

// Helper to generate a unique game ID
function generateGameId(): string {
  return `chronle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to normalize gameId - handles date-only format like "2026-01-04"
function normalizeGameId(gameId: string): string {
  // Check if it's a date-only format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(gameId)) {
    return `daily-${gameId}`;
  }
  return gameId;
}

// Helper to get or create game data (handles daily game creation)
async function getOrCreateGameData(gameId: string): Promise<StoredGameData | null> {
  // First try to get existing game
  let gameData = await getGameData(gameId);
  
  if (gameData) {
    return gameData;
  }

  // If it's a daily game that doesn't exist, create it
  if (gameId.startsWith('daily-')) {
    const dateStr = gameId.replace('daily-', '');
    const seed = getPuzzleForDay(dateStr);
    const { timeline, shuffledEventIds } = createTimelineFromSeed(seed);

    const now = new Date().toISOString();

    gameData = {
      id: gameId,
      postType: 'daily',
      title: seed.title,
      description: seed.description,
      events: seed.events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        subject: event.subject,
        imageUrl: event.imageUrl,
        imageCreditName: event.imageCreditName,
        imageCreditUrl: event.imageCreditUrl,
        date: event.date,
      })),
      solution: timeline.solution,
      shuffledOrder: shuffledEventIds,
      createdAt: now,
      updatedAt: now,
      day: dateStr,
    };

    await saveGameData(gameId, gameData);
    return gameData;
  }

  return null;
}

// GET /api/chronle/:gameId/game - Get a timeline puzzle and user session
router.get('/api/chronle/:gameId/game', async (req, res): Promise<void> => {
  try {
    const rawGameId = req.params.gameId;
    const gameId = normalizeGameId(rawGameId);
    const userId = await ensureUserExistsAndGetId();

    // Get or create the game data (handles daily game creation)
    const gameData = await getOrCreateGameData(gameId);

    if (!gameData) {
      res.status(404).json({
        status: 'error',
        message: 'Game not found',
      });
      return;
    }

    // Get or create user session
    let session = await getSession(userId, gameId);

    if (!session) {
      // Create new session with shuffled event order
      session = {
        sessionId: `session-${userId}-${gameId}`,
        gameId,
        userId,
        currentOrder: gameData.shuffledOrder,
        attempts: [],
        attemptCount: 0,
        isCompleted: false,
        isSolved: false,
        startedAt: new Date().toISOString(),
      };
      await saveSession(session);
    }

    // Get last attempt info
    const { attempt: lastAttempt, attemptCount } = await getLastAttempt(gameId, userId);

    // Build response (without solution)
    const response: ChronleGameResponse = {
      type: 'chronle_game',
      game: {
        id: gameData.id,
        postType: gameData.postType,
        title: gameData.title,
        description: gameData.description,
        events: gameData.events,
        createdAt: gameData.createdAt,
        updatedAt: gameData.updatedAt,
        creatorUsername: gameData.creatorUsername,
        creatorIconUrl: gameData.creatorIconUrl,
      },
      session: {
        type: 'chronle_session',
        sessionId: session.sessionId,
        currentOrder: session.currentOrder,
        attemptCount,
        lastAttempt: lastAttempt
          ? {
              attempt: lastAttempt.attempt,
              correct: lastAttempt.correct,
            }
          : undefined,
        isCompleted: session.isCompleted,
        isSolved: session.isSolved,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/chronle/:gameId/game:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch chronle game',
    });
  }
});

// POST /api/chronle/:gameId/session - Save current event order (without submitting)
router.post('/api/chronle/:gameId/session', async (req, res): Promise<void> => {
  try {
    const gameId = normalizeGameId(req.params.gameId);
    const { currentOrder } = req.body as { currentOrder: string[] };
    const userId = await ensureUserExistsAndGetId();

    if (!currentOrder || !Array.isArray(currentOrder)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid currentOrder',
      });
      return;
    }

    // Get existing session
    let session = await getSession(userId, gameId);

    if (!session) {
      // Create new session
      session = {
        sessionId: `session-${userId}-${gameId}`,
        gameId,
        userId,
        currentOrder,
        attempts: [],
        attemptCount: 0,
        isCompleted: false,
        isSolved: false,
        startedAt: new Date().toISOString(),
      };
    } else {
      // Update current order
      session.currentOrder = currentOrder;
    }

    await saveSession(session);

    res.json({
      status: 'success',
      sessionId: session.sessionId,
      currentOrder: session.currentOrder,
    });
  } catch (error) {
    console.error('Error saving chronle session:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save session',
    });
  }
});

// POST /api/chronle/:gameId/submit - Submit an attempt
router.post('/api/chronle/:gameId/submit', async (req, res): Promise<void> => {
  try {
    const gameId = normalizeGameId(req.params.gameId);
    const { solution } = req.body as { solution: string[] };
    const userId = await ensureUserExistsAndGetId();

    if (!solution || !Array.isArray(solution)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid solution',
      });
      return;
    }

    // Get game data for validation
    const gameData = await getGameData(gameId);

    if (!gameData) {
      res.status(404).json({
        status: 'error',
        message: 'Game not found',
      });
      return;
    }

    // Check if already completed
    const session = await getSession(userId, gameId);
    if (session?.isCompleted) {
      res.status(400).json({
        status: 'error',
        message: 'Game already completed',
      });
      return;
    }

    // Validate solution against correct order
    const correct = solution.map((eventId, index) => eventId === gameData.solution[index]);

    // Create attempt record
    const attempt = {
      timelineId: gameId,
      attempt: solution,
      userId,
      correct,
    };

    // Save attempt and get count
    const { totalCount: attemptCount } = await saveAttempt(gameId, attempt);

    const isSolved = correct.every((c) => c);
    const isFinished = isSolved || attemptCount >= 6;

    // Update session if finished
    if (isFinished && session) {
      session.isCompleted = true;
      session.isSolved = isSolved;
      session.completedAt = new Date().toISOString();
      session.currentOrder = solution;
      await saveSession(session);

      // Update streak if this is a daily game
      if (gameData.postType === 'daily' && gameData.day) {
        await updateUserStreak(userId, isSolved, gameData.day);
      }
    }

    const response: ChronleSubmitResponse = {
      type: 'chronle_submit',
      attempt,
      attemptCount,
      isSolved,
      isFinished,
      correctOrder: isFinished ? gameData.solution : undefined,
    };

    res.json(response);
  } catch (error) {
    console.error('Error submitting chronle solution:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit solution',
    });
  }
});

// GET /api/chronle/:gameId/postgame - Get post-game stats
router.get('/api/chronle/:gameId/postgame', async (req, res): Promise<void> => {
  try {
    const gameId = normalizeGameId(req.params.gameId);
    const userId = await ensureUserExistsAndGetId();

    // Get game data
    const gameData = await getGameData(gameId);

    if (!gameData) {
      res.status(404).json({
        status: 'error',
        message: 'Game not found',
      });
      return;
    }

    // Get session
    const session = await getSession(userId, gameId);
    const { attemptCount } = await getLastAttempt(gameId, userId);

    // Get stats
    const allPlayerStats = await getAllPlayerStats(gameId);
    const totalPlayers = await getTotalPlayers(gameId);

    // Build correct order with full event data
    const correctOrder: ChronleEvent[] = gameData.solution.map((eventId) => {
      const event = gameData.events.find((e) => e.id === eventId);
      return event!;
    });

    const response: ChronlePostGameResponse = {
      type: 'chronle_post_game',
      game: {
        id: gameData.id,
        postType: gameData.postType,
        title: gameData.title,
        description: gameData.description,
        events: gameData.events,
        createdAt: gameData.createdAt,
        updatedAt: gameData.updatedAt,
      },
      correctOrder,
      attemptCount,
      isSolved: session?.isSolved ?? false,
      allPlayerStats,
      totalPlayers,
      userAttemptCount: attemptCount,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting chronle postgame:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get postgame stats',
    });
  }
});

// GET /api/chronle/:gameId/leaderboard - Get game leaderboard
router.get('/api/chronle/:gameId/leaderboard', async (req, res): Promise<void> => {
  try {
    const gameId = normalizeGameId(req.params.gameId);
    const userId = await ensureUserExistsAndGetId();

    // Get leaderboard entries
    const leaderboardData = await getLeaderboard(gameId, 10);
    const totalPlayers = await getTotalPlayers(gameId);
    const userRank = await getUserRank(gameId, userId);

    // Get user handles for leaderboard entries
    const redis = await getRedisClient();
    const entries: ChronleLeaderboardEntry[] = await Promise.all(
      leaderboardData.map(async (entry, index) => {
        // Try to get user handle
        const userData = await redis.get(`user:${entry.member}`);
        const user = userData ? JSON.parse(userData) : null;
        const username = user?.handle || 'Anonymous';

        return {
          rank: index + 1,
          username,
          attemptCount: entry.score,
          isSolved: entry.score <= 6,
        };
      })
    );

    // Get user's entry if outside top 10
    let userEntry: ChronleLeaderboardEntry | undefined;
    if (userRank && userRank > 10) {
      const { attemptCount } = await getLastAttempt(gameId, userId);
      const session = await getSession(userId, gameId);
      userEntry = {
        rank: userRank,
        username: 'You',
        attemptCount,
        isSolved: session?.isSolved ?? false,
      };
    }

    const response: ChronleLeaderboardResponse = {
      type: 'chronle_leaderboard',
      entries,
      totalPlayers,
      userRank: userRank ?? undefined,
      userEntry,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting chronle leaderboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get leaderboard',
    });
  }
});

// POST /api/chronle/create - Create a custom puzzle (moderator)
router.post('/api/chronle/create', async (req, res): Promise<void> => {
  try {
    const { title, description, events } = req.body as {
      title: string;
      description: string;
      events: Array<{
        title: string;
        description: string;
        subject: string;
        imageUrl: string;
        imageCreditName: string;
        imageCreditUrl: string;
        date: string;
      }>;
    };

    const userId = await ensureUserExistsAndGetId();

    // Validate input
    if (!title || !description || !events || events.length < 4) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid puzzle data. Need at least 4 events.',
      });
      return;
    }

    // Get creator info
    const redis = await getRedisClient();
    const userData = await redis.get(`user:${userId}`);
    const user = userData ? JSON.parse(userData) : null;
    const creatorUsername = user?.handle || 'Anonymous';

    // Generate game ID
    const gameId = generateGameId();
    const now = new Date().toISOString();

    // Create events with IDs
    const eventsWithIds: ChronleEvent[] = events.map((event, index) => ({
      id: `event-${gameId}-${index}`,
      title: event.title,
      description: event.description,
      subject: event.subject,
      imageUrl: event.imageUrl,
      imageCreditName: event.imageCreditName,
      imageCreditUrl: event.imageCreditUrl,
      date: event.date,
    }));

    // Sort by date to get solution order
    const sortedEvents = [...eventsWithIds].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const solution = sortedEvents.map((e) => e.id);

    // Shuffle for initial display
    const shuffledOrder = shuffleArray(eventsWithIds).map((e) => e.id);

    // Create game data
    const gameData: StoredGameData = {
      id: gameId,
      postType: 'custom',
      title,
      description,
      events: eventsWithIds,
      solution,
      shuffledOrder,
      createdAt: now,
      updatedAt: now,
      creatorUsername,
    };

    await saveGameData(gameId, gameData);

    res.json({
      status: 'success',
      gameId,
      title,
    });
  } catch (error) {
    console.error('Error creating chronle puzzle:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create puzzle',
    });
  }
});

// POST /api/chronle/:gameId/share - Create a Reddit post for a game
router.post('/api/chronle/:gameId/share', async (req, res): Promise<void> => {
  try {
    const gameId = normalizeGameId(req.params.gameId);

    // Get game data
    const gameData = await getGameData(gameId);

    if (!gameData) {
      res.status(404).json({
        status: 'error',
        message: 'Game not found',
      });
      return;
    }

    // Get subreddit from context
    const { subredditName } = context;
    if (!subredditName) {
      res.status(500).json({
        status: 'error',
        message: 'Subreddit context not available',
      });
      return;
    }

    // Create Reddit post
    const post = await reddit.submitCustomPost({
      subredditName,
      title: `Chronle - ${gameData.title}`,
      splash: {
        appDisplayName: 'Chronle',
      },
      webviewMetadata: {
        gameId,
        gameType: 'chronle',
        postType: gameData.postType,
        autoLaunch: true,
      },
    });

    // Store post to game mapping
    await setPostToGameMapping(post.id, gameId);

    const postPermalink = `https://reddit.com/r/${subredditName}/comments/${post.id}`;

    res.json({
      status: 'success',
      gameId,
      postId: post.id,
      postPermalink,
    });
  } catch (error) {
    console.error('Error sharing chronle game:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to share game',
    });
  }
});

// GET /api/chronle/:gameId/splash - Get splash screen stats
router.get('/api/chronle/:gameId/splash', async (req, res): Promise<void> => {
  try {
    const gameId = normalizeGameId(req.params.gameId);

    // Get or create game data
    const gameData = await getOrCreateGameData(gameId);

    if (!gameData) {
      res.status(404).json({
        status: 'error',
        message: 'Game not found',
      });
      return;
    }

    // Get stats
    const totalPlayers = await getTotalPlayers(gameId);
    const allStats = await getAllPlayerStats(gameId);
    
    // Calculate solved count (players with attempts 1-6)
    let totalSolved = 0;
    let totalAttempts = 0;
    for (const [attempts, count] of Object.entries(allStats)) {
      const attemptNum = Number(attempts);
      if (attemptNum <= 6) {
        totalSolved += count;
      }
      totalAttempts += attemptNum * count;
    }
    
    const averageAttempts = totalPlayers > 0 ? totalAttempts / totalPlayers : 0;

    // Format date for daily games
    let formattedDate: string | undefined;
    if (gameData.postType === 'daily' && gameData.day) {
      formattedDate = new Date(gameData.day).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    res.json({
      gameId: gameData.id,
      postType: gameData.postType,
      title: gameData.title,
      description: gameData.description,
      formattedDate,
      creatorUsername: gameData.creatorUsername,
      creatorIconUrl: gameData.creatorIconUrl,
      totalCompletions: totalPlayers,
      totalSolved,
      averageAttempts,
    });
  } catch (error) {
    console.error('Error getting chronle splash:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get splash data',
    });
  }
});

// POST /api/chronle/:gameId/debug/reset - Reset user session and attempts (debug only)
router.post('/api/chronle/:gameId/debug/reset', async (req, res): Promise<void> => {
  try {
    const gameId = normalizeGameId(req.params.gameId);
    const userId = await ensureUserExistsAndGetId();

    // Delete user session
    await deleteSession(userId, gameId);
    
    // Clear user attempts
    await clearAttempts(gameId, userId);

    res.json({
      status: 'success',
      message: 'Session and attempts reset successfully',
      gameId,
      userId,
    });
  } catch (error) {
    console.error('Error resetting chronle session:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset session',
    });
  }
});

// GET /api/chronle/daily - Get or create today's daily game
router.get('/api/chronle/daily', async (_req, res): Promise<void> => {
  try {
    const today = getTodayDateString();
    const dailyGameId = `daily-${today}`;

    // Check if daily game exists
    let gameData = await getGameData(dailyGameId);

    if (!gameData) {
      // Create today's daily game from seed
      const seed = getPuzzleForDay(today);
      const { timeline, shuffledEventIds } = createTimelineFromSeed(seed);

      const now = new Date().toISOString();

      gameData = {
        id: dailyGameId,
        postType: 'daily',
        title: seed.title,
        description: seed.description,
        events: seed.events.map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          subject: event.subject,
          imageUrl: event.imageUrl,
          imageCreditName: event.imageCreditName,
          imageCreditUrl: event.imageCreditUrl,
          date: event.date,
        })),
        solution: timeline.solution,
        shuffledOrder: shuffledEventIds,
        createdAt: now,
        updatedAt: now,
        day: today,
      };

      await saveGameData(dailyGameId, gameData);
    }

    res.json({
      status: 'success',
      gameId: dailyGameId,
      title: gameData.title,
      description: gameData.description,
    });
  } catch (error) {
    console.error('Error getting daily chronle:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get daily game',
    });
  }
});

export default router;

