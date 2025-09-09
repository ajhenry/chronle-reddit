import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import pluralize from 'pluralize';
import Confetti from 'react-confetti';
import { GameLayout } from '../components/GameLayout';
import { toast } from 'sonner';
import { calculateDecayedScore, DEFAULT_INITIAL_SCORE } from '../../shared/score-decay';

import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Combobox, ComboboxOption } from '../components/ui/combobox';
import { PostGameModal } from '../components/PostGameModal';
import {
  TopXGame,
  TopXDailyGameResponse,
  TopXSubmissionResponse,
  TopXGameCompleteResponse,
  Season,
  EraseTopXResultsResponse,
} from '../../shared/types/api';
import { apiFetch, findValidAnswerPosition } from '../lib/utils';
import { isDevelopment } from '../lib/dev-utils';

// Animated number component for smooth transitions
const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setPreviousValue(displayValue);
      setDisplayValue(value);
      setIsAnimating(true);

      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 600); // Match the animation duration

      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <span className="inline-block relative number-container">
      <AnimatePresence mode="wait">
        {isAnimating ? (
          <>
            <motion.span
              key={`out-${previousValue}`}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -24, opacity: 0 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.68, -0.55, 0.265, 1.55],
              }}
              className="flex absolute inset-0 justify-center items-center"
            >
              {previousValue}
            </motion.span>
            <motion.span
              key={`in-${displayValue}`}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.6,
                ease: [0.68, -0.55, 0.265, 1.55],
              }}
              className="flex absolute inset-0 justify-center items-center"
            >
              {displayValue}
            </motion.span>
          </>
        ) : (
          <motion.span
            key={`static-${displayValue}`}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            className="flex absolute inset-0 justify-center items-center"
          >
            {displayValue}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

// API functions for daily TopX game
const fetchTodaysGame = async (): Promise<TopXDailyGameResponse> => {
  const response = await apiFetch('/api/topx/game', {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error("Failed to fetch today's game");
  }

  const data = await response.json();
  console.log('fetchTodaysGame', data);
  return data;
};

const submitAttempt = async (
  answer: string,
  timestamp: number,
  gameId: string
): Promise<TopXSubmissionResponse> => {
  const response = await apiFetch(`/api/topx/${gameId}/attempt`, {
    method: 'POST',
    body: JSON.stringify({
      answer,
      timestamp,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to submit attempt');
  }
  return await response.json();
};

const getPostgameResults = async (): Promise<TopXGameCompleteResponse> => {
  const response = await apiFetch('/api/topx/postgame', {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error('Failed to get postgame results');
  }
  return await response.json();
};

interface GuessedAnswer {
  answer: string;
  position: number;
}

interface GameState {
  score: number;
  initialScore: number;
  attempts: number;
  attemptsLeft?: number;
  maxAttempts: number;
  guessedAnswers: GuessedAnswer[];
  incorrectAnswers: string[];
  currentInput: string;
  gameComplete: boolean;
  gameWon: boolean;
  isShaking: boolean;
  showConfetti: boolean;
  gameStartTime: number | null;
  submissions: Array<{
    answer: string;
    timestamp: number;
    locallyCorrect?: boolean; // Client-side guess
    position?: number; // Position where the answer was placed (1-indexed)
  }>;
  currentAnswerState: string[]; // Current state of answers with empty strings for unfilled positions
}

export const TopXPage = ({ onBack }: { onBack?: () => void }) => {
  const answerListRef = useRef<HTMLDivElement>(null);
  const [showDevButtons, setShowDevButtons] = useState(false);
  const [showGoldShimmer, setShowGoldShimmer] = useState(false);
  const [gameData, setGameData] = useState<TopXGame | null>(null);
  const [dailyGameId, setDailyGameId] = useState<string | null>(null);
  const [, setSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [scoreUpdateTimer, setScoreUpdateTimer] = useState<ReturnType<typeof setInterval> | null>(
    null
  );

  // Flag to track if this is a reloaded completed game
  const [isReloadedCompletedGame, setIsReloadedCompletedGame] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    score: DEFAULT_INITIAL_SCORE,
    initialScore: DEFAULT_INITIAL_SCORE,
    attempts: 0,
    maxAttempts: 5, // Will be initialized when game data loads
    guessedAnswers: [], // Will be initialized when game data loads
    incorrectAnswers: [], // Will be initialized when game data loads
    currentInput: '',
    gameComplete: false,
    gameWon: false, // Will be initialized when game data loads
    isShaking: false,
    showConfetti: false,
    gameStartTime: null,
    submissions: [],
    currentAnswerState: [], // Will be initialized when game data loads
  });

  // Use count and category directly from server data
  const topXAnswers = gameData?.count ?? 3;
  const category = gameData?.category ?? 'items';

  // Create combobox options from suggestions, excluding already guessed/incorrect answers
  const comboboxOptions: ComboboxOption[] =
    gameData?.suggestions
      ?.filter(
        (suggestion) =>
          !gameState.guessedAnswers.some((ga) => ga.answer === suggestion) &&
          !gameState.incorrectAnswers.includes(suggestion)
      )
      .map((suggestion) => ({
        value: suggestion,
        label: suggestion,
      })) || [];

  // Log initial game state after session restoration (only once when both values are set)
  const hasLoggedInitialState = useRef(false);
  useEffect(() => {
    if (
      gameState.gameStartTime &&
      gameState.maxAttempts !== undefined &&
      !hasLoggedInitialState.current
    ) {
      hasLoggedInitialState.current = true;
      console.log('🎮 TopX Game State Initialized:', {
        score: gameState.score,
        initialScore: gameState.initialScore,
        attempts: gameState.attempts,
        maxAttempts: gameState.maxAttempts,
        attemptsLeft: gameState.maxAttempts
          ? gameState.maxAttempts - (gameState.attempts || 0)
          : 'N/A',
        guessedAnswers: gameState.guessedAnswers,
        incorrectAnswers: gameState.incorrectAnswers,
        currentAnswerState: gameState.currentAnswerState,
        gameComplete: gameState.gameComplete,
        gameWon: gameState.gameWon,
        gameStartTime: gameState.gameStartTime,
        submissionsCount: gameState.submissions.length,
      });
    }
  }, [gameState.gameStartTime, gameState.maxAttempts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time score updating effect
  useEffect(() => {
    if (gameState.gameStartTime && !gameState.gameComplete) {
      const timer = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = (now - gameState.gameStartTime!) / 1000;
        const incorrectCount = gameState.incorrectAnswers.length;
        const currentScore = calculateDecayedScore({
          initialScore: gameState.initialScore,
          elapsedSeconds,
          gameType: 'topx',
          incorrectCount,
        });

        setGameState((prev) => ({ ...prev, score: currentScore }));
      }, 100); // Update every 100ms for smooth score decay

      setScoreUpdateTimer(timer);
      return () => {
        clearInterval(timer);
        setScoreUpdateTimer(null);
      };
    }
  }, [
    gameState.gameStartTime,
    gameState.gameComplete,
    gameState.incorrectAnswers.length,
    gameState.initialScore,
  ]);

  // Fetch daily game on mount
  useEffect(() => {
    const loadDailyGame = async () => {
      try {
        setLoading(true);

        // Fetch current season
        const seasonResponse = await apiFetch('/api/season/current');
        if (!seasonResponse.ok) {
          throw new Error('Failed to fetch current season');
        }
        const seasonData = await seasonResponse.json();
        setSeason(seasonData.season);

        // Fetch today's daily game
        const dailyGame = await fetchTodaysGame();
        setGameData(dailyGame.game);
        setDailyGameId(dailyGame.dailyGameId);

        // Set up initial game state - restore from session if available
        let startTime = Date.now();
        let score = DEFAULT_INITIAL_SCORE;
        let initialScore = DEFAULT_INITIAL_SCORE;
        let gameComplete = false;
        const guessedAnswers: GuessedAnswer[] = [];
        const incorrectAnswers: string[] = [];
        let submissions: Array<{
          answer: string;
          timestamp: number;
          locallyCorrect?: boolean;
        }> = [];

        if (dailyGame.session) {
          // Restore from existing session
          console.log('🔄 Restoring session:', {
            sessionId: dailyGame.session.id,
            hasCorrectSolutionMap: !!dailyGame.session.correctSolutionMap,
            hasIncorrectAnswers: !!dailyGame.session.incorrectAnswers,
            correctSolutionMap: dailyGame.session.correctSolutionMap,
            incorrectAnswers: dailyGame.session.incorrectAnswers,
          });

          startTime = new Date(dailyGame.session.startedAt).getTime();
          score = dailyGame.session.currentScore ?? DEFAULT_INITIAL_SCORE;
          initialScore = dailyGame.session.initialScore;
          gameComplete = dailyGame.session.isCompleted;

          // Check if this is a reloaded completed game
          if (dailyGame.session.isCompleted) {
            setIsReloadedCompletedGame(true);
          }

          // Restore previous submissions and answers
          submissions = dailyGame.session.submissions.map((sub) => ({
            answer: sub.answer,
            timestamp: new Date(sub.submittedAt).getTime(),
            locallyCorrect: sub.isCorrect,
          }));

          // Use server's authoritative data when available
          if (dailyGame.session.correctSolutionMap && dailyGame.session.incorrectAnswers) {
            console.log('✅ Using server authoritative data for session restoration');

            // Use correctSolutionMap to build guessedAnswers with correct positions
            for (let i = 0; i < dailyGame.session.correctSolutionMap.length; i++) {
              const answer = dailyGame.session.correctSolutionMap[i];
              if (answer !== null) {
                guessedAnswers.push({
                  answer: answer as string,
                  position: i + 1, // Convert to 1-indexed
                });
              }
            }

            // Use server's incorrectAnswers directly
            incorrectAnswers.push(...dailyGame.session.incorrectAnswers);
          } else {
            console.log('⚠️ Server authoritative data not available, using fallback logic');
            // Fallback: rebuild from submissions using correctness flags
            for (const sub of dailyGame.session.submissions) {
              if (sub.isCorrect) {
                const position = sub.position;
                if (position) {
                  guessedAnswers.push({
                    answer: sub.answer,
                    position: position,
                  });
                }
              } else if (!incorrectAnswers.includes(sub.answer)) {
                incorrectAnswers.push(sub.answer);
              }
            }
          }
        }

        // Initialize current answer state with empty strings for all positions
        const currentAnswerState = new Array(dailyGame.game.count).fill('');

        // If we have a correct solution map from the server, use it
        if (dailyGame.session?.correctSolutionMap) {
          for (
            let i = 0;
            i < Math.min(dailyGame.session.correctSolutionMap.length, currentAnswerState.length);
            i++
          ) {
            const correctAnswer = dailyGame.session.correctSolutionMap[i];
            if (correctAnswer !== null) {
              currentAnswerState[i] = correctAnswer;
            }
          }
        } else {
          // Fallback: If we have guessed answers, update the current answer state
          for (const guessed of guessedAnswers) {
            if (guessed.position >= 1 && guessed.position <= currentAnswerState.length) {
              currentAnswerState[guessed.position - 1] = guessed.answer;
            }
          }
        }

        setGameState((prev) => ({
          ...prev,
          score,
          initialScore,
          attempts: incorrectAnswers.length,
          attemptsLeft: dailyGame.session.attemptsLeft,
          gameStartTime: startTime,
          gameComplete,
          guessedAnswers,
          incorrectAnswers,
          submissions,
          currentAnswerState,
          maxAttempts: dailyGame.game.maxAttempts,
          gameWon: gameComplete && guessedAnswers.length === dailyGame.game.count,
        }));

        // Note: For completed games, users can click "View Stats" button instead of auto-showing modal

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load daily game');
      } finally {
        setLoading(false);
      }
    };

    void loadDailyGame();
  }, []);

  // Note: Auto-focus is now handled by the Combobox component internally

  // Reset shake animation after it completes
  useEffect(() => {
    if (gameState.isShaking) {
      const timer = setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          isShaking: false,
        }));
      }, 500); // Match the animation duration (0.5s)
      return () => clearTimeout(timer);
    }
  }, [gameState.isShaking]);

  // Show game over modal when game completes
  useEffect(() => {
    if (gameState.gameComplete && !isReloadedCompletedGame) {
      if (gameState.gameWon) {
        // For wins: brief pause, then confetti, then modal
        toast.success('🎉 Amazing!', {
          description: 'You got them all!',
          duration: 1500,
        });

        // Show confetti and gold shimmer after 1 second
        const confettiTimer = setTimeout(() => {
          console.log('🎆 Triggering confetti and gold shimmer for win!');
          setGameState((prev) => ({ ...prev, showConfetti: true }));
          setShowGoldShimmer(true);
        }, 1000);

        // Hide confetti after 4 seconds
        const hideConfettiTimer = setTimeout(() => {
          setGameState((prev) => ({ ...prev, showConfetti: false }));
        }, 4000);

        // Show modal after confetti has been showing for 3 seconds
        const modalTimer = setTimeout(() => {
          setShowGameOverModal(true);
        }, 4000);

        return () => {
          clearTimeout(confettiTimer);
          clearTimeout(hideConfettiTimer);
          clearTimeout(modalTimer);
        };
      } else {
        // For losses: show toast then modal immediately
        toast.success('Close one!', {
          description: 'Game over! Check your results.',
          duration: 2000,
        });

        // Show modal after 2 seconds
        const timer = setTimeout(() => {
          setShowGameOverModal(true);
        }, 2000);

        return () => clearTimeout(timer);
      }
    }
  }, [gameState.gameComplete, gameState.gameWon]);

  // Function to trigger shake animation
  const triggerShake = () => {
    setGameState((prev) => ({ ...prev, isShaking: true }));
  };

  const handleInputChange = (input: string) => {
    setGameState((prev) => ({ ...prev, currentInput: input }));
  };

  const handleAnswerSubmit = async (answer: string) => {
    if (!gameData || gameState.gameComplete || !answer.trim() || !dailyGameId) {
      return;
    }

    const timestamp = Date.now();

    // Submit attempt to server
    // DO NOT FUCKING CHANGE THIS
    submitAttempt(answer, timestamp, dailyGameId).catch((error) => {
      console.error('Failed to submit answer to server:', error);
    });

    // Add to submissions for local tracking
    const newSubmission = {
      answer: answer,
      timestamp,
      locallyCorrect: undefined, // Will be determined later
    };

    console.log(`🎯 Attempting to validate answer: "${answer}"`);
    console.log(`📊 Current answer state: [${gameState.currentAnswerState.join(', ')}]`);

    // Try to find a valid position for this answer using the solution hash
    const validPosition = await findValidAnswerPosition(
      answer,
      gameState.currentAnswerState,
      gameData.solutionHash
    );

    if (validPosition !== null) {
      // Valid answer found! Update the answer state and UI
      console.log(`🎉 Answer "${answer}" is valid at position ${validPosition}`);
      console.log(
        `📊 Pre-submission state: attempts=${gameState.attempts}, maxAttempts=${gameState.maxAttempts}`
      );

      const newCurrentAnswerState = [...gameState.currentAnswerState];
      newCurrentAnswerState[validPosition - 1] = answer; // validPosition is 1-indexed

      const newGuessedAnswer: GuessedAnswer = {
        answer: answer,
        position: validPosition,
      };

      const newGuessedAnswers = [...gameState.guessedAnswers, newGuessedAnswer];
      const isGameWon = newGuessedAnswers.length === topXAnswers;

      setGameState((prev) => ({
        ...prev,
        guessedAnswers: newGuessedAnswers,
        submissions: [
          ...prev.submissions,
          { ...newSubmission, locallyCorrect: true, position: validPosition },
        ],
        currentAnswerState: newCurrentAnswerState,
        currentInput: '',
        gameWon: isGameWon,
        gameComplete: isGameWon,
      }));

      // Complete game if won
      if (isGameWon) {
        await handleGameComplete();
      }
    } else {
      // Invalid answer - add to incorrect answers
      console.log(`❌ Answer "${answer}" is not valid`);
      console.log(
        `📊 Pre-submission state: attempts=${gameState.attempts}, maxAttempts=${gameState.maxAttempts}`
      );

      const newIncorrectAnswers = [...gameState.incorrectAnswers, answer];
      const newAttempts = gameState.attempts + 1;
      // Let server determine if this affects attemptsLeft
      const isGameComplete = false;
      console.log(
        `📊 Post-submission state: attempts=${newAttempts}, gameComplete=${isGameComplete}`
      );

      triggerShake();

      const newGameComplete = gameState.attemptsLeft === 0;
      const newAttemptsLeft = gameState.attemptsLeft ? gameState.attemptsLeft - 1 : 0;

      setGameState((prev) => ({
        ...prev,
        incorrectAnswers: newIncorrectAnswers,
        attemptsLeft: newAttemptsLeft,
        attempts: newAttempts,
        gameComplete: newGameComplete,
        submissions: [
          ...prev.submissions,
          { ...newSubmission, locallyCorrect: false, position: undefined },
        ],
        currentInput: '',
      }));
    }
  };

  const handleGameComplete = async () => {
    try {
      const result = await getPostgameResults();

      // Update final state with server results
      setGameState((prev) => ({
        ...prev,
        score: result.finalScore,
        gameComplete: true,
      }));

      // Clear score update timer
      if (scoreUpdateTimer) {
        clearInterval(scoreUpdateTimer);
        setScoreUpdateTimer(null);
      }

      console.log('Game completed with final score:', result.finalScore);
    } catch (err) {
      console.error('Error completing game:', err);
      toast.error('Failed to complete game');
    }
  };

  const resetGame = async () => {
    // For daily games, we just reload the page since you can only play once per day
    window.location.reload();
  };

  // Development functions
  const forceGameWin = async () => {
    if (!gameData) return;

    console.log('🎯 Forcing game win for development testing');

    // Fill all correct answers
    const correctGuessedAnswers = (gameData.solution || []).map((answer, index) => ({
      answer: answer,
      position: index + 1,
    }));

    setGameState((prev) => ({
      ...prev,
      guessedAnswers: correctGuessedAnswers,
      gameWon: true,
      gameComplete: true,
      showConfetti: false, // Will be set to true by the useEffect
    }));

    // Complete the game
    await handleGameComplete();

    // Trigger gold shimmer immediately for testing
    setTimeout(() => {
      setShowGoldShimmer(true);
    }, 100);
  };

  const forceGameLoss = async () => {
    if (!gameData) return;

    console.log('💔 Forcing game loss for development testing');

    setGameState((prev) => ({
      ...prev,
      attempts: prev.maxAttempts,
      gameWon: false,
      gameComplete: true,
      showConfetti: false,
    }));

    // Complete the game
    await handleGameComplete();
  };

  const eraseGameResults = async () => {
    try {
      console.log('🗑️ Erasing TopX game results for development testing');

      const response = await apiFetch('/api/admin/erase-topx-results', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to erase game results');
      }

      const result: EraseTopXResultsResponse = await response.json();

      if (result.status === 'success') {
        toast.success(
          `Game results erased successfully: ${result.data?.submissionsDeleted || 0} submissions, ${result.data?.leaderboardEntriesDeleted || 0} leaderboard entries deleted`
        );

        // Reload the page to refresh the game state
        window.location.reload();
      } else {
        toast.error(result.message || 'Failed to erase game results');
      }
    } catch (error) {
      console.error('Error erasing game results:', error);
      toast.error('Failed to erase game results');
    }
  };

  const handleBackToMenu = () => {
    // Navigate back to main menu
    if (onBack) {
      onBack();
    } else {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Show loading state
  if (loading) {
    return (
      <GameLayout
        gameTitle="Top X Daily"
        score={0}
        attempts={0}
        maxAttempts={gameData?.maxAttempts ?? 5}
        onBack={handleBackToMenu}
        logoSrc="/top-x-logo.png"
      >
        <CardContent className="flex justify-center items-center p-8">
          <div className="text-lg font-medium text-card-foreground">Loading today's game...</div>
        </CardContent>
      </GameLayout>
    );
  }

  // Show error state
  if (error || !gameData) {
    return (
      <GameLayout
        gameTitle="Top X Daily"
        score={0}
        attempts={0}
        maxAttempts={gameData?.maxAttempts ?? 5}
        onBack={handleBackToMenu}
        logoSrc="/top-x-logo.png"
      >
        <CardContent className="flex flex-col justify-center items-center p-8 space-y-4">
          <div className="text-lg font-medium text-center text-destructive">
            {error || "Failed to load today's game"}
          </div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </GameLayout>
    );
  }

  return (
    <GameLayout
      gameTitle="Top X Daily"
      score={gameState.score}
      attempts={gameState.attempts}
      maxAttempts={gameState.maxAttempts}
      onBack={handleBackToMenu}
      onLeaderboard={() => console.log('Leaderboard clicked')}
      logoSrc="/top-x-logo.png"
    >
      {/* Development Controls */}
      {isDevelopment() && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDevButtons(!showDevButtons)}
            className="text-xs text-muted-foreground"
          >
            {showDevButtons ? '🔧 Hide Dev Tools' : '🔧 Show Dev Tools'}
          </Button>

          {showDevButtons && (
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={forceGameLoss}
                disabled={gameState.gameComplete || !gameData}
                className="text-xs"
              >
                💔 Force Loss
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={forceGameWin}
                disabled={gameState.gameComplete || !gameData}
                className="text-xs bg-green-600 hover:bg-green-700"
              >
                🎉 Force Win
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={eraseGameResults}
                className="text-xs text-orange-600 border-orange-500 hover:bg-orange-50"
              >
                🗑️ Erase Results
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Completion Banner for Reloaded Games */}
      {isReloadedCompletedGame && (
        <div className="p-4 mb-4 rounded-lg border-2 border-foreground">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div className="flex items-center space-x-3">
              <div>
                <div className="font-semibold text-foreground">Puzzle Solved</div>
                <div className="text-sm text-muted-foreground">
                  Check back in tomorrow for a new puzzle
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowGameOverModal(true)}
              variant="outline"
              className="self-start w-full sm:self-auto sm:w-auto"
            >
              View Stats
            </Button>
          </div>
        </div>
      )}

      {/* Attempts Counter */}
      {gameState.attemptsLeft !== undefined && !gameState.gameComplete && (
        <div className="mx-auto mb-6 max-w-2xl">
          <div className="text-center">
            <Card className="inline-block px-4 py-2">
              <span className="flex flex-row gap-2 items-center font-medium text-card-foreground">
                {gameState.attemptsLeft === 0 ? (
                  'LAST ATTEMPT'
                ) : (
                  <>
                    ATTEMPTS LEFT <AnimatedNumber value={gameState.attemptsLeft} />
                  </>
                )}
              </span>
            </Card>
          </div>
        </div>
      )}

      {/* Game Content */}
      <div className="space-y-6">
        {/* Prompt */}
        <h2 className="text-3xl font-black tracking-tight text-center text-foreground">
          {gameData.prompt}
        </h2>

        {/* Answer Input Combobox */}
        {!gameState.gameComplete && (
          <div className={gameState.isShaking ? 'animate-shake' : ''}>
            <Combobox
              options={comboboxOptions}
              value={gameState.currentInput}
              onValueChange={handleAnswerSubmit}
              onInputChange={handleInputChange}
              placeholder="Type to search for your answer..."
              disabled={gameState.gameComplete}
              maxHeight={240}
            />
          </div>
        )}

        {/* Answer List Title */}
        <h3 className="mb-4 text-lg font-bold text-center text-foreground">
          Top {topXAnswers} {pluralize(category, topXAnswers)}
        </h3>

        {/* Correct Answers */}
        <div ref={answerListRef} className="space-y-3">
          {Array.from({ length: topXAnswers }, (_, index) => {
            const position = index + 1;
            // Find the guessed answer for this position
            const guessedAnswer = gameState.guessedAnswers.find(
              (answer) => answer.position === position
            );

            // When game is lost, show all correct answers
            const isGameLost = gameState.gameComplete && !gameState.gameWon;
            const correctAnswer = isGameLost && gameData.solution ? gameData.solution[index] : null;
            const answerToShow = guessedAnswer?.answer || correctAnswer;
            const wasGuessed = !!guessedAnswer;

            return (
              <Card
                key={index}
                className={`${
                  guessedAnswer && showGoldShimmer && gameState.gameWon ? 'gold-shimmer-card' : ''
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex gap-4 items-center">
                    <div
                      className={`w-8 h-8 text-white font-semibold flex items-center justify-center rounded transition-all duration-200 ${
                        guessedAnswer && showGoldShimmer && gameState.gameWon
                          ? 'gold-shimmer-number'
                          : wasGuessed
                            ? 'bg-green-600'
                            : isGameLost
                              ? 'bg-gray-500' // Grey for missed answers when game is lost
                              : 'bg-gray-400'
                      }`}
                    >
                      {position}
                    </div>
                    <div
                      className={`${
                        guessedAnswer && showGoldShimmer && gameState.gameWon
                          ? 'gold-shimmer-text'
                          : wasGuessed || isGameLost
                            ? 'text-card-foreground'
                            : 'text-muted-foreground italic'
                      }`}
                    >
                      {answerToShow || ''}
                      {guessedAnswer &&
                        (() => {
                          // console.log(`Rendering position ${position}:`, guessedAnswer.answer);
                          return null;
                        })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Incorrect Answers */}
        {gameState.incorrectAnswers.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-3 text-base font-semibold text-center text-foreground">
              Incorrect Answers
            </h4>
            <div className="space-y-2">
              {gameState.incorrectAnswers.map((answer, index) => (
                <Card key={index}>
                  <CardContent className="p-2">
                    <div className="flex gap-4 items-center">
                      <div className="flex justify-center items-center w-6 h-6 text-sm font-black text-white bg-red-600 rounded">
                        ✕
                      </div>
                      <div className="text-sm text-card-foreground text-medium">{answer}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confetti Animation */}
      {gameState.showConfetti && (
        <>
          {console.log('🎆 Confetti is active!')}
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={600}
            gravity={0.2}
            colors={['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316']}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* Game Over Modal */}
      <PostGameModal
        open={showGameOverModal}
        onOpenChange={(open) => {
          setShowGameOverModal(open);
          if (!open) {
            // Hide confetti and gold shimmer when modal is closed
            setGameState((prev) => ({ ...prev, showConfetti: false }));
            setShowGoldShimmer(false);
          }
        }}
        gameType="topx"
        score={gameState.score}
        secondaryStatValue={`${gameState.guessedAnswers.length}/${topXAnswers}`}
        secondaryStatLabel="ANSWERS"
        theme={gameData?.prompt || 'Loading...'}
        onClose={() => {
          setShowGameOverModal(false);
          setGameState((prev) => ({ ...prev, showConfetti: false }));
          setShowGoldShimmer(false);
          void resetGame();
        }}
      ></PostGameModal>
    </GameLayout>
  );
};
