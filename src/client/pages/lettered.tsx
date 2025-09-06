import React, { useState, useEffect, useCallback, useRef } from 'react';
import Confetti from 'react-confetti';
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
import { LetteredGameData, GridPosition, LetterPiece, GridCell } from '../../shared/types/api';
import { isDevelopment } from '../lib/dev-utils';
import { MOCK_GAMES, getResponsiveCellSize, getResponsiveCellSpacing } from '../lib/lettered-utils';
import { useViewport } from '../hooks/useViewport';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Grid, DraggableItem } from '../components/tile-grid/tile-grid';
import { cn } from '@sglara/cn';
import { LetteredGameStateManager } from '../lib/lettered-game-state';

// Conversion functions for Grid component
const convertGridDataToItems = ({
  grid,
  placedPieces,
  pieces,
  getTileStyle,
  getTileClassName,
}: {
  grid: GridCell[][];
  placedPieces: Map<string, GridPosition>;
  pieces: LetterPiece[];
  getTileStyle?: (piece: LetterPiece) => React.CSSProperties | undefined;
  getTileClassName?: (piece: LetterPiece) => string | undefined;
}): Omit<DraggableItem, 'id'>[] => {
  const items: Omit<DraggableItem, 'id'>[] = [];

  // Convert placed pieces to Grid component format
  for (const [pieceId, position] of placedPieces.entries()) {
    const piece = pieces.find((p) => p.id === pieceId);
    if (!piece) continue;

    // Convert piece shape to Grid component format
    const shapeCells: { x: number; y: number }[] = piece.shape.map((shapePos) => ({
      x: shapePos.col,
      y: shapePos.row,
    }));

    // Calculate bounding box
    const width = Math.max(...shapeCells.map((cell) => cell.x)) + 1;
    const height = Math.max(...shapeCells.map((cell) => cell.y)) + 1;

    const shape = {
      name: piece.id,
      cells: shapeCells,
      width,
      height,
    };

    // Create content from letters
    const content = piece.letters.join('') || piece.id;

    // Use the piece's predefined color
    const color = piece.color;

    items.push({
      position: { x: position.col, y: position.row },
      shape,
      content,
      color,
      disabled: false,
      style: getTileStyle ? getTileStyle(piece) : undefined,
      className: getTileClassName ? getTileClassName(piece) : undefined,
    });
  }

  // Add anchor letters (pre-filled letters) as immovable items
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row]!.length; col++) {
      const cell = grid[row]![col];
      if (cell?.isPreFilled && cell.letter) {
        // Create a single-cell shape for the anchor letter
        const shapeCells = [{ x: 0, y: 0 }];

        const shape = {
          name: `anchor-${row}-${col}`,
          cells: shapeCells,
          width: 1,
          height: 1,
        };

        // Create a mock piece for the anchor letter
        const anchorPiece: LetterPiece = {
          id: `anchor-${row}-${col}`,
          letters: [cell.letter],
          shape: [{ row: 0, col: 0 }],
          color: '#000000', // Black for anchor letters
        };

        items.push({
          position: { x: col, y: row },
          shape,
          content: cell.letter,
          color: '#000000',
          disabled: true, // Anchor letters are immovable
          style: {
            ...(getTileStyle ? getTileStyle(anchorPiece) : {}),
            cursor: 'default', // Override disabled cursor
          },
          className: getTileClassName
            ? getTileClassName(anchorPiece)
            : 'bg-black text-white border border-white/30',
        });
      }
    }
  }

  // Add unplaced letter pieces to the extended grid area with proper spacing
  const unplacedPieces = pieces.filter((piece) => !placedPieces.has(piece.id));
  const piecesStartRow = grid.length; // Start placing pieces below the main board
  const maxCols = grid[0]!.length; // Use the same width as the main grid
  const maxRows = 12; // Maximum rows for piece placement
  const pieceSpacing = 1; // One cell gap between pieces

  // Track occupied positions to prevent overlaps
  const occupiedPositions = new Set<string>();

  for (const piece of unplacedPieces) {
    // Convert piece shape to Grid component format
    const shapeCells: { x: number; y: number }[] = piece.shape.map((shapePos) => ({
      x: shapePos.col,
      y: shapePos.row,
    }));

    // Calculate bounding box
    const width = Math.max(...shapeCells.map((cell) => cell.x)) + 1;
    const height = Math.max(...shapeCells.map((cell) => cell.y)) + 1;

    // Find a valid position for this piece
    let placed = false;
    let currentRow = piecesStartRow;
    let currentCol = 0;

    while (!placed && currentRow < piecesStartRow + maxRows) {
      // Try to place the piece at current position
      const pieceLeft = currentCol;
      const pieceTop = currentRow;
      const pieceRight = pieceLeft + width + pieceSpacing;
      const pieceBottom = pieceTop + height + pieceSpacing;

      // Check if piece fits within grid bounds
      if (pieceRight <= maxCols && pieceBottom <= piecesStartRow + maxRows) {
        // Check for overlaps with existing pieces
        let hasOverlap = false;

        for (let checkRow = pieceTop; checkRow < pieceBottom && !hasOverlap; checkRow++) {
          for (let checkCol = pieceLeft; checkCol < pieceRight && !hasOverlap; checkCol++) {
            const positionKey = `${checkCol},${checkRow}`;
            if (occupiedPositions.has(positionKey)) {
              hasOverlap = true;
            }
          }
        }

        if (!hasOverlap) {
          // Place the piece here
          const shape = {
            name: piece.id,
            cells: shapeCells,
            width,
            height,
          };

          // Create content from letters
          const content = piece.letters.join('') || piece.id;

          // Use the piece's predefined color
          const color = piece.color;

          items.push({
            position: { x: pieceLeft, y: pieceTop },
            shape,
            content,
            color,
            disabled: false,
            style: getTileStyle ? getTileStyle(piece) : undefined,
            className: getTileClassName ? getTileClassName(piece) : undefined,
          });

          // Mark positions as occupied (including spacing)
          for (let occupyRow = pieceTop; occupyRow < pieceBottom; occupyRow++) {
            for (let occupyCol = pieceLeft; occupyCol < pieceRight; occupyCol++) {
              occupiedPositions.add(`${occupyCol},${occupyRow}`);
            }
          }

          placed = true;
        }
      }

      // Move to next column
      currentCol += 1;

      // If we've reached the end of the row, move to next row
      if (currentCol + width + pieceSpacing > maxCols) {
        currentCol = 0;
        currentRow += 1;
      }
    }

    // If piece couldn't be placed, log a warning (shouldn't happen with extended grid)
    if (!placed) {
      console.warn(`Could not place piece ${piece.id} - no available space`);
    }
  }

  return items;
};

// UI-specific state (separate from core game state)
interface UIState {
  showConfetti: boolean;
  showGameOverModal: boolean;
  previewPiece: LetterPiece | null; // Currently dragged piece for preview
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
  const [currentGameIndex, setCurrentGameIndex] = useState<number>(0);

  // UI-specific state
  const [uiState, setUIState] = useState<UIState>({
    showConfetti: false,
    showGameOverModal: false,
    previewPiece: null,
    previewPosition: null,
    lastValidPreviewPosition: null,
    isValidPreview: false,
  });

  // Game state manager (core game logic, doesn't cause rerenders)
  const gameStateManagerRef = useRef<LetteredGameStateManager | null>(null);

  // State for UI updates from game state manager
  const [gameScore, setGameScore] = useState(5000);
  const [placedPieces, setPlacedPieces] = useState<Map<string, GridPosition>>(new Map());
  const [gameComplete, setGameComplete] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  // Get responsive viewport information
  const { breakpoint } = useViewport();
  const responsiveCellSize = getResponsiveCellSize(breakpoint);
  const responsiveCellSpacing = getResponsiveCellSpacing(breakpoint);

  // Touch scroll prevention is handled via CSS touch-none and event handlers

  // Initialize game state manager and set up callbacks
  useEffect(() => {
    if (!gameStateManagerRef.current) {
      gameStateManagerRef.current = new LetteredGameStateManager();

      // Set up callback to receive game state updates
      const unsubscribe = gameStateManagerRef.current.onUpdate((updates) => {
        if (updates.score !== undefined) {
          setGameScore(updates.score);
        }
        if (updates.placedPieces) {
          setPlacedPieces(updates.placedPieces);
        }
        if (updates.gameComplete !== undefined) {
          setGameComplete(updates.gameComplete);
        }
        if (updates.gameWon !== undefined) {
          setGameWon(updates.gameWon);
        }
      });

      return () => {
        unsubscribe();
        gameStateManagerRef.current?.destroy();
        gameStateManagerRef.current = null;
      };
    }
  }, []);

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

      // Initialize game state manager with new game
      if (gameStateManagerRef.current) {
        gameStateManagerRef.current.initializeGame(mockGame);
      }

      // Reset UI state for new game
      setUIState({
        showConfetti: false,
        showGameOverModal: false,
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

  // Handle game completion effects (UI side)
  const handleGameComplete = useCallback(() => {
    if (gameWon && gameComplete) {
      toast.success('🎉 Congratulations!', {
        description: 'You completed the puzzle!',
        duration: 1500,
      });

      // Show confetti and gold shimmer after 1 second
      const confettiTimer = setTimeout(() => {
        setUIState((prev) => ({ ...prev, showConfetti: true }));
        setShowGoldShimmer(true);
      }, 1000);

      // Show modal after confetti
      const modalTimer = setTimeout(() => {
        setUIState((prev) => ({ ...prev, showGameOverModal: true }));
      }, 4000);

      return () => {
        clearTimeout(confettiTimer);
        clearTimeout(modalTimer);
      };
    }
  }, [gameWon, gameComplete]);

  // Handle game completion effects when game state changes
  useEffect(() => {
    return handleGameComplete();
  }, [handleGameComplete]);

  // Handle layout changes from the grid
  const handleGridLayoutChange = useCallback(
    (layout: (string | null)[][]) => {
      if (!gameData || !gameStateManagerRef.current) return;

      // Convert layout to piece positions
      const newPlacedPieces = new Map<string, GridPosition>();

      layout.forEach((row, rowIndex) => {
        row.forEach((itemId, colIndex) => {
          if (itemId) {
            // Find the piece that corresponds to this item ID
            const piece = gameData.pieces.find((p: LetterPiece) => p.id === itemId);
            if (piece && !newPlacedPieces.has(piece.id)) {
              newPlacedPieces.set(piece.id, { row: rowIndex, col: colIndex });
            }
          }
        });
      });

      console.log('newPlacedPieces', newPlacedPieces);

      // Update game state manager with new piece positions
      // Only update pieces that have changed to avoid unnecessary work
      const currentPlacedPieces = gameStateManagerRef.current.getPlacedPieces();

      for (const [pieceId, newPosition] of newPlacedPieces) {
        const currentPosition = currentPlacedPieces.get(pieceId);
        if (
          !currentPosition ||
          currentPosition.row !== newPosition.row ||
          currentPosition.col !== newPosition.col
        ) {
          gameStateManagerRef.current.placePiece(pieceId, newPosition);
        }
      }

      // Remove pieces that are no longer placed
      for (const [pieceId] of currentPlacedPieces) {
        if (!newPlacedPieces.has(pieceId)) {
          gameStateManagerRef.current.removePiece(pieceId);
        }
      }
    },
    [gameData]
  );

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
    if (!gameData || !gameStateManagerRef.current) return;

    // Place all pieces in valid positions (simplified for testing)
    gameData.pieces.forEach((piece, index) => {
      // Simple placement for testing - place pieces in a row
      gameStateManagerRef.current!.placePiece(piece.id, { row: index, col: 0 });
    });
  };

  const handleBoardChange = async (value: string) => {
    const gameIndex = parseInt(value, 10);
    if (!isNaN(gameIndex) && gameIndex >= 0 && gameIndex < MOCK_GAMES.length) {
      await loadGame(gameIndex);
      toast.success(`Loaded board: ${MOCK_GAMES[gameIndex]?.phrase}`, { duration: 2000 });
    }
  };

  const boardTileClass = (x: number, y: number) => {
    const baseClass = 'bg-card hover:bg-accent transition-colors';
    // Style board tiles based on the lettered grid data
    const cell = gameData?.grid[y]?.[x];
    if (!cell) {
      // Check if we're in the extended area (below the main board)
      if (y >= (gameData?.grid.length ?? 0)) {
        return cn(baseClass, 'bg-background'); // Letter pieces area
      }
      return 'bg-muted'; // Main board
    }

    // Don't style cells that have pre-filled anchor letters (they're rendered as pieces)
    if (cell.isPreFilled) {
      return cn(baseClass, 'bg-background');
    }

    // Make unoccupied spaces use theme-aware muted colors
    if (cell.isUnused || cell.isSpace) {
      return cn(baseClass, 'border-2 border-border bg-muted');
    }

    // For cells with letters that will be filled by pieces, use transparent
    return cn(baseClass, 'bg-background');
  };

  const pieceTileClass = (piece: LetterPiece) => {
    const baseClass = 'bg-card hover:bg-accent text-card-foreground transition-colors';
    return cn(baseClass, `bg-[${piece.color}]`);
  };

  // Enhanced version that accepts additional classes
  const getPieceTileClass = (piece: LetterPiece, additionalClassName?: string) => {
    return cn(pieceTileClass(piece), additionalClassName);
  };

  const pieceTileDraggingClass = (_piece: DraggableItem, valid: boolean) => {
    const baseClass = 'border-2 border-dashed opacity-100 transition-colors';
    if (valid) {
      return cn(baseClass, 'bg-accent/20 border-primary');
    } else {
      return cn(baseClass, 'bg-destructive/20 border-destructive');
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
      score={gameScore}
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
                  disabled={gameComplete}
                  className="text-xs bg-green-600 hover:bg-green-700"
                >
                  Force Win
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadGame(Math.floor(Math.random() * MOCK_GAMES.length))}
                  className="text-xs"
                >
                  Random Board
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadGame(currentGameIndex)}
                  className="text-xs"
                >
                  Restart Board
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Display */}
      <div className="mb-4 text-center">
        <div className="text-2xl font-black tracking-wide text-foreground">{gameData.category}</div>
      </div>

      {/* Game Content */}
      <div className="flex justify-center">
        <Grid
          gridSize={{
            width: gameData.grid[0]!.length || 8,
            height: gameData.grid.length + 12, // Extend grid height significantly for letter pieces area
            spacing: responsiveCellSpacing,
          }}
          cellSize={responsiveCellSize}
          initialItems={convertGridDataToItems({
            grid: gameData.grid,
            placedPieces: placedPieces,
            pieces: gameData.pieces,
            getTileClassName: (piece) => getPieceTileClass(piece, 'text-2xl font-bold'),
          })}
          onLayoutChange={handleGridLayoutChange}
          defaultBoardTileClassName="bg-card hover:bg-accent transition-colors"
          defaultItemClassName="bg-primary text-primary-foreground"
          getBoardTileClassName={boardTileClass}
          getTileDraggingClassName={pieceTileDraggingClass}
          disabled={gameComplete}
        />
      </div>
      {/* Confetti Animation */}
      {uiState.showConfetti && (
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
        open={uiState.showGameOverModal}
        onOpenChange={(open) => {
          setUIState((prev) => ({ ...prev, showGameOverModal: open }));
          if (!open) {
            setUIState((prev) => ({ ...prev, showConfetti: false }));
            setShowGoldShimmer(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-green-600">
              PUZZLE COMPLETE
            </DialogTitle>
            <DialogDescription className="text-base text-center">
              You solved the puzzle perfectly
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Game Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{gameScore}</div>
                <div className="text-sm text-muted-foreground">Final Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{placedPieces.size}</div>
                <div className="text-sm text-muted-foreground">Pieces Placed</div>
              </div>
            </div>

            {/* Play Again Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => {
                  setUIState((prev) => ({
                    ...prev,
                    showGameOverModal: false,
                    showConfetti: false,
                  }));
                  resetGame();
                }}
                className="w-full"
              >
                PLAY AGAIN
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GameLayout>
  );
};
