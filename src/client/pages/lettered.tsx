import React, { useState, useEffect, useCallback, useRef } from 'react';
import Confetti from 'react-confetti';
import { GameLayout } from '../components/GameLayout';
import { toast } from 'sonner';
import { CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { LetteredGameData, GridPosition, LetterPiece, GridCell } from '../../shared/types/api';
import { DEFAULT_INITIAL_SCORE } from '../../shared/score-decay';
import { isDevelopment } from '../lib/dev-utils';
import { getResponsiveCellSize, getResponsiveCellSpacing } from '../lib/lettered-utils';
import { useViewport } from '../hooks/useViewport';
import { Grid, DraggableItem } from '../components/tile-grid/tile-grid';
import { cn } from '@sglara/cn';
import { LetteredGameStateManager } from '../lib/lettered-game-state';
import { apiFetch } from '../lib/utils';
import { LetteredDailyGameResponse, LetteredPostGameResponse } from '../../shared/types/api';

// API functions for daily Lettered game
const fetchTodaysGame = async (): Promise<LetteredDailyGameResponse> => {
  const response = await apiFetch('/api/lettered/game', {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error("Failed to fetch today's game");
  }
  const data = await response.json();
  console.log('fetchTodaysGame', data);
  return data;
};

// API function to fetch postgame stats
const fetchPostGameStats = async (gameId: string): Promise<LetteredPostGameResponse> => {
  const response = await apiFetch(`/api/lettered/${gameId}/postgame`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch postgame stats');
  }
  const data = await response.json();
  console.log('fetchPostGameStats', data);
  return data;
};

// Conversion functions for Grid component
const convertGridDataToItems = ({
  grid,
  placedPieces,
  pieces,
  initialPiecePositions,
  getTileStyle,
  getTileClassName,
}: {
  grid: GridCell[][];
  placedPieces: Map<string, GridPosition>;
  pieces: LetterPiece[];
  initialPiecePositions: Record<string, GridPosition>;
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

  // Add unplaced letter pieces using server-generated initial positions
  const unplacedPieces = pieces.filter((piece) => !placedPieces.has(piece.id));

  for (const piece of unplacedPieces) {
    // Use server-generated initial position
    const initialPosition = initialPiecePositions[piece.id];

    if (!initialPosition) {
      console.warn(`No initial position found for piece ${piece.id}, skipping`);
      continue;
    }

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
      position: { x: initialPosition.col, y: initialPosition.row },
      shape,
      content,
      color,
      disabled: false,
      style: getTileStyle ? getTileStyle(piece) : undefined,
      className: getTileClassName ? getTileClassName(piece) : undefined,
    });
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
  const [dailyGameId, setDailyGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI-specific state
  const [uiState, setUIState] = useState<UIState>({
    showConfetti: false,
    showGameOverModal: false,
    previewPiece: null,
    previewPosition: null,
    lastValidPreviewPosition: null,
    isValidPreview: false,
  });

  // Flag to track if this is a reloaded completed game
  const [isReloadedCompletedGame, setIsReloadedCompletedGame] = useState(false);

  // Postgame stats state
  const [postGameStats, setPostGameStats] = useState<LetteredPostGameResponse | null>(null);
  const [postGameStatsLoading, setPostGameStatsLoading] = useState(false);
  const [postGameStatsError, setPostGameStatsError] = useState<string | null>(null);

  // Game state manager (core game logic, doesn't cause rerenders)
  const gameStateManagerRef = useRef<LetteredGameStateManager | null>(null);

  // Function to sync score with server
  const syncScoreWithServer = useCallback(async () => {
    if (!dailyGameId) return;

    try {
      console.log('[DEBUG] Syncing score with server...');
      const response = await apiFetch(`/api/lettered/${dailyGameId}/session`);
      if (response.ok) {
        const sessionData = await response.json();
        if (sessionData.currentScore !== undefined && gameStateManagerRef.current) {
          gameStateManagerRef.current.setScore(sessionData.currentScore);
          console.log('[DEBUG] Synced score from server:', sessionData.currentScore);
        }
      }
    } catch (error) {
      console.error('[DEBUG] Failed to sync score with server:', error);
    }
  }, [dailyGameId]);

  // State for UI updates from game state manager
  const [gameScore, setGameScore] = useState(DEFAULT_INITIAL_SCORE);
  const [placedPieces, setPlacedPieces] = useState<Map<string, GridPosition>>(new Map());
  const [gameComplete, setGameComplete] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  // Get responsive viewport information
  const { breakpoint } = useViewport();
  const responsiveCellSize = getResponsiveCellSize(breakpoint, gameData?.rows, gameData?.cols);
  const responsiveCellSpacing = getResponsiveCellSpacing(breakpoint);

  // Touch scroll prevention is handled via CSS touch-none and event handlers

  // Initialize game state manager and set up callbacks
  useEffect(() => {
    if (!gameStateManagerRef.current) {
      // Start with default values, will be updated when game loads
      gameStateManagerRef.current = new LetteredGameStateManager();
      // Disable timer initially to prevent decay before restoration
      gameStateManagerRef.current.setTimerEnabled(false);

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

  // Load game data from API
  const loadGame = useCallback(async () => {
    try {
      setLoading(true);

      // Reset flag for new game load
      setIsReloadedCompletedGame(false);

      // Fetch today's daily game
      const gameData = await fetchTodaysGame();

      if (gameData.type !== 'lettered_daily_game') {
        throw new Error('Invalid game response format');
      }

      const { game: apiGameData, session: apiSessionData } = gameData;

      // Convert API game data to client format
      const clientGameData: LetteredGameData = {
        id: apiGameData.id,
        category: apiGameData.category,
        phrase: apiGameData.phrase,
        grid: apiGameData.grid,
        rows: apiGameData.rows,
        cols: apiGameData.cols,
        pieces: apiGameData.pieces,
        initialPiecePositions: apiGameData.initialPiecePositions || {},
        solution: apiGameData.solution,
        solutionHash: apiGameData.solutionHash,
        createdAt: apiGameData.createdAt,
        updatedAt: apiGameData.updatedAt,
      };

      setGameData(clientGameData);
      setDailyGameId(gameData.dailyGameId);

      // Prepare session restoration data
      let initialScoreForManager: number | undefined;
      let gameStartTime: number | undefined;

      if (apiSessionData && Object.keys(apiSessionData.pieces).length > 0) {
        // Use the current score from server and set game start time to now
        // This ensures decay continues properly from the restored score
        initialScoreForManager = apiSessionData.currentScore;
        gameStartTime = Date.now();
      }

      // Initialize game state manager with new game and session data
      if (gameStateManagerRef.current) {
        gameStateManagerRef.current.initializeGame(
          clientGameData,
          initialScoreForManager,
          gameStartTime
        );

        // If we have session data, restore the placed pieces
        if (apiSessionData && Object.keys(apiSessionData.pieces).length > 0) {
          // Check if this is a reloaded completed game
          if (apiSessionData.isCompleted) {
            setIsReloadedCompletedGame(true);
          }

          // Place pieces from the session data
          for (const [pieceId, position] of Object.entries(apiSessionData.pieces)) {
            await gameStateManagerRef.current.placePiece(pieceId, position);
          }

          // Update the score to match the session
          setGameScore(apiSessionData.currentScore);
        }

        // Enable client-side decay for visual feedback, but sync with server values
        gameStateManagerRef.current.setTimerEnabled(true);
        gameStateManagerRef.current.startScoreDecay();

        // Set up score sync callback for periodic server synchronization
        gameStateManagerRef.current.setScoreSyncCallback(() => {
          void syncScoreWithServer();
        });
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
      console.error('Error loading game:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game');
    } finally {
      setLoading(false);
    }
  }, [syncScoreWithServer]);

  useEffect(() => {
    const initializeGame = async () => {
      await loadGame();
    };

    void initializeGame();
  }, [loadGame]);

  // Handle game completion effects (UI side)
  const handleGameComplete = useCallback(() => {
    if (gameWon && gameComplete && !isReloadedCompletedGame) {
      // Only show confetti and modal for NEW completions, not reloaded ones
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
  }, [gameWon, gameComplete, isReloadedCompletedGame]);

  // Function to load postgame stats
  const loadPostGameStats = useCallback(async () => {
    if (!dailyGameId) return;

    setPostGameStatsLoading(true);
    setPostGameStatsError(null);

    try {
      const stats = await fetchPostGameStats(dailyGameId);
      setPostGameStats(stats);
    } catch (error) {
      console.error('Error loading postgame stats:', error);
      setPostGameStatsError(error instanceof Error ? error.message : 'Failed to load stats');
    } finally {
      setPostGameStatsLoading(false);
    }
  }, [dailyGameId]);

  // Handle game completion effects when game state changes
  useEffect(() => {
    return handleGameComplete();
  }, [handleGameComplete]);

  // Load postgame stats when modal opens
  useEffect(() => {
    if (uiState.showGameOverModal && gameComplete && dailyGameId) {
      void loadPostGameStats();
    }
  }, [uiState.showGameOverModal, gameComplete, dailyGameId, loadPostGameStats]);

  // Handle layout changes from the grid
  const handleGridLayoutChange = useCallback(
    async (layout: (string | null)[][]) => {
      if (!gameData || !gameStateManagerRef.current) {
        return;
      }

      // Convert layout to piece positions
      const newPlacedPieces = new Map<string, GridPosition>();

      // Process tray movements if any
      // Layout processing continues below

      // Process each piece to find its anchor point
      const processedPieces = new Set<string>();

      layout.forEach((row, rowIndex) => {
        row.forEach((itemId, colIndex) => {
          if (itemId && !processedPieces.has(itemId)) {
            const piece = gameData.pieces.find((p: LetterPiece) => p.id === itemId);
            if (!piece) return;

            processedPieces.add(itemId);

            // Use this occupied position to calculate anchor point
            const occupiedPos = { row: rowIndex, col: colIndex };

            // Find which shape position corresponds to this occupied position
            // We'll assume this is a valid position and find the matching shape
            let anchorPoint = occupiedPos; // fallback

            for (const shapePos of piece.shape) {
              // Check if this occupied position matches any shape position relative to some anchor
              // We need to find: anchor + shapePos = occupiedPos
              // So: anchor = occupiedPos - shapePos

              const testAnchor = {
                row: occupiedPos.row - shapePos.row,
                col: occupiedPos.col - shapePos.col,
              };

              // Verify this anchor point works for the piece
              let allCellsValid = true;
              for (const testShapePos of piece.shape) {
                const expectedRow = testAnchor.row + testShapePos.row;
                const expectedCol = testAnchor.col + testShapePos.col;

                // Check if this expected position is occupied by the same piece
                const layoutRow = layout[expectedRow];
                if (!layoutRow || layoutRow[expectedCol] !== itemId) {
                  allCellsValid = false;
                  break;
                }
              }

              if (allCellsValid) {
                anchorPoint = testAnchor;
                break;
              }
            }

            newPlacedPieces.set(itemId, anchorPoint);
          }
        });
      });

      // Update game state manager with new piece positions
      const currentPlacedPieces = gameStateManagerRef.current.getPlacedPieces();
      let hasAnyPieceMoved = false;

      for (const [pieceId, newPosition] of newPlacedPieces) {
        const currentPosition = currentPlacedPieces.get(pieceId);
        if (
          !currentPosition ||
          currentPosition.row !== newPosition.row ||
          currentPosition.col !== newPosition.col
        ) {
          await gameStateManagerRef.current.placePiece(pieceId, newPosition);
          hasAnyPieceMoved = true;
        }
      }

      // Remove pieces that are no longer placed
      for (const [pieceId] of currentPlacedPieces) {
        if (!newPlacedPieces.has(pieceId)) {
          // gameStateManagerRef.current.removePiece(pieceId);
          hasAnyPieceMoved = true; // Consider removal as a movement
        }
      }

      // Check if any pieces were added
      for (const [pieceId] of newPlacedPieces) {
        if (!currentPlacedPieces.has(pieceId)) {
          hasAnyPieceMoved = true;
          break;
        }
      }

      // Only save to server if pieces actually moved or layout changed
      if (hasAnyPieceMoved && dailyGameId) {
        try {
          // Send the complete board state
          const currentBoardLayout = gameStateManagerRef.current.getBoardLayout();
          const currentPlacedPieces = gameStateManagerRef.current.getPlacedPieces();

          // Debug: Check for tray area pieces
          const mainGridHeight = gameData.grid.length;
          const trayPieces = Array.from(currentPlacedPieces.entries()).filter(
            ([, position]) => position.row >= mainGridHeight
          );

          console.log(
            `[DEBUG] Piece movement detected, sending to server. Tray pieces: ${trayPieces.length}`
          );

          // Convert placed pieces Map to record for JSON serialization
          const placedPiecesRecord: Record<string, GridPosition> = {};
          for (const [pieceId, position] of currentPlacedPieces.entries()) {
            placedPiecesRecord[pieceId] = position;
          }

          const response = await apiFetch(`/api/lettered/${dailyGameId}/session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              boardState: {
                grid: currentBoardLayout,
                placedPieces: placedPiecesRecord,
              },
              timestamp: Date.now(),
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Failed to save game session:', { errorData });
          } else {
            const result = await response.json();
            console.log('Game session saved successfully:', { result });

            // Update the score to match the server's calculation
            if (result.currentScore !== undefined && gameStateManagerRef.current) {
              gameStateManagerRef.current.setScore(result.currentScore);
              console.log('[DEBUG] Updated score from server:', result.currentScore);
            } else if (result.currentScore === undefined) {
              console.warn('[DEBUG] Server response missing currentScore');
            }
          }
        } catch (error) {
          console.error('Error saving game session:', error);
        }
      } else {
        console.log('[DEBUG] No piece movement detected, skipping server update');
      }
    },
    [gameData, dailyGameId]
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
  const forceGameWin = async () => {
    if (!gameData || !gameStateManagerRef.current) return;

    // Place all pieces in valid positions (simplified for testing)
    for (const [index, piece] of gameData.pieces.entries()) {
      // Simple placement for testing - place pieces in a row
      await gameStateManagerRef.current.placePiece(piece.id, { row: index, col: 0 });
    }
  };

  const boardTileClass = (x: number, y: number) => {
    const baseClass = 'bg-card hover:bg-accent transition-colors';
    // Style board tiles based on the lettered grid data
    const cell = gameData?.grid[y]?.[x];
    if (!cell) {
      // Check if we're in the extended area (below the main board)
      if (y >= (gameData?.grid.length ?? 0)) {
        return 'bg-transparent border-none hover:bg-transparent'; // Make extended area squares invisible
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
    const baseClass = 'text-card-foreground transition-colors';
    return cn(baseClass, piece.color);
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
      onLeaderboard={() => setUIState((prev) => ({ ...prev, showGameOverModal: true }))}
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
                <Button variant="outline" size="sm" onClick={() => loadGame()} className="text-xs">
                  Reload Game
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

      {/* Completion Banner for Reloaded Games */}
      {isReloadedCompletedGame && (
        <div className="p-4 mb-4 rounded-lg border-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div className="flex items-center space-x-3">
              <div>
                <div className="font-semibold">Puzzle Solved</div>
                <div className="text-sm">Check back in tomorrow for a new puzzle</div>
              </div>
            </div>
            <Button
              onClick={() => setUIState((prev) => ({ ...prev, showGameOverModal: true }))}
              variant="outline"
              className="self-start w-full sm:self-auto sm:w-auto"
            >
              View Stats
            </Button>
          </div>
        </div>
      )}

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
            placedPieces:
              placedPieces.size === 0
                ? new Map(Object.entries(gameData.initialPiecePositions))
                : placedPieces,
            pieces: gameData.pieces,
            initialPiecePositions: gameData.initialPiecePositions,
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
        <DialogContent className="p-0 border-4 border-black shadow-2xl bg-card sm:max-w-lg">
          <div className="relative">
            {/* Header Banner */}
            <div className="relative py-6 text-center text-white bg-black">
              <div className="absolute -top-2 -right-2 z-10 px-3 py-1 text-black border-2 border-black transform rotate-12 bg-primary">
                <span className="text-sm font-black tracking-wide">COMPLETE</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white">PUZZLE</h1>
              <h2 className="-mt-1 text-2xl font-black tracking-wider text-white">COMPLETE</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Loading State */}
              {postGameStatsLoading && (
                <div className="py-8 text-center">
                  <div className="text-xl font-bold text-card-foreground">Loading stats...</div>
                </div>
              )}

              {/* Error State */}
              {postGameStatsError && (
                <div className="py-8 text-center">
                  <div className="text-xl font-bold text-destructive">Failed to load stats</div>
                  <div className="mt-2 text-sm text-card-foreground">{postGameStatsError}</div>
                </div>
              )}

              {/* Game Stats */}
              {postGameStats && !postGameStatsLoading && !postGameStatsError && (
                <>
                  {/* Validation Message */}
                  <div className="relative p-4 text-center text-white bg-black border-4 border-black">
                    <div className="mb-1 text-2xl font-black tracking-wide">✓ VALIDATED</div>
                    <div className="text-sm font-bold tracking-wider">SERVER CONFIRMED</div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 text-center bg-white border-4 border-black shadow-lg">
                      <div className="mb-1 text-3xl font-black text-black">
                        {postGameStats.finalScore}
                      </div>
                      <div className="text-sm font-bold tracking-wide text-black">SCORE</div>
                    </div>
                    <div className="p-4 text-center bg-white border-4 border-black shadow-lg">
                      <div className="mb-1 text-3xl font-black text-black">
                        {postGameStats.movesUsed}
                      </div>
                      <div className="text-sm font-bold tracking-wide text-black">MOVES</div>
                    </div>
                    <div className="p-4 text-center bg-white border-4 border-black shadow-lg">
                      <div className="mb-1 text-3xl font-black text-black">
                        {Object.keys(postGameStats.pieces).length}
                      </div>
                      <div className="text-sm font-bold tracking-wide text-black">PIECES</div>
                    </div>
                    <div className="p-4 text-center bg-white border-4 border-black shadow-lg">
                      <div className="mb-1 text-sm font-black leading-tight text-black">
                        {postGameStats.dailyGame.category}
                      </div>
                      <div className="text-sm font-bold tracking-wide text-black">CATEGORY</div>
                    </div>
                  </div>

                  {/* Theme Display */}
                  <div className="p-4 text-center border-4 border-black shadow-lg bg-primary">
                    <div className="mb-1 text-sm font-black tracking-wide text-black">
                      TODAY'S THEME
                    </div>
                    <div className="text-xl font-black leading-tight text-black">
                      {postGameStats.dailyGame.phrase}
                    </div>
                  </div>
                </>
              )}

              {/* Fallback Stats (when API fails) */}
              {!postGameStats && !postGameStatsLoading && !postGameStatsError && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 text-center bg-white border-4 border-black shadow-lg">
                    <div className="mb-1 text-3xl font-black text-black">{gameScore}</div>
                    <div className="text-sm font-bold tracking-wide text-black">SCORE</div>
                  </div>
                  <div className="p-4 text-center bg-white border-4 border-black shadow-lg">
                    <div className="mb-1 text-3xl font-black text-black">{placedPieces.size}</div>
                    <div className="text-sm font-bold tracking-wide text-black">PIECES</div>
                  </div>
                </div>
              )}

              {/* Play Again Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => {
                    setUIState((prev) => ({
                      ...prev,
                      showGameOverModal: false,
                      showConfetti: false,
                    }));
                    setPostGameStats(null); // Reset stats when closing
                    setPostGameStatsError(null);
                    resetGame();
                  }}
                  className="bg-black text-white border-4 border-black font-black text-xl py-4 px-8 shadow-lg hover:shadow-xl transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] tracking-wider"
                >
                  CLOSE
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GameLayout>
  );
};
