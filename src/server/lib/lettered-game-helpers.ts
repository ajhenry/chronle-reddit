import type { LetteredGameData, LetterPiece } from '../../shared/types/api';
import { generateMockGame } from './lettered-game-generator';
import { getNextLetteredPhrase } from './phrase-tracker';
import { getRedisClient } from './redis-provider';
import { RedisKeys, serialize, deserialize } from '../../shared/types/redis';

/**
 * Gets or creates today's daily lettered game
 * Uses ISO date string as the game ID (e.g., '2025-12-02')
 */
export async function getOrCreateTodaysLetteredGame(): Promise<LetteredGameData> {
  try {
    const redis = await getRedisClient();

    // Calculate today's date in UTC (matches the Reddit post title format)
    const today = new Date();
    const gameId = today.toISOString().split('T')[0]!; // YYYY-MM-DD format in UTC (e.g., '2025-12-02')

    // Try to get today's game from Redis
    const existingGameData = await redis.get(RedisKeys.letteredGame.byId(gameId));

    if (existingGameData) {
      const gameData = deserialize<LetteredGameData>(existingGameData);
      if (gameData) {
        console.log('Lettered game found for today:', { gameId });
        return gameData;
      }
    }

    // No game exists for today, create one
    console.log('No lettered game found for today, creating one...');

    // Get the next phrase from the sequential list
    const phraseData = await getNextLetteredPhrase();
    console.log(
      `Creating game with phrase: "${phraseData.phrase}" from category: ${phraseData.category}`
    );

    // Generate a new game using the server-side generator with a random seed
    const seed = Math.floor(Math.random() * 1000000);
    const gameData = generateMockGame(phraseData.category, phraseData.phrase, seed);

    // Set the game ID to the ISO date string and postType to 'daily'
    const now = new Date().toISOString();
    const dailyGame: LetteredGameData = {
      ...gameData,
      id: gameId,
      postType: 'daily',
      createdAt: now,
      updatedAt: now,
    };

    // Store the lettered game in Redis
    await redis.set(RedisKeys.letteredGame.byId(gameId), serialize(dailyGame));
    // Add to sorted set of all game IDs (using timestamp as score for ordering)
    await redis.zAdd(RedisKeys.letteredGame.all(), { member: gameId, score: Date.now() });

    console.log('Created daily lettered game:', { gameId, phrase: phraseData.phrase });

    return dailyGame;
  } catch (error) {
    console.error('Error in getOrCreateTodaysLetteredGame:', error);
    throw new Error('Failed to get or create today\'s lettered game');
  }
}

/**
 * Validates a user's piece placement for a lettered game
 */
export async function validateLetteredPlacement(
  gameId: string,
  pieceId: string,
  position: { row: number; col: number }
): Promise<{ valid: boolean; error?: string }> {
  try {
    const redis = await getRedisClient();

    // Get the game data from Redis
    const gameData = await redis.get(RedisKeys.letteredGame.byId(gameId));

    if (!gameData) {
      return { valid: false, error: 'Game not found' };
    }

    const game = deserialize<LetteredGameData>(gameData);

    if (!game) {
      return { valid: false, error: 'Failed to parse game data' };
    }

    // Find the piece
    const piece: LetterPiece | undefined = game.pieces.find((p: LetterPiece) => p.id === pieceId);
    if (!piece) {
      return { valid: false, error: 'Piece not found' };
    }

    // Basic validation logic (simplified - you might want to implement more complex validation)
    const grid = game.grid;

    // Check if position is valid on the grid
    for (const shapePos of piece.shape) {
      const gridRow = position.row + shapePos.row;
      const gridCol = position.col + shapePos.col;

      if (gridRow < 0 || gridRow >= game.rows || gridCol < 0 || gridCol >= game.cols) {
        return { valid: false, error: 'Piece placement is out of bounds' };
      }

      const row = grid[gridRow];
      if (!row) {
        return { valid: false, error: 'Invalid grid row' };
      }

      const cell = row[gridCol];
      if (!cell || cell.isUnused || cell.isSpace) {
        return { valid: false, error: 'Invalid grid position for piece' };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating lettered placement:', error);
    return { valid: false, error: 'Validation failed' };
  }
}
