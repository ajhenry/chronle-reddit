import type { LetteredGameData, LetterPiece } from '../../shared/types/api';
import { generateMockGame } from './lettered-game-generator';
import { getNextLetteredPhrase } from './phrase-tracker';
import { getRedisClient } from './redis-provider';
import { RedisKeys, serialize, deserialize } from '../../shared/types/redis';

interface DailyGame {
  id: string;
  day: string;
  letteredGameId: string;
  createdAt: string;
  updatedAt: string;
}

interface DailyGameStorage {
  id: string;
  day: string;
  lettered_game_id: string;
  created_at: string;
  updated_at: string;
}

// No longer need to remove solution - we send it to the client now
const removeSolution = (gameData: LetteredGameData): LetteredGameData => {
  return gameData;
};

/**
 * Gets or creates today's daily lettered game
 */
export async function getOrCreateTodaysLetteredGame(): Promise<{
  success: boolean;
  data?: { dailyGame: DailyGame; gameData: LetteredGameData };
  error?: string;
  statusCode?: number;
}> {
  // We need to remove the solution in our return except for in dev mode
  try {
    const redis = await getRedisClient();

    // Calculate today's date in EST
    const today = new Date();
    const estDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const dayString = estDate.toISOString().split('T')[0]!; // YYYY-MM-DD format

    // First try to get today's game from Redis
    const dailyGameKey = RedisKeys.dailyGame(dayString);
    const existingDailyGameData = await redis.get(dailyGameKey);

    if (existingDailyGameData) {
      const dailyGameStorage = deserialize<DailyGameStorage>(existingDailyGameData);

      if (dailyGameStorage) {
        console.log('Lettered game found for today:', { dailyGameStorage });

        // Get the lettered game data
        const letteredGameData = await redis.get(
          RedisKeys.letteredGame.byId(dailyGameStorage.lettered_game_id)
        );

        if (letteredGameData) {
          const gameData = deserialize<LetteredGameData>(letteredGameData);

          if (gameData) {
            const dailyGame: DailyGame = {
              id: dailyGameStorage.id,
              day: dailyGameStorage.day,
              letteredGameId: dailyGameStorage.lettered_game_id,
              createdAt: dailyGameStorage.created_at,
              updatedAt: dailyGameStorage.updated_at,
            };

            return {
              success: true,
              data: { dailyGame, gameData: removeSolution(gameData) },
            };
          }
        }
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

    // Note: We don't clear old sessions here since Devvit Redis doesn't support key listing
    // Sessions will naturally be isolated by the day in their key, so old sessions won't interfere

    // Store the lettered game in Redis
    const gameId = crypto.randomUUID();
    const now = new Date().toISOString();

    await redis.set(RedisKeys.letteredGame.byId(gameId), serialize(gameData));
    // Add to sorted set of all game IDs (using timestamp as score for ordering)
    await redis.zAdd(RedisKeys.letteredGame.all(), { member: gameId, score: Date.now() });

    // Create the daily game entry
    const dailyGameId = crypto.randomUUID();
    const dailyGameStorage: DailyGameStorage = {
      id: dailyGameId,
      day: dayString,
      lettered_game_id: gameId,
      created_at: now,
      updated_at: now,
    };

    await redis.set(dailyGameKey, serialize(dailyGameStorage));

    const dailyGame: DailyGame = {
      id: dailyGameStorage.id,
      day: dailyGameStorage.day,
      letteredGameId: dailyGameStorage.lettered_game_id,
      createdAt: dailyGameStorage.created_at,
      updatedAt: dailyGameStorage.updated_at,
    };

    return {
      success: true,
      data: { dailyGame, gameData: removeSolution(gameData) },
    };
  } catch (error) {
    console.error('Error in getOrCreateTodaysLetteredGame:', error);
    return { success: false, error: 'Internal server error', statusCode: 500 };
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
