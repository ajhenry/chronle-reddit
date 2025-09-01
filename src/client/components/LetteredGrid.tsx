import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { GridCell, GridPosition, TetrisPiece } from '../../shared/types/api';

interface LetteredGridProps {
  grid: GridCell[][];
  placedPieces: Map<string, GridPosition>; // piece ID -> grid position where it's placed
  pieces: TetrisPiece[];
}

export const LetteredGrid: React.FC<LetteredGridProps> = ({ grid, placedPieces, pieces }) => {
  // Create a display grid that combines the base grid with placed pieces
  const createDisplayGrid = (): (GridCell & { pieceColor?: string })[][] => {
    // Start with the base grid
    const displayGrid = grid.map((row) => row.map((cell) => ({ ...cell, pieceColor: undefined })));

    // Add placed pieces to the display grid
    for (const [pieceId, position] of placedPieces) {
      const piece = pieces.find((p) => p.id === pieceId);
      if (!piece) continue;

      for (let i = 0; i < piece.shape.length; i++) {
        const shapePos = piece.shape[i];
        const gridRow = position.row + shapePos.row;
        const gridCol = position.col + shapePos.col;

        if (gridRow >= 0 && gridRow < 8 && gridCol >= 0 && gridCol < 8) {
          displayGrid[gridRow][gridCol] = {
            letter: piece.letters[i],
            isPreFilled: false,
            isSpace: false,
            isUnused: false,
            pieceColor: piece.color,
          };
        }
      }
    }

    // Preview functionality removed for simplicity with dnd-kit

    return displayGrid;
  };

  const displayGrid = createDisplayGrid();

  const getCellClassName = (cell: GridCell & { pieceColor?: string }) => {
    const baseClasses =
      'w-full h-full flex items-center justify-center text-lg font-bold border-2 transition-all duration-200';

    // Cell type styling
    if (cell.isUnused) {
      return `${baseClasses} bg-gray-300 border-gray-400 text-gray-600`;
    }

    if (cell.isSpace) {
      return `${baseClasses} bg-gray-200 border-gray-300`;
    }

    if (cell.letter) {
      if (cell.pieceColor) {
        // Piece is placed here
        return `${baseClasses} text-white border-gray-600`;
      } else if (cell.isPreFilled) {
        // Pre-filled letter (visible)
        return `${baseClasses} bg-white border-gray-600 text-black`;
      } else {
        // Empty letter slot (hidden - show as empty white square)
        return `${baseClasses} bg-white border-gray-400`;
      }
    }

    // Empty cell
    return `${baseClasses} bg-white border-gray-400`;
  };

  const getCellStyle = (cell: GridCell & { pieceColor?: string }) => {
    if (cell.pieceColor) {
      return { backgroundColor: cell.pieceColor };
    }
    return {};
  };

  const { setNodeRef } = useDroppable({
    id: 'game-grid',
  });

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        ref={setNodeRef}
        className="grid grid-cols-8 gap-1 p-4 bg-gray-100 rounded-lg border-4 border-gray-800"
      >
        {displayGrid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div key={`${rowIndex}-${colIndex}`} className="aspect-square">
              <div className={getCellClassName(cell)} style={getCellStyle(cell)}>
                {/* Only show letter if it's pre-filled or from a placed piece */}
                {cell.isPreFilled || cell.pieceColor ? cell.letter || '' : ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LetteredGrid;
