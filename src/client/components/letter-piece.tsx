import React, { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { LetterPiece as LetterPieceType } from '../../shared/types/api';

interface LetterPieceProps {
  piece: LetterPieceType;
  isPlaced?: boolean;
  className?: string;
  gameComplete?: boolean;
}

export const LetterPiece: React.FC<LetterPieceProps> = ({
  piece,
  isPlaced = false,
  className = '',
  gameComplete = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: piece.id,
    disabled: gameComplete, // Disable dragging when game is complete
  });

  // Memoize expensive grid calculations
  const { pieceGrid, width } = useMemo(() => {
    // Calculate the bounding box of the piece
    const minRow = Math.min(...piece.shape.map((pos) => pos.row));
    const maxRow = Math.max(...piece.shape.map((pos) => pos.row));
    const minCol = Math.min(...piece.shape.map((pos) => pos.col));
    const maxCol = Math.max(...piece.shape.map((pos) => pos.col));

    const pieceHeight = maxRow - minRow + 1;
    const pieceWidth = maxCol - minCol + 1;

    // Create a grid to display the piece
    const grid: (string | null)[][] = Array(pieceHeight)
      .fill(null)
      .map(() => Array(pieceWidth).fill(null));

    // Fill the piece grid with letters
    piece.shape.forEach((pos, index) => {
      if (pos && typeof index !== 'undefined') {
        const gridRow = pos.row - minRow;
        const gridCol = pos.col - minCol;
        const letter = piece.letters[index];
        if (grid[gridRow] && typeof letter !== 'undefined') {
          grid[gridRow][gridCol] = letter;
        }
      }
    });

    return {
      pieceGrid: grid,
      width: pieceWidth,
    };
  }, [piece.shape, piece.letters]);

  // Memoize class names to prevent unnecessary recalculations
  const baseClasses = useMemo(
    () => `
    inline-block p-1 select-none touch-manipulation
    ${isPlaced ? 'opacity-90' : 'opacity-100'}
    ${gameComplete ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
    ${isDragging ? 'z-50 scale-105' : isPlaced ? 'z-10' : gameComplete ? '' : 'hover:scale-105'}
    ${gameComplete ? '' : 'active:scale-95 active:transition-transform active:duration-75'}
    ${className}
  `,
    [isDragging, isPlaced, className, gameComplete]
  );

  // Use transform3d for better performance and disable transitions during drag
  const style = useMemo(() => {
    if (transform) {
      return {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        willChange: 'transform',
      };
    }
    return {};
  }, [transform]);

  // Memoize the grid template style
  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${width}, 1fr)`,
    }),
    [width]
  );

  return (
    <div
      ref={setNodeRef}
      className={baseClasses}
      style={style}
      {...listeners}
      {...attributes}
      onTouchStart={(e) => {
        // Ensure single touch for better drag handling
        if (e.touches.length === 1) {
          e.preventDefault();
        }
      }}
    >
      <div className="grid gap-1" style={gridStyle}>
        {pieceGrid.map((row, rowIndex) =>
          row.map((letter, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 p-0.5"
            >
              <div
                className={`
                  w-full h-full flex items-center justify-center text-lg font-bold border-2
                  ${letter ? 'text-white border-gray-600 dark:border-gray-400' : 'border-transparent'}`}
                style={{
                  backgroundColor: letter ? piece.color : 'transparent',
                }}
              >
                {letter || ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LetterPiece;
