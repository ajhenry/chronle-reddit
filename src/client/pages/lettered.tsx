import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { navigateTo } from '@devvit/web/client';
import Confetti from 'react-confetti';
import { GameLayout } from '../components/GameLayout';
import { toast } from 'sonner';
import { CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PostGameModal } from '../components/PostGameModal';
import { LetteredLoadingAnimation } from '../components/LetteredLoadingAnimation';
import { LetteredInstructionsDialog } from '../components/LetteredInstructionsDialog';
import { LetteredGameData, GridPosition, LetterPiece, GridCell } from '../../shared/types/api';
import { getResponsiveCellSize, getResponsiveCellSpacing } from '../lib/lettered-utils';
import { useViewport } from '../hooks/useViewport';
import { Grid, DraggableItem, GridRef } from '../components/tile-grid/tile-grid';
import { cn } from '@sglara/cn';
import { LetteredGameStateManager } from '../lib/lettered-game-state';
import { apiFetch } from '../lib/utils';
import { LetteredDailyGameResponse, LetteredPostGameResponse } from '../../shared/types/api';
import { useTheme } from 'src/components/theme-provider';
import { InGameCustomButton } from 'src/components/InGameCustomButton';
import { useDragMode } from '../hooks/useDragMode';
import { PieceTray, PieceTrayRef } from '../components/PieceTray';
import { SidePieceTray, SidePieceTrayRef } from '../components/SidePieceTray';

// API function to fetch a game by ID (works for both daily and custom games)
const fetchGameById = async (gameId: string): Promise<LetteredDailyGameResponse> => {
  const response = await apiFetch(`/api/lettered/${gameId}/game`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch game ${gameId}`);
  }
  const data = await response.json();
  console.log('fetchGameById', { gameId, data });
  return data;
};

// API function to fetch postgame stats (works for both daily and custom games)
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
// Only includes placed pieces and anchor letters (unplaced pieces are shown in the tray modal)
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

  // Note: Unplaced pieces are NOT included here - they are shown in the PieceTrayModal

  return items;
};

// Helper function to convert a LetterPiece to DraggableItem format for external drag
const convertPieceToDraggableItem = (
  piece: LetterPiece,
  getTileClassName?: (piece: LetterPiece) => string | undefined
): Omit<DraggableItem, 'id'> => {
  const shapeCells: { x: number; y: number }[] = piece.shape.map((shapePos) => ({
    x: shapePos.col,
    y: shapePos.row,
  }));

  const width = Math.max(...shapeCells.map((cell) => cell.x)) + 1;
  const height = Math.max(...shapeCells.map((cell) => cell.y)) + 1;

  const shape = {
    name: piece.id,
    cells: shapeCells,
    width,
    height,
  };

  const content = piece.letters.join('') || piece.id;

  return {
    position: { x: 0, y: 0 }, // Will be set during drag
    shape,
    content,
    disabled: false,
    className: getTileClassName ? getTileClassName(piece) : undefined,
  };
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

export const LetteredPage = ({
  onBack,
  isAdmin = false,
  onToggleAdmin,
}: {
  onBack?: () => void;
  isAdmin?: boolean;
  onToggleAdmin?: () => void;
}) => {
  const { gameId: urlGameId } = useParams<{ gameId?: string }>();
  const navigate = useNavigate();
  const [showDebugTools, setShowDebugTools] = useState(false);
  const [, setShowGoldShimmer] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [gameData, setGameData] = useState<LetteredGameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingContext, setIsCheckingContext] = useState<boolean>(true);

  // Game ID from context API (primary source of truth)
  const [contextGameId, setContextGameId] = useState<string | null>(null);
  // Post info for sharing
  const [postId, setPostId] = useState<string | null>(null);
  const [subredditName, setSubredditName] = useState<string | null>(null);

  // Effective game ID - prefer context, fallback to URL param
  const gameId = contextGameId || urlGameId;

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

  // Postgame stats state
  const [postGameStats, setPostGameStats] = useState<LetteredPostGameResponse | null>(null);
  const [postGameStatsLoading, setPostGameStatsLoading] = useState(false);
  const [postGameStatsError, setPostGameStatsError] = useState<string | null>(null);

  // Session ID for debug display
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Game state manager (core game logic, doesn't cause rerenders)
  const gameStateManagerRef = useRef<LetteredGameStateManager | null>(null);

  // State for UI updates from game state manager
  const [elapsedTime, setElapsedTime] = useState(0);
  const [placedPieces, setPlacedPieces] = useState<Map<string, GridPosition>>(new Map());
  const [gameComplete, setGameComplete] = useState(false);
  const [moves, setMoves] = useState(0);

  // Get responsive viewport information
  const { breakpoint } = useViewport();
  const responsiveCellSize = getResponsiveCellSize(breakpoint, gameData?.rows, gameData?.cols);
  const responsiveCellSpacing = getResponsiveCellSpacing(breakpoint);

  // Drag mode preference
  const { dragMode, setDragMode } = useDragMode();

  // Grid ref for external drag
  const gridRef = useRef<GridRef>(null);

  // Tray refs for drop zone detection
  const bottomTrayRef = useRef<PieceTrayRef>(null);
  const leftTrayRef = useRef<SidePieceTrayRef>(null);
  const rightTrayRef = useRef<SidePieceTrayRef>(null);

  // Track which piece is being dragged from the tray (hide immediately when drag starts)
  const [pieceDraggingFromTray, setPieceDraggingFromTray] = useState<string | null>(null);

  // Track piece order for tray (allows reordering when pieces return to tray)
  const [pieceOrder, setPieceOrder] = useState<string[]>([]);

  // Compute unplaced pieces (pieces not yet placed on the grid)
  // Order unplaced pieces according to pieceOrder state
  const unplacedPieces = useMemo(() => {
    if (!gameData) return [];
    const unplaced = gameData.pieces.filter((piece) => !placedPieces.has(piece.id));

    // If pieceOrder is not initialized, return pieces in original order
    if (pieceOrder.length === 0) return unplaced;

    // Sort by pieceOrder, putting unknown pieces at the end
    return [...unplaced].sort((a, b) => {
      const indexA = pieceOrder.indexOf(a.id);
      const indexB = pieceOrder.indexOf(b.id);
      // If piece is not in order, put it at the end
      const effectiveA = indexA === -1 ? Infinity : indexA;
      const effectiveB = indexB === -1 ? Infinity : indexB;
      return effectiveA - effectiveB;
    });
  }, [gameData, placedPieces, pieceOrder]);

  // Check if we're on XL viewport for side trays layout
  const isXLViewport = breakpoint === 'xl';

  // Assign pieces to trays based on initial order (stable assignment)
  // This ensures pieces don't shift between trays when other pieces are placed
  const trayAssignments = useMemo(() => {
    if (!gameData)
      return { left: new Set<string>(), right: new Set<string>(), bottom: new Set<string>() };

    // Use pieceOrder if available, otherwise use original piece order
    const orderedPieceIds = pieceOrder.length > 0 ? pieceOrder : gameData.pieces.map((p) => p.id);

    // Split ALL pieces into 3 groups (not just unplaced)
    const thirdPoint = Math.ceil(orderedPieceIds.length / 3);
    const twoThirdsPoint = Math.ceil((orderedPieceIds.length * 2) / 3);

    return {
      left: new Set(orderedPieceIds.slice(0, thirdPoint)),
      right: new Set(orderedPieceIds.slice(thirdPoint, twoThirdsPoint)),
      bottom: new Set(orderedPieceIds.slice(twoThirdsPoint)),
    };
  }, [gameData, pieceOrder]);

  // Filter unplaced pieces by their stable tray assignment
  const { leftTrayPieces, rightTrayPieces, bottomTrayPiecesXL } = useMemo(() => {
    return {
      leftTrayPieces: unplacedPieces.filter((p) => trayAssignments.left.has(p.id)),
      rightTrayPieces: unplacedPieces.filter((p) => trayAssignments.right.has(p.id)),
      bottomTrayPiecesXL: unplacedPieces.filter((p) => trayAssignments.bottom.has(p.id)),
    };
  }, [unplacedPieces, trayAssignments]);

  // Check for post context and get gameId
  useEffect(() => {
    const checkContext = async () => {
      try {
        console.log('Lettered: Checking for post context...');
        const response = await apiFetch('/api/context');

        if (response.ok) {
          const data = await response.json();
          const metadata = data.context?.metadata;
          const debug = data.context?.debug;

          // Get gameId from context (primary source of truth)
          const gameIdFromContext = metadata?.gameId || metadata?.customGameId || debug?.gameId;

          // Store post info for sharing
          if (metadata?.postId) {
            setPostId(metadata.postId);
          }
          if (metadata?.subredditName) {
            setSubredditName(metadata.subredditName);
          }

          if (gameIdFromContext) {
            console.log('Lettered: Using gameId from context:', gameIdFromContext);
            setContextGameId(gameIdFromContext);
          } else if (!urlGameId) {
            // No gameId from context or URL - this is an error
            console.error('Lettered: No gameId found in context or URL');
            setError(
              'Game ID is required. This post may not have a valid game associated with it.'
            );
          }
        } else {
          // Context API failed - fall back to URL param if available
          if (!urlGameId) {
            setError('Failed to get game context');
          }
        }
      } catch (error) {
        console.error('Lettered: Error checking context:', error);
        // Fall back to URL param if context check fails
        if (!urlGameId) {
          setError('Failed to get game context');
        }
      } finally {
        setIsCheckingContext(false);
      }
    };

    void checkContext();
  }, [urlGameId]);

  // Initialize game state manager and set up callbacks
  useEffect(() => {
    if (!gameStateManagerRef.current) {
      // Start with default values, will be updated when game loads
      gameStateManagerRef.current = new LetteredGameStateManager(null, undefined, 0);

      // Set up callback to receive game state updates
      const unsubscribe = gameStateManagerRef.current.onUpdate((updates) => {
        if (updates.placedPieces) {
          setPlacedPieces(updates.placedPieces);
        }
        if (updates.gameComplete !== undefined) {
          setGameComplete(updates.gameComplete);
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

  // Update elapsed time display every second
  useEffect(() => {
    if (!gameComplete && gameStateManagerRef.current) {
      const timer = setInterval(() => {
        const elapsed = gameStateManagerRef.current?.getElapsedTime() ?? 0;
        setElapsedTime(elapsed);
      }, 100); // Update every 100ms for smooth display

      return () => clearInterval(timer);
    }
  }, [gameComplete]);

  // Load game data from API
  const loadGame = useCallback(async () => {
    try {
      setLoading(true);

      // Game ID is required - all posts must have a gameId
      if (!gameId) {
        throw new Error('Something went wrong fetching the game.');
      }

      // Reset state for new game load
      setMoves(0);

      // Fetch game data using unified endpoint (works for both daily and custom games)
      console.log('Loading game:', gameId);
      const response = await fetchGameById(gameId);
      const { game: apiGameData, session: apiSessionData } = response;
      console.log('response', { response });

      setGameData(apiGameData);

      // Initialize piece order from game data
      if (apiGameData.pieces) {
        setPieceOrder(apiGameData.pieces.map((p) => p.id));
      }

      // Prepare session restoration data
      let gameStartTime: number | undefined;
      let movesForManager: number | undefined;

      // Use session data if available
      if (apiSessionData) {
        // Calculate game start time from timeElapsed
        gameStartTime = Date.now() - apiSessionData.timeElapsed;
        movesForManager = apiSessionData.moves;

        // Set the moves count and elapsed time from server data
        setMoves(apiSessionData.moves);
        setElapsedTime(apiSessionData.timeElapsed);

        // Store session ID for debug display
        setSessionId(apiSessionData.sessionId);

        // Set if the game is complete
        setGameComplete(apiSessionData.isCompleted);
      } else {
        // For new games, start time is now
        gameStartTime = Date.now();
        setSessionId(null);
      }

      // Initialize game state manager with new game and session data
      if (gameStateManagerRef.current) {
        gameStateManagerRef.current.initializeGame(apiGameData, gameStartTime, movesForManager);

        // If we have session data, restore the placed pieces
        if (apiSessionData) {
          // Set restoration flag in manager to prevent first-time completion events
          gameStateManagerRef.current.setRestoring(true);

          // Place pieces from the session data
          for (const [pieceId, position] of Object.entries(apiSessionData.pieces)) {
            await gameStateManagerRef.current.placePiece(pieceId, position);
          }

          // Update moves count from server
          setMoves(apiSessionData.moves);

          // Clear restoration flag after all pieces are restored
          gameStateManagerRef.current.setRestoring(false);

          // Set if the game is complete
          gameStateManagerRef.current.setGameComplete(apiSessionData.isCompleted);
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
  }, [gameId]);

  useEffect(() => {
    const initializeGame = async () => {
      // Wait for context checking to complete before loading the game
      if (!isCheckingContext) {
        await loadGame();
      }
    };

    void initializeGame();
  }, [loadGame, isCheckingContext]);

  // Subscribe to first-time completion events (only fires on fresh wins)
  useEffect(() => {
    if (!gameStateManagerRef.current) return;

    const unsubscribe = gameStateManagerRef.current.onFirstTimeCompletion(() => {
      console.log('First-time completion event received');

      // Show toast for the win
      toast.success('Congratulations!', {
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
    });

    return unsubscribe;
  }, []);

  // Function to load postgame stats
  const loadPostGameStats = useCallback(async () => {
    // gameId is always required
    if (!gameId) return;

    setPostGameStatsLoading(true);
    setPostGameStatsError(null);

    try {
      const stats = await fetchPostGameStats(gameId);
      setPostGameStats(stats);
    } catch (error) {
      console.error('Error loading postgame stats:', error);
      setPostGameStatsError(error instanceof Error ? error.message : 'Failed to load stats');
    } finally {
      setPostGameStatsLoading(false);
    }
  }, [gameId]);

  // Fetch postgame stats when game is complete (for restored completed games)
  useEffect(() => {
    // Fetch stats for completed games - this handles both restored and fresh completions
    // Fresh completions also fetch stats after session save in handleGridLayoutChange
    if (gameId && gameComplete && !loading) {
      console.log('Fetching postgame stats for completed game:', {
        gameId,
        postType: gameData?.postType,
      });
      void loadPostGameStats();
    }
  }, [gameId, gameComplete, loading, gameData?.postType, loadPostGameStats]);

  // Load postgame stats when modal opens
  useEffect(() => {
    if (uiState.showGameOverModal && gameComplete && gameId) {
      console.log('Loading postgame stats for:', {
        gameId,
        postType: gameData?.postType,
      });
      void loadPostGameStats();
    }
  }, [uiState.showGameOverModal, gameComplete, gameId, gameData?.postType, loadPostGameStats]);

  // Always refetch stats when modal becomes visible
  const prevModalState = useRef(false);
  useEffect(() => {
    const modalJustOpened = uiState.showGameOverModal && !prevModalState.current;
    prevModalState.current = uiState.showGameOverModal;

    if (modalJustOpened && gameComplete && gameId) {
      // Force refetch by clearing existing stats first
      console.log('Force refetching postgame stats for:', {
        gameId,
        postType: gameData?.postType,
      });
      setPostGameStats(null);
      setPostGameStatsError(null);
      void loadPostGameStats();
    }
  }, [uiState.showGameOverModal, gameComplete, gameId, gameData?.postType, loadPostGameStats]);

  // Generate a unique signature for a piece based on its letters and shape
  // Pieces with the same signature are interchangeable
  const getPieceSignature = useCallback((piece: LetterPiece): string => {
    const letters = piece.letters.join('');
    const shapeStr = piece.shape
      .map((pos) => `${pos.row},${pos.col}`)
      .sort()
      .join(';');
    return `${letters}:${shapeStr}`;
  }, []);

  // Check if a given layout would complete the puzzle (for auto-complete during drag)
  // Handles identical pieces that can be validly swapped
  const checkPuzzleComplete = useCallback(
    (layout: (string | null)[][]): boolean => {
      console.log(`[checkPuzzleComplete] START`);
      console.log(`[checkPuzzleComplete] Layout pieces:`, layout.flat().filter(Boolean));

      if (!gameData || !gameData.solution || gameComplete) {
        console.log(
          `[checkPuzzleComplete] EARLY EXIT - gameData=${!!gameData}, solution=${!!gameData?.solution}, gameComplete=${gameComplete}`
        );
        return false;
      }

      // Parse the layout to extract piece positions
      const piecesInLayout = new Map<string, { row: number; col: number }>();
      const processedPieces = new Set<string>();

      layout.forEach((row, rowIndex) => {
        row.forEach((itemId, colIndex) => {
          if (itemId && !processedPieces.has(itemId) && !itemId.startsWith('anchor-')) {
            const piece = gameData.pieces.find((p) => p.id === itemId);
            if (!piece) return;

            processedPieces.add(itemId);

            // Calculate anchor position from the first cell found
            const occupiedPos = { row: rowIndex, col: colIndex };

            // Find the correct anchor position
            for (const shapePos of piece.shape) {
              const testAnchor = {
                row: occupiedPos.row - shapePos.row,
                col: occupiedPos.col - shapePos.col,
              };

              // Verify this anchor works for all cells of the piece
              let allCellsValid = true;
              for (const testShapePos of piece.shape) {
                const expectedRow = testAnchor.row + testShapePos.row;
                const expectedCol = testAnchor.col + testShapePos.col;
                const layoutRow = layout[expectedRow];
                if (!layoutRow || layoutRow[expectedCol] !== itemId) {
                  allCellsValid = false;
                  break;
                }
              }

              if (allCellsValid) {
                piecesInLayout.set(itemId, testAnchor);
                break;
              }
            }
          }
        });
      });

      // Check if all pieces are in their solution positions
      const mainGridHeight = gameData.grid.length;
      const mainGridWidth = gameData.grid[0]?.length || 0;

      // Filter out pieces in the tray area (below main grid)
      const mainBoardPieces = Array.from(piecesInLayout.entries()).filter(([, position]) => {
        return position.row < mainGridHeight && position.col < mainGridWidth;
      });

      // All pieces must be on the main board
      console.log(
        `[checkPuzzleComplete] mainBoardPieces=${mainBoardPieces.length}, totalPieces=${gameData.pieces.length}`
      );
      if (mainBoardPieces.length !== gameData.pieces.length) {
        console.log(`[checkPuzzleComplete] Not all pieces on board yet`);
        return false;
      }

      // Group pieces by their signature (identical pieces can be swapped)
      const piecesBySignature = new Map<string, LetterPiece[]>();
      for (const piece of gameData.pieces) {
        const signature = getPieceSignature(piece);
        const group = piecesBySignature.get(signature) || [];
        group.push(piece);
        piecesBySignature.set(signature, group);
      }

      // For each group of identical pieces, check if placed positions match solution positions
      for (const [signature, groupPieces] of piecesBySignature) {
        // Get the solution positions for all pieces in this group
        const solutionPositions = groupPieces
          .map((piece) => {
            const pos = gameData.solution[piece.id];
            return pos ? `${pos.row},${pos.col}` : null;
          })
          .filter(Boolean)
          .sort();

        // Get the placed positions for all pieces in this group
        const placedPositions = groupPieces
          .map((piece) => {
            const pos = piecesInLayout.get(piece.id);
            // Only count positions within the main grid
            if (pos && pos.row < mainGridHeight && pos.col < mainGridWidth) {
              return `${pos.row},${pos.col}`;
            }
            return null;
          })
          .filter(Boolean)
          .sort();

        // Check if the sets of positions match (order doesn't matter for identical pieces)
        if (solutionPositions.length !== placedPositions.length) {
          console.log(`[checkPuzzleComplete] Position count mismatch for group ${signature}`);
          return false;
        }

        for (let i = 0; i < solutionPositions.length; i++) {
          if (solutionPositions[i] !== placedPositions[i]) {
            console.log(
              `[checkPuzzleComplete] Position mismatch for identical pieces: ${signature}`,
              { solutionPositions, placedPositions }
            );
            return false;
          }
        }
      }

      console.log(`[checkPuzzleComplete] All pieces correct! Returning true`);
      return true;
    },
    [gameData, gameComplete, getPieceSignature]
  );

  // Handle layout changes from the grid
  const handleGridLayoutChange = useCallback(
    async (layout: (string | null)[][]) => {
      console.log(`[handleGridLayoutChange] START`);
      console.log(`[handleGridLayoutChange] Layout pieces:`, layout.flat().filter(Boolean));

      if (!gameStateManagerRef.current) {
        console.log(`[handleGridLayoutChange] EARLY EXIT - no gameStateManagerRef`);
        return;
      }

      // Note: We intentionally do NOT clear pieceDraggingFromTray here.
      // This callback fires whenever the grid layout changes, including during active drags.
      // The piece visibility is managed by:
      // 1. hiddenPieceIds prop (hides piece during drag via pieceDraggingFromTray)
      // 2. unplacedPieces (piece removed after successful placement when placedPieces updates)
      // 3. handleExternalDragInvalid (clears pieceDraggingFromTray on invalid drop/cancel)

      // Delegate all game logic to the game state manager
      const result = await gameStateManagerRef.current.updateFromLayout(layout);
      console.log(`[handleGridLayoutChange] updateFromLayout result:`, result);

      // Only make network request if pieces actually changed
      if (result.hasChanges && gameId) {
        try {
          const response = await apiFetch(`/api/lettered/${gameId}/session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              boardState: {
                grid: result.boardLayout,
                placedPieces: result.placedPieces,
              },
              timestamp: Date.now(),
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Failed to save game session:', { errorData });
          } else {
            const responseData = await response.json();
            console.log('Game session saved successfully:', { result: responseData });

            // Fetch postgame stats after session save completes when user wins
            // This ensures leaderboard entry is saved before we fetch stats
            if (responseData.hasWon) {
              console.log('User won! Fetching postgame stats after session save...');
              void loadPostGameStats();
            }
          }
        } catch (error) {
          console.error('Error saving game session:', error);
        }
      }
    },
    [gameId, loadPostGameStats]
  );

  const handleBackToMenu = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleCreateGame = () => {
    void navigate('/custom');
  };

  // Create a random game and navigate to its Reddit post
  const handlePlayAnother = async () => {
    try {
      const response = await apiFetch('/api/lettered/random', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create random game');
      }

      const data = await response.json();
      console.log('Created random game:', data);

      // Navigate to the new Reddit post using Devvit's navigateTo
      if (data.postPermalink) {
        navigateTo(data.postPermalink);
      } else {
        // Fallback to navigating within the app
        void navigate(`/game/${data.gameId}`);
      }
    } catch (error) {
      console.error('Error creating random game:', error);
      toast.error('Failed to create new game');
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

  // Clear session and reset game to initial state
  const clearSession = async () => {
    if (!gameId) return;

    try {
      const response = await apiFetch(`/api/lettered/${gameId}/session`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to clear session:', errorData);
        toast.error('Failed to clear session');
        return;
      }

      toast.success('Session cleared');
      // Reload the game to start fresh
      await loadGame();
    } catch (error) {
      console.error('Error clearing session:', error);
      toast.error('Error clearing session');
    }
  };

  // Regenerate game by clearing local state and reloading
  const regenerateGame = async () => {
    if (!gameStateManagerRef.current) return;

    // Clear local state
    setPlacedPieces(new Map());
    setGameComplete(false);
    setMoves(0);
    setElapsedTime(0);
    setPostGameStats(null);
    setUIState({
      showConfetti: false,
      showGameOverModal: false,
      previewPiece: null,
      previewPosition: null,
      lastValidPreviewPosition: null,
      isValidPreview: false,
    });

    // Clear session on server and reload
    await clearSession();
  };

  // Reset all pieces back to the tray (doesn't clear moves or time)
  const handleResetPieces = useCallback(() => {
    if (!gridRef.current || !gameData) return;

    // Deactivate any active tap-drag mode first (hides Place/Remove buttons)
    gridRef.current.deactivateTapDrag();

    // Get all items currently on the grid and remove only player-placed pieces
    // (exclude anchor letters which have IDs starting with "anchor-")
    const items = gridRef.current.getItems();
    const playerPieces = items.filter((item) => !item.id.startsWith('anchor-'));

    for (const item of playerPieces) {
      gridRef.current.removeItem(item.id);
    }

    // Clear placed pieces in game state manager
    if (gameStateManagerRef.current) {
      gameStateManagerRef.current.removePieces(playerPieces.map((item) => item.id));
    }

    // Clear any active drag state
    setPieceDraggingFromTray(null);

    console.log(`[handleResetPieces] Reset ${playerPieces.length} pieces back to tray`);
  }, [gameData]);

  // Clear leaderboard entries for current game (admin only)
  const clearGameLeaderboard = async () => {
    if (!gameId) return;

    try {
      const response = await apiFetch(`/api/admin/lettered/${gameId}/leaderboard`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to clear leaderboard:', errorData);
        toast.error('Failed to clear leaderboard');
        return;
      }

      const data = await response.json();
      toast.success(`Leaderboard cleared (${data.data.deletedCount} entries)`);
      // Reload postgame stats
      await loadPostGameStats();
    } catch (error) {
      console.error('Error clearing leaderboard:', error);
      toast.error('Error clearing leaderboard');
    }
  };

  // Clear all player stats for current game (admin only)
  const clearGameStats = async () => {
    if (!gameId) return;

    try {
      const response = await apiFetch(`/api/admin/lettered/${gameId}/stats`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to clear game stats:', errorData);
        toast.error('Failed to clear game stats');
        return;
      }

      const data = await response.json();
      toast.success(
        `Game stats cleared (${data.data.sessionsDeleted} sessions, ${data.data.submissionsDeleted} submissions)`
      );
      // Reload the game to refresh state
      await loadGame();
    } catch (error) {
      console.error('Error clearing game stats:', error);
      toast.error('Error clearing game stats');
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
      return cn(baseClass, 'bg-gray-900 text-white !border-0 !border-border');
    }

    // Make unoccupied spaces gray-700
    if (cell.isUnused || cell.isSpace) {
      return cn(baseClass, 'border-2 border-border bg-gray-700');
    }

    // For cells with letters that will be filled by pieces, use gray-200
    return cn(baseClass, 'bg-gray-200', theme === 'light' ? '!border-2 !border-gray-700' : '');
  };

  const pieceTileClass = useCallback(
    (piece: LetterPiece) => {
      const baseClass = 'text-primary-foreground transition-all duration-500 overflow-hidden';
      return cn(
        baseClass,
        !(gameStateManagerRef.current?.isGameComplete() || gameComplete)
          ? piece.color
          : 'bg-muted-foreground gold-shimmer-number'
      );
    },
    [gameComplete]
  );

  // Enhanced version that accepts additional classes
  const getPieceTileClass = useCallback(
    (piece: LetterPiece, additionalClassName?: string) => {
      return cn(pieceTileClass(piece), additionalClassName);
    },
    [pieceTileClass]
  );

  // Handle piece drag start from tray
  const handlePieceDragStart = useCallback(
    (
      pieceId: string,
      touchPosition: { clientX: number; clientY: number },
      grabOffset: { x: number; y: number }
    ) => {
      console.log(`[handlePieceDragStart] START - pieceId=${pieceId}, grabOffset=`, grabOffset);
      if (!gameData || !gridRef.current) {
        console.log(`[handlePieceDragStart] EARLY EXIT - no gameData or gridRef`);
        return;
      }

      const piece = gameData.pieces.find((p) => p.id === pieceId);
      if (!piece) {
        console.log(`[handlePieceDragStart] EARLY EXIT - piece not found`);
        return;
      }

      // Immediately hide the piece in the tray
      setPieceDraggingFromTray(pieceId);

      // Convert piece to draggable item format
      const draggableItem = convertPieceToDraggableItem(piece, (p) =>
        getPieceTileClass(p, 'text-2xl font-bold')
      );
      console.log(
        `[handlePieceDragStart] Created draggableItem with shape.name=${draggableItem.shape.name}`
      );

      // Start external drag on the grid with the grab offset from tray
      gridRef.current.startExternalDrag(draggableItem, touchPosition, grabOffset);
      console.log(`[handlePieceDragStart] Called startExternalDrag with grabOffset`);
    },
    [gameData, getPieceTileClass]
  );

  // Handle piece drag move from tray (forwards touch position to update cursor preview)
  // This is needed on mobile where global listeners may not be attached immediately
  const handlePieceDragMove = useCallback((touchPosition: { clientX: number; clientY: number }) => {
    if (!gridRef.current) return;
    gridRef.current.updateCursorPosition(touchPosition);
  }, []);

  // Handle piece drag end from tray (touch ended before global listeners took over)
  const handlePieceDragEnd = useCallback(() => {
    if (!gridRef.current) return;
    gridRef.current.cancelCursorPreview();
  }, []);

  // Handle invalid drop from external drag (piece returns to tray)
  const handleExternalDragInvalid = useCallback((itemId: string) => {
    console.log(
      `[handleExternalDragInvalid] Piece ${itemId} dropped in invalid position, returning to tray`
    );
    // Only clear the dragging state if it matches the invalidated piece
    // This prevents clearing a NEW piece's drag when an OLD piece is cancelled
    setPieceDraggingFromTray((current) => (current === itemId ? null : current));
  }, []);

  // Handle invalid placement attempt (user tried to place piece on blocked tile)
  const handleInvalidPlacement = useCallback((itemId: string) => {
    console.log(
      `[handleInvalidPlacement] Piece ${itemId} cannot be placed on blocked tile, returning to tray`
    );
    // Toast removed - visual feedback from invalid animation is sufficient
  }, []);

  const pieceTileDraggingClass = (_piece: DraggableItem, valid: boolean) => {
    if (valid) {
      return cn(
        'border-2 border-dashed opacity-80 transition-colors',
        'bg-accent/20 border-primary'
      );
    } else {
      // Invalid styling - piece turns red with breathing opacity animation
      return cn('border-2 border-solid', '!bg-red-500 border-red-600', 'animate-invalid-breathe');
    }
  };

  // Check if a cell is blocked (black tile or pre-filled - cannot place pieces on it)
  const isCellBlocked = useCallback(
    (x: number, y: number) => {
      if (!gameData) return false;

      const cell = gameData.grid[y]?.[x];
      if (!cell) return true; // Out of bounds is considered blocked

      // Blocked cells include:
      // - isUnused: empty black tiles
      // - isSpace: space characters (gaps between words)
      // - isPreFilled: anchor letters (already have a fixed letter)
      return cell.isUnused || cell.isSpace || cell.isPreFilled || false;
    },
    [gameData]
  );

  // Handle when pieces are removed due to overlap during placement
  const handlePiecesRemoved = useCallback((pieceIds: string[]) => {
    console.log(`[handlePiecesRemoved] Pieces returned to tray: ${pieceIds.join(', ')}`);
    // Explicitly remove pieces from the game state manager
    // (They are already removed from the Grid's items state)
    if (gameStateManagerRef.current) {
      gameStateManagerRef.current.removePieces(pieceIds);
    }
    // If any of the removed pieces was marked as dragging from tray (stale state),
    // clear that state so the piece shows correctly in the tray
    setPieceDraggingFromTray((current) => (current && pieceIds.includes(current) ? null : current));
  }, []);

  // Handle when a piece enters or leaves the grid bounds during drag
  // Note: We intentionally don't clear pieceDraggingFromTray here when pieceId is null.
  // The piece will naturally disappear from the tray once it's placed (unplacedPieces updates),
  // and if it's returned to tray, handleExternalDragInvalid clears it.
  const handleDragOverGridChange = useCallback((_pieceId: string | null) => {
    // Currently unused - piece visibility is handled by:
    // 1. hiddenPieceIds prop (hides piece during drag)
    // 2. unplacedPieces (piece removed after successful placement)
    // 3. handleExternalDragInvalid (clears pieceDraggingFromTray on invalid drop)
  }, []);

  // Handle drag move - update tray preview for insertion indicator
  const handleDragMove = useCallback(
    (position: { clientX: number; clientY: number }, itemId: string) => {
      // Update all tray refs with the current drag position
      bottomTrayRef.current?.updateDragPreview(position.clientX, position.clientY, itemId);
      leftTrayRef.current?.updateDragPreview(position.clientX, position.clientY, itemId);
      rightTrayRef.current?.updateDragPreview(position.clientX, position.clientY, itemId);
    },
    []
  );

  // Handle piece dropped outside grid - check if it was dropped on a tray
  const handleDragToTray = useCallback(
    (itemId: string, position: { clientX: number; clientY: number }): boolean => {
      // Check each tray to see if the drop was over it
      const trays = [bottomTrayRef.current, leftTrayRef.current, rightTrayRef.current];

      for (const tray of trays) {
        if (!tray) continue;
        const insertionInfo = tray.getInsertionInfo(position.clientX, position.clientY);
        if (insertionInfo) {
          console.log(
            `[handleDragToTray] Piece ${itemId} dropped to tray, insert before: ${insertionInfo.insertBeforePieceId ?? 'end'}`
          );

          // Clear the drag preview
          tray.clearDragPreview();

          // Update piece order using insertBeforePieceId for correct positioning
          setPieceOrder((currentOrder) => {
            // Remove the piece from its current position if it exists
            const newOrder = currentOrder.filter((id) => id !== itemId);

            if (insertionInfo.insertBeforePieceId) {
              // Insert before the specified piece
              const insertIndex = newOrder.indexOf(insertionInfo.insertBeforePieceId);
              if (insertIndex >= 0) {
                newOrder.splice(insertIndex, 0, itemId);
              } else {
                // If piece not found (shouldn't happen), append to end
                newOrder.push(itemId);
              }
            } else {
              // Insert at end
              newOrder.push(itemId);
            }

            return newOrder;
          });

          // Clear dragging state
          setPieceDraggingFromTray(null);

          // Remove from placed pieces in game state
          if (gameStateManagerRef.current) {
            gameStateManagerRef.current.removePiece(itemId);
          }

          return true; // Drop was handled
        }
      }

      // Clear all tray previews since drop wasn't on any tray
      bottomTrayRef.current?.clearDragPreview();
      leftTrayRef.current?.clearDragPreview();
      rightTrayRef.current?.clearDragPreview();

      return false; // Drop was not handled by any tray
    },
    []
  );

  // Handle piece dropped into tray (callback from PieceTray)
  const handlePieceDroppedToTray = useCallback((pieceId: string, insertionIndex: number) => {
    console.log(`[handlePieceDroppedToTray] Piece ${pieceId} inserted at index ${insertionIndex}`);
    // The piece order update is already handled in handleDragToTray
    // This callback is for additional side effects if needed
  }, []);

  // Show error state (check before loading to show errors from context check early)
  if (error) {
    return (
      <GameLayout
        gameTitle="Lettered"
        time={0}
        moves={0}
        onBack={handleBackToMenu}
        onCreateGame={handleCreateGame}
        postId={postId}
        subredditName={subredditName}
        logoSrc="/lettered-logo.svg"
      >
        <CardContent className="flex flex-col justify-center items-center p-8 space-y-4">
          <div className="text-lg font-medium text-center text-destructive">{error}</div>
          <Button onClick={() => window.location.reload()} type="button">
            Try Again
          </Button>
        </CardContent>
      </GameLayout>
    );
  }

  // Show loading state (includes context checking and game loading)
  if (isCheckingContext || loading) {
    return (
      <GameLayout
        gameTitle="Lettered"
        time={0}
        moves={0}
        onBack={handleBackToMenu}
        onCreateGame={handleCreateGame}
        postId={postId}
        subredditName={subredditName}
        logoSrc="/lettered-logo.svg"
      >
        <CardContent className="flex justify-center items-center p-8">
          <LetteredLoadingAnimation />
        </CardContent>
      </GameLayout>
    );
  }

  // Show error state for missing game data
  if (!gameData) {
    return (
      <GameLayout
        gameTitle="Lettered"
        time={0}
        moves={0}
        onBack={handleBackToMenu}
        onCreateGame={handleCreateGame}
        postId={postId}
        subredditName={subredditName}
        logoSrc="/lettered-logo.svg"
      >
        <CardContent className="flex flex-col justify-center items-center p-8 space-y-4">
          <div className="text-lg font-medium text-center text-destructive">
            Failed to load puzzle
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
      time={elapsedTime}
      moves={moves}
      onBack={handleBackToMenu}
      onReset={handleResetPieces}
      onLeaderboard={() => setUIState((prev) => ({ ...prev, showGameOverModal: true }))}
      onHelp={() => setShowInstructions(true)}
      onCreateGame={handleCreateGame}
      postId={postId}
      subredditName={subredditName}
      logoSrc="/lettered-logo.svg"
      dragMode={dragMode}
      onDragModeChange={setDragMode}
      gameComplete={gameComplete}
    >
      {/* Admin Debug Controls */}
      {isAdmin && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebugTools(!showDebugTools)}
            className="text-xs text-muted-foreground"
            type="button"
          >
            {showDebugTools ? 'Hide Debug Tools' : 'Show Debug Tools'}
          </Button>

          {showDebugTools && (
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
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearSession}
                  className="text-xs"
                  type="button"
                >
                  Clear Session
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={regenerateGame}
                  className="text-xs text-white bg-amber-600 hover:bg-amber-700"
                  type="button"
                >
                  Regenerate Game
                </Button>
              </div>
              {/* Admin-only Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearGameLeaderboard}
                  className="text-xs bg-red-700 hover:bg-red-800"
                  type="button"
                >
                  Clear Leaderboard
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearGameStats}
                  className="text-xs bg-red-900 hover:bg-red-950"
                  type="button"
                >
                  Clear All Game Stats
                </Button>
              </div>
              {/* Debug Info */}
              <div className="p-2 font-mono text-xs rounded-md bg-muted">
                <div>Game ID: {gameId || 'N/A'}</div>
                <div>Session ID: {sessionId || 'N/A'}</div>
                <div>Moves: {moves}</div>
                <div>Time: {Math.floor(elapsedTime / 1000)}s</div>
                <div>Game Complete: {gameComplete ? 'Yes' : 'No'}</div>
                <div>
                  Pieces Placed: {placedPieces.size}/{gameData?.pieces.length || 0}
                </div>
              </div>
              {/* Toggle Admin Mode */}
              {onToggleAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleAdmin}
                  className="w-full text-xs"
                  type="button"
                >
                  Hide Admin Mode (`)
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Completion Banner for Completed Games */}
      {gameComplete && (
        <div className="p-4 mx-auto mb-4 max-w-2xl rounded-lg border-2 border-foreground">
          <div
            className={cn(
              'flex flex-col gap-3',
              gameData.postType === 'daily'
                ? 'items-start sm:items-center sm:flex-row sm:justify-between'
                : 'sm:items-start'
            )}
          >
            <div className="flex items-start space-x-3">
              <div>
                <div className="font-semibold text-foreground">Puzzle Solved</div>
                <div className="text-sm text-muted-foreground">
                  {gameData.postType === 'daily'
                    ? 'Check back in tomorrow for a new puzzle'
                    : 'Congrats, you solved the puzzle'}
                </div>
              </div>
            </div>
            <div
              className={cn(
                'flex flex-col gap-2 w-full sm:w-auto sm:flex-row flex-wrap',
                gameData.postType === 'daily' ? 'sm:flex-row' : 'sm:w-full'
              )}
            >
              <Button
                onClick={() => void handlePlayAnother()}
                className={cn(
                  'w-full bg-[#F7C846] text-black hover:bg-[#E5B83D]',
                  gameData.postType === 'daily' && 'sm:w-auto'
                )}
                type="button"
              >
                Play Another
              </Button>
              <Button
                onClick={() => setUIState((prev) => ({ ...prev, showGameOverModal: true }))}
                variant="outline"
                className={cn('w-full', gameData.postType === 'daily' && 'sm:w-auto')}
                type="button"
              >
                View Stats
              </Button>
              {/* In-Game Custom Game Button */}
              <InGameCustomButton
                className={cn('w-full', gameData.postType === 'daily' && 'sm:w-auto')}
                postId={postId}
                subredditName={subredditName}
              />
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
      {/* XL viewport: 3-column layout with side trays and bottom tray */}
      {isXLViewport && !gameComplete ? (
        (() => {
          // Calculate board dimensions for tray sizing
          const gridCols = gameData.grid[0]!.length || 8;
          const gridRows = gameData.grid.length;
          const boardWidth =
            gridCols * responsiveCellSize.width + (gridCols - 1) * responsiveCellSpacing;
          const boardHeight =
            gridRows * responsiveCellSize.height + (gridRows - 1) * responsiveCellSpacing;

          return (
            <div className="flex flex-col gap-4 items-center">
              <div className="flex gap-6 justify-center items-stretch">
                {/* Left Piece Tray */}
                <div className="flex-shrink-0" style={{ minHeight: boardHeight }}>
                  <SidePieceTray
                    ref={leftTrayRef}
                    pieces={leftTrayPieces}
                    cellSize={responsiveCellSize}
                    cellSpacing={responsiveCellSpacing}
                    onPieceDragStart={handlePieceDragStart}
                    onPieceDragMove={handlePieceDragMove}
                    onPieceDragEnd={handlePieceDragEnd}
                    getPieceClassName={(piece) => getPieceTileClass(piece, 'text-2xl font-bold')}
                    disabled={gameComplete}
                    hiddenPieceIds={pieceDraggingFromTray ? [pieceDraggingFromTray] : []}
                    side="left"
                    onPieceDropped={handlePieceDroppedToTray}
                  />
                </div>

                {/* Grid */}
                <div className="flex-shrink-0">
                  <Grid
                    ref={gridRef}
                    key={`${gameComplete}`}
                    gridSize={{
                      width: gridCols,
                      height: gridRows,
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
                    dragMode="hold-to-drag"
                    shouldAutoComplete={checkPuzzleComplete}
                    hideBanner={uiState.showGameOverModal || showInstructions}
                    onExternalDragInvalid={handleExternalDragInvalid}
                    onInvalidPlacement={handleInvalidPlacement}
                    unplacedPieceCount={unplacedPieces.length}
                    isCellBlocked={isCellBlocked}
                    onPiecesRemoved={handlePiecesRemoved}
                    onDragOverGridChange={handleDragOverGridChange}
                    onDragMove={handleDragMove}
                    onDragToTray={handleDragToTray}
                  />
                </div>

                {/* Right Piece Tray */}
                <div className="flex-shrink-0" style={{ minHeight: boardHeight }}>
                  <SidePieceTray
                    ref={rightTrayRef}
                    pieces={rightTrayPieces}
                    cellSize={responsiveCellSize}
                    cellSpacing={responsiveCellSpacing}
                    onPieceDragStart={handlePieceDragStart}
                    onPieceDragMove={handlePieceDragMove}
                    onPieceDragEnd={handlePieceDragEnd}
                    getPieceClassName={(piece) => getPieceTileClass(piece, 'text-2xl font-bold')}
                    disabled={gameComplete}
                    hiddenPieceIds={pieceDraggingFromTray ? [pieceDraggingFromTray] : []}
                    side="right"
                    onPieceDropped={handlePieceDroppedToTray}
                  />
                </div>
              </div>

              {/* Bottom Piece Tray for XL */}
              <div className="flex justify-center" style={{ minWidth: boardWidth }}>
                <PieceTray
                  ref={bottomTrayRef}
                  pieces={bottomTrayPiecesXL}
                  cellSize={responsiveCellSize}
                  cellSpacing={responsiveCellSpacing}
                  onPieceDragStart={handlePieceDragStart}
                  onPieceDragMove={handlePieceDragMove}
                  onPieceDragEnd={handlePieceDragEnd}
                  getPieceClassName={(piece) => getPieceTileClass(piece, 'text-2xl font-bold')}
                  disabled={gameComplete}
                  hiddenPieceIds={pieceDraggingFromTray ? [pieceDraggingFromTray] : []}
                  onPieceDropped={handlePieceDroppedToTray}
                />
              </div>
            </div>
          );
        })()
      ) : (
        <>
          {/* Standard layout for smaller viewports or completed games */}
          <div className="flex justify-center">
            <Grid
              ref={gridRef}
              key={`${gameComplete}`}
              gridSize={{
                width: gameData.grid[0]!.length || 8,
                height: gameData.grid.length,
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
              dragMode={dragMode}
              shouldAutoComplete={checkPuzzleComplete}
              hideBanner={uiState.showGameOverModal || showInstructions}
              onExternalDragInvalid={handleExternalDragInvalid}
              onInvalidPlacement={handleInvalidPlacement}
              unplacedPieceCount={unplacedPieces.length}
              isCellBlocked={isCellBlocked}
              onPiecesRemoved={handlePiecesRemoved}
              onDragOverGridChange={handleDragOverGridChange}
              onDragMove={handleDragMove}
              onDragToTray={handleDragToTray}
            />
          </div>

          {/* Piece Tray */}
          <div className="flex justify-center">
            <PieceTray
              ref={bottomTrayRef}
              pieces={unplacedPieces}
              cellSize={responsiveCellSize}
              cellSpacing={responsiveCellSpacing}
              onPieceDragStart={handlePieceDragStart}
              onPieceDragMove={handlePieceDragMove}
              onPieceDragEnd={handlePieceDragEnd}
              getPieceClassName={(piece) => getPieceTileClass(piece, 'text-2xl font-bold')}
              disabled={gameComplete}
              hiddenPieceIds={pieceDraggingFromTray ? [pieceDraggingFromTray] : []}
              onPieceDropped={handlePieceDroppedToTray}
            />
          </div>
        </>
      )}
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
        isCustomGame={gameData.postType === 'custom'}
        loading={postGameStatsLoading}
        error={postGameStatsError}
        time={postGameStats?.timeElapsed ?? elapsedTime}
        moves={postGameStats?.movesUsed ?? moves}
        theme={postGameStats?.game.phrase ?? '—'}
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
