import React, { useMemo } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { GridCell, GridPosition, LetterPiece } from '../../shared/types/api';

interface LetteredGridProps {
  grid: GridCell[][];
  placedPieces: Map<string, GridPosition>; // piece ID -> grid position where it's placed
  pieces: LetterPiece[];
  previewPiece?: LetterPiece | null; // Currently dragged piece for preview
  previewPosition?: GridPosition | null; // Position where preview should be shown
  isValidPreview: boolean; // Whether the current preview position is valid
  draggingFromGrid?: string | null; // ID of piece being dragged from grid (don't render in cells)
  gameComplete?: boolean; // Whether the game is complete
  gameState?: { lastValidPreviewPosition: GridPosition | null }; // Game state containing lastValidPreviewPosition
}

// Component for individual draggable grid cells
interface DraggableGridCellProps {
  cell: GridCell & { pieceColor?: string };
  rowIndex: number;
  colIndex: number;
  className: string;
  style: React.CSSProperties;
  letter: string;
  pieceId: string | null;
  gameComplete: boolean;
}

const DraggableGridCell: React.FC<DraggableGridCellProps> = ({
  cell: _cell,
  rowIndex,
  colIndex,
  className,
  style,
  letter,
  pieceId,
  gameComplete,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: pieceId || `cell-${rowIndex}-${colIndex}`,
    disabled: !pieceId || gameComplete, // Only draggable if there's a piece and game isn't complete
  });

  // Use transform3d for better performance and disable transitions during drag
  const dragStyle = useMemo(() => {
    if (transform) {
      return {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        willChange: 'transform',
      };
    }
    return {};
  }, [transform]);

  return (
    <div
      ref={setNodeRef}
      className="m-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14"
      style={{
        gridRow: rowIndex + 1,
        gridColumn: colIndex + 1,
      }}
    >
      <div
        className={`m-0 aspect-square ${className}`}
        style={{
          ...style,
          ...dragStyle,
          margin: 0,
          padding: 0,
          width: '100%',
          height: '100%',
          pointerEvents: pieceId ? 'auto' : 'inherit',
        }}
        {...listeners}
        {...attributes}
      >
        {letter}
      </div>
    </div>
  );
};

export const LetteredGrid: React.FC<LetteredGridProps> = ({
  grid,
  placedPieces,
  pieces,
  previewPiece,
  previewPosition,
  isValidPreview,
  draggingFromGrid = null,
  gameComplete = false,
  gameState,
}) => {
  // Memoize the display grid to prevent unnecessary recalculations
  // Only show the base grid without placed pieces (since they're rendered as overlays)
  const displayGrid = useMemo((): (GridCell & { pieceColor?: string })[][] => {
    // Just return the base grid without any placed piece modifications
    return grid.map((row) => row.map((cell) => ({ ...cell })));
  }, [grid]);

  // Memoize expensive calculations that don't depend on preview state
  const placedPiecePositions = useMemo(() => {
    const positions = new Map<string, Set<string>>();
    for (const [pieceId, position] of placedPieces.entries()) {
      if (pieceId === draggingFromGrid) continue;
      const piece = pieces.find((p) => p.id === pieceId);
      if (piece) {
        const cellSet = new Set<string>();
        for (const shapePos of piece.shape) {
          if (!shapePos) continue;
          const absoluteRow = position.row + shapePos.row;
          const absoluteCol = position.col + shapePos.col;
          cellSet.add(`${absoluteRow}-${absoluteCol}`);
        }
        positions.set(pieceId, cellSet);
      }
    }
    return positions;
  }, [placedPieces, pieces, draggingFromGrid]);

  // Memoize preview piece positions - use last valid position when current is invalid
  const previewPiecePositions = useMemo(() => {
    if (!previewPiece) return new Set<string>();

    // Use last valid position if current position is invalid, otherwise use current position
    const positionToUse =
      !isValidPreview && gameState?.lastValidPreviewPosition
        ? gameState.lastValidPreviewPosition
        : previewPosition;

    if (!positionToUse) return new Set<string>();

    const cellSet = new Set<string>();
    for (const shapePos of previewPiece.shape) {
      if (!shapePos) continue;
      const absoluteRow = positionToUse.row + shapePos.row;
      const absoluteCol = positionToUse.col + shapePos.col;
      cellSet.add(`${absoluteRow}-${absoluteCol}`);
    }
    return cellSet;
  }, [previewPiece, previewPosition, isValidPreview, gameState?.lastValidPreviewPosition]);

  // Memoize cell to piece ID mapping for faster lookups
  const cellToPieceId = useMemo(() => {
    const cellMap = new Map<string, string>();
    for (const [pieceId, cellSet] of placedPiecePositions.entries()) {
      for (const cellKey of cellSet) {
        cellMap.set(cellKey, pieceId);
      }
    }
    return cellMap;
  }, [placedPiecePositions]);

  // Memoize class name functions for better performance
  const getCellClassName = useMemo(
    () => (cell: GridCell & { pieceColor?: string }, rowIndex: number, colIndex: number) => {
      // Check if this cell is draggable (has a piece and game isn't complete)
      const draggableCellKey = `${rowIndex}-${colIndex}`;
      let isDraggable = false;
      for (const [, cellSet] of placedPiecePositions.entries()) {
        if (cellSet.has(draggableCellKey)) {
          isDraggable = true;
          break;
        }
      }

      const baseClasses =
        isDraggable && !gameComplete
          ? 'w-full h-full flex items-center justify-center text-xl font-black border-2 cursor-grab active:cursor-grabbing m-1'
          : 'w-full h-full flex items-center justify-center text-xl font-black border-2 m-1';

      // Handle placed pieces - check if current cell is covered by any placed piece
      const placedCellKey = `${rowIndex}-${colIndex}`;
      let isPlaced = false;
      let pieceColorClass = '';
      for (const [pieceId, cellSet] of placedPiecePositions.entries()) {
        if (cellSet.has(placedCellKey)) {
          isPlaced = true;
          const piece = pieces.find((p) => p.id === pieceId);
          if (piece?.color) {
            pieceColorClass = piece.color;
          }
          break;
        }
      }
      if (isPlaced) {
        return `${baseClasses} text-black dark:text-black border-black dark:border-gray-600 ${pieceColorClass}`;
      }

      // Handle preview piece - check if current cell is covered by the preview piece
      if (previewPiecePositions.has(placedCellKey)) {
        const previewColorClass = previewPiece?.color || '';
        return `${baseClasses} text-black dark:text-black border-black dark:border-gray-600 ${previewColorClass}`;
      }

      // Cell type styling with touch feedback
      if (cell.isUnused) {
        return `${baseClasses} bg-gray-200 dark:bg-gray-800 border-black dark:border-gray-600 text-gray-600 dark:text-gray-400 transition-colors duration-75`;
      }

      if (cell.isSpace) {
        return `${baseClasses} bg-gray-100 dark:bg-gray-700 border-black dark:border-gray-600 transition-colors duration-75`;
      }

      if (cell.isLetter) {
        if (cell.pieceColor) {
          // Piece is placed here
          return `${baseClasses} text-black dark:text-black border-black dark:border-gray-600`;
        } else if (cell.isPreFilled) {
          // Pre-filled letter (visible)
          return `${baseClasses} bg-white dark:bg-black border-black dark:border-white text-black dark:text-white transition-colors duration-75`;
        } else {
          // Empty letter slot (hidden - show as empty white square)
          return `${baseClasses} bg-white dark:bg-black border-gray-400 dark:border-gray-600 transition-colors duration-75`;
        }
      }

      // Empty cell
      return `${baseClasses} bg-white dark:bg-black border-gray-400 dark:border-gray-600 transition-colors duration-75`;
    },
    [placedPiecePositions, previewPiecePositions, gameComplete]
  );

  const getCellLetter = useMemo(
    () => (cell: GridCell & { pieceColor?: string }, rowIndex: number, colIndex: number) => {
      // Check for placed pieces first - check if current cell is covered by any placed piece
      const cellKey = `${rowIndex}-${colIndex}`;
      for (const [pieceId, cellSet] of placedPiecePositions.entries()) {
        if (cellSet.has(cellKey)) {
          const piece = pieces.find((p) => p.id === pieceId);
          if (piece) {
            // Find the shape index for this cell
            const position = placedPieces.get(pieceId);
            if (position) {
              for (let shapeIndex = 0; shapeIndex < piece.shape.length; shapeIndex++) {
                const shapePos = piece.shape[shapeIndex];
                if (!shapePos) continue;
                const absoluteRow = position.row + shapePos.row;
                const absoluteCol = position.col + shapePos.col;
                if (absoluteRow === rowIndex && absoluteCol === colIndex) {
                  return piece.letters[shapeIndex] || '';
                }
              }
            }
          }
        }
      }

      // Check for preview piece - check if current cell is covered by the preview piece
      if (previewPiecePositions.has(cellKey) && previewPiece) {
        // Use the same position that was used to calculate previewPiecePositions
        const positionToUse =
          !isValidPreview && gameState?.lastValidPreviewPosition
            ? gameState.lastValidPreviewPosition
            : previewPosition;

        if (positionToUse) {
          for (let shapeIndex = 0; shapeIndex < previewPiece.shape.length; shapeIndex++) {
            const shapePos = previewPiece.shape[shapeIndex];
            if (!shapePos) continue;
            const absoluteRow = positionToUse.row + shapePos.row;
            const absoluteCol = positionToUse.col + shapePos.col;
            if (absoluteRow === rowIndex && absoluteCol === colIndex) {
              return previewPiece.letters[shapeIndex] || '';
            }
          }
        }
      }

      // Pre-filled cells show their original letter
      if (cell.isPreFilled) {
        return cell.letter || '';
      }

      return '';
    },
    [
      placedPiecePositions,
      previewPiecePositions,
      placedPieces,
      pieces,
      previewPiece,
      previewPosition,
      isValidPreview,
      gameState?.lastValidPreviewPosition,
    ]
  );

  const getCellStyle = useMemo(
    () => (_cell: GridCell & { pieceColor?: string }, rowIndex: number, colIndex: number) => {
      // Check if current cell is covered by any placed piece
      const cellKey = `${rowIndex}-${colIndex}`;
      for (const [pieceId, cellSet] of placedPiecePositions.entries()) {
        if (cellSet.has(cellKey)) {
          const piece = pieces.find((p) => p.id === pieceId);
          if (piece) {
            return {
              color: 'black',
            };
          }
        }
      }

      // Check if current cell is covered by the preview piece
      if (previewPiecePositions.has(cellKey) && previewPiece) {
        return {
          color: 'black',
        };
      }

      return {};
    },
    [placedPiecePositions, previewPiecePositions, pieces, previewPiece]
  );

  const { setNodeRef } = useDroppable({
    id: 'game-grid',
  });

  return (
    <div className="flex relative justify-center items-center">
      <div
        ref={setNodeRef}
        data-grid="lettered-grid"
        className="grid gap-1 p-3 rounded-none border-4 border-black dark:bg-black dark:border-foreground touch-none"
        style={{
          gridTemplateColumns: `repeat(${grid[0]?.length || 0}, 0fr)`,
          gridTemplateRows: `repeat(${grid.length}, 1fr)`,
          gap: '0.25rem',
          pointerEvents: draggingFromGrid ? 'none' : 'auto',
        }}
      >
        {displayGrid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            // Find if there's a piece at this position using the memoized map
            const cellKey = `${rowIndex}-${colIndex}`;
            let pieceIdAtPosition = cellToPieceId.get(cellKey) || null;
            // Skip pieces being dragged
            if (pieceIdAtPosition === draggingFromGrid) {
              pieceIdAtPosition = null;
            }

            return (
              <DraggableGridCell
                key={`${rowIndex}-${colIndex}`}
                cell={cell}
                rowIndex={rowIndex}
                colIndex={colIndex}
                className={getCellClassName(cell, rowIndex, colIndex)}
                style={getCellStyle(cell, rowIndex, colIndex)}
                letter={getCellLetter(cell, rowIndex, colIndex)}
                pieceId={pieceIdAtPosition}
                gameComplete={gameComplete || false}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default LetteredGrid;
