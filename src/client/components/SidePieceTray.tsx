import React, {
  useMemo,
  useCallback,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { cn } from '../lib/utils';
import { LetterPiece as LetterPieceType, GridPosition } from '../../shared/types/api';

// Gap size for insertion preview animation
const INSERTION_GAP_SIZE = 40;

// Ref type for SidePieceTray to expose bounds and drop handling
export interface SidePieceTrayRef {
  getBounds: () => DOMRect | null;
  // Check if point is over the tray and return insertion index, or -1 if not over tray
  getInsertionIndex: (clientX: number, clientY: number) => number;
  // Update the drag preview position for insertion indicator
  updateDragPreview: (clientX: number, clientY: number, pieceId: string) => void;
  // Clear the drag preview
  clearDragPreview: () => void;
  // Handle drop at current preview position
  handleDrop: () => { pieceId: string; insertionIndex: number } | null;
}

interface SidePieceTrayProps {
  pieces: LetterPieceType[];
  cellSize: { width: number; height: number };
  cellSpacing: number;
  onPieceDragStart: (
    pieceId: string,
    touchPosition: { clientX: number; clientY: number },
    grabOffset: { x: number; y: number }
  ) => void;
  onPieceDragMove?: (touchPosition: { clientX: number; clientY: number }) => void;
  onPieceDragEnd?: () => void;
  getPieceClassName?: (piece: LetterPieceType) => string | undefined;
  disabled?: boolean;
  hiddenPieceIds?: string[];
  side: 'left' | 'right';
  // Called when a piece is dropped into the tray
  onPieceDropped?: (pieceId: string, insertionIndex: number) => void;
}

interface SideTrayPieceProps {
  piece: LetterPieceType;
  cellSize: { width: number; height: number };
  cellSpacing: number;
  onDragStart: (
    pieceId: string,
    touchPosition: { clientX: number; clientY: number },
    grabOffset: { x: number; y: number }
  ) => void;
  onDragMove?: (touchPosition: { clientX: number; clientY: number }) => void;
  onDragEnd?: () => void;
  className?: string;
  disabled?: boolean;
}

const SideTrayPiece: React.FC<SideTrayPieceProps> = ({
  piece,
  cellSize,
  cellSpacing,
  onDragStart,
  onDragMove,
  onDragEnd,
  className,
  disabled = false,
}) => {
  const pieceContainerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const hasDragStartedRef = useRef(false);
  const [isOverValidTarget, setIsOverValidTarget] = useState(false);

  // Threshold for drag gesture detection
  const DRAG_THRESHOLD = 20;

  const calculateGrabOffset = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!pieceContainerRef.current) {
        const minCol = Math.min(...piece.shape.map((pos) => pos.col));
        const maxCol = Math.max(...piece.shape.map((pos) => pos.col));
        const minRow = Math.min(...piece.shape.map((pos) => pos.row));
        const maxRow = Math.max(...piece.shape.map((pos) => pos.row));
        return {
          x: Math.floor((maxCol - minCol + 1) / 2),
          y: Math.floor((maxRow - minRow + 1) / 2),
        };
      }

      const rect = pieceContainerRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const relativeY = clientY - rect.top;

      const cellX = Math.floor(relativeX / (cellSize.width + cellSpacing));
      const cellY = Math.floor(relativeY / (cellSize.height + cellSpacing));

      const minCol = Math.min(...piece.shape.map((pos) => pos.col));
      const maxCol = Math.max(...piece.shape.map((pos) => pos.col));
      const minRow = Math.min(...piece.shape.map((pos) => pos.row));
      const maxRow = Math.max(...piece.shape.map((pos) => pos.row));
      const width = maxCol - minCol + 1;
      const height = maxRow - minRow + 1;

      return {
        x: Math.max(0, Math.min(cellX, width - 1)),
        y: Math.max(0, Math.min(cellY, height - 1)),
      };
    },
    [piece.shape, cellSize.width, cellSize.height, cellSpacing]
  );

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

  const isValidDragTarget = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    let element: HTMLElement | null = target;
    while (element) {
      if (element.dataset.hasLetter === 'true') return true;
      if (element.dataset.pieceGrid === 'true') return true;
      if (element.dataset.hasLetter === 'false') return false;
      if (element.dataset.pieceContainer === 'true') return false;
      element = element.parentElement;
    }
    return false;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      if (!isValidDragTarget(e.target)) return;

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        id: touch.identifier,
      };
      hasDragStartedRef.current = false;
    },
    [disabled, isValidDragTarget]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      if (hasDragStartedRef.current && touchStartRef.current) {
        const touch = Array.from(e.touches).find((t) => t.identifier === touchStartRef.current?.id);
        if (touch) {
          e.preventDefault();
          e.stopPropagation();
          onDragMove?.({ clientX: touch.clientX, clientY: touch.clientY });
        }
        return;
      }

      if (!touchStartRef.current) return;

      const touch = Array.from(e.touches).find((t) => t.identifier === touchStartRef.current?.id);
      if (!touch) return;

      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Start drag if movement exceeds threshold
      if (distance > DRAG_THRESHOLD) {
        hasDragStartedRef.current = true;
        e.preventDefault();
        e.stopPropagation();

        const grabOffset = calculateGrabOffset(touchStartRef.current.x, touchStartRef.current.y);
        onDragStart(
          piece.id,
          { clientX: touch.clientX, clientY: touch.clientY },
          grabOffset
        );
      }
    },
    [disabled, onDragStart, onDragMove, piece.id, calculateGrabOffset]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const endedTouch = Array.from(e.changedTouches).find(
        (t) => t.identifier === touchStartRef.current?.id
      );
      if (!endedTouch) return;

      if (hasDragStartedRef.current) {
        onDragEnd?.();
      }
      touchStartRef.current = null;
      hasDragStartedRef.current = false;
    },
    [onDragEnd]
  );

  const handleTouchCancel = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const cancelledTouch = Array.from(e.changedTouches).find(
        (t) => t.identifier === touchStartRef.current?.id
      );
      if (!cancelledTouch) return;

      if (hasDragStartedRef.current) {
        onDragEnd?.();
      }
      touchStartRef.current = null;
      hasDragStartedRef.current = false;
    },
    [onDragEnd]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      if (!isValidDragTarget(e.target)) return;

      e.preventDefault();
      e.stopPropagation();

      const grabOffset = calculateGrabOffset(e.clientX, e.clientY);
      onDragStart(piece.id, { clientX: e.clientX, clientY: e.clientY }, grabOffset);
    },
    [disabled, onDragStart, piece.id, isValidDragTarget, calculateGrabOffset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) {
        setIsOverValidTarget(false);
        return;
      }
      setIsOverValidTarget(isValidDragTarget(e.target));
    },
    [disabled, isValidDragTarget]
  );

  const handleMouseLeave = useCallback(() => {
    setIsOverValidTarget(false);
  }, []);

  const pieceWidthPx = width * cellSize.width + (width - 1) * cellSpacing;
  const pieceHeightPx = height * cellSize.height + (height - 1) * cellSpacing;

  return (
    <div
      ref={pieceContainerRef}
      className={cn(
        'flex-shrink-0 select-none',
        'transition-all duration-300 ease-out',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        !disabled && isOverValidTarget ? 'cursor-grab' : 'cursor-default'
      )}
      style={{
        width: pieceWidthPx,
        height: pieceHeightPx,
        touchAction: 'none', // Prevent any browser touch handling for side trays
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-piece-container="true"
    >
      <div
        className="grid h-full"
        style={{
          gridTemplateColumns: `repeat(${width}, ${cellSize.width}px)`,
          gridTemplateRows: `repeat(${height}, ${cellSize.height}px)`,
          gap: cellSpacing,
        }}
        data-piece-grid="true"
      >
        {pieceGrid.map((row, rowIndex) =>
          row.map((letter, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={cn(
                'flex justify-center items-center',
                'text-xl font-bold sm:text-2xl',
                'border border-border',
                'transition-all duration-300',
                letter ? className : 'bg-transparent border-transparent'
              )}
              style={{
                backgroundColor: letter ? piece.color : 'transparent',
              }}
              data-has-letter={letter ? 'true' : 'false'}
            >
              {letter || ''}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const SidePieceTray = forwardRef<SidePieceTrayRef, SidePieceTrayProps>(
  (
    {
      pieces,
      cellSize,
      cellSpacing,
      onPieceDragStart,
      onPieceDragMove,
      onPieceDragEnd,
      getPieceClassName,
      disabled = false,
      hiddenPieceIds = [],
      side,
      onPieceDropped,
    },
    ref
  ) => {
    // Ref for the tray container
    const trayContainerRef = useRef<HTMLDivElement>(null);
    const pieceRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Drag preview state for insertion indicator
    const [dragPreview, setDragPreview] = useState<{
      insertionIndex: number;
      pieceId: string;
    } | null>(null);

    // Get visible pieces (not hidden)
    const visiblePieces = useMemo(() => {
      return pieces.filter((piece) => !hiddenPieceIds.includes(piece.id));
    }, [pieces, hiddenPieceIds]);

    // Calculate insertion index based on cursor position (vertical for side trays)
    const calculateInsertionIndex = useCallback(
      (clientX: number, clientY: number): number => {
        const trayContainer = trayContainerRef.current;
        if (!trayContainer) return -1;

        const trayBounds = trayContainer.getBoundingClientRect();

        // Check if point is within tray bounds (with some horizontal tolerance)
        const horizontalTolerance = 20;
        if (
          clientX < trayBounds.left - horizontalTolerance ||
          clientX > trayBounds.right + horizontalTolerance ||
          clientY < trayBounds.top ||
          clientY > trayBounds.bottom
        ) {
          return -1;
        }

        // Get visible pieces (not being dragged)
        if (visiblePieces.length === 0) return 0;

        // Get piece positions and find insertion point
        const piecePositions: { id: string; top: number; bottom: number; center: number }[] = [];
        for (const piece of visiblePieces) {
          const element = pieceRefs.current.get(piece.id);
          if (element) {
            const rect = element.getBoundingClientRect();
            piecePositions.push({
              id: piece.id,
              top: rect.top,
              bottom: rect.bottom,
              center: rect.top + rect.height / 2,
            });
          }
        }

        // Sort by position
        piecePositions.sort((a, b) => a.top - b.top);

        // Find where to insert
        for (let i = 0; i < piecePositions.length; i++) {
          const pos = piecePositions[i];
          if (pos && clientY < pos.center) {
            // Find the original index of this piece
            const originalIndex = pieces.findIndex((p) => p.id === pos.id);
            return originalIndex >= 0 ? originalIndex : i;
          }
        }

        // Insert at end
        return pieces.length;
      },
      [pieces, visiblePieces]
    );

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        getBounds: () => {
          return trayContainerRef.current?.getBoundingClientRect() ?? null;
        },

        getInsertionIndex: (clientX: number, clientY: number) => {
          return calculateInsertionIndex(clientX, clientY);
        },

        updateDragPreview: (clientX: number, clientY: number, pieceId: string) => {
          const insertionIndex = calculateInsertionIndex(clientX, clientY);
          if (insertionIndex >= 0) {
            setDragPreview({ insertionIndex, pieceId });
          } else {
            setDragPreview(null);
          }
        },

        clearDragPreview: () => {
          setDragPreview(null);
        },

        handleDrop: () => {
          if (!dragPreview) return null;
          const result = { pieceId: dragPreview.pieceId, insertionIndex: dragPreview.insertionIndex };
          setDragPreview(null);
          onPieceDropped?.(result.pieceId, result.insertionIndex);
          return result;
        },
      }),
      [calculateInsertionIndex, dragPreview, onPieceDropped]
    );

    // Register piece ref
    const setPieceRef = useCallback((pieceId: string, element: HTMLDivElement | null) => {
      if (element) {
        pieceRefs.current.set(pieceId, element);
      } else {
        pieceRefs.current.delete(pieceId);
      }
    }, []);

    // Don't render if no visible pieces and no drag preview
    if (visiblePieces.length === 0 && !dragPreview) {
      return null;
    }

    return (
      <div
        ref={trayContainerRef}
        className={cn(
          'flex flex-col items-center gap-3 py-4 px-2',
          'overflow-y-auto overflow-x-hidden',
          'scrollbar-themed',
          'transition-all duration-300 ease-out',
          side === 'left' ? 'items-end' : 'items-start',
          // Highlight when dragging over
          dragPreview ? 'bg-accent/10 rounded-lg' : ''
        )}
        style={{
          maxHeight: '100%',
        }}
        data-tray-drop-zone="true"
      >
        {pieces.map((piece, index) => {
          const isHidden = hiddenPieceIds.includes(piece.id);
          // Show insertion gap before this piece if drag preview is at this index
          const showInsertionGapBefore = dragPreview && dragPreview.insertionIndex === index;

          return (
            <React.Fragment key={piece.id}>
              {/* Insertion gap indicator */}
              {showInsertionGapBefore && (
                <div
                  className="flex-shrink-0 w-full transition-all duration-200 ease-out"
                  style={{
                    height: INSERTION_GAP_SIZE,
                    background:
                      'linear-gradient(180deg, transparent 45%, hsl(var(--primary) / 0.3) 50%, transparent 55%)',
                    borderRadius: 4,
                  }}
                />
              )}
              <div
                ref={(el) => setPieceRef(piece.id, el)}
                className="transition-all duration-200 ease-out"
                style={{
                  opacity: isHidden ? 0 : 1,
                  height: isHidden ? 0 : 'auto',
                  overflow: isHidden ? 'hidden' : 'visible',
                  pointerEvents: isHidden ? 'none' : 'auto',
                  margin: isHidden ? 0 : undefined,
                }}
              >
                <SideTrayPiece
                  piece={piece}
                  cellSize={cellSize}
                  cellSpacing={cellSpacing}
                  onDragStart={onPieceDragStart}
                  onDragMove={onPieceDragMove}
                  onDragEnd={onPieceDragEnd}
                  className={getPieceClassName?.(piece)}
                  disabled={disabled}
                />
              </div>
            </React.Fragment>
          );
        })}
        {/* Insertion gap at end */}
        {dragPreview && dragPreview.insertionIndex >= pieces.length && (
          <div
            className="flex-shrink-0 w-full transition-all duration-200 ease-out"
            style={{
              height: INSERTION_GAP_SIZE,
              background:
                'linear-gradient(180deg, transparent 45%, hsl(var(--primary) / 0.3) 50%, transparent 55%)',
              borderRadius: 4,
            }}
          />
        )}
      </div>
    );
  }
);

SidePieceTray.displayName = 'SidePieceTray';

export default SidePieceTray;

