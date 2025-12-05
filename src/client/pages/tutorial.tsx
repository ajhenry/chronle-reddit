import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { Button } from '../components/ui/button';
import { Grid, DraggableItem } from '../components/tile-grid/tile-grid';
import { cn } from '../lib/utils';
import { getResponsiveCellSize, getResponsiveCellSpacing } from '../lib/lettered-utils';
import { useViewport } from '../hooks/useViewport';
import { apiFetch } from '../lib/utils';
import type { GridCell, GridPosition, LetterPiece, LetteredGameData } from '../../shared/types/api';
import { useDragMode } from '../hooks/useDragMode';
import { useTheme } from '../components/theme-provider';

// Static tutorial game data for "THE LION KING"
// This is a simplified puzzle that doesn't require server calls
const createTutorialGameData = (): LetteredGameData => {
  // Grid layout for "THE LION KING" (6 columns x 3 rows for phrase, centered)
  // Row 0: _ T H E _ _ (THE centered)
  // Row 1: _ L I O N _ (LION centered)
  // Row 2: _ K I N G _ (KING centered)
  const cols = 6;
  const rows = 3;

  // Create the grid
  const grid: GridCell[][] = [];

  // Row 0: THE (centered, starts at col 1)
  const row0Letters = [null, 'T', 'H', 'E', null, null];
  grid[0] = row0Letters.map((letter, col) => ({
    letter: letter,
    isLetter: letter !== null,
    isPreFilled: letter === 'T', // T is anchor letter
    isSpace: false,
    isUnused: col === 0 || col >= 4, // First and last 2 cells are unused
  }));

  // Row 1: LION (centered, starts at col 1)
  const row1Letters = [null, 'L', 'I', 'O', 'N', null];
  grid[1] = row1Letters.map((letter, col) => ({
    letter: letter,
    isLetter: letter !== null,
    isPreFilled: letter === 'L', // L is anchor letter
    isSpace: false,
    isUnused: col === 0 || col >= 5, // First and last cells are unused
  }));

  // Row 2: KING (centered, starts at col 1)
  const row2Letters = [null, 'K', 'I', 'N', 'G', null];
  grid[2] = row2Letters.map((letter, col) => ({
    letter: letter,
    isLetter: letter !== null,
    isPreFilled: letter === 'K', // K is anchor letter
    isSpace: false,
    isUnused: col === 0 || col >= 5, // First and last cells are unused
  }));

  // Define letter pieces (the movable tiles)
  const pieces: LetterPiece[] = [
    {
      id: 'piece-he',
      letters: ['H', 'E'],
      shape: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
      color: 'piece-color-blue',
    },
    {
      id: 'piece-ion',
      letters: ['I', 'O', 'N'],
      shape: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
      color: 'piece-color-green',
    },
    {
      id: 'piece-ing',
      letters: ['I', 'N', 'G'],
      shape: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
      color: 'piece-color-purple',
    },
  ];

  // Initial positions (below the main board)
  const initialPiecePositions: Record<string, GridPosition> = {
    'piece-he': { row: 5, col: 0 },
    'piece-ion': { row: 5, col: 3 },
    'piece-ing': { row: 7, col: 1 },
  };

  // Solution positions (where pieces should go - adjusted for centered grid)
  const solution: Record<string, GridPosition> = {
    'piece-he': { row: 0, col: 2 }, // HE goes after T (T is at col 1)
    'piece-ion': { row: 1, col: 2 }, // ION goes after L (L is at col 1)
    'piece-ing': { row: 2, col: 2 }, // ING goes after K (K is at col 1)
  };

  return {
    id: 'tutorial',
    postType: 'custom',
    category: 'DISNEY FILM',
    phrase: 'THE LION KING',
    grid,
    rows,
    cols,
    pieces,
    initialPiecePositions,
    solution,
    seed: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// LETTERED logo component with yellow tile styling
function LetteredLogo() {
  const letters = ['L', 'E', 'T', 'T', 'E', 'R', 'E', 'D'];

  return (
    <div className="flex gap-1">
      {letters.map((letter, index) => (
        <div
          key={index}
          className="flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 bg-[#F7C846] text-black font-black text-base sm:text-xl rounded-sm"
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

// Conversion functions for Grid component (same as lettered.tsx)
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
        const shapeCells = [{ x: 0, y: 0 }];

        const shape = {
          name: `anchor-${row}-${col}`,
          cells: shapeCells,
          width: 1,
          height: 1,
        };

        const anchorPiece: LetterPiece = {
          id: `anchor-${row}-${col}`,
          letters: [cell.letter],
          shape: [{ row: 0, col: 0 }],
          color: '#000000',
        };

        items.push({
          position: { x: col, y: row },
          shape,
          content: cell.letter,
          disabled: true,
          style: {
            ...(getTileStyle ? getTileStyle(anchorPiece) : {}),
            cursor: 'default',
          },
          className: getTileClassName
            ? cn(getTileClassName(anchorPiece), 'text-white')
            : 'bg-black text-background border border-muted',
        });
      }
    }
  }

  // Add unplaced letter pieces using initial positions
  const unplacedPieces = pieces.filter((piece) => !placedPieces.has(piece.id));

  for (const piece of unplacedPieces) {
    const initialPosition = initialPiecePositions[piece.id];

    if (!initialPosition) {
      console.warn(`No initial position found for piece ${piece.id}, skipping`);
      continue;
    }

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

// Check if a piece is placed at its solution position
const isPieceAtSolution = (
  pieceId: string,
  currentPosition: GridPosition,
  solution: Record<string, GridPosition>
): boolean => {
  const solutionPos = solution[pieceId];
  if (!solutionPos) return false;
  return currentPosition.row === solutionPos.row && currentPosition.col === solutionPos.col;
};

// Check if all pieces are at their solution positions
const isGameComplete = (
  placedPieces: Map<string, GridPosition>,
  pieces: LetterPiece[],
  solution: Record<string, GridPosition>
): boolean => {
  // All pieces must be placed at their solution positions
  for (const piece of pieces) {
    const currentPos = placedPieces.get(piece.id);
    if (!currentPos) return false;
    if (!isPieceAtSolution(piece.id, currentPos, solution)) return false;
  }
  return true;
};

export const TutorialPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { breakpoint } = useViewport();
  const { dragMode } = useDragMode();

  // Static game data - created once
  const gameDataRef = useRef<LetteredGameData>(createTutorialGameData());
  const gameData = gameDataRef.current;

  // Game state
  const [placedPieces, setPlacedPieces] = useState<Map<string, GridPosition>>(new Map());
  const [gameComplete, setGameComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Responsive sizing
  const responsiveCellSize = getResponsiveCellSize(breakpoint, gameData.rows, gameData.cols);
  const responsiveCellSpacing = getResponsiveCellSpacing(breakpoint);

  // Parse layout to extract piece positions
  const parseLayoutToPieces = useCallback(
    (layout: (string | null)[][]): Map<string, GridPosition> => {
      const piecesInLayout = new Map<string, GridPosition>();
      const processedPieces = new Set<string>();

      layout.forEach((row, rowIndex) => {
        row.forEach((itemId, colIndex) => {
          if (itemId && itemId.startsWith('piece-') && !processedPieces.has(itemId)) {
            const piece = gameData.pieces.find((p) => p.id === itemId);
            if (!piece) return;

            processedPieces.add(itemId);

            // Calculate anchor position from the first cell found
            const occupiedPos = { row: rowIndex, col: colIndex };

            // Find the correct anchor position by testing each shape cell
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

      return piecesInLayout;
    },
    [gameData.pieces]
  );

  // Check if a given layout would complete the puzzle (for auto-complete during drag)
  const checkPuzzleComplete = useCallback(
    (layout: (string | null)[][]): boolean => {
      if (gameComplete) return false;

      const piecesInLayout = parseLayoutToPieces(layout);

      // Check if all pieces are at their solution positions
      return isGameComplete(piecesInLayout, gameData.pieces, gameData.solution);
    },
    [gameData.pieces, gameData.solution, gameComplete, parseLayoutToPieces]
  );

  // Handle layout changes from the grid
  const handleGridLayoutChange = useCallback(
    (layout: (string | null)[][]) => {
      // Extract piece positions from the layout
      const newPlacedPieces = parseLayoutToPieces(layout);

      setPlacedPieces(newPlacedPieces);

      // Check if game is complete
      if (isGameComplete(newPlacedPieces, gameData.pieces, gameData.solution)) {
        setGameComplete(true);
        setShowConfetti(true);
      }
    },
    [gameData.pieces, gameData.solution, parseLayoutToPieces]
  );

  // Save tutorial completion and navigate home
  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    try {
      await apiFetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tutorialCompleted: true,
        }),
      });
    } catch (error) {
      console.error('Failed to save tutorial completion:', error);
    } finally {
      setIsSaving(false);
      // Navigate to home regardless of save success
      void navigate('/');
    }
  }, [navigate]);

  // Skip tutorial
  const handleSkip = useCallback(async () => {
    await handleComplete();
  }, [handleComplete]);

  // Tile styling
  const pieceTileClass = (piece: LetterPiece) => {
    const baseClass = 'text-primary-foreground transition-all duration-500 overflow-hidden';
    return cn(baseClass, !gameComplete ? piece.color : 'bg-muted-foreground gold-shimmer-number');
  };

  const getPieceTileClass = (piece: LetterPiece, additionalClassName?: string) => {
    return cn(pieceTileClass(piece), additionalClassName);
  };

  const boardTileClass = (x: number, y: number) => {
    const baseClass = 'bg-card hover:bg-accent transition-colors';

    const cell = gameData.grid[y]?.[x];
    if (!cell) {
      if (y >= gameData.grid.length) {
        return 'bg-transparent border-none hover:bg-transparent';
      }
      return 'bg-gray-700';
    }

    if (cell.isPreFilled) {
      return cn(baseClass, 'bg-gray-900 text-white !border-0 !border-border');
    }

    if (cell.isUnused || cell.isSpace) {
      return cn(baseClass, 'border-2 border-border bg-gray-700');
    }

    return cn(baseClass, 'bg-gray-200', theme === 'light' ? '!border-2 !border-gray-700' : '');
  };

  const pieceTileDraggingClass = (_piece: DraggableItem, valid: boolean) => {
    const baseClass = 'border-2 border-dashed opacity-80 transition-colors';
    if (valid) {
      return cn(baseClass, 'bg-accent/20 border-primary');
    } else {
      return cn(baseClass, 'bg-destructive/20 border-destructive');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Welcome Header */}
      <div className="pt-8 pb-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-2xl font-bold text-white">Welcome to</h1>
          <div className="flex justify-center">
            <LetteredLogo />
          </div>
        </div>
      </div>

      {/* Instruction Text */}
      <div className="flex justify-center items-center px-6 h-20">
        {isDragging ? (
          <div className="space-y-1 text-center">
            <p className="text-base text-white/80">
              Drag the piece into place and tap anywhere that isn&apos;t another piece to place it
            </p>
          </div>
        ) : (
          <p className="text-base text-center text-white/80">Tap on a piece to select it</p>
        )}
      </div>

      {/* Category Display */}
      <div className="mb-4 text-center">
        <div className="text-sm font-bold tracking-widest text-white/70">{gameData.category}</div>
      </div>

      {/* Game Grid */}
      <div className="flex flex-1 justify-center px-4">
        <Grid
          key={`${gameComplete}`}
          gridSize={{
            width: gameData.cols,
            height: gameData.rows + 6, // Extra rows for piece staging area
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
          dragMode={dragMode}
          shouldAutoComplete={checkPuzzleComplete}
          hideHintPill={true}
          onDragStateChange={setIsDragging}
        />
      </div>

      {/* Bottom Section */}
      <div className="p-4 mt-auto">
        <div className="mx-auto max-w-2xl">
          {/* Completion Message */}
          {gameComplete && (
            <div className="p-4 mb-4 text-center rounded-lg border-2 border-green-500 bg-green-500/10">
              <h2 className="text-xl font-bold text-white">Puzzle Complete!</h2>
              <p className="text-sm text-white/70">
                You&apos;ve learned how to play Lettered. Ready to try a real puzzle?
              </p>
            </div>
          )}

          {/* Skip/Continue Button */}
          <Button
            onClick={gameComplete ? handleComplete : handleSkip}
            disabled={isSaving}
            className={cn(
              'w-full text-lg font-bold',
              gameComplete ? '' : 'bg-[#F7C846] text-black hover:bg-[#E5B83D] border-0'
            )}
            size="lg"
          >
            {isSaving ? 'Saving...' : gameComplete ? 'Continue' : 'Skip Tutorial'}
          </Button>
        </div>
      </div>

      {/* Confetti Animation */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={400}
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
    </div>
  );
};
