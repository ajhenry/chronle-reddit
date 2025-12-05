import { Router } from 'express';
import { z } from 'zod';
import { context } from '@devvit/web/server';
import { reddit } from '../lib/reddit-provider';
import { generateMockGame } from '../lib/lettered-game-generator';
import {
  setCustomGame,
  getCustomGame,
  deleteCustomGame,
  setPostToGameMapping,
  getGameLeaderboard,
  addScoreToGameLeaderboard,
  getPlayerHistory,
  addScoreToPlayerHistory,
  addScoreToGlobalLeaderboard,
  getPlayerScoreForGame,
  getPlayerRankInGame,
} from '../database/redis';
import { CustomGameScore } from '../../shared/types/api';

const router: Router = Router();

// Schema for custom lettered game creation
const customLetteredSchema = z.object({
  phrase: z.string().min(1).max(70).trim(),
  category: z.string().max(50).default('Custom'),
});

// Schema for game ID parameter
const gameIdParamSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
});

// Schema for completion submission
const completionSubmissionSchema = z.object({
  timeElapsed: z.number().int().min(0),
  moves: z.number().int().min(0),
});

// Schema for dev game generation (no posting to Reddit)
const devLetteredSchema = z.object({
  phrase: z.string().min(1).max(70).trim(),
  seed: z.number().int().min(0).optional(),
});

// Schema for leaderboard query parameters
const leaderboardQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = parseInt(val || '10');
      return Math.min(Math.max(parsed, 1), 100);
    }),
});

// Schema for player history parameters
const usernameParamSchema = z.object({
  username: z.string().min(1, 'Username is required'),
});

// Schema for player history query parameters
const historyQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = parseInt(val || '20');
      return Math.min(Math.max(parsed, 1), 100);
    }),
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
    const cleanPhrase = phrase.replace(/[^a-zA-Z\s]/g, '').trim();
    if (!cleanPhrase) {
      res.status(400).json({
        error: 'Phrase must contain at least one letter',
      });
      return;
    }

    // Validate phrase length constraints
    if (cleanPhrase.length > 70) {
      res.status(400).json({
        error: 'Phrase must be 70 characters or less (including spaces)',
      });
      return;
    }

    // Validate word length constraints (max 9 letters per word)
    const words = cleanPhrase.split(/\s+/);
    const longWords = words.filter((word) => word.length > 9);
    if (longWords.length > 0) {
      res.status(400).json({
        error: `Words must be 9 letters or less. Found: ${longWords.join(', ')}`,
      });
      return;
    }

    // Get current user for the post title and creator info
    let username = 'Anonymous';
    let userIconUrl: string =
      'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png';
    try {
      const user = await reddit.getCurrentUser();
      username = user?.username || 'Anonymous';
      userIconUrl = (await user?.getSnoovatarUrl()) ?? userIconUrl;
      console.log('Creating custom game for user:', username, 'icon:', userIconUrl);
    } catch (error) {
      console.error('Error getting current user:', error);
    }

    // Generate game data using the lettered-game-generator
    console.log(`Generating custom lettered game for phrase: "${cleanPhrase}"`);
    const seed = Math.floor(Math.random() * 1000000);
    const generatedGame = generateMockGame(category, cleanPhrase, seed);
    const gameData = {
      ...generatedGame,
      postType: 'custom' as const,
      creatorUsername: username,
      creatorIconUrl: userIconUrl,
    };

    // Create unique game ID for Redis storage
    const gameId = `custom-lettered:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;

    // Store game data in Redis
    try {
      await setCustomGame(gameId, gameData);
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

    // Create Reddit post with the custom game
    try {
      const post = await reddit.submitCustomPost({
        subredditName: subredditName,
        title: `Lettered - ${category}`,
        splash: {
          appDisplayName: 'Lettered',
        },
        // Store gameId in the post data - the webview should read this
        webviewMetadata: {
          gameId: gameId, // Standardized field name (used by both daily and custom)
          customGameId: gameId, // Keep for backwards compatibility
          gameType: 'lettered',
          postType: 'custom',
          autoLaunch: true, // Flag to indicate this should launch directly
          theme: category, // Store the theme/category for display
        },
      });

      console.log(`Created custom lettered post: ${post.id}`);
      console.log(`Post URL: ${post.url}`);

      // Store mapping from post ID to game ID in Redis for context detection
      await setPostToGameMapping(post.id, gameId);

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
        await deleteCustomGame(gameId);
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

// Dev endpoint for generating lettered games without creating Reddit posts
router.post('/api/dev/lettered', async (req, res): Promise<void> => {
  console.log('🔍 Generating dev lettered game');
  try {
    // Validate request body
    const validationResult = devLetteredSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input',
        details: validationResult.error.issues,
      });
      return;
    }

    const { phrase, seed } = validationResult.data;

    // Clean and validate phrase (only letters and spaces)
    const cleanPhrase = phrase.replace(/[^a-zA-Z\s]/g, '').trim();
    if (!cleanPhrase) {
      res.status(400).json({
        error: 'Phrase must contain at least one letter',
      });
      return;
    }

    // Validate phrase length constraints
    if (cleanPhrase.length > 70) {
      res.status(400).json({
        error: 'Phrase must be 70 characters or less (including spaces)',
      });
      return;
    }

    // Validate word length constraints (max 9 letters per word)
    const words = cleanPhrase.split(/\s+/);
    const longWords = words.filter((word) => word.length > 9);
    if (longWords.length > 0) {
      res.status(400).json({
        error: `Words must be 9 letters or less. Found: ${longWords.join(', ')}`,
      });
      return;
    }

    // Generate game data using the lettered-game-generator
    console.log(`Generating dev lettered game for phrase: "${cleanPhrase}" with seed: ${seed}`);
    const generatedGame = generateMockGame('Dev Test', cleanPhrase, seed);
    const gameData = { ...generatedGame, postType: 'custom' as const };

    res.json({
      status: 'success',
      gameData,
    });
  } catch (error) {
    console.error('Error generating dev lettered game:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

// Get custom game data from Redis
router.get('/api/custom/lettered/:gameId', async (req, res): Promise<void> => {
  try {
    // Validate gameId parameter
    const paramValidation = gameIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      res.status(400).json({
        error: 'Invalid game ID',
        details: paramValidation.error.issues,
      });
      return;
    }

    const { gameId } = paramValidation.data;

    const username = (await reddit.getCurrentUsername()) || 'anonymous';

    // Retrieve game data from Redis
    try {
      const gameData = await getCustomGame(gameId);

      // We also need to add the session data to the game data
      // Fetch the postgame data
      const postgameData = await getPlayerScoreForGame(username, gameId);

      if (!gameData) {
        res.status(404).json({
          error: 'Game not found or expired',
        });
        return;
      }

      res.json({
        status: 'success',
        gameData,
        isCompleted: postgameData?.completedAt,
        gameScore: postgameData,
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
router.post('/api/custom/lettered/:gameId/complete', async (req, res): Promise<void> => {
  try {
    // Validate gameId parameter
    const paramValidation = gameIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      res.status(400).json({
        error: 'Invalid game ID',
        details: paramValidation.error.issues,
      });
      return;
    }

    // Validate request body
    const bodyValidation = completionSubmissionSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({
        error: 'Invalid completion data',
        details: bodyValidation.error.issues,
      });
      return;
    }

    const { gameId } = paramValidation.data;
    const { timeElapsed, moves } = bodyValidation.data;

    // Get username from Reddit context
    let username = 'anonymous';
    try {
      username = (await reddit.getCurrentUsername()) || 'anonymous';
      console.log(
        `Custom game completion - Username retrieved: ${username} for game ${gameId} with time ${timeElapsed}ms and ${moves} moves`
      );
    } catch (error) {
      console.error('Error getting username from context:', error);
    }

    // Check if they already completed this game
    const existingScore = await getPlayerScoreForGame(username, gameId);
    if (existingScore) {
      res.status(400).json({
        error: 'You already completed this game',
      });
      return;
    }

    // Verify game exists
    const gameData = await getCustomGame(gameId);
    if (!gameData) {
      res.status(404).json({
        error: 'Game not found or expired',
      });
      return;
    }

    // Create completion entry
    // Score = time in seconds + moves (lower is better)
    const score = Math.floor(timeElapsed / 1000) + moves;
    const completionEntry: CustomGameScore = {
      username,
      gameId,
      phrase: gameData.phrase,
      completedAt: new Date().toISOString(),
      timeElapsed,
      moves,
      score,
    };

    // Store completion in Redis using helper functions
    await addScoreToGameLeaderboard(gameId, completionEntry);
    await addScoreToPlayerHistory(username, completionEntry);
    await addScoreToGlobalLeaderboard(completionEntry);

    console.log(
      `Stored custom game completion: ${username} completed game ${gameId} in ${timeElapsed}ms with ${moves} moves`
    );

    res.json({
      status: 'success',
      completion: completionEntry,
      message: 'Completion recorded successfully',
    });
  } catch (error) {
    console.error('Error submitting custom game completion:', error);
    res.status(500).json({
      error: 'Failed to record completion',
    });
  }
});

// Get leaderboard for a specific custom game
router.get('/api/custom/lettered/:gameId/leaderboard', async (req, res): Promise<void> => {
  try {
    // Validate gameId parameter
    const paramValidation = gameIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      res.status(400).json({
        error: 'Invalid game ID',
        details: paramValidation.error.issues,
      });
      return;
    }

    // Validate query parameters
    const queryValidation = leaderboardQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: queryValidation.error.issues,
      });
      return;
    }

    const { gameId } = paramValidation.data;
    const { limit } = queryValidation.data;

    // Get top scores for this specific game
    const existingScores = await getGameLeaderboard(gameId);

    // Sort by score descending and get top scores
    const scores = existingScores
      .sort((a: CustomGameScore, b: CustomGameScore) => b.score - a.score)
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
    // Validate username parameter
    const paramValidation = usernameParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      res.status(400).json({
        error: 'Invalid username',
        details: paramValidation.error.issues,
      });
      return;
    }

    // Validate query parameters
    const queryValidation = historyQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: queryValidation.error.issues,
      });
      return;
    }

    const { username } = paramValidation.data;
    const { limit } = queryValidation.data;

    // Get player's game history
    const history = await getPlayerHistory(username);

    // Sort by timestamp descending and limit
    const sortedHistory = history
      .sort((a: CustomGameScore, b: CustomGameScore) => (b.timestamp || 0) - (a.timestamp || 0))
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

// Get postgame stats for a custom game
router.get('/api/custom/lettered/:gameId/postgame', async (req, res): Promise<void> => {
  try {
    // Validate gameId parameter
    const paramValidation = gameIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      res.status(400).json({
        error: 'Invalid game ID',
        details: paramValidation.error.issues,
      });
      return;
    }

    const { gameId } = paramValidation.data;

    // Get username from Reddit context
    let username = 'anonymous';
    try {
      username = (await reddit.getCurrentUsername()) || 'anonymous';
      console.log(`Custom game postgame - Username retrieved: ${username} for game ${gameId}`);
    } catch (error) {
      console.error('Error getting username from context:', error);
    }

    // Verify game exists and get game data
    const gameData = await getCustomGame(gameId);
    if (!gameData) {
      res.status(404).json({
        error: 'Game not found or expired',
      });
      return;
    }

    // Get player's score for this game from their history
    const playerScore = await getPlayerScoreForGame(username, gameId);

    if (!playerScore) {
      res.status(404).json({
        error: 'No score found for this game',
      });
      return;
    }

    // Get game leaderboard to show player ranking
    const existingScores = await getGameLeaderboard(gameId);
    const sortedScores = existingScores.sort(
      (a: CustomGameScore, b: CustomGameScore) => b.score - a.score
    );

    // Find player's rank
    const playerRank = await getPlayerRankInGame(username, gameId);

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

    console.log(
      `Custom game postgame data: Player ${username} rank ${playerRank}/${sortedScores.length}, leaderboard:`,
      sortedScores.slice(0, 3).map((s: CustomGameScore) => `${s.username}:${s.score}`)
    );

    res.json(postgameResponse);
  } catch (error) {
    console.error('Error getting custom game postgame stats:', error);
    res.status(500).json({
      error: 'Failed to get postgame stats',
    });
  }
});

export default router;
