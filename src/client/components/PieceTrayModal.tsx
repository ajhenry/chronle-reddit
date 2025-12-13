import React, { useMemo, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { LetterPiece as LetterPieceType } from '../../shared/types/api';
import { Button } from './ui/button';

interface PieceTrayModalProps {
  isOpen: boolean;
  onClose: () => void;
  pieces: LetterPieceType[];
  onPieceSelect: (pieceId: string, touchPosition: { clientX: number; clientY: number }) => void;
}

interface TrayPieceProps {
  piece: LetterPieceType;
  onSelect: (pieceId: string, touchPosition: { clientX: number; clientY: number }) => void;
}

const TrayPiece: React.FC<TrayPieceProps> = ({ piece, onSelect }) => {
  // Calculate the grid dimensions for displaying the piece
  const { pieceGrid, width } = useMemo(() => {
    const minRow = Math.min(...piece.shape.map((pos) => pos.row));
    const maxRow = Math.max(...piece.shape.map((pos) => pos.row));
    const minCol = Math.min(...piece.shape.map((pos) => pos.col));
    const maxCol = Math.max(...piece.shape.map((pos) => pos.col));

    const pieceHeight = maxRow - minRow + 1;
    const pieceWidth = maxCol - minCol + 1;

    const grid: (string | null)[][] = Array(pieceHeight)
      .fill(null)
      .map(() => Array(pieceWidth).fill(null));

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

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Get touch/mouse position
      let clientX: number;
      let clientY: number;

      if ('touches' in e) {
        const touch = e.touches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      onSelect(piece.id, { clientX, clientY });
    },
    [piece.id, onSelect]
  );

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${width}, 1fr)`,
    }),
    [width]
  );

  return (
    <div
      className={cn(
        'inline-block p-1 select-none touch-manipulation',
        'cursor-grab active:cursor-grabbing',
        'hover:scale-105 active:scale-95 transition-transform duration-75'
      )}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
    >
      <div className="grid gap-0.5" style={gridStyle}>
        {pieceGrid.map((row, rowIndex) =>
          row.map((letter, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="p-0 w-9 h-9 sm:w-10 sm:h-10 aspect-square"
            >
              <div
                className={cn(
                  'w-full h-full aspect-square flex items-center justify-center text-xl font-black border',
                  letter
                    ? 'text-black bg-white border-black dark:border-white dark:bg-black'
                    : 'border-transparent'
                )}
                style={{
                  backgroundColor: letter
                    ? `var(--chart-${(piece.id.charCodeAt(piece.id.length - 1) % 5) + 1})`
                    : 'transparent',
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

export const PieceTrayModal: React.FC<PieceTrayModalProps> = ({
  isOpen,
  onClose,
  pieces,
  onPieceSelect,
}) => {
  // Don't render anything if not open
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999]',
        'flex flex-col',
        'bg-background/80 backdrop-blur-sm',
        'animate-in fade-in duration-200'
      )}
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">Piece Tray</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Pieces Grid */}
      <div
        className="flex-1 overflow-y-auto px-2 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap justify-center items-start gap-2">
          {pieces.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              All pieces have been placed!
            </div>
          ) : (
            pieces.map((piece) => (
              <TrayPiece
                key={piece.id}
                piece={piece}
                onSelect={onPieceSelect}
              />
            ))
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 text-center text-xs text-muted-foreground border-t border-border">
        {pieces.length} piece{pieces.length !== 1 ? 's' : ''} remaining
      </div>
    </div>
  );
};

export default PieceTrayModal;

