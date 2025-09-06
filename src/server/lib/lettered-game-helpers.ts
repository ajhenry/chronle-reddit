import { supabase } from '../../shared/supabase-server';
import type { LetteredGameData, LetterPiece } from '../../shared/types/api';
import type { DailyGame } from '../../shared/types/supabase';
import { generateMockGame } from './lettered-game-generator';

/**
 * Gets or creates today's daily lettered game
 */
export async function getOrCreateTodaysLetteredGame(): Promise<{
  success: boolean;
  data?: { dailyGame: DailyGame; gameData: LetteredGameData };
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

    // if (existingGame && existingGame.length > 0) {
    //   console.log('Lettered game found for today:', { existingGame: existingGame[0] });
    //   // Game already exists for today
    //   const dailyGame = existingGame[0];
    //   const gameData = dailyGame.game_data as LetteredGameData;

    //   return {
    //     success: true,
    //     data: { dailyGame, gameData },
    //   };
    // }

    // No game exists for today, create one
    console.log('No lettered game found for today, creating one...');

    // Generate a new game using the server-side generator
    // For now, we'll use a fixed phrase and category - in production this could be randomized
    const gameData = generateMockGame('movies', 'A CHRISTMAS STORY', 123);

    // Remove all sessions for the game if they exist
    await supabase.from('game_sessions').delete();
    await supabase.from('lettered_sessions').delete();
    await supabase.from('lettered_games').delete();

    // Insert the generated game into the database
    const { data: insertedGame, error: insertError } = await supabase
      .from('lettered_games')
      .insert({
        category: gameData.category,
        phrase: gameData.phrase,
        grid: gameData.grid,
        rows: gameData.rows,
        cols: gameData.cols,
        pieces: gameData.pieces,
        solution: gameData.solution,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting generated lettered game:', insertError);
      return { success: false, error: 'Failed to create lettered game', statusCode: 500 };
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
        lettered_game_id: insertedGame.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating daily lettered game:', createError);
      return { success: false, error: 'Failed to create daily game', statusCode: 500 };
    }

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
