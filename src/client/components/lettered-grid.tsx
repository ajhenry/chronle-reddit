import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { GridCell, GridPosition, LetterPiece } from '../../shared/types/api';
import LetterPieceComponent from './letter-piece';

interface LetteredGridProps {
  grid: GridCell[][];
  placedPieces: Map<string, GridPosition>; // piece ID -> grid position where it's placed
  pieces: LetterPiece[];
  previewPiece?: LetterPiece | null; // Currently dragged piece for preview
  previewPosition?: GridPosition | null; // Position where preview should be shown
  isValidPreview?: boolean; // Whether the current preview position is valid
}

export const LetteredGrid: React.FC<LetteredGridProps> = ({
  grid,
  placedPieces,
  pieces,
  previewPiece,
  previewPosition,
  isValidPreview = false,
}) => {
  // Memoize the display grid to prevent unnecessary recalculations
  // Only show the base grid without placed pieces (since they're rendered as overlays)
  const displayGrid = useMemo((): (GridCell & { pieceColor?: string })[][] => {
    // Just return the base grid without any placed piece modifications
    return grid.map((row) => row.map((cell) => ({ ...cell })));
  }, [grid]);

  // Memoize class name functions for better performance
  const getCellClassName = useMemo(
    () => (cell: GridCell & { pieceColor?: string }, rowIndex: number, colIndex: number) => {
      const baseClasses =
        'w-full h-full flex items-center justify-center text-lg font-bold border-2';

      // Handle placed pieces - check if current cell is covered by any placed piece
      let isPlaced = false;
      for (const [pieceId, position] of placedPieces.entries()) {
        const piece = pieces.find((p) => p.id === pieceId);
        if (piece) {
          for (const shapePos of piece.shape) {
            if (!shapePos) continue;
            const absoluteRow = position.row + shapePos.row;
            const absoluteCol = position.col + shapePos.col;
            if (absoluteRow === rowIndex && absoluteCol === colIndex) {
              isPlaced = true;
              break;
            }
          }
          if (isPlaced) break;
        }
      }
      if (isPlaced) {
        return `${baseClasses} text-white dark:text-white border-gray-600 dark:border-gray-400`;
      }

      // Handle preview piece - check if current cell is covered by the preview piece
      if (previewPiece && previewPosition) {
        let isPreview = false;
        for (const shapePos of previewPiece.shape) {
          if (!shapePos) continue;
          const absoluteRow = previewPosition.row + shapePos.row;
          const absoluteCol = previewPosition.col + shapePos.col;
          if (absoluteRow === rowIndex && absoluteCol === colIndex) {
            isPreview = true;
            break;
          }
        }
        if (isPreview) {
          return `${baseClasses} text-white dark:text-white border-gray-600 dark:border-gray-400`;
        }
      }

      // Cell type styling
      if (cell.isUnused) {
        return `${baseClasses} bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-400`;
      }

      if (cell.isSpace) {
        return `${baseClasses} bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500`;
      }

      if (cell.letter) {
        if (cell.pieceColor) {
          // Piece is placed here
          return `${baseClasses} text-white dark:text-white border-gray-600 dark:border-gray-400`;
        } else if (cell.isPreFilled) {
          // Pre-filled letter (visible)
          return `${baseClasses} bg-white dark:bg-gray-800 border-gray-600 dark:border-gray-400 text-black dark:text-white`;
        } else {
          // Empty letter slot (hidden - show as empty white square)
          return `${baseClasses} bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600`;
        }
      }

      // Empty cell
      return `${baseClasses} bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600`;
    },
    [placedPieces, pieces, previewPiece, previewPosition]
  );

  const getCellLetter = useMemo(
    () => (cell: GridCell & { pieceColor?: string }, rowIndex: number, colIndex: number) => {
      // Check for placed pieces first - check if current cell is covered by any placed piece
      for (const [pieceId, position] of placedPieces.entries()) {
        const piece = pieces.find((p) => p.id === pieceId);
        if (piece) {
          // Check if any shape position of this piece covers the current cell
          for (let shapeIndex = 0; shapeIndex < piece.shape.length; shapeIndex++) {
            const shapePos = piece.shape[shapeIndex];
            if (!shapePos) continue;
            const absoluteRow = position.row + shapePos.row;
            const absoluteCol = position.col + shapePos.col;

            if (absoluteRow === rowIndex && absoluteCol === colIndex) {
              // This cell is covered by this piece - return the corresponding letter
              return piece.letters[shapeIndex] || '';
            }
          }
        }
      }

      // Check for preview piece - check if current cell is covered by the preview piece
      if (previewPiece && previewPosition) {
        for (let shapeIndex = 0; shapeIndex < previewPiece.shape.length; shapeIndex++) {
          const shapePos = previewPiece.shape[shapeIndex];
          if (!shapePos) continue;
          const absoluteRow = previewPosition.row + shapePos.row;
          const absoluteCol = previewPosition.col + shapePos.col;

          if (absoluteRow === rowIndex && absoluteCol === colIndex) {
            // This cell is covered by the preview piece - return the corresponding letter
            return previewPiece.letters[shapeIndex] || '';
          }
        }
      }

      // Pre-filled cells show their original letter
      if (cell.isPreFilled) {
        return cell.letter || '';
      }

      return '';
    },
    [placedPieces, pieces, previewPiece, previewPosition]
  );

  const getCellStyle = useMemo(
    () => (_cell: GridCell & { pieceColor?: string }, rowIndex: number, colIndex: number) => {
      // Check if current cell is covered by any placed piece and get its color
      for (const [pieceId, position] of placedPieces.entries()) {
        const piece = pieces.find((p) => p.id === pieceId);
        if (piece) {
          for (const shapePos of piece.shape) {
            if (!shapePos) continue;
            const absoluteRow = position.row + shapePos.row;
            const absoluteCol = position.col + shapePos.col;
            if (absoluteRow === rowIndex && absoluteCol === colIndex) {
              return { backgroundColor: piece.color };
            }
          }
        }
      }

      // Check if current cell is covered by the preview piece
      if (previewPiece && previewPosition) {
        for (const shapePos of previewPiece.shape) {
          if (!shapePos) continue;
          const absoluteRow = previewPosition.row + shapePos.row;
          const absoluteCol = previewPosition.col + shapePos.col;
          if (absoluteRow === rowIndex && absoluteCol === colIndex) {
            return { backgroundColor: previewPiece.color };
          }
        }
      }

      return {};
    },
    [placedPieces, pieces, previewPiece, previewPosition]
  );

  const { setNodeRef } = useDroppable({
    id: 'game-grid',
  });

  console.log('previewPiece', previewPiece);

  return (
    <div className="relative mx-auto">
      <div
        ref={setNodeRef}
        data-grid="lettered-grid"
        className="flex flex-col p-4 bg-gray-100 rounded-lg border-4 border-gray-800 dark:bg-gray-700 dark:border-gray-400"
      >
        {displayGrid.map((row, rowIndex) => (
          <div key={`${rowIndex}`} className="flex">
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="m-0.5 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16"
              >
                <div
                  className={getCellClassName(cell, rowIndex, colIndex)}
                  style={getCellStyle(cell, rowIndex, colIndex)}
                >
                  {/* Only show letter if it's pre-filled */}
                  {getCellLetter(cell, rowIndex, colIndex)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LetteredGrid;
