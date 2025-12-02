import { getRedisClient } from '../lib/redis-provider';
import { getTodayEST } from '../lib/time';
import { RedisKeys, serialize, deserialize } from '../../shared/types/redis';

export interface DailyGame {
  id: string;
  day: string;
  letteredGameId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DailyGameStorage {
  id: string;
  day: string;
  lettered_game_id: string | null;
  created_at: string;
  updated_at: string;
}

const convertGame = (game: DailyGameStorage): DailyGame => {
  return {
    id: game.id,
    day: game.day,
    letteredGameId: game.lettered_game_id,
    createdAt: game.created_at,
    updatedAt: game.updated_at,
  };
};

const convertToStorage = (game: DailyGame): DailyGameStorage => {
  return {
    id: game.id,
    day: game.day,
    lettered_game_id: game.letteredGameId,
    created_at: game.createdAt,
    updated_at: game.updatedAt,
  };
};

const createDailyGame = async (): Promise<DailyGame> => {
  try {
    const redis = await getRedisClient();
    const gameId = crypto.randomUUID();
    const now = new Date().toISOString();
    const today = getTodayEST();

    const game: DailyGame = {
      id: gameId,
      day: today,
      letteredGameId: null,
      createdAt: now,
      updatedAt: now,
    };

    const storageData = convertToStorage(game);
    await redis.set(RedisKeys.dailyGame(today), serialize(storageData));

    console.log('Created daily game:', { gameId, day: today });

    return game;
  } catch (error) {
    console.error('Failed to create daily game:', { error });
    throw new Error('Failed to create daily game');
  }
};

// Fetches today's game from the database, creates it if it doesn't exist
export const getOrCreateTodaysGame = async (): Promise<DailyGame> => {
  try {
    const redis = await getRedisClient();
    const today = getTodayEST();
    const gameData = await redis.get(RedisKeys.dailyGame(today));

    if (!gameData) {
      return await createDailyGame();
    }

    const data = deserialize<DailyGameStorage>(gameData);
    if (!data) {
      console.error('Failed to deserialize daily game data');
      return await createDailyGame();
    }

    return convertGame(data);
  } catch (error) {
    console.error('Failed to get todays game:', { error });
    throw new Error('Failed to get today\'s game');
  }
};

export const updateDailyGame = async (game: DailyGame): Promise<DailyGame> => {
  try {
    const redis = await getRedisClient();

    const updatedGame: DailyGame = {
      ...game,
      updatedAt: new Date().toISOString(),
    };

    const storageData = convertToStorage(updatedGame);
    await redis.set(RedisKeys.dailyGame(game.day), serialize(storageData));

    console.log('Updated daily game:', { gameId: game.id, day: game.day });

    return updatedGame;
  } catch (error) {
    console.error('Failed to update daily game:', { error });
    throw new Error('Failed to update daily game');
  }
};
