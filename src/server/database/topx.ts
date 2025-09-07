import { supabase } from '../../shared/supabase-server';
import { Database } from '../../shared/types/supabase';

export interface TopXGame {
  id: string;
  prompt: string;
  solution: string[];
}

export type TopXGameData = TopXGame & {
  category: string;
  count: number;
  suggestions: string[];
};

const convertTopXGame = (game: Database['public']['Tables']['topx_games']['Row']): TopXGame => {
  return {
    id: game.id,
    prompt: game.prompt,
    solution: game.solution,
  };
};

export const createTopXGame = async (data: TopXGameData): Promise<TopXGame> => {
  const { data: topxGame, error } = await supabase
    .from('topx_games')
    .insert({
      prompt: data.prompt,
      solution: data.solution,
      category: data.category,
      count: data.count,
      suggestions: data.suggestions,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create topx game:', { error });
    throw new Error(`Failed to create topx game: ${error.message}`, { cause: error });
  }

  return convertTopXGame(topxGame);
};

// Randomly selects a topx game
export const findRandomTopXGame = async (): Promise<TopXGame> => {
  // Find the count of topx games
  const { count, error: countError } = await supabase
    .from('topx_games')
    .select('*', { count: 'exact', head: true });

  console.log('countData', count);

  if (countError || !count) {
    console.error('Failed to find topx game count:', { error: countError });
    throw new Error(`Failed to find topx game count: ${countError?.message}`, {
      cause: countError,
    });
  }

  if (count === 0) {
    console.error('No topx games found');
    throw new Error('No topx games found');
  }
  const randomOffset = Math.floor(Math.random() * count);
  const { data: topxGame, error } = await supabase
    .from('topx_games')
    .select('*')
    .limit(1)
    .range(randomOffset, randomOffset)
    .single();

  if (error) {
    console.error('Failed to find topx game:', { error });
    throw new Error(`Failed to find topx game: ${error.message}`, { cause: error });
  }

  return convertTopXGame(topxGame);
};

export const findTopXGameById = async (id: string): Promise<TopXGame> => {
  const { data, error } = await supabase.from('topx_games').select('*').eq('id', id).single();
  if (error) {
    console.error('Failed to find topx game:', { error });
    throw new Error(`Failed to find topx game: ${error.message}`, { cause: error });
  }
  return convertTopXGame(data);
};
