import React, { useMemo, useCallback, useRef } from 'react';
import { cn } from '../lib/utils';
import { LetterPiece as LetterPieceType, GridPosition } from '../../shared/types/api';

// Threshold in pixels for vertical drag to trigger piece pickup
const VERTICAL_DRAG_THRESHOLD = 20;

interface PieceTrayProps {
  pieces: LetterPieceType[];
  cellSize: { width: number; height: number };
  cellSpacing: number;
  onPieceDragStart: (pieceId: string, touchPosition: { clientX: number; clientY: number }) => void;
  getPieceClassName?: (piece: LetterPieceType) => string | undefined;
  disabled?: boolean;
}

interface TrayPieceProps {
  piece: LetterPieceType;
  cellSize: { width: number; height: number };
  cellSpacing: number;
  onDragStart: (pieceId: string, touchPosition: { clientX: number; clientY: number }) => void;
  className?: string;
  disabled?: boolean;
}

const TrayPiece: React.FC<TrayPieceProps> = ({
  piece,
  cellSize,
  cellSpacing,
  onDragStart,
  className,
  disabled = false,
}) => {
  // Track touch state for gesture detection
  const touchStartRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const hasDragStartedRef = useRef(false);

  // Calculate the grid dimensions for displaying the piece
  const { pieceGrid, width, height } = useMemo(() => {
    const minRow = Math.min(...piece.shape.map((pos: GridPosition) => pos.row));
    const maxRow = Math.max(...piece.shape.map((pos: GridPosition) => pos.row));
    const minCol = Math.min(...piece.shape.map((pos: GridPosition) => pos.col));
    const maxCol = Math.max(...piece.shape.map((pos: GridPosition) => pos.col));

    const pieceHeight = maxRow - minRow + 1;
    const pieceWidth = maxCol - minCol + 1;

    const grid: (string | null)[][] = Array(pieceHeight)
      .fill(null)
      .map(() => Array(pieceWidth).fill(null));

    piece.shape.forEach((pos: GridPosition, index: number) => {
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
      height: pieceHeight,
    };
  }, [piece.shape, piece.letters]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      if (!touch) return;

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        id: touch.identifier,
      };
      hasDragStartedRef.current = false;
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || !touchStartRef.current || hasDragStartedRef.current) return;

      const touch = Array.from(e.touches).find((t) => t.identifier === touchStartRef.current?.id);
      if (!touch) return;

      const deltaY = touch.clientY - touchStartRef.current.y;

      // Check if vertical upward movement exceeds threshold
      // (horizontal movement is handled by native scroll via touch-action: pan-x)
      if (deltaY < -VERTICAL_DRAG_THRESHOLD) {
        // Upward drag detected - start piece drag
        hasDragStartedRef.current = true;
        e.preventDefault();
        e.stopPropagation();

        onDragStart(piece.id, {
          clientX: touch.clientX,
          clientY: touch.clientY,
        });

        // Reset touch state
        touchStartRef.current = null;
      }
      // If horizontal movement is dominant, let native scroll handle it
      // (don't prevent default)
    },
    [disabled, onDragStart, piece.id]
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    hasDragStartedRef.current = false;
  }, []);

  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null;
    hasDragStartedRef.current = false;
  }, []);

  // Mouse support for desktop
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      // On desktop, immediately start drag on click
      onDragStart(piece.id, {
        clientX: e.clientX,
        clientY: e.clientY,
      });
    },
    [disabled, onDragStart, piece.id]
  );

  // Calculate piece dimensions
  const pieceWidthPx = width * cellSize.width + (width - 1) * cellSpacing;
  const pieceHeightPx = height * cellSize.height + (height - 1) * cellSpacing;

  return (
    <div
      className={cn(
        'flex-shrink-0 select-none',
        'transition-all duration-300 ease-out',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
      )}
      style={{
        width: pieceWidthPx,
        height: pieceHeightPx,
        touchAction: 'pan-x', // Allow horizontal scroll, we handle vertical
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
    >
      <div
        className="grid h-full"
        style={{
          gridTemplateColumns: `repeat(${width}, ${cellSize.width}px)`,
          gridTemplateRows: `repeat(${height}, ${cellSize.height}px)`,
          gap: cellSpacing,
        }}
      >
        {pieceGrid.map((row, rowIndex) =>
          row.map((letter, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={cn(
                'flex items-center justify-center',
                'text-xl sm:text-2xl font-bold',
                'border border-border',
                'transition-all duration-300',
                letter ? className : 'border-transparent bg-transparent'
              )}
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

export const PieceTray: React.FC<PieceTrayProps> = ({
  pieces,
  cellSize,
  cellSpacing,
  onPieceDragStart,
  getPieceClassName,
  disabled = false,
}) => {
  // Calculate the height of the tallest piece
  const trayHeight = useMemo(() => {
    if (pieces.length === 0) return 0;

    let maxHeight = 0;
    for (const piece of pieces) {
      const minRow = Math.min(...piece.shape.map((pos: GridPosition) => pos.row));
      const maxRow = Math.max(...piece.shape.map((pos: GridPosition) => pos.row));
      const pieceHeight = maxRow - minRow + 1;
      if (pieceHeight > maxHeight) {
        maxHeight = pieceHeight;
      }
    }

    // Convert to pixels
    return maxHeight * cellSize.height + (maxHeight - 1) * cellSpacing;
  }, [pieces, cellSize.height, cellSpacing]);

  // Don't render if no pieces
  if (pieces.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'w-full overflow-x-auto overflow-y-hidden',
        'transition-all duration-300 ease-out'
      )}
      style={{
        height: trayHeight,
        // Add padding for visual breathing room
        paddingTop: 16,
        paddingBottom: 8,
      }}
    >
      <div
        className={cn('flex items-center gap-4', 'h-full', 'transition-all duration-300 ease-out')}
        style={{
          // Ensure pieces are left-aligned
          justifyContent: 'flex-start',
          minWidth: 'min-content',
        }}
      >
        {pieces.map((piece) => (
          <TrayPiece
            key={piece.id}
            piece={piece}
            cellSize={cellSize}
            cellSpacing={cellSpacing}
            onDragStart={onPieceDragStart}
            className={getPieceClassName?.(piece)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};

export default PieceTray;
