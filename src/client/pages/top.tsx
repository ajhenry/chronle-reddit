import { useState, useEffect, useRef } from 'react';
import pluralize from 'pluralize';
import Confetti from 'react-confetti';
import { GameLayout } from '../components/GameLayout';
import { toast } from 'sonner';

import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { TopXGameData, TopXValidateResponse } from '../../shared/types/api';
import { apiFetch } from '../lib/utils';

// Function to parse prompt and extract number and category
const parsePrompt = (prompt: string | undefined) => {
  if (!prompt) return { number: 3, category: 'items' };

  const match = prompt.match(/top (\d+) (.+?) that/);
  if (match && match[1] && match[2]) {
    return {
      number: parseInt(match[1]),
      category: match[2],
    };
  }
  return { number: 3, category: 'items' }; // fallback
};

// API functions
const fetchRandomGame = async (): Promise<TopXGameData> => {
  const response = await apiFetch('/api/topx/games/random', {
    method: 'GET',
  });
  console.log('Response:', response);
  if (!response.ok) {
    throw new Error('Failed to fetch game');
  }
  const data = await response.json();
  return data.game;
};

const validateAnswer = async (
  gameId: string,
  answer: string,
  guessedAnswers: string[],
  maxAttempts: number
): Promise<TopXValidateResponse> => {
  const response = await apiFetch(`/api/topx/game/${gameId}/validate`, {
    method: 'POST',
    body: JSON.stringify({
      answer,
      guessedAnswers,
      maxAttempts,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to validate answer');
  }

  return await response.json();
};

interface GuessedAnswer {
  answer: string;
  position: number;
}

interface GameState {
  score: number;
  attempts: number;
  maxAttempts: number;
  guessedAnswers: GuessedAnswer[];
  incorrectAnswers: string[];
  currentInput: string;
  showSuggestions: boolean;
  gameComplete: boolean;
  gameWon: boolean;
  isShaking: boolean;
  showConfetti: boolean;
}

export const TopPage = ({ onBack }: { onBack?: () => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const answerListRef = useRef<HTMLDivElement>(null);
  const [showDevButtons, setShowDevButtons] = useState(false);
  const [showGoldShimmer, setShowGoldShimmer] = useState(false);
  const [gameData, setGameData] = useState<TopXGameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    attempts: 1,
    maxAttempts: 5,
    guessedAnswers: [],
    incorrectAnswers: [],
    currentInput: '',
    showSuggestions: false,
    gameComplete: false,
    gameWon: false,
    isShaking: false,
    showConfetti: false,
  });

  // Parse the prompt to extract number and category
  const { number, category } = gameData
    ? parsePrompt(gameData.prompt)
    : { number: 3, category: 'items' };

  // Filter suggestions based on current input
  const filteredSuggestions =
    gameData?.searchSuggestions
      ?.filter(
        (suggestion) =>
          suggestion.toLowerCase().includes(gameState.currentInput.toLowerCase()) &&
          !gameState.guessedAnswers.some((ga) => ga.answer === suggestion) &&
          !gameState.incorrectAnswers.includes(suggestion)
      )
      .slice(0, 8) || []; // Limit to 8 suggestions for better UX

  // Fetch game data on mount
  useEffect(() => {
    const loadGame = async () => {
      try {
        setLoading(true);
        const game = await fetchRandomGame();
        setGameData(game);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setLoading(false);
      }
    };

    void loadGame();
  }, []);

  // Auto-focus input on mount (after game data loads)
  useEffect(() => {
    if (inputRef.current && !loading && gameData) {
      inputRef.current.focus();
    }
  }, [loading, gameData]);

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

  const handleSuggestionClick = async (suggestion: string) => {
    if (!gameData) return;

    try {
      const result = await validateAnswer(
        gameData.id,
        suggestion,
        gameState.guessedAnswers.map((ga) => ga.answer),
        gameState.maxAttempts
      );

      if (result.isCorrect) {
        const newGuessedAnswer: GuessedAnswer = {
          answer: suggestion,
          position: result.position || 1, // fallback to 1 if position is undefined
        };
        console.log(
          'Adding correct answer (API):',
          suggestion,
          'at position:',
          result.position || 1
        );
        const newGuessedAnswers = [...gameState.guessedAnswers, newGuessedAnswer];
        const newScore = gameState.score + 100; // 100 points per correct answer
        const isGameWon = newGuessedAnswers.length === number;

        setGameState((prev) => ({
          ...prev,
          guessedAnswers: newGuessedAnswers,
          score: newScore,
          // Don't increment attempts for correct answers
          currentInput: '',
          showSuggestions: false,
          gameWon: isGameWon,
          gameComplete: isGameWon || prev.attempts >= 5,
        }));

        // Force re-render to ensure the answer appears before confetti
        setTimeout(() => {
          // Small delay to ensure state has updated
        }, 50);
      } else {
        const newIncorrectAnswers = [...gameState.incorrectAnswers, suggestion];
        triggerShake(); // Trigger shake animation for wrong answer
        setGameState((prev) => ({
          ...prev,
          incorrectAnswers: newIncorrectAnswers,
          attempts: prev.attempts + 1,
          currentInput: '',
          showSuggestions: false,
          gameComplete: prev.attempts + 1 >= 5,
        }));
      }
    } catch (err) {
      console.error('Error validating answer:', err);
      // Fallback to local validation if API fails
      const isCorrect = gameData.correctAnswers.includes(suggestion);

      if (isCorrect) {
        // For fallback validation, we need to find the position from correctAnswers
        const position = gameData.correctAnswers.indexOf(suggestion) + 1;
        const newGuessedAnswer: GuessedAnswer = {
          answer: suggestion,
          position: position,
        };
        console.log('Adding correct answer (fallback):', suggestion, 'at position:', position);
        const newGuessedAnswers = [...gameState.guessedAnswers, newGuessedAnswer];
        const newScore = gameState.score + 100;
        const isGameWon = newGuessedAnswers.length === number;

        setGameState((prev) => ({
          ...prev,
          guessedAnswers: newGuessedAnswers,
          score: newScore,
          // Don't increment attempts for correct answers
          currentInput: '',
          showSuggestions: false,
          gameWon: isGameWon,
          gameComplete: isGameWon || prev.attempts >= 5,
        }));

        // Force re-render to ensure the answer appears before confetti
        setTimeout(() => {
          // Small delay to ensure state has updated
        }, 50);
      } else {
        const newIncorrectAnswers = [...gameState.incorrectAnswers, suggestion];
        triggerShake(); // Trigger shake animation for wrong answer
        const newAttempts = gameState.attempts + 1;
        setGameState((prev) => ({
          ...prev,
          incorrectAnswers: newIncorrectAnswers,
          attempts: newAttempts,
          currentInput: '',
          showSuggestions: false,
          gameComplete: newAttempts >= 5,
        }));
      }
    }
  };

  const resetGame = async () => {
    try {
      setLoading(true);
      setShowGameOverModal(false); // Close modal before resetting
      const newGame = await fetchRandomGame();
      setGameData(newGame);

      setGameState({
        score: 0,
        attempts: 1,
        maxAttempts: 5,
        guessedAnswers: [],
        incorrectAnswers: [],
        currentInput: '',
        showSuggestions: false,
        gameComplete: false,
        gameWon: false,
        isShaking: false,
        showConfetti: false,
      });
      setShowGoldShimmer(false);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load new game');
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Development functions
  const forceGameWin = () => {
    if (!gameData) return;

    console.log('🎯 Forcing game win for development testing');

    // Fill all correct answers
    const correctGuessedAnswers = gameData.correctAnswers.map((answer, index) => ({
      answer: answer,
      position: index + 1,
    }));

    setGameState((prev) => ({
      ...prev,
      guessedAnswers: correctGuessedAnswers,
      score: correctGuessedAnswers.length * 100,
      gameWon: true,
      gameComplete: true,
      showConfetti: false, // Will be set to true by the useEffect
    }));

    // Trigger gold shimmer immediately for testing
    setTimeout(() => {
      setShowGoldShimmer(true);
    }, 100);
  };

  const forceGameLoss = () => {
    if (!gameData) return;

    console.log('💔 Forcing game loss for development testing');

    setGameState((prev) => ({
      ...prev,
      attempts: prev.maxAttempts,
      gameWon: false,
      gameComplete: true,
      showConfetti: false,
    }));
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
        gameTitle="Top X"
        score={0}
        attempts={1}
        maxAttempts={5}
        onBack={handleBackToMenu}
      >
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-lg font-medium text-card-foreground">Loading game...</div>
        </CardContent>
      </GameLayout>
    );
  }

  // Show error state
  if (error || !gameData) {
    return (
      <GameLayout
        gameTitle="Top X"
        score={0}
        attempts={1}
        maxAttempts={5}
        onBack={handleBackToMenu}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="text-lg font-medium text-destructive text-center">
            {error || 'Failed to load game'}
          </div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </GameLayout>
    );
  }

  return (
    <GameLayout
      gameTitle="Top X"
      score={gameState.score}
      attempts={gameState.attempts}
      maxAttempts={gameState.maxAttempts}
      onBack={handleBackToMenu}
      onLeaderboard={() => console.log('Leaderboard clicked')}
    >
      {/* Development Controls */}
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
          <div className="mt-2 flex gap-2 flex-wrap">
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
          </div>
        )}
      </div>

      {/* Game Content */}
      <div className="space-y-6">
        {/* Prompt */}
        <h2 className="font-black text-foreground text-3xl tracking-tight text-center">
          {gameData.prompt}
        </h2>

        {/* Input Section with Dropdown */}
        {!gameState.gameComplete && (
          <div className="relative">
            <Input
              ref={inputRef}
              value={gameState.currentInput}
              onChange={(e) => {
                const value = e.target.value;
                setGameState((prev) => ({ ...prev, currentInput: value }));
                // If it's a complete suggestion match, treat it as a submission
                if (gameData.searchSuggestions.includes(value)) {
                  void handleSuggestionClick(value);
                }
              }}
              placeholder="Type your answer..."
              disabled={gameState.gameComplete}
              className={gameState.isShaking ? 'animate-shake' : ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && gameState.currentInput.trim()) {
                  void handleSuggestionClick(gameState.currentInput.trim());
                }
              }}
            />

            {/* Dropdown Suggestions */}
            {gameState.currentInput && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border-2 border-border rounded-none max-h-60 overflow-y-auto">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full px-4 py-3 text-left text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150 border-b border-border last:border-b-0"
                    onClick={() => {
                      void handleSuggestionClick(suggestion);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Answer List Title */}
        <h3 className="text-lg font-bold text-foreground mb-4 text-center">
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
            return (
              <Card
                key={index}
                className={`${
                  guessedAnswer && showGoldShimmer && gameState.gameWon ? 'gold-shimmer-card' : ''
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 text-white font-semibold flex items-center justify-center rounded transition-all duration-200 ${
                        guessedAnswer && showGoldShimmer && gameState.gameWon
                          ? 'gold-shimmer-number'
                          : guessedAnswer
                            ? 'bg-green-600'
                            : 'bg-gray-400'
                      }`}
                    >
                      {position}
                    </div>
                    <div
                      className={`${
                        guessedAnswer && showGoldShimmer && gameState.gameWon
                          ? 'gold-shimmer-text'
                          : guessedAnswer
                            ? 'text-card-foreground'
                            : 'text-muted-foreground italic'
                      }`}
                    >
                      {guessedAnswer?.answer ?? ''}
                      {guessedAnswer &&
                        (() => {
                          console.log(`Rendering position ${position}:`, guessedAnswer.answer);
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
            <h4 className="text-base font-semibold text-foreground mb-3 text-center">
              Incorrect Answers
            </h4>
            <div className="space-y-2">
              {gameState.incorrectAnswers.map((answer, index) => (
                <Card key={index}>
                  <CardContent className="p-2">
                    <div className="flex items-center gap-4">
                      <div className="w-6 h-6 bg-red-600 text-white font-semibold flex items-center justify-center text-sm rounded">
                        ✗
                      </div>
                      <div className="text-card-foreground text-sm text-medium">{answer}</div>
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
            <DialogDescription className="text-center text-base">
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
                <h4 className="text-sm font-semibold text-green-700 mb-2">
                  ✅ Correct Answers Found:
                </h4>
                <div className="space-y-1">
                  {gameState.guessedAnswers
                    .sort((a, b) => a.position - b.position)
                    .map((guessedAnswer) => (
                      <div
                        key={guessedAnswer.answer}
                        className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded"
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
                <h4 className="text-sm font-semibold text-red-700 mb-2">❌ Incorrect Guesses:</h4>
                <div className="space-y-1">
                  {gameState.incorrectAnswers.map((answer) => (
                    <div key={answer} className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                      {answer}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show missed answers for losses */}
            {!gameState.gameWon && gameData && (
              <div>
                <h4 className="text-sm font-semibold text-blue-700 mb-2">
                  🎯 Correct Answers You Missed:
                </h4>
                <div className="space-y-1">
                  {gameData.correctAnswers
                    .filter(
                      (answer) => !gameState.guessedAnswers.some((ga) => ga.answer === answer)
                    )
                    .map((answer) => {
                      const position = gameData.correctAnswers.indexOf(answer) + 1;
                      return (
                        <div
                          key={answer}
                          className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded"
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
                🎮 PLAY AGAIN
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GameLayout>
  );
};
