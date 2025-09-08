import { Router } from 'express';
import {
  TopXDailyGameResponse,
  TopXSubmissionResponse,
  TopXGameCompleteResponse,
} from '../../shared/types/api';
import { calculateDecayedScore } from '../../shared/score-decay';
import { supabase } from '../../shared/supabase-server';
import { recordLeaderboardEntry } from '../lib/leaderboard-helpers';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';
import { getUserTopXSessionForToday, updateTopXSession } from '../database/topx';
import { getOrCreateTodaysGame } from '../database/game';
import {
  createTopXSubmission,
  getIncorrectTopXSubmissionCountForToday,
  getOrCreateTodaysTopXSession,
  getTodaysTopXGame,
} from '../database/topx';
import { isDevelopment } from '../../shared/utils';

const router = Router();

// GET /api/topx/game - Returns the current day's game or results of the game
router.get('/api/topx/game', async (_req, res): Promise<void> => {
  console.log('GET /api/topx/game');
  try {
    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    console.log('userId', userId);

    const dailyGame = await getOrCreateTodaysGame();
    console.log('dailyGame', dailyGame);
    const dailyTopXGame = await getTodaysTopXGame();
    console.log('dailyTopXGame', dailyTopXGame);
    const incorrectSubmissionCount = await getIncorrectTopXSubmissionCountForToday(userId);
    console.log('incorrectSubmissionCount', incorrectSubmissionCount);
    const existingSession = await getOrCreateTodaysTopXSession(userId);
    console.log('existingSession', existingSession);

    // Calculate current score using same algorithm as client
    const gameStartTime = new Date(existingSession.startedAt).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.max(0, (now - gameStartTime) / 1000);

    // Calculate current score using same algorithm as client
    const currentScore = calculateDecayedScore({
      initialScore: existingSession.initialScore,
      elapsedSeconds,
      gameType: 'topx',
      incorrectCount: incorrectSubmissionCount,
    });

    const sessionData = {
      id: existingSession.id,
      startedAt: existingSession.startedAt,
      currentScore: existingSession.isCompleted ? existingSession.finalScore : currentScore,
      initialScore: existingSession.initialScore,
      isCompleted: existingSession.isCompleted,
      attemptsLeft: existingSession.attemptsLeft,
      submissions: existingSession.submissions,
    };

    const response: TopXDailyGameResponse = {
      type: 'topx_daily_game',
      dailyGameId: dailyGame.id,
      game: {
        category: dailyTopXGame.category,
        count: dailyTopXGame.count,
        createdAt: dailyTopXGame.createdAt,
        updatedAt: dailyTopXGame.updatedAt,
        id: dailyTopXGame.id,
        prompt: dailyTopXGame.prompt,
        ...(isDevelopment() && {
          solution: dailyTopXGame.solution,
        }),
        suggestions: dailyTopXGame.suggestions,
        solutionHash: dailyTopXGame.solutionHash,
      },
      day: dailyGame.day,
      session: {
        ...sessionData,
        userId: existingSession.userId,
        dailyGameId: existingSession.dailyGameId,
        completedAt: existingSession.completedAt,
        finalScore: existingSession.finalScore,
        attemptsLeft: existingSession.attemptsLeft,
      },
    };

    console.log('response', response);

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
router.post('/api/topx/:gameId/attempt', async (req, res): Promise<void> => {
  console.log('POST /api/topx/:gameId/attempt', { body: req.body, params: req.params });
  try {
    const { answer, timestamp, position } = req.body;
    const { gameId } = req.params;
    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    const dailyGame = await getOrCreateTodaysGame();
    const dailyTopXGame = await getTodaysTopXGame();
    console.log('dailyGame', dailyTopXGame, gameId);

    if (dailyGame.id !== gameId) {
      console.error('Game ID is not for the current daily game', dailyTopXGame.id, gameId);
      res.status(400).json({
        status: 'error',
        message: 'Game ID is not for the current daily game',
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

    // Get existing game session (should already exist from game load)
    const session = await getOrCreateTodaysTopXSession(userId);
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
    const incorrectCount = await getIncorrectTopXSubmissionCountForToday(userId);

    // Scoring algorithm: Start at 5000, decay over time, faster decay with wrong answers
    const currentScore = calculateDecayedScore({
      initialScore: session.initialScore,
      elapsedSeconds,
      gameType: 'topx',
      incorrectCount,
    });

    // Validate the submission - check both answer correctness and position
    const trimmedAnswer = answer.trim();
    const solutionIndex = dailyTopXGame.solution!.findIndex(
      (s) => s.toLowerCase().trim() === trimmedAnswer.toLowerCase()
    );
    const isCorrect = solutionIndex !== -1;
    const correctPosition = isCorrect ? solutionIndex + 1 : null; // 1-indexed position
    const positionMatches = isCorrect && position === correctPosition;

    console.log(`🔍 Validating submission: "${trimmedAnswer}"`);
    console.log(`📍 Solution index: ${solutionIndex}, Correct position: ${correctPosition}`);
    console.log(`🎯 Client position: ${position}, Matches: ${positionMatches}`);

    const submission = await createTopXSubmission({
      gameSessionId: session.id,
      answer: trimmedAnswer,
      isCorrect: isCorrect && positionMatches, // Only correct if answer AND position are right
      scoreAtSubmission: currentScore,
      submittedAt: new Date(timestamp).toISOString(),
      position: position,
    });

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

    if (!dailyGame) {
      console.error('Daily game data is malformed');
      res.status(500).json({
        status: 'error',
        message: 'Daily game data is malformed',
      });
      return;
    }

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

    // TypeScript should know session is defined here
    const validSession = session;

    // If not completed, validate and complete the game now
    if (!validSession.isCompleted) {
      // Get all submissions for this session
      const { data: submissions, error: submissionsError } = await supabase
        .from('topx_submissions')
        .select('*')
        .eq('game_session_id', validSession.id)
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
      await updateTopXSession(validSession.id, {
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
        finalScore: session.finalScore,
        correctAnswers: [], // TODO: Store correct answers in session or recalculate
        totalCorrect: 0, // TODO: Calculate total correct from submissions
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
