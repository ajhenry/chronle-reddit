import { getTodayEST } from './time';
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
    const today = getTodayEST();
    
    // Create or get today's lettered game (uses ISO date as game ID)
    console.log('Creating/fetching Lettered game for today...');
    const letteredGame = await getOrCreateTodaysLetteredGame();
    
    console.log('Lettered game ready for today:', { gameId: letteredGame.id, day: today });

    return {
      success: true,
      day: today,
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
