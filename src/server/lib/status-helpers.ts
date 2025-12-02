import { getTodayEST } from './time';
import { getOrCreateTodaysGame, updateDailyGame } from '../database/game';
import { getOrCreateTodaysLetteredGame } from './lettered-game-helpers';

/**
 * Result type for status check
 */
export type StatusCheckResult =
  | {
      success: true;
      day: string;
    }
  | {
      success: false;
      error: string;
      statusCode: number;
    };

/**
 * Checks if games exist for today and creates them if they don't
 * @returns Promise<StatusCheckResult>
 */
export const checkAndCreateTodaysGames = async (): Promise<StatusCheckResult> => {
  console.log('Checking and creating todays games', { today: getTodayEST() });
  try {
    let dailyGame = await getOrCreateTodaysGame();

    const hasLetteredGame = dailyGame.letteredGameId !== null;

    if (!hasLetteredGame) {
      console.log('Creating Lettered game for today...');
      const letteredResult = await getOrCreateTodaysLetteredGame();
      
      if (!letteredResult.success || !letteredResult.data) {
        return {
          success: false,
          error: letteredResult.error || 'Failed to create lettered game',
          statusCode: letteredResult.statusCode || 500,
        };
      }
      
      dailyGame.letteredGameId = letteredResult.data.dailyGame.letteredGameId;
      console.log('Updating daily game for today', { day: dailyGame.day });
      dailyGame = await updateDailyGame(dailyGame);
    } else {
      console.log('Daily game exists for today', { day: dailyGame.day });
    }

    return {
      success: true,
      day: dailyGame.day,
    };
  } catch (error) {
    console.error('Unexpected error in checkAndCreateTodaysGames:', error);
    return {
      success: false,
      error: 'Internal server error',
      statusCode: 500,
    };
  }
};
