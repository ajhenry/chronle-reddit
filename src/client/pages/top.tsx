import { useState, useEffect, useRef } from 'react';
import pluralize from 'pluralize';
import Confetti from 'react-confetti';
import { GameLayout } from '../components/GameLayout';
import { toast } from 'sonner';
import { calculateDecayedScore, DEFAULT_INITIAL_SCORE } from '../../shared/score-decay';

import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Combobox, ComboboxOption } from '../components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
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
  gameId: string,
  position?: number
): Promise<TopXSubmissionResponse> => {
  const response = await apiFetch(`/api/topx/${gameId}/attempt`, {
    method: 'POST',
    body: JSON.stringify({
      answer,
      timestamp,
      position,
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

export const TopPage = ({ onBack }: { onBack?: () => void }) => {
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

  const [gameState, setGameState] = useState<GameState>({
    score: DEFAULT_INITIAL_SCORE,
    initialScore: DEFAULT_INITIAL_SCORE,
    attempts: 1,
    maxAttempts: 5,
    guessedAnswers: [],
    incorrectAnswers: [],
    currentInput: '',
    gameComplete: false,
    gameWon: false,
    isShaking: false,
    showConfetti: false,
    gameStartTime: null,
    submissions: [],
    currentAnswerState: [], // Will be initialized when game data loads
  });

  // Use count and category directly from server data
  const number = gameData?.count ?? 3;
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
          startTime = new Date(dailyGame.session.startedAt).getTime();
          score = dailyGame.session.currentScore ?? DEFAULT_INITIAL_SCORE;
          initialScore = dailyGame.session.initialScore;
          gameComplete = dailyGame.session.isCompleted;

          // Restore previous submissions and answers
          submissions = dailyGame.session.submissions.map((sub) => ({
            answer: sub.answer,
            timestamp: new Date(sub.submittedAt).getTime(),
            locallyCorrect: sub.isCorrect,
          }));

          // Use server's authoritative data when available
          if (dailyGame.session.correctSolutionMap && dailyGame.session.incorrectAnswers) {
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
          gameStartTime: startTime,
          gameComplete,
          guessedAnswers,
          incorrectAnswers,
          submissions,
          currentAnswerState,
          gameWon: gameComplete && guessedAnswers.length === dailyGame.game.count,
        }));

        // If game is already completed, show the modal after a brief delay
        if (gameComplete) {
          setTimeout(() => {
            setShowGameOverModal(true);
          }, 500);
        }

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
    if (gameState.gameComplete) {
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

  // Game state management simplified with new API

  const handleInputChange = (input: string) => {
    setGameState((prev) => ({ ...prev, currentInput: input }));
  };

  const handleAnswerSubmit = async (answer: string) => {
    if (!gameData || gameState.gameComplete || !answer.trim() || !dailyGameId) return;

    const timestamp = Date.now();

    try {
      // Submit attempt to server
      await submitAttempt(answer, timestamp, dailyGameId);

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

        const newCurrentAnswerState = [...gameState.currentAnswerState];
        newCurrentAnswerState[validPosition - 1] = answer; // validPosition is 1-indexed

        const newGuessedAnswer: GuessedAnswer = {
          answer: answer,
          position: validPosition,
        };

        const newGuessedAnswers = [...gameState.guessedAnswers, newGuessedAnswer];
        const isGameWon = newGuessedAnswers.length === number;
        const isGameComplete = isGameWon || gameState.attempts >= gameState.maxAttempts;

        // Submit to server for authoritative validation (include position for correct answers)
        try {
          await submitAttempt(answer, timestamp, dailyGameId, validPosition);
        } catch (error) {
          console.error('Failed to submit answer to server:', error);
          // Continue with optimistic UI update even if server submission fails
        }

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
          gameComplete: isGameComplete,
        }));

        // Complete game if won
        if (isGameWon) {
          await handleGameComplete();
        }
      } else {
        // Invalid answer - add to incorrect answers
        console.log(`❌ Answer "${answer}" is not valid`);

        const newIncorrectAnswers = [...gameState.incorrectAnswers, answer];
        const newAttempts = gameState.attempts + 1;
        const isGameComplete = newAttempts >= gameState.maxAttempts;

        triggerShake();

        // Submit to server for validation (even though we know it's wrong)
        try {
          await submitAttempt(answer, timestamp, dailyGameId);
        } catch (error) {
          console.error('Failed to submit answer to server:', error);
        }

        setGameState((prev) => ({
          ...prev,
          incorrectAnswers: newIncorrectAnswers,
          attempts: newAttempts,
          submissions: [
            ...prev.submissions,
            { ...newSubmission, locallyCorrect: false, position: undefined },
          ],
          currentInput: '',
          gameComplete: isGameComplete,
        }));

        // Complete game if max attempts reached
        if (isGameComplete) {
          await handleGameComplete();
        }
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      toast.error('Failed to submit answer');
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
        attempts={1}
        maxAttempts={5}
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
        attempts={1}
        maxAttempts={5}
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
          Top {number} {pluralize(category, number)}
        </h3>

        {/* Correct Answers */}
        <div ref={answerListRef} className="space-y-3">
          {Array.from({ length: number }, (_, index) => {
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
                      <div className="flex justify-center items-center w-6 h-6 text-sm font-semibold text-white bg-red-600 rounded">
                        ✗
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
      <Dialog
        open={showGameOverModal}
        onOpenChange={(open) => {
          setShowGameOverModal(open);
          if (!open) {
            // Hide confetti and gold shimmer when modal is closed
            setGameState((prev) => ({ ...prev, showConfetti: false }));
            setShowGoldShimmer(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              className={`text-center text-2xl font-bold ${
                gameState.gameWon ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {gameState.gameWon ? '🎉 CONGRATULATIONS!' : '💔 GAME OVER'}
            </DialogTitle>
            <DialogDescription className="text-base text-center">
              {gameState.gameWon
                ? `You found all ${number} answers!`
                : `You used all ${gameState.maxAttempts} attempts`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Game Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{gameState.score}</div>
                <div className="text-sm text-muted-foreground">Final Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {gameState.guessedAnswers.length}/{number}
                </div>
                <div className="text-sm text-muted-foreground">Correct Answers</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {gameState.incorrectAnswers.length}
                </div>
                <div className="text-sm text-muted-foreground">Wrong Guesses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{gameState.attempts - 1}</div>
                <div className="text-sm text-muted-foreground">Attempts Used</div>
              </div>
            </div>

            {/* Correct Answers Found */}
            {gameState.guessedAnswers.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-green-700">
                  ✅ Correct Answers Found:
                </h4>
                <div className="space-y-1">
                  {gameState.guessedAnswers
                    .sort((a, b) => a.position - b.position)
                    .map((guessedAnswer) => (
                      <div
                        key={guessedAnswer.answer}
                        className="px-2 py-1 text-sm text-green-600 bg-green-50 rounded"
                      >
                        {guessedAnswer.position}. {guessedAnswer.answer}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Incorrect Answers */}
            {gameState.incorrectAnswers.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-red-700">❌ Incorrect Guesses:</h4>
                <div className="space-y-1">
                  {gameState.incorrectAnswers.map((answer) => (
                    <div key={answer} className="px-2 py-1 text-sm text-red-600 bg-red-50 rounded">
                      {answer}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show missed answers for losses */}
            {!gameState.gameWon && gameData && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-blue-700">
                  🎯 Correct Answers You Missed:
                </h4>
                <div className="space-y-1">
                  {(gameData.solution || [])
                    .filter(
                      (answer) => !gameState.guessedAnswers.some((ga) => ga.answer === answer)
                    )
                    .map((answer) => {
                      const position = (gameData.solution || []).indexOf(answer) + 1;
                      return (
                        <div
                          key={answer}
                          className="px-2 py-1 text-sm text-blue-600 bg-blue-50 rounded"
                        >
                          {position}. {answer}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Play Again Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => {
                  setShowGameOverModal(false);
                  setGameState((prev) => ({ ...prev, showConfetti: false }));
                  void resetGame();
                }}
                className="w-full"
              >
                🔄 RELOAD GAME
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GameLayout>
  );
};
