import { Router } from 'express';
import { z } from 'zod';
import {
  TopXDailyGameResponse,
  TopXSubmissionResponse,
  TopXGameCompleteResponse,
  TopXSubmission,
} from '../../shared/types/api';
import { calculateDecayedScore } from '../../shared/score-decay';
import { supabase } from '../../shared/supabase-server';
import { updateTopxLeaderboards } from '../lib/leaderboard-helpers';
import { ensureUserExistsAndGetId } from '../lib/user-helpers';
import { getCurrentUTCTime, toUTCTimestamp, getCurrentUTCISOString } from '../lib/time';
import { logRouteInfo, logError } from '../lib/logging';
import {
  getTopXSubmissionsForToday,
  getUserTopXSessionForToday,
  updateTopXSession,
} from '../database/topx';
import { getOrCreateTodaysGame } from '../database/game';
import {
  checkTopXSubmissionExists,
  createTopXSubmission,
  getCorrectTopXSubmissionCountForToday,
  getIncorrectTopXSubmissionCountForToday,
  getOrCreateTodaysTopXSession,
  getTodaysTopXGame,
} from '../database/topx';
import { isDevelopment } from '../../shared/utils';

// Zod schema for validating topx attempt payload
const topxAttemptSchema = z.object({
  answer: z.string().min(1, 'Answer cannot be empty').trim(),
  timestamp: z.number().positive('Timestamp in milliseconds'),
});

const router = Router();

// GET /api/topx/game - Returns the current day's game or results of the game
router.get('/api/topx/game', async (_req, res): Promise<void> => {
  try {
    logRouteInfo('/api/topx/game', { action: 'get_daily_game' });

    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      logRouteInfo('/api/topx/game', { result: 'unauthenticated' });
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    const dailyGame = await getOrCreateTodaysGame();
    const dailyTopXGame = await getTodaysTopXGame();
    const incorrectSubmissionCount = await getIncorrectTopXSubmissionCountForToday(userId);
    const existingSession = await getOrCreateTodaysTopXSession(userId);

    // Calculate current score using same algorithm as client
    const gameStartTime = toUTCTimestamp(existingSession.startedAt);
    const now = getCurrentUTCTime();
    const elapsedSeconds = Math.max(0, (now - gameStartTime) / 1000);

    // Calculate current score using same algorithm as client
    const currentScore = calculateDecayedScore({
      initialScore: existingSession.initialScore,
      elapsedSeconds,
      gameType: 'topx',
      incorrectCount: incorrectSubmissionCount,
    });

    // Calculate attemptsLeft consistently as maxAttempts - incorrect submissions
    const calculatedAttemptsLeft = Math.max(
      0,
      dailyTopXGame.maxAttempts - incorrectSubmissionCount
    );

    const response: TopXDailyGameResponse = {
      type: 'topx_daily_game',
      dailyGameId: dailyGame.id,
      game: {
        category: dailyTopXGame.category,
        count: dailyTopXGame.count,
        maxAttempts: dailyTopXGame.maxAttempts,
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
        ...existingSession,
        attemptsLeft: calculatedAttemptsLeft,
        currentScore: existingSession.isCompleted ? existingSession.finalScore : currentScore,
      },
    };

    logRouteInfo('/api/topx/game', {
      result: 'success',
      userId,
      gameId: dailyGame.id,
      sessionId: existingSession.id,
      currentScore,
      attemptsLeft: calculatedAttemptsLeft,
    });

    res.json(response);
  } catch (error) {
    logError('/api/topx/game', error);
    res.status(500).json({
      status: 'error',
      message: "Failed to fetch today's daily game",
    });
  }
});

// POST /api/topx/attempt - Saves a user's attempt along with the timestamp submitted
router.post('/api/topx/:gameId/attempt', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;

    logRouteInfo('/api/topx/:gameId/attempt', {
      action: 'submit_attempt',
      gameId,
    });

    // Validate payload with Zod
    const payloadValidation = topxAttemptSchema.safeParse(req.body);
    if (!payloadValidation.success) {
      logError('/api/topx/:gameId/attempt', payloadValidation.error, {
        context: 'payload_validation',
        gameId,
      });
      res.status(400).json({
        status: 'error',
        message: 'Invalid payload structure',
        errors: payloadValidation.error.issues,
      });
      return;
    }

    const { answer, timestamp } = payloadValidation.data;
    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      logRouteInfo('/api/topx/:gameId/attempt', {
        result: 'unauthenticated',
        gameId,
      });
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    const dailyGame = await getOrCreateTodaysGame();
    const dailyTopXGame = await getTodaysTopXGame();

    if (dailyGame.id !== gameId) {
      logError('/api/topx/:gameId/attempt', new Error('Game ID mismatch'), {
        context: 'game_id_validation',
        providedGameId: gameId,
        currentGameId: dailyGame.id,
        userId,
      });
      res.status(400).json({
        status: 'error',
        message: 'Game ID is not for the current daily game',
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

    // Check if user has any attempts left
    if (session.attemptsLeft < 0) {
      res.status(400).json({
        status: 'error',
        message: 'No attempts remaining',
      });
      return;
    }

    // Check for duplicate submission
    const trimmedAnswer = answer.trim();
    const submissionExists = await checkTopXSubmissionExists(session.id, trimmedAnswer);
    if (submissionExists) {
      res.status(400).json({
        status: 'error',
        message: 'This answer has already been submitted',
      });
      return;
    }

    // Calculate time-based score decay
    const gameStartTime = toUTCTimestamp(session.startedAt);
    const submissionTime = timestamp;
    const elapsedSeconds = Math.max(0, (submissionTime - gameStartTime) / 1000);

    // Count incorrect submissions so far
    const currentIncorrectCount = await getIncorrectTopXSubmissionCountForToday(userId);

    // Scoring algorithm: Start at 250, decay over time, faster decay with wrong answers
    const currentScore = calculateDecayedScore({
      initialScore: session.initialScore,
      elapsedSeconds,
      gameType: 'topx',
      incorrectCount: currentIncorrectCount,
    });

    // Validate the submission - check if answer is in the solution
    const solutionIndex = dailyTopXGame.solution!.findIndex(
      (s) => s.toLowerCase().trim() === trimmedAnswer.toLowerCase()
    );
    const isCorrect = solutionIndex !== -1;

    const submissionData: Omit<TopXSubmission, 'id'> = {
      gameSessionId: session.id,
      answer: trimmedAnswer,
      isCorrect: isCorrect,
      scoreAtSubmission: currentScore,
      submittedAt: new Date(timestamp).toISOString(), // timestamp is already in milliseconds
    };

    if (isCorrect) {
      submissionData.position = solutionIndex + 1;
    }

    const submission = await createTopXSubmission(submissionData);

    // Update session's current score and attempts left
    const updateData: { finalScore: number; attemptsLeft?: number } = { finalScore: currentScore };
    if (!isCorrect) {
      // Only decrement attempts for incorrect answers
      updateData.attemptsLeft = session.attemptsLeft - 1;
    }
    await updateTopXSession(session.id, updateData);

    // Check if the game should be completed
    const updatedAttemptsLeft = updateData.attemptsLeft ?? session.attemptsLeft;
    const correctSubmissionsCount = await getCorrectTopXSubmissionCountForToday(userId);
    const totalCorrectAnswers = dailyTopXGame.solution!.length;

    // Game is completed if user found all answers OR ran out of attempts
    const gameCompleted = correctSubmissionsCount >= totalCorrectAnswers || updatedAttemptsLeft < 0;

    if (gameCompleted && !session.isCompleted) {
      // Mark session as completed with current score
      await updateTopXSession(session.id, {
        isCompleted: true,
        completedAt: getCurrentUTCISOString(),
        finalScore: currentScore,
      });

      // Update leaderboard tables with the final score
      try {
        // Calculate time elapsed since game start
        const gameStartTime = toUTCTimestamp(session.startedAt);
        const timeElapsed = Math.max(0, (getCurrentUTCTime() - gameStartTime) / 1000);

        await updateTopxLeaderboards(
          userId,
          currentScore,
          currentIncorrectCount + (isCorrect ? 1 : 0),
          timeElapsed
        );

        logRouteInfo('/api/topx/:gameId/attempt', {
          result: 'leaderboard_updated',
          userId,
          finalScore: currentScore,
          attemptsUsed: currentIncorrectCount + (isCorrect ? 1 : 0),
          timeElapsed,
        });
      } catch (leaderboardError) {
        // Don't fail the request if leaderboard update fails, just log it
        logError('/api/topx/:gameId/attempt', leaderboardError, {
          context: 'leaderboard_update_failed',
          userId,
          finalScore: currentScore,
        });
      }
    }

    const response: TopXSubmissionResponse = {
      type: 'topx_submission',
      submissionId: submission.id,
      accepted: true,
      attemptsLeft: updatedAttemptsLeft,
      gameCompleted: gameCompleted && !session.isCompleted,
    };

    logRouteInfo('/api/topx/:gameId/attempt', {
      result: 'success',
      userId,
      gameId,
      submissionId: submission.id,
      answer: trimmedAnswer,
      isCorrect,
      score: currentScore,
      attemptsLeft: updatedAttemptsLeft,
      gameCompleted: gameCompleted && !session.isCompleted,
    });

    res.json(response);
  } catch (error) {
    logError('/api/topx/:gameId/attempt', error, {
      gameId: req.params.gameId,
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit answer',
    });
  }
});

// GET /api/topx/postgame - Returns the results that were validated on the server
router.get('/api/topx/postgame', async (_req, res): Promise<void> => {
  try {
    logRouteInfo('/api/topx/postgame', { action: 'get_postgame_results' });

    const userId = await ensureUserExistsAndGetId();

    if (!userId) {
      logRouteInfo('/api/topx/postgame', { result: 'unauthenticated' });
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    const session = await getOrCreateTodaysTopXSession(userId);

    if (!session.isCompleted) {
      logRouteInfo('/api/topx/postgame', {
        result: 'game_not_completed',
        userId,
        sessionId: session.id,
      });
      res.status(400).json({
        status: 'error',
        message: 'Game session is not completed',
      });
      return;
    }

    const submissions = await getTopXSubmissionsForToday(userId);

    const finalScore = session.finalScore;
    const correctAnswers = submissions
      .filter((s) => s.isCorrect)
      .map((s) => ({
        answer: s.answer,
        position: s.position!,
        points: s.scoreAtSubmission,
      }));

    const response: TopXGameCompleteResponse = {
      type: 'topx_game_complete',
      finalScore,
      correctAnswers,
      totalCorrect: correctAnswers.length,
      isValid: true,
    };

    logRouteInfo('/api/topx/postgame', {
      result: 'success',
      userId,
      sessionId: session.id,
      finalScore,
      totalCorrect: correctAnswers.length,
    });

    res.json(response);
  } catch (error) {
    logError('/api/topx/postgame', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get postgame results',
    });
  }
});

export default router;
