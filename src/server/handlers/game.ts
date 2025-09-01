import { Router } from 'express';
import {
  TopXDailyGameResponse,
  TopXSubmissionResponse,
  TopXGameCompleteResponse,
} from '../../shared/types/api';
import { supabase } from '../../shared/supabase-server';
import { getOrCreateTodaysDailyGame } from '../lib/daily-game-helpers';
import { recordLeaderboardEntry } from '../lib/leaderboard-helpers';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';

const router = Router();

// GET /api/topx/game - Returns the current day's game or results of the game
router.get('/api/topx/game', async (_req, res): Promise<void> => {
  console.log('GET /api/topx/game');
  try {
    const userId = await ensureUserExistsAndGetId();
    console.log('userId', { userId });

    // Get or create today's daily game using the helper
    const result = await getOrCreateTodaysDailyGame();

    if (!result.success) {
      res.status(result.statusCode).json({
        status: 'error',
        message: result.error,
      });
      return;
    }

    const { dailyGame, gameData } = result.data;

    let sessionData: {
      id: string;
      startedAt: string;
      currentScore: number;
      initialScore: number;
      isCompleted: boolean;
      submissions: Array<{
        answer: string;
        submittedAt: string;
        isCorrect: boolean;
        position?: number;
        scoreAtSubmission: number;
      }>;
    } | null = null;

    // If user is authenticated, get or create their game session
    if (userId) {
      // First try to get existing session
      const { data: existingSession } = await supabase
        .from('game_sessions')
        .select(
          `
          id,
          started_at,
          completed_at,
          initial_score,
          final_score,
          is_completed,
          topx_submissions(
            answer,
            submitted_at,
            is_correct,
            position,
            score_at_submission
          )
        `
        )
        .eq('user_id', userId)
        .eq('daily_game_id', dailyGame.id)
        .single();

      if (existingSession) {
        // User has an existing session, calculate current score
        const gameStartTime = new Date(existingSession.started_at).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.max(0, (now - gameStartTime) / 1000);

        // Count incorrect submissions
        const incorrectCount = (existingSession.topx_submissions || []).filter(
          (sub: { is_correct: boolean }) => !sub.is_correct
        ).length;

        // Calculate current score using same algorithm as client
        const decayMultiplier = Math.pow(1.5, incorrectCount);
        const scoreDecay = Math.floor(elapsedSeconds * decayMultiplier);
        const currentScore = Math.max(0, existingSession.initial_score - scoreDecay);

        sessionData = {
          id: existingSession.id,
          startedAt: existingSession.started_at,
          currentScore: existingSession.is_completed ? existingSession.final_score : currentScore,
          initialScore: existingSession.initial_score,
          isCompleted: existingSession.is_completed,
          submissions: (existingSession.topx_submissions || []).map(
            (sub: {
              answer: string;
              submitted_at: string;
              is_correct: boolean;
              position?: number;
              score_at_submission: number;
            }) => {
              const result: {
                answer: string;
                submittedAt: string;
                isCorrect: boolean;
                position?: number;
                scoreAtSubmission: number;
              } = {
                answer: sub.answer,
                submittedAt: sub.submitted_at,
                isCorrect: sub.is_correct,
                scoreAtSubmission: sub.score_at_submission,
              };
              if (sub.position !== null && sub.position !== undefined) {
                result.position = sub.position;
              }
              return result;
            }
          ),
        };
      } else {
        // No existing session, create a new one
        const { data: newSession, error: createError } = await supabase
          .from('game_sessions')
          .insert({
            user_id: userId,
            daily_game_id: dailyGame.id,
            initial_score: 5000,
            final_score: 5000,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating game session:', createError);
          // Continue without session data
        } else {
          sessionData = {
            id: newSession.id,
            startedAt: newSession.started_at,
            currentScore: 5000,
            initialScore: 5000,
            isCompleted: false,
            submissions: [],
          };
        }
      }
    }

    const response: TopXDailyGameResponse = {
      type: 'topx_daily_game',
      dailyGameId: dailyGame.id,
      game: gameData,
      day: dailyGame.day,
      ...(sessionData && { session: sessionData }),
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/topx/game:', error);
    res.status(500).json({
      status: 'error',
      message: "Failed to fetch today's daily game",
    });
  }
});

// POST /api/topx/attempt - Saves a user's attempt along with the timestamp submitted
router.post('/api/topx/attempt', async (req, res): Promise<void> => {
  try {
    const { answer, timestamp } = req.body;
    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    if (!answer || !timestamp) {
      res.status(400).json({
        status: 'error',
        message: 'Answer and timestamp are required',
      });
      return;
    }

    // Get today's daily game
    const { data: dailyGameResult, error: dailyGameError } =
      await supabase.rpc('get_todays_daily_game');

    if (dailyGameError || !dailyGameResult || dailyGameResult.length === 0) {
      console.error("Error fetching today's daily game:", dailyGameError);
      res.status(404).json({
        status: 'error',
        message: 'No daily game available for today',
      });
      return;
    }

    const dailyGame = dailyGameResult[0];

    // Get existing game session (should already exist from game load)
    const { data: sessionData, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('daily_game_id', dailyGame.id)
      .single();

    if (sessionError || !sessionData) {
      console.error('Error fetching game session:', sessionError);
      res.status(404).json({
        status: 'error',
        message: 'Game session not found. Please reload the game.',
      });
      return;
    }

    const session = sessionData;

    if (session.is_completed) {
      res.status(400).json({
        status: 'error',
        message: 'Game session is already completed',
      });
      return;
    }

    // Calculate time-based score decay
    const gameStartTime = new Date(session.started_at).getTime();
    const submissionTime = timestamp;
    const elapsedSeconds = Math.max(0, (submissionTime - gameStartTime) / 1000);

    // Count incorrect submissions so far
    const { count: incorrectCount, error: countError } = await supabase
      .from('topx_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('game_session_id', session.id)
      .eq('is_correct', false);

    if (countError) {
      console.error('Error counting incorrect submissions:', countError);
    }

    const incorrectSubmissions = incorrectCount || 0;

    // Scoring algorithm: Start at 5000, decay over time, faster decay with wrong answers
    const decayMultiplier = Math.pow(1.5, incorrectSubmissions);
    const scoreDecay = Math.floor(elapsedSeconds * decayMultiplier);
    const currentScore = Math.max(0, session.initial_score - scoreDecay);

    // Record the submission without validation
    const { data: submission, error: submissionError } = await supabase
      .from('topx_submissions')
      .insert({
        game_session_id: session.id,
        answer: answer.trim(),
        is_correct: false, // Will be determined later during completion
        score_at_submission: currentScore,
        submitted_at: new Date(timestamp).toISOString(),
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Error creating submission:', submissionError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to record submission',
      });
      return;
    }

    // Update session's current score
    await supabase.from('game_sessions').update({ final_score: currentScore }).eq('id', session.id);

    const response: TopXSubmissionResponse = {
      type: 'topx_submission',
      submissionId: submission.id,
      accepted: true,
    };

    res.json(response);
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit answer',
    });
  }
});

// GET /api/topx/postgame - Returns the results that were validated on the server
router.get('/api/topx/postgame', async (_req, res): Promise<void> => {
  try {
    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    // Get today's daily game
    const { data: dailyGameResult, error: dailyGameError } =
      await supabase.rpc('get_todays_daily_game');

    if (dailyGameError || !dailyGameResult || dailyGameResult.length === 0) {
      console.error("Error fetching today's daily game:", dailyGameError);
      res.status(404).json({
        status: 'error',
        message: 'No daily game available for today',
      });
      return;
    }

    const dailyGame = dailyGameResult[0];

    // Get the user's game session
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select(
        `
        *,
        daily_games!inner(
          id,
          topx_game_id,
          topx_games!inner(*)
        )
      `
      )
      .eq('user_id', userId)
      .eq('daily_game_id', dailyGame.id)
      .single();

    if (sessionError || !session) {
      console.error('Error fetching game session:', sessionError);
      res.status(404).json({
        status: 'error',
        message: 'No game session found for today',
      });
      return;
    }

    // If not completed, validate and complete the game now
    if (!session.is_completed) {
      // Get all submissions for this session
      const { data: submissions, error: submissionsError } = await supabase
        .from('topx_submissions')
        .select('*')
        .eq('game_session_id', session.id)
        .order('submitted_at', { ascending: true });

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        res.status(500).json({
          status: 'error',
          message: 'Failed to fetch submissions',
        });
        return;
      }

      const game = session.daily_games.topx_games;
      const solution = game.solution.map((s: string) => s.toLowerCase().trim());

      // Validate each submission and calculate final score
      let finalScore = 0;
      const correctAnswers: Array<{ answer: string; position: number; points: number }> = [];
      const foundPositions = new Set<number>();

      for (const submission of submissions || []) {
        const normalizedAnswer = submission.answer.toLowerCase().trim();
        const position = solution.indexOf(normalizedAnswer);
        const isCorrect = position !== -1 && !foundPositions.has(position);

        if (isCorrect) {
          foundPositions.add(position);
          const points = submission.score_at_submission;
          finalScore += points;

          correctAnswers.push({
            answer: submission.answer,
            position: position + 1, // 1-indexed
            points,
          });
        }

        // Update submission with correct validation
        await supabase
          .from('topx_submissions')
          .update({
            is_correct: isCorrect,
            position: isCorrect ? position + 1 : null,
          })
          .eq('id', submission.id);
      }

      // Mark session as completed
      await supabase
        .from('game_sessions')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          final_score: finalScore,
          correct_answers: correctAnswers,
        })
        .eq('id', session.id);

      // Record the points in the leaderboard
      const leaderboardResult = await recordLeaderboardEntry(
        userId,
        dailyGame.id,
        session.id,
        finalScore
      );

      if (!leaderboardResult.success) {
        console.error('Failed to record leaderboard entry:', leaderboardResult.error);
        // Continue with the response even if leaderboard recording fails
      }

      const response: TopXGameCompleteResponse = {
        type: 'topx_game_complete',
        finalScore,
        correctAnswers,
        totalCorrect: correctAnswers.length,
        isValid: true,
      };

      res.json(response);
    } else {
      // Game already completed, return the stored results
      const response: TopXGameCompleteResponse = {
        type: 'topx_game_complete',
        finalScore: session.final_score,
        correctAnswers: session.correct_answers || [],
        totalCorrect: (session.correct_answers || []).length,
        isValid: true,
      };

      res.json(response);
    }
  } catch (error) {
    console.error('Error getting postgame results:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get postgame results',
    });
  }
});

export default router;
