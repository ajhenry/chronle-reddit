import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { TetrisPiece as TetrisPieceType } from '../../shared/types/api';

interface TetrisPieceProps {
  piece: TetrisPieceType;
  isPlaced?: boolean;
  className?: string;
}

export const TetrisPiece: React.FC<TetrisPieceProps> = ({
  piece,
  isPlaced = false,
  className = '',
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: piece.id,
    disabled: isPlaced,
  });
  // Calculate the bounding box of the piece
  const minRow = Math.min(...piece.shape.map((pos) => pos.row));
  const maxRow = Math.max(...piece.shape.map((pos) => pos.row));
  const minCol = Math.min(...piece.shape.map((pos) => pos.col));
  const maxCol = Math.max(...piece.shape.map((pos) => pos.col));

  const height = maxRow - minRow + 1;
  const width = maxCol - minCol + 1;

  // Create a grid to display the piece
  const pieceGrid: (string | null)[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(null));

  // Fill the piece grid with letters
  piece.shape.forEach((pos, index) => {
    const gridRow = pos.row - minRow;
    const gridCol = pos.col - minCol;
    pieceGrid[gridRow][gridCol] = piece.letters[index];
  });

  const baseClasses = `
    inline-block p-2 rounded-lg border-2 cursor-grab active:cursor-grabbing
    transition-all duration-200 select-none
    ${isDragging ? 'shadow-2xl scale-110 z-50' : 'shadow-lg hover:shadow-xl hover:scale-105'}
    ${isPlaced ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `;

  const pieceStyle = {
    borderColor: piece.color,
    backgroundColor: `${piece.color}20`, // Light background
  };

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        ...pieceStyle,
      }
    : pieceStyle;

  return (
    <div ref={setNodeRef} className={baseClasses} style={style} {...listeners} {...attributes}>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${width}, 1fr)` }}>
        {pieceGrid.map((row, rowIndex) =>
          row.map((letter, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`
                w-8 h-8 flex items-center justify-center text-sm font-bold rounded
                border-2 transition-colors duration-200
                ${letter ? 'text-white border-gray-600' : 'border-transparent'}
              `}
              style={{
                backgroundColor: letter ? piece.color : 'transparent',
              }}
            >
              {letter || ''}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TetrisPiece;
