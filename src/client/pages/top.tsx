import { useState, useEffect, useRef } from 'react';
import pluralize from 'pluralize';
import { GameLayout } from '../components/GameLayout';

import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { TopXGameData, TopXValidateResponse } from '../../shared/types/api';

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
  const response = await fetch('/api/topx/games/random', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
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
  const response = await fetch(`/api/topx/game/${gameId}/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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

interface GameState {
  score: number;
  attempts: number;
  maxAttempts: number;
  guessedAnswers: string[];
  incorrectAnswers: string[];
  currentInput: string;
  showSuggestions: boolean;
  gameComplete: boolean;
  gameWon: boolean;
}

export const TopPage = ({ onBack }: { onBack?: () => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [gameData, setGameData] = useState<TopXGameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    attempts: 0,
    maxAttempts: 5,
    guessedAnswers: [],
    incorrectAnswers: [],
    currentInput: '',
    showSuggestions: false,
    gameComplete: false,
    gameWon: false,
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
          !gameState.guessedAnswers.includes(suggestion) &&
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

  const handleSuggestionClick = async (suggestion: string) => {
    if (!gameData) return;

    try {
      const result = await validateAnswer(
        gameData.id,
        suggestion,
        gameState.guessedAnswers,
        gameState.maxAttempts
      );

      if (result.isCorrect) {
        const newGuessedAnswers = [...gameState.guessedAnswers, suggestion];
        const newScore = gameState.score + 100; // 100 points per correct answer

        setGameState((prev) => ({
          ...prev,
          guessedAnswers: newGuessedAnswers,
          score: newScore,
          attempts: prev.attempts + 1,
          currentInput: '',
          showSuggestions: false,
          gameWon: newGuessedAnswers.length === number,
          gameComplete: newGuessedAnswers.length === number || prev.attempts + 1 >= 5,
        }));
      } else {
        const newIncorrectAnswers = [...gameState.incorrectAnswers, suggestion];
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
      const newAttempts = gameState.attempts + 1;

      if (isCorrect) {
        const newGuessedAnswers = [...gameState.guessedAnswers, suggestion];
        const newScore = gameState.score + 100;

        setGameState((prev) => ({
          ...prev,
          guessedAnswers: newGuessedAnswers,
          score: newScore,
          attempts: newAttempts,
          currentInput: '',
          showSuggestions: false,
          gameWon: newGuessedAnswers.length === number,
          gameComplete: newGuessedAnswers.length === number || newAttempts >= 5,
        }));
      } else {
        const newIncorrectAnswers = [...gameState.incorrectAnswers, suggestion];
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
      const newGame = await fetchRandomGame();
      setGameData(newGame);

      setGameState({
        score: 0,
        attempts: 0,
        maxAttempts: 5,
        guessedAnswers: [],
        incorrectAnswers: [],
        currentInput: '',
        showSuggestions: false,
        gameComplete: false,
        gameWon: false,
      });

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
        attempts={0}
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
        attempts={0}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && gameState.currentInput.trim()) {
                  void handleSuggestionClick(gameState.currentInput.trim());
                }
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            />

            {/* Dropdown Suggestions */}
            {showDropdown && gameState.currentInput && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border-2 border-border rounded-none max-h-60 overflow-y-auto">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full px-4 py-3 text-left text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150 border-b border-border last:border-b-0"
                    onClick={() => {
                      void handleSuggestionClick(suggestion);
                      setShowDropdown(false);
                    }}
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
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
        <div className="space-y-3">
          {Array.from({ length: number }, (_, index) => {
            const guessedAnswer = gameState.guessedAnswers[index];
            return (
              <Card key={index}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 text-white font-semibold flex items-center justify-center rounded ${
                        guessedAnswer ? 'bg-green-600' : 'bg-gray-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div
                      className={`${
                        guessedAnswer ? 'text-card-foreground' : 'text-muted-foreground italic'
                      }`}
                    >
                      {guessedAnswer ?? ''}
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

        {/* Game Complete Message */}
        {gameState.gameComplete && (
          <Card className="text-center">
            <CardContent>
              <h3
                className={`text-xl font-semibold mb-4 ${gameState.gameWon ? 'text-green-600' : 'text-destructive'}`}
              >
                {gameState.gameWon ? 'CONGRATULATIONS!' : 'GAME OVER!'}
              </h3>
              <p className="text-base text-card-foreground mb-4">
                {gameState.gameWon
                  ? `You got all ${number} answers! Final score: ${gameState.score}`
                  : `You used all ${gameState.maxAttempts} attempts. Better luck next time!`}
              </p>
              {!gameState.gameWon && (
                <div className="mb-4">
                  <p className="text-sm text-card-foreground mb-2">Correct answers were:</p>
                  <div className="space-y-1">
                    {gameData.correctAnswers.map((answer, index) => (
                      <div key={answer} className="text-sm text-muted-foreground">
                        {index + 1}. {answer}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={() => void resetGame()}>PLAY AGAIN</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </GameLayout>
  );
};
