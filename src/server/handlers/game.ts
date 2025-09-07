import { Router } from 'express';
import {
  TopXDailyGameResponse,
  TopXSubmissionResponse,
  TopXGameCompleteResponse,
  StatusResponse,
} from '../../shared/types/api';
import { calculateDecayedScore, DEFAULT_INITIAL_SCORE } from '../../shared/score-decay';
import { supabase } from '../../shared/supabase-server';
import { checkAndCreateTodaysGames, getTodayEST } from '../lib/status-helpers';
import { recordLeaderboardEntry } from '../lib/leaderboard-helpers';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';
import {
  getUserTopXSessionForToday,
  createTopXSession,
  updateTopXSession,
  findTopXSessionById,
} from '../database/topx-sessions';
import { getOrCreateTodaysGame } from '../database/game';

const router = Router();

// GET /api/status - Checks if games exist for today and creates them if needed
router.get('/api/status', async (_req, res): Promise<void> => {
  console.log('GET /api/status');
  try {
    const result = await checkAndCreateTodaysGames();

    if (!result.success) {
      res.status(result.statusCode).json({
        status: 'error',
        message: result.error,
      });
      return;
    }

    const response: StatusResponse = {
      type: 'status',
      day: result.day,
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check game status',
    });
  }
});

// GET /api/topx/game - Returns the current day's game or results of the game
router.get('/api/topx/game', async (_req, res): Promise<void> => {
  console.log('GET /api/topx/game');
  try {
    const userId = await ensureUserExistsAndGetId();
    console.log('userId', { userId });

    try {
      // Get or create today's daily game using the helper
      const result = await getOrCreateTodaysGame();

      res.json({
        success: true,
      });
    } catch (error) {
      console.error("Error getting today's daily game:", error);
      res.status(500).json({
        status: 'error',
        message: "Failed to get today's daily game",
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
      try {
        // First try to get existing session
        const existingSession = await getUserTopXSessionForToday(userId);

        if (existingSession) {
          // User has an existing session, get submissions and calculate current score
          const { data: submissions } = await supabase
            .from('topx_submissions')
            .select('answer, submitted_at, is_correct, position, score_at_submission')
            .eq('game_session_id', existingSession.id);

          // Calculate current score using same algorithm as client
          const gameStartTime = new Date(existingSession.startedAt).getTime();
          const now = Date.now();
          const elapsedSeconds = Math.max(0, (now - gameStartTime) / 1000);

          // Count incorrect submissions
          const incorrectCount = (submissions || []).filter((sub) => !sub.is_correct).length;

          // Calculate current score using same algorithm as client
          const currentScore = calculateDecayedScore({
            initialScore: existingSession.initialScore,
            elapsedSeconds,
            gameType: 'topx',
            incorrectCount,
          });

          sessionData = {
            id: existingSession.id,
            startedAt: existingSession.startedAt,
            currentScore: existingSession.isCompleted ? existingSession.finalScore : currentScore,
            initialScore: existingSession.initialScore,
            isCompleted: existingSession.isCompleted,
            submissions: (submissions || []).map((sub) => {
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
            }),
          };
        } else {
          // No existing session, create a new one
          try {
            const newSession = await createTopXSession(userId, dailyGame.id);
            sessionData = {
              id: newSession.id,
              startedAt: newSession.startedAt,
              currentScore: DEFAULT_INITIAL_SCORE,
              initialScore: DEFAULT_INITIAL_SCORE,
              isCompleted: false,
              submissions: [],
            };
          } catch (createError) {
            console.error('Error creating topx session:', createError);
            // Continue without session data
          }
        }
      } catch (sessionError) {
        console.error('Error handling topx session:', sessionError);
        // Continue without session data
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
    let session;
    try {
      session = await findTopXSessionById(req.body.sessionId);
    } catch (sessionError) {
      console.error('Error fetching topx session:', sessionError);
      res.status(404).json({
        status: 'error',
        message: 'Game session not found. Please reload the game.',
      });
      return;
    }

    if (!session) {
      res.status(404).json({
        status: 'error',
        message: 'Game session not found. Please reload the game.',
      });
      return;
    }

    if (session.isCompleted) {
      res.status(400).json({
        status: 'error',
        message: 'Game session is already completed',
      });
      return;
    }

    // Calculate time-based score decay
    const gameStartTime = new Date(session.startedAt).getTime();
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
    const currentScore = calculateDecayedScore({
      initialScore: session.initialScore,
      elapsedSeconds,
      gameType: 'topx',
      incorrectCount: incorrectSubmissions,
    });

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
    await updateTopXSession(session.id, { finalScore: currentScore });

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
    let session;
    try {
      session = await getUserTopXSessionForToday(userId);
    } catch (sessionError) {
      console.error('Error fetching topx session:', sessionError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch game session',
      });
      return;
    }

    if (!session) {
      res.status(404).json({
        status: 'error',
        message: 'No game session found for today',
      });
      return;
    }

    // If not completed, validate and complete the game now
    if (!session.isCompleted) {
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

      // Get the TopX game data
      const { data: gameData, error: gameError } = await supabase
        .from('topx_games')
        .select('*')
        .eq('id', dailyGame.topx_game_id)
        .single();

      if (gameError || !gameData) {
        console.error('Error fetching topx game:', gameError);
        res.status(500).json({
          status: 'error',
          message: 'Failed to fetch game data',
        });
        return;
      }

      const game = gameData;
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
      await updateTopXSession(session.id, {
        isCompleted: true,
        completedAt: new Date().toISOString(),
        finalScore,
      });

      // Record the points in the leaderboard
      const leaderboardResult = await recordLeaderboardEntry(
        userId,
        dailyGame.id,
        session.id,
        finalScore,
        'topx'
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
