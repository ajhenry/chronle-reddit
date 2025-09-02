import { useState, useEffect, useCallback } from 'react';
import Confetti from 'react-confetti';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from '@dnd-kit/core';
import { GameLayout } from '../components/GameLayout';
import { toast } from 'sonner';
import { CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  LetteredGameData,
  GridPosition,
  LetterPiece as LetterPieceType,
} from '../../shared/types/api';
import { isDevelopment } from '../lib/dev-utils';
import { MOCK_GAMES } from '../lib/lettered-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import LetteredGrid from '../components/lettered-grid';
import LetterPiece from '../components/letter-piece';

interface GameState {
  score: number;
  initialScore: number;
  gameComplete: boolean;
  gameWon: boolean;
  showConfetti: boolean;
  gameStartTime: number | null;
  placedPieces: Map<string, GridPosition>; // piece ID -> grid position
  lastValidPositions: Map<string, GridPosition>; // piece ID -> last valid position
  previewPiece: LetterPieceType | null; // Currently dragged piece for preview
  previewPosition: GridPosition | null; // Position where preview should be shown
  lastValidPreviewPosition: GridPosition | null; // Last valid preview position
  isValidPreview: boolean; // Whether the current preview position is valid
}

export const LetteredPage = ({ onBack }: { onBack?: () => void }) => {
  const [showDevButtons, setShowDevButtons] = useState(false);
  const [, setShowGoldShimmer] = useState(false);
  const [gameData, setGameData] = useState<LetteredGameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [scoreUpdateTimer, setScoreUpdateTimer] = useState<ReturnType<typeof setInterval> | null>(
    null
  );
  const [currentGameIndex, setCurrentGameIndex] = useState<number>(0);

  // Configure sensors for better touch and mouse support with optimized settings
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced from 8 for more responsive dragging
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // Reduced from 200 for better responsiveness
        tolerance: 3, // Reduced from 5 for more precise touch
      },
    })
  );

  // Touch scroll prevention is handled via CSS touch-none and event handlers

  const [gameState, setGameState] = useState<GameState>({
    score: 5000,
    initialScore: 5000,
    gameComplete: false,
    gameWon: false,
    showConfetti: false,
    gameStartTime: Date.now(),
    placedPieces: new Map(),
    lastValidPositions: new Map(),
    previewPiece: null,
    previewPosition: null,
    lastValidPreviewPosition: null,
    isValidPreview: false,
  });

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [currentMousePosition, setCurrentMousePosition] = useState<GridPosition | null>(null);
  const [draggingFromGrid, setDraggingFromGrid] = useState<string | null>(null);

  // Real-time score updating effect (same as TopX)
  useEffect(() => {
    if (gameState.gameStartTime && !gameState.gameComplete) {
      const timer = setInterval(() => {
        // Timer for future score decay implementation
        // Currently disabled to focus on game mechanics
      }, 1000);

      setScoreUpdateTimer(timer);
      return () => {
        clearInterval(timer);
        setScoreUpdateTimer(null);
      };
    }
  }, [gameState.gameStartTime, gameState.gameComplete, gameState.initialScore]);

  // Load mock game data
  const loadGame = useCallback(async (gameIndex: number = 0) => {
    try {
      setLoading(true);

      const mockGame = MOCK_GAMES[gameIndex];
      if (!mockGame) {
        throw new Error(`No game found at index ${gameIndex}`);
      }

      setGameData(mockGame);
      setCurrentGameIndex(gameIndex);

      // Reset game state for new game
      setGameState({
        score: 5000,
        initialScore: 5000,
        gameComplete: false,
        gameWon: false,
        showConfetti: false,
        gameStartTime: Date.now(),
        placedPieces: new Map(),
        lastValidPositions: new Map(),
        previewPiece: null,
        previewPosition: null,
        lastValidPreviewPosition: null,
        isValidPreview: false,
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializeGame = async () => {
      // Check if dev mode has selected a specific game
      const devGameIndex = localStorage.getItem('dev_lettered_game_index');
      let gameIndex = 0;

      if (devGameIndex !== null && isDevelopment()) {
        const parsedIndex = parseInt(devGameIndex, 10);
        if (!isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < MOCK_GAMES.length) {
          gameIndex = parsedIndex;
        }
        // Clear the dev selection after using it
        localStorage.removeItem('dev_lettered_game_index');
      }

      await loadGame(gameIndex);
    };

    void initializeGame();
  }, [loadGame]);

  // Validate if all pieces are placed correctly according to the solution
  const validateSolution = useCallback((): boolean => {
    if (!gameData || !gameData.solution) return false;

    // Check if all pieces are placed
    const allPiecesPlaced = gameData.pieces.every((piece) => gameState.placedPieces.has(piece.id));
    if (!allPiecesPlaced) return false;

    // Validate each piece is in its correct position
    for (let i = 0; i < gameData.pieces.length; i++) {
      const piece = gameData.pieces[i];
      const solutionPositions = gameData.solution[i];
      const placedPosition = piece ? gameState.placedPieces.get(piece.id) : null;

      if (!piece || !placedPosition || !solutionPositions) return false;

      // Check if the placed position matches any of the solution positions
      // The solution might have multiple valid positions for each piece
      const isCorrectPosition = solutionPositions.some(
        (solutionPos) =>
          solutionPos.row === placedPosition.row && solutionPos.col === placedPosition.col
      );

      if (!isCorrectPosition) return false;
    }

    return true;
  }, [gameData, gameState.placedPieces]);

  // Check if game is won
  const checkGameComplete = useCallback(() => {
    if (!gameData) return;

    // Check if all pieces are placed
    const allPiecesPlaced = gameData.pieces.every((piece) => gameState.placedPieces.has(piece.id));

    if (allPiecesPlaced && !gameState.gameComplete) {
      // Validate if pieces are in correct positions
      const isSolutionCorrect = validateSolution();

      if (isSolutionCorrect) {
        // Game is won!
        setGameState((prev) => ({
          ...prev,
          gameComplete: true,
          gameWon: true,
        }));

        // Stop score timer
        if (scoreUpdateTimer) {
          clearInterval(scoreUpdateTimer);
          setScoreUpdateTimer(null);
        }
      } else {
        // All pieces are placed but not in correct positions - show error
        toast.error('Pieces are not in the correct positions!', { duration: 2000 });
      }
    }
  }, [
    gameData,
    gameState.placedPieces,
    gameState.gameComplete,
    scoreUpdateTimer,
    validateSolution,
  ]);

  // Check game completion whenever pieces are placed
  useEffect(() => {
    checkGameComplete();
  }, [gameState.placedPieces, gameData, checkGameComplete]);

  // Show game over modal and effects when game completes
  useEffect(() => {
    if (gameState.gameComplete && gameState.gameWon) {
      toast.success('🎉 Congratulations!', {
        description: 'You completed the puzzle!',
        duration: 1500,
      });

      // Show confetti and gold shimmer after 1 second
      const confettiTimer = setTimeout(() => {
        setGameState((prev) => ({ ...prev, showConfetti: true }));
        setShowGoldShimmer(true);
      }, 1000);

      // Show modal after confetti
      const modalTimer = setTimeout(() => {
        setShowGameOverModal(true);
      }, 4000);

      return () => {
        clearTimeout(confettiTimer);
        clearTimeout(modalTimer);
      };
    }
  }, [gameState.gameComplete, gameState.gameWon]);

  // Validate piece placement
  const validatePlacement = useCallback(
    (piece: LetterPieceType, position: GridPosition): boolean => {
      if (!gameData) return false;

      // Quick bounds check first - most common failure case
      for (let i = 0; i < piece.shape.length; i++) {
        const shapePos = piece.shape[i];
        if (!shapePos) continue;

        const gridRow = position.row + shapePos.row;
        const gridCol = position.col + shapePos.col;

        // Early bounds check
        if (gridRow < 0 || gridRow >= 8 || gridCol < 0 || gridCol >= 8) {
          return false;
        }
      }

      // Check each position in detail
      for (let i = 0; i < piece.shape.length; i++) {
        const shapePos = piece.shape[i];
        if (!shapePos) continue;

        const gridRow = position.row + shapePos.row;
        const gridCol = position.col + shapePos.col;

        const cell = gameData.grid[gridRow]?.[gridCol];

        if (!cell) {
          return false;
        }

        // Can't place on pre-filled anchor letters
        if (cell.isPreFilled) {
          return false;
        }

        // Check for overlaps with placed pieces
        for (const [placedPieceId, placedPos] of gameState.placedPieces) {
          if (placedPieceId === piece.id) continue;

          const placedPiece = gameData.pieces.find((p) => p.id === placedPieceId);
          if (!placedPiece) continue;

          for (const placedShapePos of placedPiece.shape) {
            const placedGridRow = placedPos.row + placedShapePos.row;
            const placedGridCol = placedPos.col + placedShapePos.col;

            if (placedGridRow === gridRow && placedGridCol === gridCol) {
              return false;
            }
          }
        }
      }

      return true;
    },
    [gameData, gameState.placedPieces]
  );

  // Convert mouse position to grid coordinates
  const getGridPositionFromMouseEvent = useCallback(
    (event: MouseEvent | Touch): GridPosition | null => {
      // Find the grid element
      const gridElement = document.querySelector('[data-grid="lettered-grid"]');
      if (!gridElement) return null;

      const rect = gridElement.getBoundingClientRect();
      const x = (event.clientX || 0) - rect.left;
      const y = (event.clientY || 0) - rect.top;

      // Account for padding (16px on each side in Tailwind p-4)
      const padding = 16;
      const adjustedX = x - padding;
      const adjustedY = y - padding;

      // Grid has gaps between cells, accounted for in grid layout
      const availableWidth = rect.width - 2 * padding;
      const availableHeight = rect.height - 2 * padding;

      // Each cell + gap takes up availableWidth / 8
      const cellWithGapWidth = availableWidth / 8;
      const cellWithGapHeight = availableHeight / 8;

      const col = Math.floor(adjustedX / cellWithGapWidth);
      const row = Math.floor(adjustedY / cellWithGapHeight);

      // Clamp to valid grid bounds
      if (row >= 0 && row < 8 && col >= 0 && col < 8) {
        return { row, col };
      }

      return null;
    },
    []
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    console.log('handleDragStart', event);
    const { active } = event;
    const activeId = active.id as string;

    // Check if this is a piece being dragged (either from tray or grid)
    const piece = gameData?.pieces.find((p) => p.id === activeId);

    if (piece) {
      setActiveDragId(activeId);

      // Check if this piece is currently placed on the grid
      const isPlacedOnGrid = gameState.placedPieces.has(activeId);
      if (isPlacedOnGrid) {
        // Remove the piece from the grid and mark it as being dragged from grid
        setDraggingFromGrid(activeId);
        setGameState((prev) => {
          const newPlacedPieces = new Map(prev.placedPieces);
          newPlacedPieces.delete(activeId);
          return {
            ...prev,
            placedPieces: newPlacedPieces,
          };
        });
      }
    }

    // Clear any existing preview
    setGameState((prev) => ({
      ...prev,
      previewPiece: null,
      previewPosition: null,
      isValidPreview: false,
    }));
  };

  // Handle drag over - calculate grid position for preview
  const handleDragOver = (event: DragOverEvent) => {
    const { active } = event;

    if (!gameData || !active) {
      // Clear preview if no active drag or game data
      setGameState((prev) => ({
        ...prev,
        previewPiece: null,
        previewPosition: null,
        lastValidPreviewPosition: null,
        isValidPreview: false,
      }));
      return;
    }

    const pieceId = active.id as string;
    const piece = gameData.pieces.find((p) => p.id === pieceId);
    if (piece) {
      setGameState((prev) => ({
        ...prev,
        previewPiece: piece,
        lastValidPreviewPosition: null, // Clear last valid position when starting new drag
        isValidPreview: false, // Reset validation until position is set
      }));
    }
  };

  // Listen for current mouse position change with debouncing
  useEffect(() => {
    if (!currentMousePosition) return;

    // Debounce position updates during dragging to reduce rerenders
    const timeoutId = setTimeout(
      () => {
        setGameState((prev) => {
          if (
            prev.previewPosition?.row === currentMousePosition.row &&
            prev.previewPosition?.col === currentMousePosition.col
          ) {
            return prev;
          }
          return {
            ...prev,
            previewPosition: currentMousePosition,
          };
        });
      },
      activeDragId ? 8 : 0
    ); // ~120fps during drag, immediate when not dragging

    return () => clearTimeout(timeoutId);
  }, [currentMousePosition, activeDragId]);

  // Validate preview position when it changes
  useEffect(() => {
    if (!gameState.previewPiece || !gameState.previewPosition) {
      setGameState((prev) => {
        if (prev.isValidPreview === false) return prev; // Avoid unnecessary updates
        return {
          ...prev,
          isValidPreview: false,
        };
      });
      return;
    }

    const isValid = validatePlacement(gameState.previewPiece, gameState.previewPosition);
    setGameState((prev) => {
      // Always update lastValidPreviewPosition when position is valid
      const updates: Partial<GameState> = {
        isValidPreview: isValid,
      };

      if (isValid) {
        updates.lastValidPreviewPosition = gameState.previewPosition;
      }

      // Avoid unnecessary updates if nothing changed
      if (
        prev.isValidPreview === isValid &&
        (!isValid || prev.lastValidPreviewPosition === gameState.previewPosition)
      ) {
        return prev;
      }

      return {
        ...prev,
        ...updates,
      };
    });
  }, [gameState.previewPiece, gameState.previewPosition, validatePlacement]);

  // Track mouse position during drag
  useEffect(() => {
    // Early return if not dragging
    if (!activeDragId) return;

    let rafId: number;
    let lastPosition: GridPosition | null = null;

    const updatePosition = (gridPosition: GridPosition | null) => {
      // Only update if position actually changed
      if (
        !gridPosition ||
        (lastPosition?.col === gridPosition.col && lastPosition?.row === gridPosition.row)
      ) {
        return;
      }

      lastPosition = gridPosition;

      // Use requestAnimationFrame for smoother updates
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setCurrentMousePosition(gridPosition);
      });
    };

    const handleMouseMove = (event: MouseEvent) => {
      const gridPosition = getGridPositionFromMouseEvent(event);
      updatePosition(gridPosition);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        if (touch) {
          const gridPosition = getGridPositionFromMouseEvent(touch);
          updatePosition(gridPosition);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeDragId]);

  // Handle drag end with dnd-kit
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Clear drag state
    setActiveDragId(null);
    setCurrentMousePosition(null);
    setDraggingFromGrid(null);

    // Clear preview
    setGameState((prev) => ({
      ...prev,
      previewPiece: null,
      previewPosition: null,
      lastValidPreviewPosition: null,
      isValidPreview: false,
    }));

    if (!gameData) return;

    const pieceId = active.id as string;
    const piece = gameData.pieces.find((p) => p.id === pieceId);
    if (!piece) return;

    // If dropped on grid, place at current mouse position
    if (over && over.id === 'game-grid' && currentMousePosition) {
      const position = currentMousePosition;

      // Check if placement is valid
      const isValid = validatePlacement(piece, position);

      if (isValid) {
        // Valid placement - place the piece and update last valid position
        const newPlacedPieces = new Map(gameState.placedPieces);
        newPlacedPieces.set(piece.id, position);

        const newLastValidPositions = new Map(gameState.lastValidPositions);
        newLastValidPositions.set(piece.id, position);

        setGameState((prev) => ({
          ...prev,
          placedPieces: newPlacedPieces,
          lastValidPositions: newLastValidPositions,
        }));

        toast.success('Piece placed!', { duration: 1000 });
      } else {
        // Invalid placement - revert to last valid position or remove from grid
        const lastValidPosition = gameState.lastValidPositions.get(piece.id);

        if (lastValidPosition) {
          // Revert to last valid position
          const newPlacedPieces = new Map(gameState.placedPieces);
          newPlacedPieces.set(piece.id, lastValidPosition);

          setGameState((prev) => ({
            ...prev,
            placedPieces: newPlacedPieces,
          }));

          toast.error('Invalid position - reverted to last valid position', { duration: 1500 });
        } else {
          // No last valid position - remove from grid (back to tray)
          const newPlacedPieces = new Map(gameState.placedPieces);
          newPlacedPieces.delete(piece.id);

          setGameState((prev) => ({
            ...prev,
            placedPieces: newPlacedPieces,
          }));

          toast.error('Invalid position - piece returned to tray', { duration: 1500 });
        }
      }
    }
  };

  const handleBackToMenu = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const resetGame = () => {
    window.location.reload();
  };

  // Development functions
  const forceGameWin = () => {
    if (!gameData) return;

    // Place all pieces in valid positions (simplified for testing)
    const newPlacedPieces = new Map<string, GridPosition>();

    gameData.pieces.forEach((piece, index) => {
      // Simple placement for testing - place pieces in a row
      newPlacedPieces.set(piece.id, { row: index, col: 0 });
    });

    setGameState((prev) => ({
      ...prev,
      placedPieces: newPlacedPieces,
      gameWon: true,
      gameComplete: true,
    }));
  };

  const handleBoardChange = async (value: string) => {
    const gameIndex = parseInt(value, 10);
    if (!isNaN(gameIndex) && gameIndex >= 0 && gameIndex < MOCK_GAMES.length) {
      await loadGame(gameIndex);
      toast.success(`Loaded board: ${MOCK_GAMES[gameIndex]?.phrase}`, { duration: 2000 });
    }
  };

  // Show loading state
  if (loading) {
    return (
      <GameLayout gameTitle="Lettered Daily" score={0} onBack={handleBackToMenu}>
        <CardContent className="flex justify-center items-center p-8">
          <div className="text-lg font-medium text-card-foreground">Loading today's puzzle...</div>
        </CardContent>
      </GameLayout>
    );
  }

  // Show error state
  if (error || !gameData) {
    return (
      <GameLayout gameTitle="Lettered Daily" score={0} onBack={handleBackToMenu}>
        <CardContent className="flex flex-col justify-center items-center p-8 space-y-4">
          <div className="text-lg font-medium text-center text-destructive">
            {error || "Failed to load today's puzzle"}
          </div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </GameLayout>
    );
  }

  return (
    <GameLayout
      gameTitle="Lettered Daily"
      score={gameState.score}
      onBack={handleBackToMenu}
      onLeaderboard={() => console.log('Leaderboard clicked')}
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
            <div className="mt-2 space-y-3">
              {/* Board Selection */}
              <div className="flex gap-2 items-center">
                <label className="min-w-0 text-xs font-medium text-muted-foreground">Board:</label>
                <Select value={currentGameIndex.toString()} onValueChange={handleBoardChange}>
                  <SelectTrigger className="w-full max-w-xs text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_GAMES.map((game, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{game.phrase}</span>
                          <span className="text-xs text-muted-foreground">{game.category}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={forceGameWin}
                  disabled={gameState.gameComplete}
                  className="text-xs bg-green-600 hover:bg-green-700"
                >
                  🎉 Force Win
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadGame(Math.floor(Math.random() * MOCK_GAMES.length))}
                  className="text-xs"
                >
                  🎲 Random Board
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadGame(currentGameIndex)}
                  className="text-xs"
                >
                  🔄 Restart Board
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game Content */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          {/* Category */}
          <h2 className="text-2xl font-black tracking-tight text-center text-foreground">
            {gameData.category}
          </h2>

          {/* Phrase */}
          <h3 className="text-lg font-bold text-center opacity-75 text-foreground">
            "{gameData.phrase}"
          </h3>

          {/* Game Grid */}
          <LetteredGrid
            grid={gameData.grid}
            placedPieces={gameState.placedPieces}
            pieces={gameData.pieces}
            previewPiece={gameState.previewPiece}
            previewPosition={gameState.previewPosition}
            isValidPreview={gameState.isValidPreview}
            draggingFromGrid={draggingFromGrid}
            gameComplete={gameState.gameComplete}
            gameState={gameState}
          />

          {/* Piece Tray */}
          <div>
            <h4 className="mb-3 text-base font-semibold text-center text-foreground">
              Lettered Pieces
            </h4>
            <div className="flex flex-wrap gap-3 justify-center p-4 bg-gray-50 rounded-lg border-2 border-gray-300 dark:bg-gray-800 dark:border-gray-600">
              {gameData.pieces.map((piece) => {
                const isPlaced = gameState.placedPieces.has(piece.id);
                const isDragging = activeDragId === piece.id;
                const isPreviewingOnGrid = isDragging && gameState.previewPiece?.id === piece.id;
                // Only render pieces that aren't placed on the board and aren't currently showing preview on grid
                if (isPlaced || isPreviewingOnGrid) {
                  return null;
                }
                return (
                  <LetterPiece
                    key={piece.id}
                    piece={piece}
                    isPlaced={isPlaced}
                    gameComplete={gameState.gameComplete}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </DndContext>
      {/* Confetti Animation */}
      {gameState.showConfetti && (
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
      )}
      {/* Game Over Modal */}
      <Dialog
        open={showGameOverModal}
        onOpenChange={(open) => {
          setShowGameOverModal(open);
          if (!open) {
            setGameState((prev) => ({ ...prev, showConfetti: false }));
            setShowGoldShimmer(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-green-600">
              🎉 PUZZLE COMPLETE!
            </DialogTitle>
            <DialogDescription className="text-base text-center">
              You solved the puzzle perfectly!
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
                <div className="text-2xl font-bold text-primary">{gameData.pieces.length}</div>
                <div className="text-sm text-muted-foreground">Pieces Placed</div>
              </div>
            </div>

            {/* Play Again Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => {
                  setShowGameOverModal(false);
                  setGameState((prev) => ({ ...prev, showConfetti: false }));
                  resetGame();
                }}
                className="w-full"
              >
                🔄 PLAY AGAIN
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GameLayout>
  );
};
