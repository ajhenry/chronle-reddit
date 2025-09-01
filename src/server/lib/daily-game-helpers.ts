import { supabase } from '../../shared/supabase-server';
import type { TopXGame, DailyGame } from '../../shared/types/supabase';
import type { TopXGameData } from '../../shared/types/api';

// Helper function to convert database record to API format
export const convertGameToApiFormat = (dbGame: TopXGame): TopXGameData => ({
  id: dbGame.id,
  prompt: dbGame.prompt,
  solution: dbGame.solution,
  suggestions: dbGame.suggestions,
  category: dbGame.category,
  count: dbGame.count,
  created_at: dbGame.created_at,
  updated_at: dbGame.updated_at,
});

// Helper function to get current date in EST timezone
export const getTodayEST = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
};

// Result type for daily game creation
export type CreateDailyGameResult =
  | {
      success: true;
      data: {
        dailyGame: DailyGame;
        topxGame: TopXGame;
        gameData: TopXGameData;
      };
    }
  | {
      success: false;
      error: string;
      statusCode: number;
    };

/**
 * Creates a daily game for a specific date by selecting a random TopX game
 * @param targetDate - The date in EST timezone (YYYY-MM-DD format). If not provided, uses today.
 * @param gameId - Optional specific game ID to use instead of random selection
 * @returns Promise<CreateDailyGameResult>
 */
export const createDailyGame = async (
  targetDate?: string,
  gameId?: string
): Promise<CreateDailyGameResult> => {
  try {
    const day = targetDate || getTodayEST();

    // Check if a daily game already exists for this date
    const { data: existingDailyGame, error: existingError } = await supabase
      .from('daily_games')
      .select('*')
      .eq('day', day)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking for existing daily game:', existingError);
      return {
        success: false,
        error: 'Failed to check for existing daily game',
        statusCode: 500,
      };
    }

    if (existingDailyGame) {
      return {
        success: false,
        error: `Daily game already exists for ${day}`,
        statusCode: 409,
      };
    }

    let selectedGame: TopXGame;

    if (gameId) {
      // Use specific game ID
      const { data: specificGame, error: specificError } = await supabase
        .from('topx_games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (specificError || !specificGame) {
        console.error('Error fetching specific game:', specificError);
        return {
          success: false,
          error: 'Specified game not found',
          statusCode: 404,
        };
      }

      selectedGame = specificGame;
    } else {
      // Select a random game
      const { count, error: countError } = await supabase
        .from('topx_games')
        .select('*', { count: 'exact', head: true });

      if (countError || !count || count === 0) {
        console.error('Error getting game count or no games available:', countError);
        return {
          success: false,
          error: 'No TopX games available to assign',
          statusCode: 404,
        };
      }

      const randomOffset = Math.floor(Math.random() * count);

      const { data: randomGames, error: randomError } = await supabase
        .from('topx_games')
        .select('*')
        .range(randomOffset, randomOffset)
        .limit(1);

      if (randomError || !randomGames || randomGames.length === 0) {
        console.error('Error fetching random game:', randomError);
        return {
          success: false,
          error: 'Failed to select random game',
          statusCode: 500,
        };
      }

      selectedGame = randomGames[0];
    }

    // Create daily game entry
    const { data: dailyGame, error: dailyGameError } = await supabase
      .from('daily_games')
      .insert({
        day,
        topx_game_id: selectedGame.id,
      })
      .select()
      .single();

    if (dailyGameError) {
      console.error('Error creating daily game:', dailyGameError);
      return {
        success: false,
        error: 'Failed to create daily game entry',
        statusCode: 500,
      };
    }

    const gameData = convertGameToApiFormat(selectedGame);

    return {
      success: true,
      data: {
        dailyGame,
        topxGame: selectedGame,
        gameData,
      },
    };
  } catch (error) {
    console.error('Unexpected error in createDailyGame:', error);
    return {
      success: false,
      error: 'Internal server error',
      statusCode: 500,
    };
  }
};

/**
 * Gets or creates today's daily game
 * @returns Promise<CreateDailyGameResult>
 */
export const getOrCreateTodaysDailyGame = async (): Promise<CreateDailyGameResult> => {
  try {
    // First try to get today's game using the database function
    const { data: result, error } = await supabase.rpc('get_todays_daily_game');

    if (error) {
      console.error("Error fetching today's daily game:", error);
      return {
        success: false,
        error: "Failed to fetch today's daily game",
        statusCode: 500,
      };
    }

    if (result && result.length > 0) {
      // Daily game exists, return it
      const dailyGameData = result[0];
      const gameData = dailyGameData.game_data;
      const topxGame = convertGameToApiFormat(gameData);

      return {
        success: true,
        data: {
          dailyGame: {
            id: dailyGameData.id,
            day: dailyGameData.day,
            topx_game_id: gameData.id,
            created_at: dailyGameData.created_at,
            updated_at: dailyGameData.updated_at,
          },
          topxGame: gameData,
          gameData: topxGame,
        },
      };
    }

    // No daily game found, create one
    return await createDailyGame();
  } catch (error) {
    console.error('Unexpected error in getOrCreateTodaysDailyGame:', error);
    return {
      success: false,
      error: 'Internal server error',
      statusCode: 500,
    };
  }
};
