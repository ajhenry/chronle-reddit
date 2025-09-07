import { supabase } from '../../shared/supabase-server';
import { Database } from '../../shared/types/supabase';
import { getTodayEST } from '../lib/time';

export interface TopXSession {
  id: string;
  userId: string;
  dailyGameId: string;
  startedAt: string;
  completedAt: string | null;
  initialScore: number;
  finalScore: number;
  isCompleted: boolean;
}

const convertTopXSession = (session: Database['public']['Tables']['topx_sessions']['Row']): TopXSession => {
  return {
    id: session.id,
    userId: session.user_id,
    dailyGameId: session.daily_game_id,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    initialScore: session.initial_score,
    finalScore: session.final_score,
    isCompleted: session.is_completed,
  };
};

export const getUserTopXSessionForToday = async (userId: string): Promise<TopXSession | null> => {
  const { data, error } = await supabase
    .from('topx_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('daily_game_id', (
      await supabase
        .from('daily_games')
        .select('id')
        .eq('day', getTodayEST())
        .single()
    ).data?.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No session found for today
      return null;
    }
    console.error('Failed to find todays topx session:', { error });
    throw new Error(`Failed to find todays topx session: ${error.message}`, { cause: error });
  }

  return convertTopXSession(data);
};

export const createTopXSession = async (userId: string, dailyGameId: string): Promise<TopXSession> => {
  const { data, error } = await supabase
    .from('topx_sessions')
    .insert({
      user_id: userId,
      daily_game_id: dailyGameId,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create topx session:', { error });
    throw new Error(`Failed to create topx session: ${error.message}`, { cause: error });
  }

  return convertTopXSession(data);
};

export const updateTopXSession = async (
  sessionId: string,
  updates: Partial<Pick<TopXSession, 'completedAt' | 'finalScore' | 'isCompleted'>>
): Promise<TopXSession> => {
  const updateData: Database['public']['Tables']['topx_sessions']['Update'] = {};

  if (updates.completedAt !== undefined) {
    updateData.completed_at = updates.completedAt;
  }
  if (updates.finalScore !== undefined) {
    updateData.final_score = updates.finalScore;
  }
  if (updates.isCompleted !== undefined) {
    updateData.is_completed = updates.isCompleted;
  }

  const { data, error } = await supabase
    .from('topx_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update topx session:', { error });
    throw new Error(`Failed to update topx session: ${error.message}`, { cause: error });
  }

  return convertTopXSession(data);
};

export const findTopXSessionById = async (sessionId: string): Promise<TopXSession> => {
  const { data, error } = await supabase
    .from('topx_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Failed to find topx session:', { error });
    throw new Error(`Failed to find topx session: ${error.message}`, { cause: error });
  }

  return convertTopXSession(data);
};
