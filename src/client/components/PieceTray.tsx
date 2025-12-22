import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { LetterPiece as LetterPieceType, GridPosition } from '../../shared/types/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

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
  onPieceDragStart: (
    pieceId: string,
    touchPosition: { clientX: number; clientY: number },
    grabOffset: { x: number; y: number }
  ) => void;
  // Called on touchmove after drag starts - forwards touch position to update cursor preview
  // This is needed because global listeners may not be attached yet on mobile
  onPieceDragMove?: (touchPosition: { clientX: number; clientY: number }) => void;
  // Called when touch ends after drag started
  onPieceDragEnd?: () => void;
  getPieceClassName?: (piece: LetterPieceType) => string | undefined;
  disabled?: boolean;
  // IDs of pieces that should be hidden (e.g., when being dragged over the grid)
  hiddenPieceIds?: string[];
}

interface TrayPieceProps {
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

const TrayPiece: React.FC<TrayPieceProps> = ({
  piece,
  cellSize,
  cellSpacing,
  onDragStart,
  onDragMove,
  onDragEnd,
  className,
  disabled = false,
}) => {
  // Ref to the piece container for calculating grab offset
  const pieceContainerRef = useRef<HTMLDivElement>(null);
  // Track touch state for gesture detection
  const touchStartRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const hasDragStartedRef = useRef(false);
  // Track if user is in scroll mode (horizontal movement detected first)
  const scrollModeRef = useRef(false);
  // Track if mouse is over a valid drag target (for cursor)
  const [isOverValidTarget, setIsOverValidTarget] = useState(false);

  // Calculate which cell was clicked/touched based on pointer position
  const calculateGrabOffset = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!pieceContainerRef.current) {
        // Fallback to center if ref not available
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

      // Calculate which cell was clicked
      const cellX = Math.floor(relativeX / (cellSize.width + cellSpacing));
      const cellY = Math.floor(relativeY / (cellSize.height + cellSpacing));

      // Clamp to valid range
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
      if (disabled) return;

      // If drag already started, forward touch position to update cursor preview
      // This bridges the gap before global listeners are attached
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

        // Calculate grab offset from where the touch started (not current position)
        const grabOffset = calculateGrabOffset(touchStartRef.current.x, touchStartRef.current.y);

        onDragStart(
          piece.id,
          {
            clientX: touch.clientX,
            clientY: touch.clientY,
          },
          grabOffset
        );

        // Don't reset touchStartRef - we need to keep tracking the touch
        // to forward subsequent events until global listeners take over
      }
      // If in scroll mode, let native scroll handle it (don't prevent default)
    },
    [disabled, onDragStart, onDragMove, piece.id, calculateGrabOffset]
  );

  const handleTouchEnd = useCallback(() => {
    // If drag was started, notify that it ended
    if (hasDragStartedRef.current) {
      onDragEnd?.();
    }
    touchStartRef.current = null;
    hasDragStartedRef.current = false;
    scrollModeRef.current = false;
  }, [onDragEnd]);

  const handleTouchCancel = useCallback(() => {
    // If drag was started, notify that it ended
    if (hasDragStartedRef.current) {
      onDragEnd?.();
    }
    touchStartRef.current = null;
    hasDragStartedRef.current = false;
    scrollModeRef.current = false;
  }, [onDragEnd]);

  // Mouse support for desktop
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      // Only allow drag if click was on a valid letter cell (not dead zone)
      if (!isValidDragTarget(e.target)) return;

      e.preventDefault();
      e.stopPropagation();

      // Calculate grab offset from click position
      const grabOffset = calculateGrabOffset(e.clientX, e.clientY);

      // On desktop, immediately start drag on click
      onDragStart(
        piece.id,
        {
          clientX: e.clientX,
          clientY: e.clientY,
        },
        grabOffset
      );
    },
    [disabled, onDragStart, piece.id, isValidDragTarget, calculateGrabOffset]
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
      ref={pieceContainerRef}
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
  onPieceDragMove,
  onPieceDragEnd,
  getPieceClassName,
  disabled = false,
  hiddenPieceIds = [],
}) => {
  // Refs for scroll container and piece elements
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pieceRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Track if we can scroll in each direction
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Get visible pieces (not hidden)
  const visiblePieces = useMemo(() => {
    return pieces.filter((piece) => !hiddenPieceIds.includes(piece.id));
  }, [pieces, hiddenPieceIds]);

  // Check if all visible pieces fit in view (no scrolling needed)
  const allPiecesVisible = !canScrollLeft && !canScrollRight;

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

    // Convert to pixels and add vertical padding for borders and visual breathing room
    const TRAY_VERTICAL_PADDING = 40;
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
  }, [updateScrollButtons, pieces, hiddenPieceIds]);

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

  // Scroll to center a specific piece by ID
  const scrollToPieceById = useCallback(
    (pieceId: string) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const pieceElement = pieceRefs.current.get(pieceId);
      if (!pieceElement) return;

      // Calculate scroll position to center the piece
      const containerRect = container.getBoundingClientRect();
      const pieceRect = pieceElement.getBoundingClientRect();

      const pieceCenter = pieceRect.left + pieceRect.width / 2;
      const containerCenter = containerRect.left + containerRect.width / 2;
      const scrollOffset = pieceCenter - containerCenter;
      const targetScrollLeft = container.scrollLeft + scrollOffset;

      // Fast smooth scroll (150ms)
      smoothScrollTo(container, targetScrollLeft, 150);
    },
    [smoothScrollTo]
  );

  // Find the first visible piece to the left/right of current scroll position
  const findNextVisiblePiece = useCallback(
    (direction: 'left' | 'right'): string | null => {
      const container = scrollContainerRef.current;
      if (!container || visiblePieces.length === 0) return null;

      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      // Get all visible piece positions
      const piecePositions: { id: string; center: number }[] = [];
      for (const piece of visiblePieces) {
        const element = pieceRefs.current.get(piece.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          piecePositions.push({
            id: piece.id,
            center: rect.left + rect.width / 2,
          });
        }
      }

      // Sort by position
      piecePositions.sort((a, b) => a.center - b.center);

      if (direction === 'right') {
        // Find the first piece whose center is to the right of container center
        for (const pos of piecePositions) {
          if (pos.center > containerCenter + 10) {
            return pos.id;
          }
        }
        // If none found, we're at the end
        return null;
      } else {
        // Find the last piece whose center is to the left of container center
        for (let i = piecePositions.length - 1; i >= 0; i--) {
          const pos = piecePositions[i];
          if (pos && pos.center < containerCenter - 10) {
            return pos.id;
          }
        }
        // If none found, we're at the start
        return null;
      }
    },
    [visiblePieces]
  );

  // Navigate to previous visible piece
  const handlePrevious = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const nextPieceId = findNextVisiblePiece('left');
    if (nextPieceId) {
      scrollToPieceById(nextPieceId);
    } else {
      // Already at start, bounce
      bounceAtLimit(container, 'left');
    }
  }, [findNextVisiblePiece, scrollToPieceById, bounceAtLimit]);

  // Navigate to next visible piece
  const handleNext = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const nextPieceId = findNextVisiblePiece('right');
    if (nextPieceId) {
      scrollToPieceById(nextPieceId);
    } else {
      // Already at end, bounce
      bounceAtLimit(container, 'right');
    }
  }, [findNextVisiblePiece, scrollToPieceById, bounceAtLimit]);

  // Register piece ref
  const setPieceRef = useCallback((pieceId: string, element: HTMLDivElement | null) => {
    if (element) {
      pieceRefs.current.set(pieceId, element);
    } else {
      pieceRefs.current.delete(pieceId);
    }
  }, []);

  // Don't render if no visible pieces
  if (visiblePieces.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('flex flex-col items-center w-full', 'transition-all duration-300 ease-out')}
      style={{
        // Add padding for visual breathing room
        paddingTop: 8,
        paddingBottom: 16,
      }}
    >
      {/* Scrollable tray container */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'overflow-x-auto overflow-y-hidden',
          'transition-all duration-300 ease-out',
          'scrollbar-themed'
        )}
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
          {pieces.map((piece) => {
            const isHidden = hiddenPieceIds.includes(piece.id);
            return (
              <div
                key={piece.id}
                ref={(el) => setPieceRef(piece.id, el)}
                // Use CSS to hide instead of filtering from DOM
                // This keeps touch handlers active during drag
                style={{
                  opacity: isHidden ? 0 : 1,
                  width: isHidden ? 0 : 'auto',
                  overflow: isHidden ? 'hidden' : 'visible',
                  pointerEvents: isHidden ? 'none' : 'auto',
                }}
              >
                <TrayPiece
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
            );
          })}
        </div>
      </div>

      {/* Scroll indicator - only show when pieces are out of view */}
      {!allPiecesVisible && (
        <div className="flex gap-2 justify-center items-center mt-2 text-muted-foreground">
          <ChevronLeft
            className={cn(
              'w-4 h-4 transition-opacity duration-200',
              canScrollLeft ? 'opacity-100' : 'opacity-0'
            )}
          />
          <span className="text-xs font-medium">More Pieces</span>
          <ChevronRight
            className={cn(
              'w-4 h-4 transition-opacity duration-200',
              canScrollRight ? 'opacity-100' : 'opacity-0'
            )}
          />
        </div>
      )}

      {/* Navigation buttons - only show when pieces are out of view */}
      {!allPiecesVisible && (
        <div className="flex gap-4 mt-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            disabled={!canScrollLeft}
            aria-label="Previous piece"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={!canScrollRight}
            aria-label="Next piece"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PieceTray;
