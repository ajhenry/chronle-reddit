import { Router } from 'express';
import { z } from 'zod';
import { context } from '@devvit/web/server';
import { reddit } from '../lib/reddit-provider';
import { redis } from '@devvit/redis';
import { generateMockGame } from '../lib/lettered-game-generator';

const router = Router();

// Types for custom game scores
interface CustomGameScore {
  username: string;
  gameId: string;
  phrase: string;
  score: number;
  completedAt: string;
  timeElapsed: number; // in seconds
  moves: number;
}

interface CustomGameSession {
  gameId: string;
  username: string;
  startedAt: string;
  isCompleted: boolean;
  finalScore?: number;
  moves: number;
  timeElapsed?: number;
}

// Schema for custom lettered game creation
const customLetteredSchema = z.object({
  phrase: z.string().min(1).max(45).trim(),
  category: z.string().max(50).default('Custom'),
});

router.post('/api/custom/lettered', async (req, res): Promise<void> => {
  try {
    // Validate request body
    const validationResult = customLetteredSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input',
        details: validationResult.error.issues,
      });
      return;
    }

    const { phrase, category } = validationResult.data;

    // Clean and validate phrase (only letters and spaces)
    const cleanPhrase = phrase.replace(/[^a-zA-Z\s]/g, '').toUpperCase().trim();
    if (!cleanPhrase) {
      res.status(400).json({
        error: 'Phrase must contain at least one letter',
      });
      return;
    }

    // Validate phrase length constraints
    if (cleanPhrase.length > 45) {
      res.status(400).json({
        error: 'Phrase must be 45 characters or less (including spaces)',
      });
      return;
    }

    // Validate word length constraints (max 9 letters per word)
    const words = cleanPhrase.split(/\s+/);
    const longWords = words.filter(word => word.length > 9);
    if (longWords.length > 0) {
      res.status(400).json({
        error: `Words must be 9 letters or less. Found: ${longWords.join(', ')}`,
      });
      return;
    }

    // Generate game data using the lettered-game-generator
    console.log(`Generating custom lettered game for phrase: "${cleanPhrase}"`);
    const gameData = generateMockGame(category, cleanPhrase);

    // Create unique game ID for Redis storage
    const gameId = `custom-lettered:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;

    // Store game data in Redis
    try {
      await redis.set(gameId, JSON.stringify(gameData));
      await redis.expire(gameId, 60 * 60 * 24 * 7); // Expire in 7 days
      console.log(`Stored custom game in Redis with ID: ${gameId}`);
    } catch (redisError) {
      console.error('Failed to store game in Redis:', redisError);
      res.status(500).json({
        error: 'Failed to store game data',
      });
      return;
    }

    // Get subreddit name from context
    const { subredditName } = context;
    if (!subredditName) {
      res.status(500).json({
        error: 'Subreddit context not available',
      });
      return;
    }

    // Get current user for the post title
    let username = 'Anonymous';
    try {
      const user = await reddit.getCurrentUser();
      username = user?.username || 'Anonymous';
      console.log('🔍 Creating custom game for user:', username);
    } catch (error) {
      console.error('Error getting current user:', error);
    }

    // Create Reddit post with the custom game
    try {
      const post = await reddit.submitCustomPost({
        subredditName: subredditName,
        title: `Custom puzzle by ${username}`,
        splash: {
          appDisplayName: 'Podium Game',
        },
        // Store gameId in the post data - the webview should read this
        webviewMetadata: {
          customGameId: gameId,
          gameType: 'lettered',
          autoLaunch: true, // Flag to indicate this should launch directly
          theme: category, // Store the theme/category for display
        },
      });

      console.log(`Created custom lettered post: ${post.id}`);
      console.log(`Post URL: ${post.url}`);

      // Store mapping from post ID to game ID in Redis for context detection
      // Try storing with both full ID and short ID (without t3_)
      const postToGameKey = `custom-lettered:post:${post.id}`;
      await redis.set(postToGameKey, gameId);
      await redis.expire(postToGameKey, 60 * 60 * 24 * 7); // Same expiration as game data
      console.log(`Stored post-to-game mapping: ${post.id} -> ${gameId}`);
      
      // Also store without t3_ prefix if it exists
      if (post.id.startsWith('t3_')) {
        const shortId = post.id.replace('t3_', '');
        const altKey = `custom-lettered:post:${shortId}`;
        await redis.set(altKey, gameId);
        await redis.expire(altKey, 60 * 60 * 24 * 7);
        console.log(`Stored alternate mapping: ${shortId} -> ${gameId}`);
      }

      res.json({
        status: 'success',
        postId: post.id,
        postPermalink: `https://reddit.com/r/${subredditName}/comments/${post.id}`,
        gameId,
        phrase: cleanPhrase,
        category,
      });
    } catch (postError) {
      console.error('Failed to create Reddit post:', postError);
      
      // Clean up Redis entry if post creation failed
      try {
        await redis.del(gameId);
      } catch (cleanupError) {
        console.error('Failed to cleanup Redis entry:', cleanupError);
      }

      res.status(500).json({
        error: 'Failed to create Reddit post',
      });
      return;
    }
  } catch (error) {
    console.error('Error creating custom lettered game:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

// Get custom game data from Redis
router.get('/api/custom/lettered/:gameId', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      res.status(400).json({
        error: 'Game ID is required',
      });
      return;
    }

    // Retrieve game data from Redis
    try {
      const gameDataStr = await redis.get(gameId);
      
      if (!gameDataStr) {
        res.status(404).json({
          error: 'Game not found or expired',
        });
        return;
      }

      const gameData = JSON.parse(gameDataStr);

      res.json({
        status: 'success',
        gameData,
      });
    } catch (redisError) {
      console.error('Failed to retrieve game from Redis:', redisError);
      res.status(500).json({
        error: 'Failed to retrieve game data',
      });
      return;
    }
  } catch (error) {
    console.error('Error retrieving custom lettered game:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

// Submit score for custom game
router.post('/api/custom/lettered/:gameId/score', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { score, timeElapsed, moves } = req.body;

    if (!gameId || typeof score !== 'number' || typeof timeElapsed !== 'number' || typeof moves !== 'number') {
      res.status(400).json({
        error: 'Missing required fields: gameId, score, timeElapsed, moves',
      });
      return;
    }

    // Get username from Reddit context
    let username = 'anonymous';
    try {
      username = await reddit.getCurrentUsername() || 'anonymous';
      console.log(`Custom game score submission - Username retrieved: ${username} for game ${gameId} with score ${score}`);
    } catch (error) {
      console.error('Error getting username from context:', error);
    }

    // Verify game exists
    const gameDataStr = await redis.get(gameId);
    if (!gameDataStr) {
      res.status(404).json({
        error: 'Game not found or expired',
      });
      return;
    }

    const gameData = JSON.parse(gameDataStr);

    // Create score entry
    const scoreEntry: CustomGameScore = {
      username,
      gameId,
      phrase: gameData.phrase,
      score,
      completedAt: new Date().toISOString(),
      timeElapsed,
      moves,
    };

    // Store score in Redis using simple key-value storage
    const timestamp = Date.now();
    
    // Store in game-specific leaderboard
    const gameLeaderboardKey = `custom-lettered:leaderboard:${gameId}`;
    const existingScoresStr = await redis.get(gameLeaderboardKey) || '[]';
    const existingScores = JSON.parse(existingScoresStr);
    existingScores.push({ ...scoreEntry, timestamp });
    // Keep top 100 scores for each game
    const sortedScores = existingScores
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 100);
    await redis.set(gameLeaderboardKey, JSON.stringify(sortedScores));
    await redis.expire(gameLeaderboardKey, 60 * 60 * 24 * 30); // Keep for 30 days

    // Store in player's personal custom game history
    const playerHistoryKey = `custom-lettered:player:${username}`;
    const playerHistoryStr = await redis.get(playerHistoryKey) || '[]';
    const playerHistory = JSON.parse(playerHistoryStr);
    playerHistory.push({ ...scoreEntry, timestamp });
    // Keep last 100 games for each player
    const trimmedHistory = playerHistory.slice(-100);
    await redis.set(playerHistoryKey, JSON.stringify(trimmedHistory));
    await redis.expire(playerHistoryKey, 60 * 60 * 24 * 30); // Keep for 30 days

    // Store in global custom games leaderboard (all players, all custom games)
    const globalLeaderboardKey = 'custom-lettered:global-leaderboard';
    const existingGlobalStr = await redis.get(globalLeaderboardKey) || '[]';
    const existingGlobal = JSON.parse(existingGlobalStr);
    existingGlobal.push({ ...scoreEntry, timestamp });
    // Keep top 1000 scores globally
    const sortedGlobal = existingGlobal
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 1000);
    await redis.set(globalLeaderboardKey, JSON.stringify(sortedGlobal));
    await redis.expire(globalLeaderboardKey, 60 * 60 * 24 * 30); // Keep for 30 days

    console.log(`Stored custom game score: ${username} scored ${score} on game ${gameId}`);

    res.json({
      status: 'success',
      scoreSubmitted: scoreEntry,
      message: 'Score submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting custom game score:', error);
    res.status(500).json({
      error: 'Failed to submit score',
    });
  }
});

// Get leaderboard for a specific custom game
router.get('/api/custom/lettered/:gameId/leaderboard', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

    if (!gameId) {
      res.status(400).json({
        error: 'Game ID is required',
      });
      return;
    }

    // Get top scores for this specific game (use simple key-value storage for leaderboards)
    const gameLeaderboardKey = `custom-lettered:leaderboard:${gameId}`;
    const existingScoresStr = await redis.get(gameLeaderboardKey) || '[]';
    const existingScores = JSON.parse(existingScoresStr);
    
    // Sort by score descending and get top scores
    const scores = existingScores
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit);

    res.json({
      status: 'success',
      gameId,
      leaderboard: scores,
      count: scores.length,
    });
  } catch (error) {
    console.error('Error getting custom game leaderboard:', error);
    res.status(500).json({
      error: 'Failed to get leaderboard',
    });
  }
});

// Get player's custom game history
router.get('/api/custom/lettered/player/:username/history', async (req, res): Promise<void> => {
  try {
    const { username } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    if (!username) {
      res.status(400).json({
        error: 'Username is required',
      });
      return;
    }

    // Get player's game history
    const playerHistoryKey = `custom-lettered:player:${username}`;
    const historyStr = await redis.get(playerHistoryKey) || '[]';
    const history = JSON.parse(historyStr);

    // Sort by timestamp descending and limit
    const sortedHistory = history
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, limit);

    res.json({
      status: 'success',
      username,
      history: sortedHistory,
      count: sortedHistory.length,
    });
  } catch (error) {
    console.error('Error getting player custom game history:', error);
    res.status(500).json({
      error: 'Failed to get player history',
    });
  }
});

// Get global custom games leaderboard
router.get('/api/custom/lettered/global-leaderboard', async (req, res): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    // Get top scores across all custom games
    const globalLeaderboardKey = 'custom-lettered:global-leaderboard';
    const existingGlobalStr = await redis.get(globalLeaderboardKey) || '[]';
    const existingGlobal = JSON.parse(existingGlobalStr);
    
    // Sort by score descending and get top scores
    const scores = existingGlobal
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit);

    res.json({
      status: 'success',
      leaderboard: scores,
      count: scores.length,
    });
  } catch (error) {
    console.error('Error getting global custom game leaderboard:', error);
    res.status(500).json({
      error: 'Failed to get global leaderboard',
    });
  }
});

// Get postgame stats for a custom game
router.get('/api/custom/lettered/:gameId/postgame', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      res.status(400).json({
        error: 'Game ID is required',
      });
      return;
    }

    // Get username from Reddit context
    let username = 'anonymous';
    try {
      username = await reddit.getCurrentUsername() || 'anonymous';
      console.log(`Custom game postgame - Username retrieved: ${username} for game ${gameId}`);
    } catch (error) {
      console.error('Error getting username from context:', error);
    }

    // Verify game exists and get game data
    const gameDataStr = await redis.get(gameId);
    if (!gameDataStr) {
      res.status(404).json({
        error: 'Game not found or expired',
      });
      return;
    }

    const gameData = JSON.parse(gameDataStr);

    // Get player's score for this game from their history
    const playerHistoryKey = `custom-lettered:player:${username}`;
    const playerHistoryStr = await redis.get(playerHistoryKey) || '[]';
    const playerHistory = JSON.parse(playerHistoryStr);
    
    // Find the latest score for this game ID
    const playerScore = playerHistory
      .filter((score: any) => score.gameId === gameId)
      .sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];

    if (!playerScore) {
      res.status(404).json({
        error: 'No score found for this game',
      });
      return;
    }

    // Get game leaderboard to show player ranking
    const gameLeaderboardKey = `custom-lettered:leaderboard:${gameId}`;
    const existingScoresStr = await redis.get(gameLeaderboardKey) || '[]';
    const existingScores = JSON.parse(existingScoresStr);
    const sortedScores = existingScores.sort((a: any, b: any) => b.score - a.score);
    
    // Find player's rank
    const playerRank = sortedScores.findIndex((score: any) => score.username === username) + 1;

    // Create postgame response similar to regular games
    const postgameResponse = {
      dailyGame: {
        phrase: gameData.phrase,
        id: gameId,
        date: new Date().toISOString().split('T')[0], // Use current date for custom games
      },
      finalScore: playerScore.score,
      movesUsed: playerScore.moves,
      timeElapsed: playerScore.timeElapsed,
      rank: playerRank,
      totalPlayers: sortedScores.length,
      leaderboard: sortedScores.slice(0, 10), // Top 10 for display
    };

    console.log(`Custom game postgame data: Player ${username} rank ${playerRank}/${sortedScores.length}, leaderboard:`, 
                sortedScores.slice(0, 3).map((s: any) => `${s.username}:${s.score}`));

    res.json(postgameResponse);
  } catch (error) {
    console.error('Error getting custom game postgame stats:', error);
    res.status(500).json({
      error: 'Failed to get postgame stats',
    });
  }
});

export default router;