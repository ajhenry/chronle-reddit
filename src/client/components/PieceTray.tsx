import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { LetterPiece as LetterPieceType, GridPosition } from '../../shared/types/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Threshold in pixels for upward movement to trigger piece pickup
const DRAG_THRESHOLD = 20;
// Maximum angle from vertical (in degrees) that still counts as a drag gesture
// 60 degrees means horizontal movement can be up to ~1.73x the vertical movement
const MAX_DRAG_ANGLE_DEGREES = 60;
const MAX_DRAG_ANGLE_TAN = Math.tan((MAX_DRAG_ANGLE_DEGREES * Math.PI) / 180); // ~1.73

interface PieceTrayProps {
  pieces: LetterPieceType[];
  cellSize: { width: number; height: number };
  cellSpacing: number;
  onPieceDragStart: (pieceId: string, touchPosition: { clientX: number; clientY: number }) => void;
  getPieceClassName?: (piece: LetterPieceType) => string | undefined;
  disabled?: boolean;
  // IDs of pieces that should be hidden (e.g., when being dragged over the grid)
  hiddenPieceIds?: string[];
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
  // Track if user is in scroll mode (horizontal movement detected first)
  const scrollModeRef = useRef(false);
  // Track if mouse is over a valid drag target (for cursor)
  const [isOverValidTarget, setIsOverValidTarget] = useState(false);

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

  // Check if a touch/click target is on an actual letter cell (not dead zone)
  const isValidDragTarget = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    // Walk up the DOM tree to find if we're on a valid drag target
    let element: HTMLElement | null = target;
    while (element) {
      // Allow drag from letter cells
      if (element.dataset.hasLetter === 'true') {
        return true;
      }
      // Allow drag from the grid wrapper (gaps between cells)
      if (element.dataset.pieceGrid === 'true') {
        return true;
      }
      // Block drag from empty cells (dead zones)
      if (element.dataset.hasLetter === 'false') {
        return false;
      }
      // Stop at the piece container
      if (element.dataset.pieceContainer === 'true') {
        return false;
      }
      element = element.parentElement;
    }
    return false;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      if (!touch) return;

      // Only track touch if it started on a valid letter cell
      if (!isValidDragTarget(e.target)) return;

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        id: touch.identifier,
      };
      hasDragStartedRef.current = false;
      scrollModeRef.current = false;
    },
    [disabled, isValidDragTarget]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || !touchStartRef.current || hasDragStartedRef.current) return;

      const touch = Array.from(e.touches).find((t) => t.identifier === touchStartRef.current?.id);
      if (!touch) return;

      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = touch.clientY - touchStartRef.current.y;
      const absDeltaY = Math.abs(deltaY);

      // Calculate if the gesture is within the allowed drag angle (60 degrees from vertical)
      // If horizontal movement is greater than tan(60) * vertical movement, it's a scroll gesture
      const isWithinDragAngle = absDeltaY > 0 && deltaX / absDeltaY <= MAX_DRAG_ANGLE_TAN;

      // Lock into scroll mode if movement is too horizontal (outside drag angle cone)
      if (!scrollModeRef.current && absDeltaY > 5 && !isWithinDragAngle) {
        scrollModeRef.current = true;
      }

      // Trigger drag if:
      // 1. NOT in scroll mode
      // 2. Upward movement exceeds threshold (negative deltaY)
      // 3. Gesture is within the allowed drag angle
      if (!scrollModeRef.current && deltaY < -DRAG_THRESHOLD && isWithinDragAngle) {
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
      // If in scroll mode, let native scroll handle it (don't prevent default)
    },
    [disabled, onDragStart, piece.id]
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    hasDragStartedRef.current = false;
    scrollModeRef.current = false;
  }, []);

  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null;
    hasDragStartedRef.current = false;
    scrollModeRef.current = false;
  }, []);

  // Mouse support for desktop
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      // Only allow drag if click was on a valid letter cell (not dead zone)
      if (!isValidDragTarget(e.target)) return;

      e.preventDefault();
      e.stopPropagation();

      // On desktop, immediately start drag on click
      onDragStart(piece.id, {
        clientX: e.clientX,
        clientY: e.clientY,
      });
    },
    [disabled, onDragStart, piece.id, isValidDragTarget]
  );

  // Track mouse position to update cursor based on whether we're over a valid target
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) {
        setIsOverValidTarget(false);
        return;
      }
      const isValid = isValidDragTarget(e.target);
      setIsOverValidTarget(isValid);
    },
    [disabled, isValidDragTarget]
  );

  // Reset cursor state when mouse leaves the piece
  const handleMouseLeave = useCallback(() => {
    setIsOverValidTarget(false);
  }, []);

  // Calculate piece dimensions
  const pieceWidthPx = width * cellSize.width + (width - 1) * cellSpacing;
  const pieceHeightPx = height * cellSize.height + (height - 1) * cellSpacing;

  return (
    <div
      className={cn(
        'flex-shrink-0 select-none',
        'transition-all duration-300 ease-out',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        // Only show grab cursor when over a valid drag target (letter cells)
        !disabled && isOverValidTarget ? 'cursor-grab' : 'cursor-default'
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

export const PieceTray: React.FC<PieceTrayProps> = ({
  pieces,
  cellSize,
  cellSpacing,
  onPieceDragStart,
  getPieceClassName,
  disabled = false,
  hiddenPieceIds = [],
}) => {
  // Refs for scroll container and piece elements
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pieceRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Track current focused piece index for navigation
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Track if we can scroll in each direction
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Calculate the height of the tallest piece (with padding for borders)
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

    // Convert to pixels and add vertical padding for borders
    const TRAY_VERTICAL_PADDING = 8;
    return maxHeight * cellSize.height + (maxHeight - 1) * cellSpacing + TRAY_VERTICAL_PADDING;
  }, [pieces, cellSize.height, cellSpacing]);

  // Update scroll button visibility based on scroll position
  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  // Update scroll buttons on mount and when pieces change
  useEffect(() => {
    updateScrollButtons();

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons, { passive: true });
      window.addEventListener('resize', updateScrollButtons, { passive: true });

      return () => {
        container.removeEventListener('scroll', updateScrollButtons);
        window.removeEventListener('resize', updateScrollButtons);
      };
    }
  }, [updateScrollButtons, pieces]);

  // Reset focused index when pieces change
  useEffect(() => {
    if (focusedIndex >= pieces.length) {
      setFocusedIndex(Math.max(0, pieces.length - 1));
    }
  }, [pieces.length, focusedIndex]);

  // Ref to track ongoing scroll animation
  const scrollAnimationRef = useRef<number | null>(null);

  // Custom smooth scroll with faster duration
  const smoothScrollTo = useCallback(
    (container: HTMLElement, targetScrollLeft: number, duration: number = 150) => {
      // Cancel any ongoing animation
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }

      const start = container.scrollLeft;
      const delta = targetScrollLeft - start;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        container.scrollLeft = start + delta * eased;

        if (progress < 1) {
          scrollAnimationRef.current = requestAnimationFrame(animate);
        } else {
          scrollAnimationRef.current = null;
        }
      };

      scrollAnimationRef.current = requestAnimationFrame(animate);
    },
    []
  );

  // Bounce animation when at scroll limits
  const bounceAtLimit = useCallback((container: HTMLElement, direction: 'left' | 'right') => {
    const bounceDistance = 12;
    const bounceDuration = 100;

    // Determine bounce direction
    const currentScroll = container.scrollLeft;
    const bounceTarget =
      direction === 'left' ? currentScroll - bounceDistance : currentScroll + bounceDistance;

    // First phase: bounce outward
    const startTime = performance.now();
    const animateBounce = (currentTime: number) => {
      const elapsed = currentTime - startTime;

      if (elapsed < bounceDuration) {
        // Bounce out
        const progress = elapsed / bounceDuration;
        const eased = Math.sin(progress * Math.PI); // Smooth up and down
        const offset = (bounceTarget - currentScroll) * eased;
        container.scrollLeft = currentScroll + offset;
        requestAnimationFrame(animateBounce);
      } else {
        // Return to original position
        container.scrollLeft = currentScroll;
      }
    };

    requestAnimationFrame(animateBounce);
  }, []);

  // Scroll to center a specific piece
  const scrollToPiece = useCallback(
    (index: number, isAtBound: boolean = false, boundDirection?: 'left' | 'right') => {
      const container = scrollContainerRef.current;
      const piece = pieces[index];
      if (!container || !piece) return;

      const pieceElement = pieceRefs.current.get(piece.id);
      if (!pieceElement) return;

      // Calculate scroll position to center the piece
      const containerRect = container.getBoundingClientRect();
      const pieceRect = pieceElement.getBoundingClientRect();

      const pieceCenter = pieceRect.left + pieceRect.width / 2;
      const containerCenter = containerRect.left + containerRect.width / 2;
      const scrollOffset = pieceCenter - containerCenter;
      const targetScrollLeft = container.scrollLeft + scrollOffset;

      // If at bound, show bounce effect
      if (isAtBound && boundDirection) {
        bounceAtLimit(container, boundDirection);
      } else {
        // Fast smooth scroll (150ms)
        smoothScrollTo(container, targetScrollLeft, 150);
      }

      setFocusedIndex(index);
    },
    [pieces, smoothScrollTo, bounceAtLimit]
  );

  // Navigate to previous piece
  const handlePrevious = useCallback(() => {
    const isAtStart = focusedIndex === 0;
    const newIndex = Math.max(0, focusedIndex - 1);
    scrollToPiece(newIndex, isAtStart, 'left');
  }, [focusedIndex, scrollToPiece]);

  // Navigate to next piece
  const handleNext = useCallback(() => {
    const isAtEnd = focusedIndex === pieces.length - 1;
    const newIndex = Math.min(pieces.length - 1, focusedIndex + 1);
    scrollToPiece(newIndex, isAtEnd, 'right');
  }, [focusedIndex, pieces.length, scrollToPiece]);

  // Register piece ref
  const setPieceRef = useCallback((pieceId: string, element: HTMLDivElement | null) => {
    if (element) {
      pieceRefs.current.set(pieceId, element);
    } else {
      pieceRefs.current.delete(pieceId);
    }
  }, []);

  // Don't render if no pieces
  if (pieces.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('flex flex-col items-center w-full', 'transition-all duration-300 ease-out')}
      style={{
        // Add padding for visual breathing room
        paddingTop: 16,
        paddingBottom: 8,
      }}
    >
      {/* Scrollable tray container */}
      <div
        ref={scrollContainerRef}
        className={cn('overflow-x-auto overflow-y-hidden', 'transition-all duration-300 ease-out')}
        style={{
          height: trayHeight,
          maxWidth: '100%',
        }}
      >
        <div
          className={cn(
            'flex gap-4 items-center',
            'h-full',
            'transition-all duration-300 ease-out'
          )}
          style={{
            // Ensure pieces are left-aligned within the scrollable container
            justifyContent: 'flex-start',
            minWidth: 'min-content',
          }}
        >
          {pieces
            .filter((piece) => !hiddenPieceIds.includes(piece.id))
            .map((piece) => (
              <div key={piece.id} ref={(el) => setPieceRef(piece.id, el)}>
                <TrayPiece
                  piece={piece}
                  cellSize={cellSize}
                  cellSpacing={cellSpacing}
                  onDragStart={onPieceDragStart}
                  className={getPieceClassName?.(piece)}
                  disabled={disabled}
                />
              </div>
            ))}
        </div>
      </div>

      {/* Navigation buttons */}
      {pieces.length > 1 && (
        <div className="flex gap-4 mt-3">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={!canScrollLeft}
            className={cn(
              'flex justify-center items-center',
              'w-10 h-10 rounded-full',
              'bg-muted/50 hover:bg-muted',
              'border border-border',
              'transition-all duration-200',
              'disabled:opacity-30 disabled:cursor-not-allowed'
            )}
            aria-label="Previous piece"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canScrollRight}
            className={cn(
              'flex justify-center items-center',
              'w-10 h-10 rounded-full',
              'bg-muted/50 hover:bg-muted',
              'border border-border',
              'transition-all duration-200',
              'disabled:opacity-30 disabled:cursor-not-allowed'
            )}
            aria-label="Next piece"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PieceTray;
