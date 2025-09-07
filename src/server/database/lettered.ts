import { Database } from '../../shared/types/supabase';
import { supabase } from '../../shared/supabase-server';
import { GridCell, GridPosition, LetterPiece } from '../../shared/types/api';
import { DEFAULT_INITIAL_SCORE } from '../../shared/score-decay';
import { getTodayEST } from '../lib/time';
import { getOrCreateTodaysGame } from './game';

export interface LetteredGame {
  id: string;
  category: string;
  phrase: string;
  grid: GridCell[][];
  rows: number;
  cols: number;
  pieces: LetterPiece[];
  initialPiecePositions: Record<string, GridPosition>;
  solution: Record<string, GridPosition>;
  solutionHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface LetteredSession {
  id: string;
  userId: string;
  dailyGameId: string;
  startedAt: string;
  completedAt: string | null;
  initialScore: number;
  finalScore: number;
  isCompleted: boolean;
}

export interface LetteredSubmission {
  id: string;
  gameSessionId: string;
  boardState: {
    grid: GridCell[][];
    placedPieces: Record<string, GridPosition>; // pieceId -> position
  };
  submittedAt: string;
  scoreAtSubmission: number;
}

const convertLetteredSubmission = (
  submission: Database['public']['Tables']['lettered_submissions']['Row']
): LetteredSubmission => {
  return {
    id: submission.id,
    gameSessionId: submission.game_session_id,
    boardState: submission.board_state as LetteredSubmission['boardState'],
    submittedAt: submission.submitted_at,
    scoreAtSubmission: submission.score_at_submission,
  };
};

const convertLetteredSession = (
  session: Database['public']['Tables']['lettered_sessions']['Row']
): LetteredSession => {
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

const convertLetteredGame = (
  game: Database['public']['Tables']['lettered_games']['Row']
): LetteredGame => {
  return {
    id: game.id,
    category: game.category,
    phrase: game.phrase,
    grid: game.grid as GridCell[][],
    rows: game.rows,
    cols: game.cols,
    pieces: game.pieces as LetterPiece[],
    initialPiecePositions: game.initial_piece_positions as Record<string, GridPosition>,
    solution: game.solution as Record<string, GridPosition>,
    solutionHash: game.solution_hash,
    createdAt: game.created_at,
    updatedAt: game.updated_at,
  };
};

export const createLetteredGame = async (game: LetteredGame): Promise<LetteredGame> => {
  const { data, error } = await supabase
    .from('lettered_games')
    .insert({
      category: game.category,
      phrase: game.phrase,
      grid: game.grid,
      rows: game.rows,
      cols: game.cols,
      pieces: game.pieces,
      initial_piece_positions: game.initialPiecePositions,
      solution: game.solution,
      solution_hash: game.solutionHash,
    })
    .select()
    .single();
  if (error) {
    console.error('Failed to create lettered game:', { error });
    throw new Error(`Failed to create lettered game: ${error.message}`, { cause: error });
  }
  return convertLetteredGame(data);
};

export const findLetteredGameById = async (id: string): Promise<LetteredGame> => {
  const { data, error } = await supabase.from('lettered_games').select('*').eq('id', id).single();
  if (error) {
    console.error('Failed to find lettered game:', { error });
    throw new Error(`Failed to find lettered game: ${error.message}`, { cause: error });
  }
  return convertLetteredGame(data);
};

export const findRandomLetteredGame = async (): Promise<LetteredGame> => {
  // Find the count of lettered games
  const { count, error: countError } = await supabase
    .from('lettered_games')
    .select('count', { count: 'exact', head: true });

  if (countError || !count) {
    console.error('Failed to find lettered game count:', { error: countError });
    throw new Error(`Failed to find lettered game count: ${countError?.message}`, {
      cause: countError,
    });
  }

  if (count === 0) {
    console.error('No lettered games found');
    throw new Error('No lettered games found');
  }
  const randomOffset = Math.floor(Math.random() * count);

  const { data, error } = await supabase
    .from('lettered_games')
    .select('*')
    .limit(1)
    .range(randomOffset, randomOffset)
    .single();
  if (error) {
    console.error('Failed to find random lettered game:', { error });
    throw new Error(`Failed to find random lettered game: ${error.message}`, { cause: error });
  }
  return convertLetteredGame(data);
};

export const getTodaysLetteredGame = async (): Promise<LetteredGame> => {
  const { data, error } = await supabase
    .from('daily_games')
    .select('*, lettered_games!inner(*)')
    .eq('day', getTodayEST())
    .single();

  if (error) {
    console.error('Failed to find todays lettered game:', { error });
    throw new Error(`Failed to find todays lettered game: ${error.message}`, { cause: error });
  }

  return convertLetteredGame(data.lettered_games);
};

export const getOrCreateLetteredSessionForToday = async (
  userId: string
): Promise<LetteredSession> => {
  const dailyGame = await getOrCreateTodaysGame();

  const { data, error } = await supabase
    .from('lettered_sessions')
    .select('*')
    .eq('daily_game_id', dailyGame.id)
    .single();

  if (!data && error.message.includes('PGRST116')) {
    return await createLetteredSession(userId);
  }

  if (error) {
    console.error('Failed to find todays lettered session:', { error });
    throw new Error(`Failed to find todays lettered session: ${error.message}`, { cause: error });
  }

  return convertLetteredSession(data);
};

export const getLatestLetteredSubmissionForToday = async (
  userId: string
): Promise<LetteredSubmission | null> => {
  const letteredSession = await getOrCreateLetteredSessionForToday(userId);

  const { data, error } = await supabase
    .from('lettered_submissions')
    .select('*')
    .eq('game_session_id', letteredSession.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Failed to find latest lettered submission:', { error });
    throw new Error(`Failed to find latest lettered submission: ${error.message}`, {
      cause: error,
    });
  }

  if (data.length === 0) {
    return null;
  }

  return convertLetteredSubmission(data[0]!);
};

export const getLetteredSubmissionsForToday = async (
  userId: string
): Promise<LetteredSubmission[]> => {
  const letteredSession = await getOrCreateLetteredSessionForToday(userId);

  const { data, error } = await supabase
    .from('lettered_submissions')
    .select('*')
    .eq('game_session_id', letteredSession.id)
    .order('submitted_at', { ascending: true });

  if (error) {
    console.error('Failed to find lettered submissions:', { error });
    throw new Error(`Failed to find lettered submissions: ${error.message}`, { cause: error });
  }

  return data.map(convertLetteredSubmission);
};

export const getOrCreateUserLetteredSessionForToday = async (
  userId: string
): Promise<LetteredSession> => {
  const dailyGame = await getOrCreateTodaysGame();

  const { data, error } = await supabase
    .from('lettered_sessions')
    .select('*')
    .eq('daily_game_id', dailyGame.id)
    .single();

  if (!data && error.message.includes('PGRST116')) {
    return await createLetteredSession(userId);
  }

  if (error) {
    console.error('Failed to find todays lettered session:', { error });
    throw new Error(`Failed to find todays lettered session: ${error.message}`, { cause: error });
  }

  return convertLetteredSession(data);
};

export const createLetteredSession = async (userId: string): Promise<LetteredSession> => {
  const dailyGame = await getOrCreateTodaysGame();

  const { data, error } = await supabase
    .from('lettered_sessions')
    .insert({
      initial_score: DEFAULT_INITIAL_SCORE,
      user_id: userId,
      daily_game_id: dailyGame.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create lettered session:', { error });
    throw new Error(`Failed to create lettered session: ${error.message}`, { cause: error });
  }

  return convertLetteredSession(data);
};

export const updateLetteredSession = async (
  sessionId: string,
  updates: Partial<Pick<LetteredSession, 'completedAt' | 'finalScore' | 'isCompleted'>>
): Promise<LetteredSession> => {
  const updateData: Database['public']['Tables']['lettered_sessions']['Update'] = {};

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
    .from('lettered_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update lettered session:', { error });
    throw new Error(`Failed to update lettered session: ${error.message}`, { cause: error });
  }

  return convertLetteredSession(data);
};

export const findLetteredSessionById = async (sessionId: string): Promise<LetteredSession> => {
  const { data, error } = await supabase
    .from('lettered_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Failed to find lettered session:', { error });
    throw new Error(`Failed to find lettered session: ${error.message}`, { cause: error });
  }

  return convertLetteredSession(data);
};

export const createLetteredSubmission = async (
  submission: Pick<LetteredSubmission, 'gameSessionId' | 'boardState' | 'scoreAtSubmission'>
): Promise<LetteredSubmission> => {
  const { data, error } = await supabase
    .from('lettered_submissions')
    .insert({
      game_session_id: submission.gameSessionId,
      board_state: submission.boardState,
      score_at_submission: submission.scoreAtSubmission,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create lettered submission:', { error });
    throw new Error(`Failed to create lettered submission: ${error.message}`, { cause: error });
  }

  return convertLetteredSubmission(data);
};

export const getTotalLetteredSubmissionsForToday = async (userId: string): Promise<number> => {
  const session = await getOrCreateUserLetteredSessionForToday(userId);

  const { count, error } = await supabase
    .from('lettered_submissions')
    .select('count', { count: 'exact', head: true })
    .eq('game_session_id', session.id);

  if (error) {
    console.error('Failed to find total lettered submissions:', { error });
    throw new Error(`Failed to find total lettered submissions: ${error.message}`, {
      cause: error,
    });
  }

  return count ?? 0;
};
