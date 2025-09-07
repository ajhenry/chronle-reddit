import { supabase } from '../../shared/supabase-server';
import { Database } from '../../shared/types/supabase';
import { getTodayEST } from '../lib/time';

export interface DailyGame {
  id: string;
  day: string;
  topxGameId: string | null;
  letteredGameId: string | null;
  createdAt: string;
  updatedAt: string;
}

const convertGame = (game: Database['public']['Tables']['daily_games']['Row']): DailyGame => {
  return {
    id: game.id,
    day: game.day,
    topxGameId: game.topx_game_id,
    letteredGameId: game.lettered_game_id,
    createdAt: game.created_at,
    updatedAt: game.updated_at,
  };
};

const createDailyGame = async (): Promise<DailyGame> => {
  const { data, error } = await supabase
    .from('daily_games')
    .insert({
      day: getTodayEST(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create daily game:', { error });
    throw new Error(`Failed to create daily game: ${error.message}`, { cause: error });
  }

  return convertGame(data as Database['public']['Tables']['daily_games']['Row']);
};

// Fetches today's game from the database, creates it if it doesn't exist
export const getOrCreateTodaysGame = async (): Promise<DailyGame> => {
  const today = getTodayEST();
  const { data, error } = await supabase.from('daily_games').select('*').eq('day', today).single();

  // If the daily game doesn't exist, create it
  if (!data && error.message.includes('PGRST116')) {
    return await createDailyGame();
  }

  if (error) {
    console.error('Failed to get todays game:', { today, error, code: error.code });
    throw new Error(`Failed to get today's game: ${error.message}`, { cause: error });
  }

  return convertGame(data);
};

export const updateDailyGame = async (game: DailyGame): Promise<DailyGame> => {
  const { data, error } = await supabase
    .from('daily_games')
    .update({
      topx_game_id: game.topxGameId,
      lettered_game_id: game.letteredGameId,
    })
    .eq('id', game.id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update daily game:', { error });
    throw new Error(`Failed to update daily game: ${error.message}`, { cause: error });
  }

  return convertGame(data);
};
