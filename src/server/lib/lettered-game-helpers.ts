import { supabase } from '../../shared/supabase-server';
import type { LetteredGameData } from '../../shared/types/api';

/**
 * Gets or creates today's daily lettered game
 */
export async function getOrCreateTodaysLetteredGame(): Promise<{
  success: boolean;
  data?: { dailyGame: any; gameData: LetteredGameData };
  error?: string;
  statusCode?: number;
}> {
  try {
    // First try to get today's game
    const { data: existingGame, error: fetchError } = await supabase.rpc(
      'get_todays_lettered_daily_game'
    );

    if (fetchError) {
      console.error("Error fetching today's lettered game:", fetchError);
      return { success: false, error: "Failed to fetch today's game", statusCode: 500 };
    }

    if (existingGame && existingGame.length > 0) {
      // Game already exists for today
      const dailyGame = existingGame[0];
      const gameData = dailyGame.game_data as LetteredGameData;

      return {
        success: true,
        data: { dailyGame, gameData },
      };
    }

    // No game exists for today, create one
    console.log('No lettered game found for today, creating one...');

    // Get a random lettered game from the database
    const { data: randomGame, error: randomError } = await supabase
      .from('lettered_games')
      .select('*')
      .limit(1)
      .single();

    if (randomError || !randomGame) {
      console.error('Error fetching random lettered game:', randomError);
      return { success: false, error: 'No lettered games available', statusCode: 404 };
    }

    // Calculate today's date in EST
    const today = new Date();
    const estDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const dayString = estDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Create the daily game entry
    const { data: dailyGame, error: createError } = await supabase
      .from('daily_games')
      .insert({
        day: dayString,
        lettered_game_id: randomGame.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating daily lettered game:', createError);
      return { success: false, error: 'Failed to create daily game', statusCode: 500 };
    }

    // Return the created game data
    const gameData: LetteredGameData = {
      id: randomGame.id,
      category: randomGame.category,
      phrase: randomGame.phrase,
      grid: randomGame.grid,
      pieces: randomGame.pieces,
      solution: randomGame.solution,
      created_at: randomGame.created_at,
      updated_at: randomGame.updated_at,
    };

    return {
      success: true,
      data: { dailyGame, gameData },
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
    // Get the game data
    const { data: game, error: gameError } = await supabase
      .from('lettered_games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return { valid: false, error: 'Game not found' };
    }

    // Find the piece
    const piece = game.pieces.find((p: any) => p.id === pieceId);
    if (!piece) {
      return { valid: false, error: 'Piece not found' };
    }

    // Basic validation logic (simplified - you might want to implement more complex validation)
    const grid = game.grid;
    const solution = game.solution;

    // Check if position is valid on the grid
    for (const shapePos of piece.shape) {
      const gridRow = position.row + shapePos.row;
      const gridCol = position.col + shapePos.col;

      if (gridRow < 0 || gridRow >= 8 || gridCol < 0 || gridCol >= 8) {
        return { valid: false, error: 'Piece placement is out of bounds' };
      }

      const cell = grid[gridRow][gridCol];
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
