import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { GameLayout } from '../components/GameLayout';
import { toast } from 'sonner';
import { CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PostGameModal } from '../components/PostGameModal';
import { LetteredLoadingAnimation } from '../components/LetteredLoadingAnimation';
import { LetteredInstructionsDialog } from '../components/LetteredInstructionsDialog';
import { InGameCustomButton } from '../components/InGameCustomButton';
import {
  LetteredGameData,
  GridPosition,
  LetterPiece,
  GridCell,
  LetteredCustomGameResponse,
} from '../../shared/types/api';
import { DEFAULT_INITIAL_SCORE } from '../../shared/score-decay';
import { isDevelopment } from '../lib/dev-utils';
import { getResponsiveCellSize, getResponsiveCellSpacing } from '../lib/lettered-utils';
import { useViewport } from '../hooks/useViewport';
import { Grid, DraggableItem } from '../components/tile-grid/tile-grid';
import { cn } from '@sglara/cn';
import { LetteredGameStateManager } from '../lib/lettered-game-state';
import { apiFetch } from '../lib/utils';
import { LetteredDailyGameResponse, LetteredPostGameResponse } from '../../shared/types/api';
import { useTheme } from 'src/components/theme-provider';

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

// API function to fetch custom lettered game
const fetchCustomGame = async (gameId: string): Promise<LetteredCustomGameResponse> => {
  const response = await apiFetch(`/api/custom/lettered/${gameId}`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch custom game');
  }
  const data = await response.json();
  console.log('fetchCustomGame', { data });
  // Transform the response to match the expected format
  return {
    type: 'lettered_custom_game',
    game: data.gameData,
    isCompleted: data.isCompleted,
    gameScore: data.gameScore,
  };
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

// API function to fetch custom game postgame stats
const fetchCustomPostGameStats = async (gameId: string): Promise<LetteredPostGameResponse> => {
  const response = await apiFetch(`/api/custom/lettered/${gameId}/postgame`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch custom game postgame stats');
  }
  const data = await response.json();
  console.log('fetchCustomPostGameStats', data);
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

    items.push({
      position: { x: position.col, y: position.row },
      shape,
      content,
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
          disabled: true, // Anchor letters are immovable
          style: {
            ...(getTileStyle ? getTileStyle(anchorPiece) : {}),
            cursor: 'default', // Override disabled cursor
          },
          className: getTileClassName
            ? cn(getTileClassName(anchorPiece), 'text-white')
            : 'bg-black text-background border border-muted',
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

    items.push({
      position: { x: initialPosition.col, y: initialPosition.row },
      shape,
      content,
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
  const { gameId } = useParams<{ gameId?: string }>();
  const navigate = useNavigate();
  const [showDevButtons, setShowDevButtons] = useState(false);
  const [, setShowGoldShimmer] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
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
  const { theme } = useTheme();

  // Flag to track if this is a reloaded completed game
  const [isReloadedCompletedGame, setIsReloadedCompletedGame] = useState(false);

  // Flag to track if session restoration is in progress
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  // Postgame stats state
  const [postGameStats, setPostGameStats] = useState<LetteredPostGameResponse | null>(null);
  const [postGameStatsLoading, setPostGameStatsLoading] = useState(false);
  const [postGameStatsError, setPostGameStatsError] = useState<string | null>(null);

  // Game state manager (core game logic, doesn't cause rerenders)
  const gameStateManagerRef = useRef<LetteredGameStateManager | null>(null);

  // State for UI updates from game state manager
  const [gameScore, setGameScore] = useState(DEFAULT_INITIAL_SCORE);
  const [placedPieces, setPlacedPieces] = useState<Map<string, GridPosition>>(new Map());
  const [gameComplete, setGameComplete] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [moves, setMoves] = useState(0);

  // Get responsive viewport information
  const { breakpoint } = useViewport();
  const responsiveCellSize = getResponsiveCellSize(breakpoint, gameData?.rows, gameData?.cols);
  const responsiveCellSpacing = getResponsiveCellSpacing(breakpoint);

  // Initialize game state manager and set up callbacks
  useEffect(() => {
    if (!gameStateManagerRef.current) {
      // Start with default values, will be updated when game loads
      gameStateManagerRef.current = new LetteredGameStateManager(
        null,
        undefined,
        undefined,
        undefined,
        0
      );
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
        if (updates.moves !== undefined) {
          setMoves(updates.moves);
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

      // Reset flags for new game load
      setIsReloadedCompletedGame(false);
      setIsRestoringSession(false);
      setMoves(0); // Reset moves for new game

      // Fetch game data - either daily or custom
      let gameData: LetteredDailyGameResponse | LetteredCustomGameResponse;
      if (gameId) {
        // Fetch custom game by ID
        gameData = await fetchCustomGame(gameId);
      } else {
        // Fetch today's daily game
        gameData = await fetchTodaysGame();
      }

      // Handle setting up the game data for custom games
      if (gameData.type === 'lettered_custom_game') {
        const { game: apiGameData, gameScore, isCompleted } = gameData;
        setGameData(apiGameData);

        // Initialize game state manager with new game and session data
        if (gameStateManagerRef.current) {
          gameStateManagerRef.current.initializeGame(
            apiGameData,
            gameScore?.score || DEFAULT_INITIAL_SCORE,
            Date.now(),
            gameScore?.score || DEFAULT_INITIAL_SCORE,
            gameScore?.moves || 0
          );

          // If the game is completed, restore it to the completed state
          if (isCompleted) {
            // Set restoration flags to prevent race conditions
            setIsRestoringSession(true);
            gameStateManagerRef.current.setRestoring(true);
            setIsReloadedCompletedGame(true);

            // Place pieces from the solution to show the completed game
            if (apiGameData.solution) {
              for (const [pieceId, position] of Object.entries(apiGameData.solution)) {
                await gameStateManagerRef.current.placePiece(pieceId, position);
              }
            }

            // Update the score to match the session
            if (gameScore) {
              setGameScore(gameScore.score);
              // Update moves count from server
              setMoves(gameScore.moves);
            }
            // Update the game complete flag
            setGameComplete(true);
            // Update the game won flag
            setGameWon(true);

            // Clear restoration flags after all pieces are restored
            gameStateManagerRef.current.setRestoring(false);
            gameStateManagerRef.current.setTimerEnabled(false);
            setIsRestoringSession(false);
          } else {
            // Enable client-side decay for visual feedback, but sync with server values
            gameStateManagerRef.current.setTimerEnabled(true);
            gameStateManagerRef.current.startScoreDecay();
          }
        }
      }

      // Handle setting up the game data for daily games
      if (gameData.type === 'lettered_daily_game') {
        const { game: apiGameData, session: apiSessionData } = gameData;

        setGameData(apiGameData);
        setDailyGameId(gameData.dailyGameId);

        // Prepare session restoration data
        let initialScoreForManager: number | undefined;
        let currentScoreForManager: number | undefined;
        let gameStartTime: number | undefined;
        let movesForManager: number | undefined;

        // Only use session data for daily games, not custom games
        if (apiSessionData) {
          // Use the original initial score from server for decay calculations
          // and set current score to the restored score
          initialScoreForManager = apiSessionData.initialScore;
          currentScoreForManager = apiSessionData.currentScore;
          gameStartTime = Date.now();
          movesForManager = apiSessionData.moves;

          // Set the moves count from server data
          setMoves(apiSessionData.moves);
        } else {
          // For new games (no session data) or custom games, set the appropriate initial score
          initialScoreForManager = DEFAULT_INITIAL_SCORE;
        }

        // Initialize game state manager with new game and session data
        if (gameStateManagerRef.current) {
          gameStateManagerRef.current.initializeGame(
            apiGameData,
            initialScoreForManager,
            gameStartTime,
            currentScoreForManager,
            movesForManager
          );

          // If we have session data and this is NOT a custom game, restore the placed pieces
          if (apiSessionData) {
            // Set restoration flags to prevent race conditions
            setIsRestoringSession(true);
            gameStateManagerRef.current.setRestoring(true);

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
            // Update moves count from server
            setMoves(apiSessionData.moves);

            // Clear restoration flags after all pieces are restored
            gameStateManagerRef.current.setRestoring(false);
            setIsRestoringSession(false);
          }

          // Enable client-side decay for visual feedback, but sync with server values
          gameStateManagerRef.current.setTimerEnabled(true);
          gameStateManagerRef.current.startScoreDecay();
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const initializeGame = async () => {
      await loadGame();
    };

    void initializeGame();
  }, [loadGame]);

  // Handle game completion effects (UI side)
  const handleGameComplete = useCallback(() => {
    console.log('🚀 handleGameComplete called:', {
      gameWon,
      gameComplete,
      isReloadedCompletedGame,
      gameId,
      isCustomGame: !!gameId,
      hasGameStateManager: !!gameStateManagerRef.current,
    });

    if (gameWon && gameComplete && !isReloadedCompletedGame) {
      // Submit score for custom games
      if (gameId && gameStateManagerRef.current) {
        const finalScore = gameStateManagerRef.current.getScore();
        const startTime = gameStateManagerRef.current.getState()?.gameStartTime;
        const timeElapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

        console.log('📤 Submitting custom game score:', {
          gameId,
          finalScore,
          timeElapsed,
          moves,
          startTime: new Date(startTime).toISOString(),
        });

        // Submit score to custom game endpoint
        apiFetch(`/api/custom/lettered/${gameId}/score`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            score: finalScore,
            timeElapsed: timeElapsed,
            moves: moves,
          }),
        })
          .then((response) => {
            if (response.ok) {
              console.log('✅ Custom game score submitted successfully');
            } else {
              console.error('❌ Failed to submit custom game score, status:', response.status);
            }
          })
          .catch((error) => {
            console.error('💥 Error submitting custom game score:', error);
          });
      } else {
        console.log('⏭️ Score submission skipped:', {
          gameId,
          hasGameStateManager: !!gameStateManagerRef.current,
          reason: !gameId ? 'No gameId' : 'No gameStateManager',
        });
      }

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
  }, [gameWon, gameComplete, isReloadedCompletedGame, gameId, moves]);

  // Function to load postgame stats
  const loadPostGameStats = useCallback(async () => {
    // Handle both custom games and daily games
    if (!dailyGameId && !gameId) return; // Need either dailyGameId or gameId

    setPostGameStatsLoading(true);
    setPostGameStatsError(null);

    try {
      let stats;
      if (gameId) {
        // Custom game - use custom postgame endpoint
        stats = await fetchCustomPostGameStats(gameId);
      } else if (dailyGameId) {
        // Daily game - use regular postgame endpoint
        stats = await fetchPostGameStats(dailyGameId);
      }

      if (stats) {
        setPostGameStats(stats);
      }
    } catch (error) {
      console.error('Error loading postgame stats:', error);
      setPostGameStatsError(error instanceof Error ? error.message : 'Failed to load stats');
    } finally {
      setPostGameStatsLoading(false);
    }
  }, [dailyGameId, gameId]);

  // Handle game completion effects when game state changes
  useEffect(() => {
    console.log('🎮 Game state changed:', {
      gameWon,
      gameComplete,
      isReloadedCompletedGame,
      gameId,
      isCustomGame: !!gameId,
      isDailyGame: !!dailyGameId,
    });

    if (gameWon && gameComplete && !isReloadedCompletedGame) {
      console.log('🎉 Game completed - calling handleGameComplete');
      handleGameComplete();
    } else {
      console.log('❌ Game completion conditions not met:', {
        gameWon,
        gameComplete,
        isReloadedCompletedGame,
        willTrigger: gameWon && gameComplete && !isReloadedCompletedGame,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameWon, gameComplete, isReloadedCompletedGame, handleGameComplete]);

  // Load postgame stats when modal opens (for both daily and custom games)
  useEffect(() => {
    if (uiState.showGameOverModal && gameComplete && (dailyGameId || gameId)) {
      console.log('📊 Loading postgame stats for:', {
        dailyGameId,
        gameId,
        isCustomGame: !!gameId,
      });
      void loadPostGameStats();
    }
  }, [uiState.showGameOverModal, gameComplete, dailyGameId, gameId, loadPostGameStats]);

  // Always refetch stats when modal becomes visible
  const prevModalState = useRef(false);
  useEffect(() => {
    const modalJustOpened = uiState.showGameOverModal && !prevModalState.current;
    prevModalState.current = uiState.showGameOverModal;

    if (modalJustOpened && gameComplete && (dailyGameId || gameId)) {
      // Force refetch by clearing existing stats first
      console.log('🔄 Force refetching postgame stats for:', {
        dailyGameId,
        gameId,
        isCustomGame: !!gameId,
      });
      setPostGameStats(null);
      setPostGameStatsError(null);
      void loadPostGameStats();
    }
  }, [uiState.showGameOverModal, gameComplete, dailyGameId, gameId, loadPostGameStats]);

  // Handle layout changes from the grid
  const handleGridLayoutChange = useCallback(
    async (layout: (string | null)[][]) => {
      if (!gameData || !gameStateManagerRef.current) {
        return;
      }

      // Prevent handling layout changes during session restoration to avoid race conditions
      if (isRestoringSession) {
        console.log('[DEBUG] Skipping layout change during session restoration');
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
      // Skip session saving for custom games
      if (hasAnyPieceMoved && dailyGameId && !gameId) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameData, dailyGameId, isRestoringSession]
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
    // void navigate(0);
  };

  // Development functions
  const forceGameWin = async () => {
    if (!gameData || !gameStateManagerRef.current || !gameId) return;

    console.log('gameData', { gameData, gameId });

    // Place all pieces in valid positions (simplified for testing)
    for (const piece of gameData.pieces) {
      const position = gameData.solution?.[piece.id];
      if (!position) {
        console.warn(`No solution position found for piece ${piece.id}, skipping`);
        continue;
      }
      console.log('placing piece', piece.id, position);
      // Simple placement for testing - place pieces in a row
      await gameStateManagerRef.current.placePiece(piece.id, position);
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
      return 'bg-gray-700'; // Main board
    }

    // Don't style cells that have pre-filled anchor letters (they're rendered as pieces)
    if (cell.isPreFilled) {
      console.log('isPreFilled', cell);
      return cn(baseClass, 'bg-gray-900 text-white !border-0 !border-border');
    }

    // Make unoccupied spaces gray-700
    if (cell.isUnused || cell.isSpace) {
      return cn(baseClass, 'border-2 border-border bg-gray-700');
    }

    // For cells with letters that will be filled by pieces, use gray-200
    return cn(baseClass, 'bg-gray-200', theme === 'light' ? '!border-2 !border-gray-700' : '');
  };

  const pieceTileClass = (piece: LetterPiece) => {
    const baseClass =
      'text-primary-foreground transition-all touch-none duration-500 overflow-hidden';
    return cn(
      baseClass,
      !(
        gameStateManagerRef.current?.isGameComplete() ||
        gameWon ||
        gameComplete ||
        isRestoringSession ||
        isReloadedCompletedGame
      )
        ? piece.color
        : 'bg-muted-foreground gold-shimmer-number'
    );
  };

  // Enhanced version that accepts additional classes
  const getPieceTileClass = (piece: LetterPiece, additionalClassName?: string) => {
    return cn(pieceTileClass(piece), additionalClassName);
  };

  const pieceTileDraggingClass = (_piece: DraggableItem, valid: boolean) => {
    const baseClass = 'border-2 border-dashed opacity-80 transition-colors';
    if (valid) {
      return cn(baseClass, 'bg-accent/20 border-primary');
    } else {
      return cn(baseClass, 'bg-destructive/20 border-destructive');
    }
  };

  // Show loading state
  if (loading) {
    return (
      <GameLayout
        gameTitle="Lettered"
        score={0}
        onBack={handleBackToMenu}
        logoSrc="/lettered-logo.svg"
      >
        <CardContent className="flex justify-center items-center p-8">
          <LetteredLoadingAnimation />
        </CardContent>
      </GameLayout>
    );
  }

  // Show error state
  if (error || !gameData) {
    return (
      <GameLayout
        gameTitle="Lettered"
        score={0}
        onBack={handleBackToMenu}
        logoSrc="/lettered-logo.svg"
      >
        <CardContent className="flex flex-col justify-center items-center p-8 space-y-4">
          <div className="text-lg font-medium text-center text-destructive">
            {error || "Failed to load today's puzzle"}
          </div>
          <Button onClick={() => window.location.reload()} type="button">
            Try Again
          </Button>
        </CardContent>
      </GameLayout>
    );
  }

  return (
    <GameLayout
      gameTitle="Lettered"
      score={gameScore}
      moves={moves}
      onBack={handleBackToMenu}
      onLeaderboard={() => setUIState((prev) => ({ ...prev, showGameOverModal: true }))}
      onHelp={() => setShowInstructions(true)}
      logoSrc="/lettered-logo.svg"
    >
      {/* Development Controls */}
      {isDevelopment() && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDevButtons(!showDevButtons)}
            className="text-xs text-muted-foreground"
            type="button"
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
                  type="button"
                >
                  Force Win
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadGame()}
                  className="text-xs"
                  type="button"
                >
                  Reload Game
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* In-Game Custom Game Button */}
      {!isReloadedCompletedGame && !postGameStats && (
        <div className="flex flex-row justify-center mb-8 space-x-2">
          <InGameCustomButton className={cn('w-auto')} />
          {gameId && (
            <Button
              onClick={() => {
                const date = new Date();
                date.setTime(date.getTime() + 24 * 60 * 60 * 1000);
                const expires = `expires=${date.toUTCString()}`;
                document.cookie = `dailyMode=true;${expires};path=/`;
                void navigate('/?dailyMode=true');
              }}
              variant="outline"
              className="self-start w-auto"
              type="button"
            >
              Play Daily Podium
            </Button>
          )}
        </div>
      )}

      {/* Completion Banner for Reloaded Games */}
      {(isReloadedCompletedGame || postGameStats) && (
        <div className="p-4 mb-4 rounded-lg border-2 border-foreground">
          <div
            className={cn(
              'flex flex-col gap-3',
              !gameId
                ? 'items-start sm:items-center sm:flex-row sm:justify-between'
                : 'sm:items-start'
            )}
          >
            <div className="flex items-start space-x-3">
              <div>
                <div className="font-semibold text-foreground">Puzzle Solved</div>
                <div className="text-sm text-muted-foreground">
                  {!gameId
                    ? 'Check back in tomorrow for a new puzzle'
                    : 'You already solved this puzzle'}
                </div>
              </div>
            </div>
            <div
              className={cn(
                'flex flex-col gap-2 w-full sm:w-auto sm:flex-row',
                !gameId ? 'sm:flex-row' : 'sm:w-full'
              )}
            >
              <Button
                onClick={() => setUIState((prev) => ({ ...prev, showGameOverModal: true }))}
                variant="outline"
                className={cn('self-start w-full', !gameId && 'sm:w-auto')}
                type="button"
              >
                View Stats
              </Button>
              {/* In-Game Custom Game Button */}
              <InGameCustomButton className={cn('w-full', !gameId && 'sm:w-auto')} />
              {gameId && (
                <Button
                  onClick={() => {
                    const date = new Date();
                    date.setTime(date.getTime() + 24 * 60 * 60 * 1000);
                    const expires = `expires=${date.toUTCString()}`;
                    document.cookie = `dailyMode=true;${expires};path=/`;
                    void navigate('/?dailyMode=true');
                  }}
                  variant="secondary"
                  className="self-start w-full"
                  type="button"
                >
                  Play Daily Podium
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Display */}
      <div className="mb-6 text-center">
        <div className="text-2xl font-black tracking-wide uppercase text-foreground">
          {gameData.category}
        </div>
      </div>

      {/* Game Content */}
      <div className="flex justify-center">
        <Grid
          key={`${gameWon}-${isRestoringSession}`}
          gridSize={{
            width: gameData.grid[0]!.length || 8,
            height: gameData.grid.length + 20, // Extend grid height to match server's maxRows for letter pieces area
            spacing: responsiveCellSpacing,
          }}
          cellSize={responsiveCellSize}
          initialItems={convertGridDataToItems({
            grid: gameData.grid,
            placedPieces:
              placedPieces.size === 0 && !isRestoringSession
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
          disabled={gameComplete || isRestoringSession}
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
      <PostGameModal
        open={uiState.showGameOverModal}
        onOpenChange={(open) => {
          setUIState((prev) => ({ ...prev, showGameOverModal: open }));
          if (!open) {
            setUIState((prev) => ({ ...prev, showConfetti: false }));
            setShowGoldShimmer(false);
          }
        }}
        gameType="lettered"
        isCustomGame={!!gameId} // Pass true if this is a custom game
        loading={postGameStatsLoading}
        error={postGameStatsError}
        score={postGameStats?.finalScore ?? gameScore}
        secondaryStatValue={postGameStats?.movesUsed ?? placedPieces.size}
        secondaryStatLabel="MOVES"
        theme={postGameStats?.dailyGame.phrase ?? 'Loading...'}
        leaderboard={postGameStats?.leaderboard}
        playerRank={postGameStats?.rank}
        totalPlayers={postGameStats?.totalPlayers}
        onClose={() => {
          setUIState((prev) => ({
            ...prev,
            showGameOverModal: false,
            showConfetti: false,
          }));
          setPostGameStats(null); // Reset stats when closing
          setPostGameStatsError(null);
          resetGame();
        }}
      />

      {/* Instructions Dialog */}
      <LetteredInstructionsDialog open={showInstructions} onOpenChange={setShowInstructions} />
    </GameLayout>
  );
};
