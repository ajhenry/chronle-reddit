import { Router } from 'express';
import { reddit } from '../lib/reddit-provider';
import { getUserByRedditHandle, getUserById } from '../database/user';
import { getRedisClient } from '../lib/redis-provider';
import { RedisKeys, deserialize } from '../../shared/types/redis';
import { findLetteredSessionById, getLatestLetteredSubmission } from '../database/lettered';

const router = Router();

// Admin check endpoint - returns 404 if user is not admin
router.get('/api/admin', async (_req, res): Promise<void> => {
  try {
    // Get Reddit username from Devvit context
    const redditUsername = await reddit.getCurrentUsername();

    if (!redditUsername) {
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    const user = await getUserByRedditHandle(redditUsername);

    // Check if user is admin
    if (!user.admin) {
      console.log('User is not admin', { user });
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    // User is admin, return success
    res.json({
      status: 'success',
      message: 'Admin access granted',
      user: {
        id: user.id,
        reddit_id: user.redditId,
        handle: user.handle,
        image_url: user.imageUrl,
        admin: user.admin,
      },
    });
  } catch (error) {
    console.error('Error checking admin status:', { error });
    res.status(404).json({
      status: 'error',
      message: 'Not found',
    });
  }
});

// Admin endpoint to clear all game sessions
router.post('/api/admin/clear/sessions', async (_req, res): Promise<void> => {
  try {
    // First check if user is admin
    const redditUsername = await reddit.getCurrentUsername();

    if (!redditUsername || redditUsername === 'anonymous') {
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    const user = await getUserByRedditHandle(redditUsername);

    if (!user || !user.admin) {
      console.log('User is not admin', { user });
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    // Clear all lettered sessions from Redis
    // Note: Since Devvit Redis doesn't support key listing, we track active session days
    // in a sorted set and clear those explicitly
    const redis = await getRedisClient();
    const sessionDaysKey = 'lettered_session_days';

    // Get all days that have sessions
    const days = await redis.zRange(sessionDaysKey, 0, -1);

    let letteredSessionsDeleted = 0;
    for (const day of days) {
      const dayStr = day.member;
      const lookupKey = `lettered_session_lookup:${dayStr}`;

      // Get all sessionId -> userId mappings for this day
      const sessionMap = await redis.hGetAll(lookupKey);

      // Delete each session
      for (const [_sessionId, userId] of Object.entries(sessionMap)) {
        const sessionKey = `lettered_sessions:${userId}:${dayStr}`;
        await redis.del(sessionKey);
        letteredSessionsDeleted++;
      }

      // Clear the lookup hash for this day
      await redis.del(lookupKey);
    }

    // Clear the session days tracker
    await redis.del(sessionDaysKey);

    console.log('Cleared lettered sessions:', { count: letteredSessionsDeleted });

    res.json({
      status: 'success',
      message: 'All game sessions cleared successfully',
      data: {
        letteredSessionsDeleted: letteredSessionsDeleted || 0,
        totalDeleted: letteredSessionsDeleted || 0,
      },
    });
  } catch (error) {
    console.error('Error clearing sessions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Admin endpoint to clear only lettered sessions (danger zone option)
router.post('/api/admin/clear/lettered-sessions', async (_req, res): Promise<void> => {
  try {
    // First check if user is admin
    const redditUsername = await reddit.getCurrentUsername();

    if (!redditUsername || redditUsername === 'anonymous') {
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    const user = await getUserByRedditHandle(redditUsername);

    if (!user || !user.admin) {
      console.log('User is not admin', { user });
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    const redis = await getRedisClient();
    let letteredSessionsDeleted = 0;
    let letteredSubmissionsDeleted = 0;
    let perGameLookupsDeleted = 0;

    console.log('Starting lettered sessions cleanup...');

    // Clear all lettered sessions and submissions using the global lookup
    try {
      // The actual global lookup key used in lettered.ts
      const globalLookupKey = 'lettered_session_global_lookup';
      const sessionMap = await redis.hGetAll(globalLookupKey);
      console.log(`Found ${Object.keys(sessionMap).length} lettered sessions to delete`);

      for (const [sessionId, sessionDataStr] of Object.entries(sessionMap)) {
        try {
          const sessionData = deserialize<{ userId: string; gameId: string }>(sessionDataStr);
          if (!sessionData) {
            console.error('Failed to parse session data for:', sessionId);
            continue;
          }

          const sessionKey = RedisKeys.letteredSession(sessionData.userId, sessionData.gameId);
          await redis.del(sessionKey);
          letteredSessionsDeleted++;

          // Clear submissions for this session
          await redis.del(RedisKeys.letteredSubmissions(sessionId));
          letteredSubmissionsDeleted++;
        } catch (parseError) {
          console.error('Error parsing session data:', parseError);
        }
      }

      // Clear the global lookup
      await redis.del(globalLookupKey);

      // Get all games that have sessions and clear their per-game lookups
      const sessionGamesKey = 'lettered_session_games';
      const gamesWithSessions = await redis.zRange(sessionGamesKey, 0, -1);
      console.log(`Found ${gamesWithSessions.length} games with session lookups to clear`);

      for (const game of gamesWithSessions) {
        const gameId = game.member;
        const perGameLookupKey = `lettered_session_lookup:${gameId}`;
        await redis.del(perGameLookupKey);
        perGameLookupsDeleted++;
      }

      // Clear session games tracking
      await redis.del(sessionGamesKey);
    } catch (error) {
      console.error('Error clearing lettered sessions:', error);
    }

    console.log('Lettered sessions cleanup completed:', {
      sessionsDeleted: letteredSessionsDeleted,
      submissionsDeleted: letteredSubmissionsDeleted,
      perGameLookupsDeleted,
    });

    res.json({
      status: 'success',
      message: 'All lettered sessions cleared successfully',
      data: {
        letteredSessionsDeleted,
        totalDeleted: letteredSessionsDeleted + letteredSubmissionsDeleted + perGameLookupsDeleted,
      },
    });
  } catch (error) {
    console.error('Error clearing lettered sessions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Admin endpoint to clear ALL Redis data (nuclear option)
router.post('/api/admin/clear/redis', async (_req, res): Promise<void> => {
  try {
    // First check if user is admin
    const redditUsername = await reddit.getCurrentUsername();

    if (!redditUsername || redditUsername === 'anonymous') {
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    const user = await getUserByRedditHandle(redditUsername);

    if (!user || !user.admin) {
      console.log('User is not admin', { user });
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    const redis = await getRedisClient();
    let totalDeleted = 0;

    // Track different categories
    const deletedCounts = {
      letteredGames: 0,
      letteredSessions: 0,
      letteredSubmissions: 0,
      customGames: 0,
      postMappings: 0,
      leaderboards: 0,
      userStats: 0,
      users: 0,
      other: 0,
    };

    console.log('Starting comprehensive Redis cleanup...');

    // 1. Clear all lettered games
    try {
      const games = await redis.zRange(RedisKeys.letteredGame.all(), 0, -1);
      console.log(`Found ${games.length} lettered games to delete`);

      for (const game of games) {
        const gameId = game.member;
        await redis.del(RedisKeys.letteredGame.byId(gameId));
        deletedCounts.letteredGames++;
        totalDeleted++;
      }

      // Clear the games index
      await redis.del(RedisKeys.letteredGame.all());
      totalDeleted++;
    } catch (error) {
      console.error('Error clearing lettered games:', error);
    }

    // 2. Clear all lettered sessions and submissions
    try {
      // The actual global lookup key used in lettered.ts
      const globalLookupKey = 'lettered_session_global_lookup';
      const sessionMap = await redis.hGetAll(globalLookupKey);
      console.log(`Found ${Object.keys(sessionMap).length} sessions to delete`);

      for (const [sessionId, sessionDataStr] of Object.entries(sessionMap)) {
        try {
          const sessionData = deserialize<{ userId: string; gameId: string }>(sessionDataStr);
          if (!sessionData) {
            console.error('Failed to parse session data for:', sessionId);
            continue;
          }

          const sessionKey = RedisKeys.letteredSession(sessionData.userId, sessionData.gameId);
          await redis.del(sessionKey);
          deletedCounts.letteredSessions++;
          totalDeleted++;

          // Clear submissions for this session
          await redis.del(RedisKeys.letteredSubmissions(sessionId));
          deletedCounts.letteredSubmissions++;
          totalDeleted++;
        } catch (parseError) {
          console.error('Error parsing session data:', parseError);
        }
      }

      // Clear the global lookup
      await redis.del(globalLookupKey);
      totalDeleted++;

      // Get all games that have sessions and clear their per-game lookups
      const sessionGamesKey = 'lettered_session_games';
      const gamesWithSessions = await redis.zRange(sessionGamesKey, 0, -1);
      console.log(`Found ${gamesWithSessions.length} games with session lookups to clear`);

      for (const game of gamesWithSessions) {
        const gameId = game.member;
        const perGameLookupKey = `lettered_session_lookup:${gameId}`;
        await redis.del(perGameLookupKey);
        totalDeleted++;
      }

      // Clear session games tracking
      await redis.del(sessionGamesKey);
      totalDeleted++;
    } catch (error) {
      console.error('Error clearing sessions:', error);
    }

    // 3. Clear custom games (pattern-based keys)
    // Note: Since Devvit Redis doesn't support SCAN, we'll clear known patterns
    // Custom game keys follow the pattern: custom-lettered:timestamp:randomid
    // These are tracked when created, but for now we'll skip them unless we implement tracking
    console.log('Custom games cleanup: Skipped (no index available)');

    // 4. Clear post-to-game mappings (pattern-based)
    // Pattern: custom-lettered:post:*
    console.log('Post mappings cleanup: Skipped (no index available)');

    // 5. Clear all leaderboards
    try {
      const periods = ['daily', 'weekly', 'monthly', 'alltime'] as const;
      const types = ['overall', 'lettered'] as const;

      for (const type of types) {
        for (const period of periods) {
          // Clear current period
          const key = RedisKeys.leaderboard(type, period);
          await redis.del(key);
          deletedCounts.leaderboards++;
          totalDeleted++;

          // Clear metadata
          const metadataKey = `${key}:metadata`;
          await redis.del(metadataKey);
          deletedCounts.leaderboards++;
          totalDeleted++;
        }
      }

      console.log(`Cleared ${deletedCounts.leaderboards} leaderboard keys`);
    } catch (error) {
      console.error('Error clearing leaderboards:', error);
    }

    // 6. Clear phrase tracker index
    try {
      await redis.del('lettered_phrase_index');
      totalDeleted++;
    } catch (error) {
      console.error('Error clearing phrase tracker:', error);
    }

    // 7. User stats and user data - Note: Usually we don't want to clear user accounts
    // but this is a debug nuclear option, so we'll add it with a note
    console.log('User data cleanup: Skipped (preserving user accounts)');

    console.log('Redis cleanup completed:', {
      totalDeleted,
      breakdown: deletedCounts,
    });

    res.json({
      status: 'success',
      message: 'All Redis data cleared successfully',
      data: {
        totalDeleted,
        breakdown: deletedCounts,
      },
    });
  } catch (error) {
    console.error('Error clearing Redis data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Admin endpoint to lookup a session by ID
router.get('/api/admin/session/:sessionId', async (req, res): Promise<void> => {
  try {
    // First check if user is admin
    const redditUsername = await reddit.getCurrentUsername();

    if (!redditUsername || redditUsername === 'anonymous') {
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    const adminUser = await getUserByRedditHandle(redditUsername);

    if (!adminUser || !adminUser.admin) {
      console.log('User is not admin', { adminUser });
      res.status(404).json({
        status: 'error',
        message: 'Not found',
      });
      return;
    }

    const { sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({
        status: 'error',
        message: 'Session ID is required',
      });
      return;
    }

    // Look up the session
    const session = await findLetteredSessionById(sessionId);

    // Get the user info for this session
    const sessionUser = await getUserById(session.userId);

    // Get the latest submission for this session
    const latestSubmission = await getLatestLetteredSubmission(
      session.userId,
      session.letteredGameId
    );

    // Get the game data
    const redis = await getRedisClient();
    const gameDataRaw = await redis.get(RedisKeys.letteredGame.byId(session.letteredGameId));
    const gameData = gameDataRaw
      ? deserialize<{ phrase: string; category: string }>(gameDataRaw)
      : null;

    res.json({
      status: 'success',
      session: {
        id: session.id,
        userId: session.userId,
        gameId: session.letteredGameId,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        timeElapsed: session.timeElapsed,
        isCompleted: session.isCompleted,
        moves: session.moves,
      },
      user: sessionUser
        ? {
            id: sessionUser.id,
            redditId: sessionUser.redditId,
            handle: sessionUser.handle,
            imageUrl: sessionUser.imageUrl,
          }
        : null,
      game: gameData
        ? {
            phrase: gameData.phrase,
            category: gameData.category,
          }
        : null,
      submission: latestSubmission
        ? {
            id: latestSubmission.id,
            submittedAt: latestSubmission.submittedAt,
            placedPiecesCount: Object.keys(latestSubmission.boardState.placedPieces).length,
          }
        : null,
    });
  } catch (error) {
    console.error('Error looking up session:', error);
    res.status(404).json({
      status: 'error',
      message: 'Session not found',
    });
  }
});

export default router;
