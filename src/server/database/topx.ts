import { DEFAULT_INITIAL_SCORE } from '../../shared/score-decay';
import { supabase } from '../../shared/supabase-server';
import { TopXGame, TopXSubmission } from '../../shared/types/api';
import { Database } from '../../shared/types/supabase';
import { generateSolutionHashMap, generateCorrectSolutionMap } from '../../shared/utils';
import { getOrCreateTodaysGame, updateDailyGame } from './game';

// Update in shared/types/api.ts if you change this
export interface TopXSession {
  id: string;
  userId: string;
  dailyGameId: string;
  startedAt: string;
  completedAt: string | null;
  initialScore: number;
  finalScore: number;
  isCompleted: boolean;
  attemptsLeft: number;
  submissions: TopXSubmission[];
  correctSolutionMap?: (string | null)[]; // Array where index is position-1, value is correct answer or null
  incorrectAnswers?: string[]; // Array of answers that were submitted but are incorrect
}

const convertTopXSubmission = (
  submission: Database['public']['Tables']['topx_submissions']['Row']
): TopXSubmission => {
  const result: TopXSubmission = {
    id: submission.id,
    gameSessionId: submission.game_session_id,
    answer: submission.answer,
    submittedAt: submission.submitted_at,
    isCorrect: submission.is_correct,
    scoreAtSubmission: submission.score_at_submission,
  };

  if (submission.position !== null && submission.position !== undefined) {
    result.position = submission.position;
  }

  return result;
};

const convertTopXSession = (
  session: Database['public']['Tables']['topx_sessions']['Row'],
  submissions: TopXSubmission[],
  solution?: string[]
): TopXSession => {
  const result: TopXSession = {
    id: session.id,
    userId: session.user_id,
    dailyGameId: session.daily_game_id,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    initialScore: session.initial_score,
    finalScore: session.final_score,
    isCompleted: session.is_completed,
    attemptsLeft: session.attempts_left,
    submissions,
  };

  if (solution) {
    // Get only correct submissions with positions
    const correctSubmissions = submissions
      .filter((s) => s.isCorrect && s.position)
      .map((s) => ({ answer: s.answer, position: s.position! }));

    result.correctSolutionMap = generateCorrectSolutionMap(solution, correctSubmissions);

    // Build set of correct answers for determining incorrect ones
    const correctAnswers = new Set(solution.map((s) => s.toLowerCase().trim()));

    // Find all unique incorrect answers
    const incorrectAnswersSet = new Set<string>();
    for (const submission of submissions) {
      const normalizedAnswer = submission.answer.toLowerCase().trim();
      if (!correctAnswers.has(normalizedAnswer)) {
        incorrectAnswersSet.add(submission.answer);
      }
    }

    result.incorrectAnswers = Array.from(incorrectAnswersSet);
  }

  return result;
};

const convertTopXGame = (game: Database['public']['Tables']['topx_games']['Row']): TopXGame => {
  return {
    id: game.id,
    prompt: game.prompt,
    solution: game.solution,
    category: game.category,
    count: game.count,
    maxAttempts: game.max_attempts,
    suggestions: game.suggestions,
    solutionHash: game.solution_hash as Record<string, boolean>,
    createdAt: game.created_at,
    updatedAt: game.updated_at,
  };
};

export const createTopXGame = async (data: TopXGame): Promise<TopXGame> => {
  if (!data.solution) {
    throw new Error('Solution is required to create a TopX game');
  }

  // Generate solution hash map for secure validation
  const solutionHash = await generateSolutionHashMap(data.solution);

  const { data: topxGame, error } = await supabase
    .from('topx_games')
    .insert({
      prompt: data.prompt,
      solution: data.solution,
      category: data.category,
      count: data.count,
      max_attempts: data.maxAttempts,
      suggestions: data.suggestions,
      solution_hash: solutionHash,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
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

export const getTodaysTopXGame = async (): Promise<TopXGame> => {
  const dailyGame = await getOrCreateTodaysGame();

  let topxGameId = dailyGame.topxGameId;

  if (!topxGameId) {
    console.warn('No topx game id found for today, assigning one');
    const topxGame = await findRandomTopXGame();
    dailyGame.topxGameId = topxGame.id;
    const updatedDailyGame = await updateDailyGame(dailyGame);
    topxGameId = updatedDailyGame.topxGameId;

    if (!topxGameId) {
      console.error('Failed to assign topx game for today');
      throw new Error('Failed to assign topx game for today');
    }
  }

  const { data, error } = await supabase
    .from('topx_games')
    .select('*')
    .eq('id', topxGameId)
    .single();

  if (error) {
    console.error('Failed to find topx game for today:', { error });
    throw new Error(`Failed to find topx game for today: ${error.message}`, { cause: error });
  }

  return convertTopXGame(data);
};

export const getOrCreateTodaysTopXSession = async (userId: string): Promise<TopXSession> => {
  console.log('getOrCreateTodaysTopXSession', userId);
  const dailyGame = await getOrCreateTodaysGame();

  const { data, error } = await supabase
    .from('topx_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('daily_game_id', dailyGame.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('PGRST116')) {
      console.log('No session found for today, creating one');
      // Get today's game to determine max attempts
      const todaysGame = await getTodaysTopXGame();
      // No session found for today
      return await createTopXSession(userId, dailyGame.id, todaysGame.maxAttempts);
    }
    console.error('Failed to find todays topx session:', { error });
    throw new Error(`Failed to find todays topx session: ${error.message}`, { cause: error });
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from('topx_submissions')
    .select('*')
    .eq('game_session_id', data.id);

  if (submissionsError) {
    console.error('Failed to find topx submissions:', { error: submissionsError });
    throw new Error(`Failed to find topx submissions: ${submissionsError.message}`, {
      cause: submissionsError,
    });
  }

  const todaysGame = await getTodaysTopXGame();
  return convertTopXSession(data, submissions.map(convertTopXSubmission), todaysGame.solution);
};

export const createTopXSession = async (
  userId: string,
  dailyGameId: string,
  maxAttempts: number = 5
): Promise<TopXSession> => {
  const { data, error } = await supabase
    .from('topx_sessions')
    .insert({
      initial_score: DEFAULT_INITIAL_SCORE,
      attempts_left: maxAttempts,
      user_id: userId,
      daily_game_id: dailyGameId,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create topx session:', { error });
    throw new Error(`Failed to create topx session: ${error.message}`, { cause: error });
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from('topx_submissions')
    .select('*')
    .eq('game_session_id', data.id);

  if (submissionsError) {
    console.error('Failed to find topx submissions:', { error: submissionsError });
    throw new Error(`Failed to find topx submissions: ${submissionsError.message}`, {
      cause: submissionsError,
    });
  }

  const todaysGame = await getTodaysTopXGame();
  return convertTopXSession(data, submissions.map(convertTopXSubmission), todaysGame.solution);
};

export const updateTopXSession = async (
  sessionId: string,
  updates: Partial<Pick<TopXSession, 'completedAt' | 'finalScore' | 'isCompleted' | 'attemptsLeft'>>
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
  if (updates.attemptsLeft !== undefined) {
    updateData.attempts_left = updates.attemptsLeft;
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

  const { data: submissions, error: submissionsError } = await supabase
    .from('topx_submissions')
    .select('*')
    .eq('game_session_id', data.id);

  if (submissionsError) {
    console.error('Failed to find topx submissions:', { error: submissionsError });
    throw new Error(`Failed to find topx submissions: ${submissionsError.message}`, {
      cause: submissionsError,
    });
  }

  const todaysGame = await getTodaysTopXGame();
  return convertTopXSession(data, submissions.map(convertTopXSubmission), todaysGame.solution);
};

export const getUserTopXSessionForToday = async (userId: string): Promise<TopXSession> => {
  const dailyGame = await getOrCreateTodaysGame();

  const { data, error } = await supabase
    .from('topx_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('daily_game_id', dailyGame.id)
    .single();

  if (error) {
    console.error('Failed to find todays topx session:', { error });
    throw new Error(`Failed to find todays topx session: ${error.message}`, { cause: error });
  }

  const submissions = await getTopXSubmissionsForToday(userId);
  const todaysGame = await getTodaysTopXGame();

  return convertTopXSession(data, submissions, todaysGame.solution);
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

  const submissions = await getTopXSubmissionsForToday(data.user_id);

  // Get the game data for this session to provide solution context
  const { data: dailyGameData, error: dailyGameError } = await supabase
    .from('daily_games')
    .select('topx_game_id')
    .eq('id', data.daily_game_id)
    .single();

  let solution: string[] | undefined;
  if (!dailyGameError && dailyGameData?.topx_game_id) {
    const gameData = await findTopXGameById(dailyGameData.topx_game_id);
    solution = gameData.solution;
  }

  return convertTopXSession(data, submissions, solution);
};

export const getTopXSubmissionsForToday = async (userId: string): Promise<TopXSubmission[]> => {
  const topxSession = await getOrCreateTodaysTopXSession(userId);

  const { data, error } = await supabase
    .from('topx_submissions')
    .select('*')
    .eq('game_session_id', topxSession.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to find topx submissions:', { error });
    throw new Error(`Failed to find topx submissions: ${error.message}`, { cause: error });
  }

  return data.map(convertTopXSubmission);
};

export const getTopXSubmissionCountForToday = async (userId: string): Promise<number> => {
  const topxSession = await getOrCreateTodaysTopXSession(userId);

  const { count, error } = await supabase
    .from('topx_submissions')
    .select('count', { count: 'exact', head: true })
    .eq('game_session_id', topxSession.id);

  if (error) {
    console.error('Failed to find topx submissions:', { error });
    throw new Error(`Failed to find topx submissions: ${error.message}`, { cause: error });
  }

  return count ?? 0;
};

export const getIncorrectTopXSubmissionCountForToday = async (userId: string): Promise<number> => {
  const topxSession = await getOrCreateTodaysTopXSession(userId);

  console.log('topxSession', topxSession);

  const { count, error } = await supabase
    .from('topx_submissions')
    .select('count', { count: 'exact', head: true })
    .eq('game_session_id', topxSession.id)
    .eq('is_correct', false);

  if (error) {
    console.error('Failed to find incorrect topx submissions:', { error });
    throw new Error(`Failed to find incorrect topx submissions: ${error.message}`, {
      cause: error,
    });
  }

  console.log('count', count);

  return count ?? 0;
};

export const getCorrectTopXSubmissionCountForToday = async (userId: string): Promise<number> => {
  const topxSession = await getOrCreateTodaysTopXSession(userId);

  const { count, error } = await supabase
    .from('topx_submissions')
    .select('count', { count: 'exact', head: true })
    .eq('game_session_id', topxSession.id)
    .eq('is_correct', true);

  if (error) {
    console.error('Failed to find correct topx submissions:', { error });
    throw new Error(`Failed to find correct topx submissions: ${error.message}`, {
      cause: error,
    });
  }

  return count ?? 0;
};

export const checkTopXSubmissionExists = async (
  gameSessionId: string,
  answer: string
): Promise<boolean> => {
  const { count, error } = await supabase
    .from('topx_submissions')
    .select('count', { count: 'exact', head: true })
    .eq('game_session_id', gameSessionId)
    .eq('answer', answer.trim().toLowerCase());

  if (error) {
    console.error('Failed to check topx submission exists:', { error });
    throw new Error(`Failed to check topx submission exists: ${error.message}`, { cause: error });
  }

  return (count ?? 0) > 0;
};

export const createTopXSubmission = async (
  submission: Omit<TopXSubmission, 'id'>
): Promise<TopXSubmission> => {
  const { data, error } = await supabase
    .from('topx_submissions')
    .insert({
      game_session_id: submission.gameSessionId,
      answer: submission.answer,
      is_correct: submission.isCorrect,
      score_at_submission: submission.scoreAtSubmission,
      submitted_at: submission.submittedAt,
      position: submission.position || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create topx submission:', { error });
    throw new Error(`Failed to create topx submission: ${error.message}`, { cause: error });
  }

  return convertTopXSubmission(data);
};
