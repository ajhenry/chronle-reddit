import React, {
  useMemo,
  useCallback,
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { cn } from '../lib/utils';
import { LetterPiece as LetterPieceType, GridPosition } from '../../shared/types/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

// Gap size for insertion preview animation
const INSERTION_GAP_SIZE = 60;

// Ref type for PieceTray to expose bounds and drop handling
export interface PieceTrayRef {
  getBounds: () => DOMRect | null;
  // Check if point is over the tray and return insertion info, or null if not over tray
  // Returns the piece ID to insert before (or null if inserting at end)
  getInsertionIndex: (clientX: number, clientY: number) => number;
  getInsertionInfo: (
    clientX: number,
    clientY: number
  ) => { insertBeforePieceId: string | null; visualIndex: number } | null;
  // Update the drag preview position for insertion indicator
  updateDragPreview: (clientX: number, clientY: number, pieceId: string) => void;
  // Clear the drag preview
  clearDragPreview: () => void;
  // Handle drop at current preview position - returns piece ID to insert before
  handleDrop: () => { pieceId: string; insertBeforePieceId: string | null } | null;
}

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
  // Called when a piece is dropped into the tray
  onPieceDropped?: (pieceId: string, insertionIndex: number) => void;
  // When true, pieces wrap to next row instead of horizontal scrolling
  wrap?: boolean;
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
  // Track touch identifier for multi-touch support
  const activeTouchIdRef = useRef<number | null>(null);
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

  // Check if a touch/click is on a valid drag target
  // Valid targets: letter cells, or gaps that are adjacent to letter cells
  // Invalid targets: dead zones, gaps in dead zone areas
  const isValidDragTarget = useCallback(
    (target: EventTarget | null, clientX: number, clientY: number): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;

      // Walk up the DOM tree to check what we're on
      let element: HTMLElement | null = target;
      let isOnGrid = false;

      while (element) {
        // Allow drag from letter cells
        if (element.dataset.hasLetter === 'true') return true;
        // Dead zones (empty cells) are not valid drag targets
        if (element.dataset.hasLetter === 'false') return false;
        // Mark if we're on the grid element (a gap between cells)
        if (element.dataset.pieceGrid === 'true') {
          isOnGrid = true;
          break;
        }
        // Stop searching at piece container
        if (element.dataset.pieceContainer === 'true') return false;
        element = element.parentElement;
      }

      // If on a gap (grid element), check if nearest cell is a letter cell
      if (isOnGrid && pieceContainerRef.current) {
        const rect = pieceContainerRef.current.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const relativeY = clientY - rect.top;

        // Calculate cell dimensions including spacing
        const cellTotalWidth = cellSize.width + cellSpacing;
        const cellTotalHeight = cellSize.height + cellSpacing;

        // Find which cell position we're closest to
        const cellX = Math.round(relativeX / cellTotalWidth - 0.5);
        const cellY = Math.round(relativeY / cellTotalHeight - 0.5);

        // Clamp to valid range
        const clampedX = Math.max(0, Math.min(cellX, width - 1));
        const clampedY = Math.max(0, Math.min(cellY, height - 1));

        // Check if the nearest cell has a letter
        const nearestCellHasLetter = pieceGrid[clampedY]?.[clampedX] !== null;
        return nearestCellHasLetter;
      }

      return false;
    },
    [pieceGrid, width, height, cellSize.width, cellSize.height, cellSpacing]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      // Use changedTouches to get the touch that triggered THIS event
      const touch = e.changedTouches[0];
      if (!touch) return;

      // Only start drag if touch is on a valid letter cell or gap between letter cells
      if (!isValidDragTarget(e.target, touch.clientX, touch.clientY)) return;

      // Prevent any browser touch handling (scrolling)
      e.preventDefault();
      e.stopPropagation();

      // Track this touch for multi-touch support
      activeTouchIdRef.current = touch.identifier;

      // Calculate grab offset and immediately start drag (like mouse behavior)
      const grabOffset = calculateGrabOffset(touch.clientX, touch.clientY);
      onDragStart(piece.id, { clientX: touch.clientX, clientY: touch.clientY }, grabOffset);
    },
    [disabled, isValidDragTarget, calculateGrabOffset, onDragStart, piece.id]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || activeTouchIdRef.current === null) return;

      // Find the touch we're tracking
      const touch = Array.from(e.touches).find((t) => t.identifier === activeTouchIdRef.current);
      if (!touch) return;

      // Prevent scrolling and forward touch position to update cursor preview
      e.preventDefault();
      e.stopPropagation();
      onDragMove?.({ clientX: touch.clientX, clientY: touch.clientY });
    },
    [disabled, onDragMove]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (activeTouchIdRef.current === null) return;

      // Only handle if the ended touch matches the one we're tracking
      const endedTouch = Array.from(e.changedTouches).find(
        (t) => t.identifier === activeTouchIdRef.current
      );
      if (!endedTouch) return;

      // Notify that drag ended
      onDragEnd?.();
      activeTouchIdRef.current = null;
    },
    [onDragEnd]
  );

  const handleTouchCancel = useCallback(
    (e: React.TouchEvent) => {
      if (activeTouchIdRef.current === null) return;

      // Only handle if the cancelled touch matches the one we're tracking
      const cancelledTouch = Array.from(e.changedTouches).find(
        (t) => t.identifier === activeTouchIdRef.current
      );
      if (!cancelledTouch) return;

      // Notify that drag ended
      onDragEnd?.();
      activeTouchIdRef.current = null;
    },
    [onDragEnd]
  );

  // Mouse support for desktop
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      // Only allow drag if click was on a valid letter cell or gap between letter cells
      if (!isValidDragTarget(e.target, e.clientX, e.clientY)) return;

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
      const isValid = isValidDragTarget(e.target, e.clientX, e.clientY);
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
        touchAction: 'pan-x pan-y', // Allow scroll by default, prevented by parent when dragging
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
                // Letter cells: no browser touch handling (drag only)
                // Dead zones: inherit from parent (allows scroll)
                touchAction: letter ? 'none' : undefined,
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

export const PieceTray = forwardRef<PieceTrayRef, PieceTrayProps>(
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
      onPieceDropped,
      wrap = false,
    },
    ref
  ) => {
    // Refs for scroll container and piece elements
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const trayContainerRef = useRef<HTMLDivElement>(null);
    const pieceRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Track if any piece is currently being dragged (ref to avoid race conditions)
    const isDraggingRef = useRef(false);

    // Track if we can scroll in each direction
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Drag preview state for insertion indicator
    const [dragPreview, setDragPreview] = useState<{
      insertionIndex: number;
      pieceId: string;
    } | null>(null);

    // Calculate insertion info based on cursor position
    // Returns the piece ID to insert before (or null if inserting at end) and visual index
    const calculateInsertionInfo = useCallback(
      (
        clientX: number,
        clientY: number
      ): { insertBeforePieceId: string | null; visualIndex: number } | null => {
        const trayContainer = trayContainerRef.current;
        if (!trayContainer) return null;

        const trayBounds = trayContainer.getBoundingClientRect();

        // Check if point is within tray bounds (with some vertical tolerance)
        const verticalTolerance = 20;
        if (
          clientX < trayBounds.left ||
          clientX > trayBounds.right ||
          clientY < trayBounds.top - verticalTolerance ||
          clientY > trayBounds.bottom + verticalTolerance
        ) {
          return null;
        }

        // Get visible pieces (not being dragged)
        const visiblePieces = pieces.filter((p) => !hiddenPieceIds.includes(p.id));
        if (visiblePieces.length === 0) return { insertBeforePieceId: null, visualIndex: 0 };

        // Get piece positions and find insertion point
        const piecePositions: { id: string; left: number; right: number; center: number }[] = [];
        for (const piece of visiblePieces) {
          const element = pieceRefs.current.get(piece.id);
          if (element) {
            const rect = element.getBoundingClientRect();
            piecePositions.push({
              id: piece.id,
              left: rect.left,
              right: rect.right,
              center: rect.left + rect.width / 2,
            });
          }
        }

        // Sort by position
        piecePositions.sort((a, b) => a.left - b.left);

        // Find where to insert
        for (let i = 0; i < piecePositions.length; i++) {
          const pos = piecePositions[i];
          if (pos && clientX < pos.center) {
            // Find the original index of this piece for visual rendering
            const originalIndex = pieces.findIndex((p) => p.id === pos.id);
            return {
              insertBeforePieceId: pos.id,
              visualIndex: originalIndex >= 0 ? originalIndex : i,
            };
          }
        }

        // Insert at end
        return { insertBeforePieceId: null, visualIndex: pieces.length };
      },
      [pieces, hiddenPieceIds]
    );

    // Legacy method for backwards compatibility - returns visual index
    const calculateInsertionIndex = useCallback(
      (clientX: number, clientY: number): number => {
        const info = calculateInsertionInfo(clientX, clientY);
        return info ? info.visualIndex : -1;
      },
      [calculateInsertionInfo]
    );

    // Track the insertion info for the current drag preview
    const [dragPreviewInfo, setDragPreviewInfo] = useState<{
      insertBeforePieceId: string | null;
      pieceId: string;
    } | null>(null);

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

        getInsertionInfo: (clientX: number, clientY: number) => {
          return calculateInsertionInfo(clientX, clientY);
        },

        updateDragPreview: (clientX: number, clientY: number, pieceId: string) => {
          const info = calculateInsertionInfo(clientX, clientY);
          if (info) {
            setDragPreview({ insertionIndex: info.visualIndex, pieceId });
            setDragPreviewInfo({ insertBeforePieceId: info.insertBeforePieceId, pieceId });
          } else {
            setDragPreview(null);
            setDragPreviewInfo(null);
          }
        },

        clearDragPreview: () => {
          setDragPreview(null);
          setDragPreviewInfo(null);
        },

        handleDrop: () => {
          if (!dragPreview || !dragPreviewInfo) return null;
          const result = {
            pieceId: dragPreviewInfo.pieceId,
            insertBeforePieceId: dragPreviewInfo.insertBeforePieceId,
          };
          setDragPreview(null);
          setDragPreviewInfo(null);
          // Legacy callback still uses visual index for backwards compatibility
          onPieceDropped?.(result.pieceId, dragPreview.insertionIndex);
          return result;
        },
      }),
      [
        calculateInsertionIndex,
        calculateInsertionInfo,
        dragPreview,
        dragPreviewInfo,
        onPieceDropped,
      ]
    );

    // Get visible pieces (not hidden)
    const visiblePieces = useMemo(() => {
      return pieces.filter((piece) => !hiddenPieceIds.includes(piece.id));
    }, [pieces, hiddenPieceIds]);

    // Check if all visible pieces fit in view (no scrolling needed)
    const allPiecesVisible = !canScrollLeft && !canScrollRight;

    // Calculate the height of the tallest piece (with padding for borders)
    // Keep a minimum height so the tray remains visible when empty
    const trayHeight = useMemo(() => {
      const TRAY_VERTICAL_PADDING = 40;
      const MIN_TRAY_HEIGHT = cellSize.height + TRAY_VERTICAL_PADDING;

      if (pieces.length === 0) return MIN_TRAY_HEIGHT;

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

    // Cancel any ongoing scroll animation
    const cancelScrollAnimation = useCallback(() => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
    }, []);

    // Wrap onPieceDragStart to cancel scroll animations and track drag state
    const handlePieceDragStart = useCallback(
      (
        pieceId: string,
        touchPosition: { clientX: number; clientY: number },
        grabOffset: { x: number; y: number }
      ) => {
        // Mark that we're dragging (prevents scroll in onTouchMove handler)
        isDraggingRef.current = true;
        // Cancel any ongoing scroll animation
        cancelScrollAnimation();
        // Call the original handler
        onPieceDragStart(pieceId, touchPosition, grabOffset);
      },
      [onPieceDragStart, cancelScrollAnimation]
    );

    // Wrap onPieceDragEnd to clear drag state
    const handlePieceDragEnd = useCallback(() => {
      isDraggingRef.current = false;
      onPieceDragEnd?.();
    }, [onPieceDragEnd]);

    // Handle touch move on scroll container - prevent scrolling when dragging
    const handleScrollContainerTouchMove = useCallback((e: React.TouchEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, []);

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

    // Scroll to make a specific piece the leftmost visible item
    const scrollToPieceAsFirst = useCallback(
      (pieceId: string) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const pieceElement = pieceRefs.current.get(pieceId);
        if (!pieceElement) return;

        // Calculate scroll position to make the piece the leftmost item
        const containerRect = container.getBoundingClientRect();
        const pieceRect = pieceElement.getBoundingClientRect();

        // We want the piece's left edge to align with the container's left edge
        const scrollOffset = pieceRect.left - containerRect.left;
        const targetScrollLeft = container.scrollLeft + scrollOffset;

        // Smooth scroll for page navigation (300ms)
        smoothScrollTo(container, targetScrollLeft, 300);
      },
      [smoothScrollTo]
    );

    // Find the first piece that is not completely visible in the given direction
    // For pagination: returns the piece that should become the leftmost item on next/prev page
    const findNextPagePiece = useCallback(
      (direction: 'left' | 'right'): string | null => {
        const container = scrollContainerRef.current;
        if (!container || visiblePieces.length === 0) return null;

        const containerRect = container.getBoundingClientRect();
        const containerLeft = containerRect.left;
        const containerRight = containerRect.right;

        // Get all visible piece positions with their bounds
        const piecePositions: { id: string; left: number; right: number }[] = [];
        for (const piece of visiblePieces) {
          const element = pieceRefs.current.get(piece.id);
          if (element) {
            const rect = element.getBoundingClientRect();
            piecePositions.push({
              id: piece.id,
              left: rect.left,
              right: rect.right,
            });
          }
        }

        // Sort by position (left to right)
        piecePositions.sort((a, b) => a.left - b.left);

        if (direction === 'right') {
          // Find the first piece that is not completely visible on the right
          // (its right edge extends beyond the container's right edge)
          for (const pos of piecePositions) {
            if (pos.right > containerRight + 1) {
              return pos.id;
            }
          }
          // If none found, we're at the end
          return null;
        } else {
          // For previous page: find the first piece that is cut off on the left
          // Then we need to scroll so that a "page" worth of pieces before becomes visible

          // First, find the current leftmost visible piece
          let currentLeftmostIndex = -1;
          for (let i = 0; i < piecePositions.length; i++) {
            const pos = piecePositions[i];
            if (pos && pos.right > containerLeft) {
              currentLeftmostIndex = i;
              break;
            }
          }

          if (currentLeftmostIndex <= 0) {
            // Already at the start
            return null;
          }

          // Count how many pieces fit in the container width
          const containerWidth = containerRect.width;
          let piecesPerPage = 0;
          let accumulatedWidth = 0;

          // Estimate pieces per page using the first few visible pieces
          for (
            let i = currentLeftmostIndex;
            i < piecePositions.length && i < currentLeftmostIndex + 10;
            i++
          ) {
            const pos = piecePositions[i];
            if (!pos) break;
            const pieceWidth = pos.right - pos.left;
            if (accumulatedWidth + pieceWidth <= containerWidth) {
              accumulatedWidth += pieceWidth + 16; // 16 for margin
              piecesPerPage++;
            } else {
              break;
            }
          }

          // Go back by approximately one page worth of pieces
          const targetIndex = Math.max(0, currentLeftmostIndex - Math.max(1, piecesPerPage));
          const targetPiece = piecePositions[targetIndex];
          return targetPiece ? targetPiece.id : null;
        }
      },
      [visiblePieces]
    );

    // Navigate to previous page of pieces
    const handlePrevious = useCallback(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const targetPieceId = findNextPagePiece('left');
      if (targetPieceId) {
        scrollToPieceAsFirst(targetPieceId);
      } else {
        // Already at start, bounce
        bounceAtLimit(container, 'left');
      }
    }, [findNextPagePiece, scrollToPieceAsFirst, bounceAtLimit]);

    // Navigate to next page of pieces
    const handleNext = useCallback(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const targetPieceId = findNextPagePiece('right');
      if (targetPieceId) {
        scrollToPieceAsFirst(targetPieceId);
      } else {
        // Already at end, bounce
        bounceAtLimit(container, 'right');
      }
    }, [findNextPagePiece, scrollToPieceAsFirst, bounceAtLimit]);

    // Register piece ref
    const setPieceRef = useCallback((pieceId: string, element: HTMLDivElement | null) => {
      if (element) {
        pieceRefs.current.set(pieceId, element);
      } else {
        pieceRefs.current.delete(pieceId);
      }
    }, []);

    // Always render the tray - pieces can be dropped back into it at any time
    return (
      <div
        ref={trayContainerRef}
        className={cn(
          'flex flex-col items-center w-full',
          'transition-all duration-300 ease-out',
          // Highlight when dragging over
          dragPreview ? 'rounded-lg bg-accent/10' : ''
        )}
        style={{
          // Add padding for visual breathing room
          paddingBottom: 16,
        }}
        data-tray-drop-zone="true"
      >
        {/* Tray container - scrollable or wrapping based on wrap prop */}
        <div
          ref={scrollContainerRef}
          className={cn(
            'transition-all duration-300 ease-out',
            wrap ? 'overflow-visible' : 'overflow-x-auto overflow-y-hidden scrollbar-themed'
          )}
          style={{
            height: wrap ? 'auto' : trayHeight,
            minHeight: wrap ? trayHeight : undefined,
            maxWidth: '100%',
            touchAction: wrap ? 'none' : 'pan-x pan-y',
          }}
          onTouchMove={wrap ? undefined : handleScrollContainerTouchMove}
        >
          <div
            className={cn(
              'flex items-center',
              'transition-all duration-300 ease-out',
              wrap ? 'flex-wrap gap-y-4 justify-center' : 'h-full'
            )}
            style={{
              justifyContent: wrap ? 'center' : 'flex-start',
              minWidth: wrap ? undefined : 'min-content',
            }}
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
                      className="flex-shrink-0 duration-200 animate-in fade-in zoom-in-95"
                      style={{
                        width: INSERTION_GAP_SIZE,
                        height: '100%',
                        background:
                          'linear-gradient(90deg, transparent 45%, hsl(var(--primary) / 0.3) 50%, transparent 55%)',
                        borderRadius: 4,
                      }}
                    />
                  )}
                  <div
                    ref={(el) => setPieceRef(piece.id, el)}
                    className={cn(
                      'transition-all duration-300 ease-out origin-center',
                      // Entrance animation when piece first appears (not hidden)
                      // Disable animations during drag to prevent vibration
                      !isHidden &&
                        !dragPreview &&
                        'animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-300'
                    )}
                    // Use CSS to hide instead of filtering from DOM
                    // This keeps touch handlers active during drag
                    // Use transform: scale and max-width for smooth animations (can't animate to 'auto')
                    // Use horizontal margin for spacing (animates smoothly when hidden)
                    style={{
                      opacity: isHidden ? 0 : 1,
                      transform: isHidden ? 'scale(0.8)' : 'scale(1)',
                      maxWidth: isHidden ? 0 : 200,
                      marginLeft: isHidden ? 0 : 8,
                      marginRight: isHidden ? 0 : 8,
                      overflow: 'hidden',
                      pointerEvents: isHidden ? 'none' : 'auto',
                    }}
                  >
                    <TrayPiece
                      piece={piece}
                      cellSize={cellSize}
                      cellSpacing={cellSpacing}
                      onDragStart={handlePieceDragStart}
                      onDragMove={onPieceDragMove}
                      onDragEnd={handlePieceDragEnd}
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
                className="flex-shrink-0 duration-200 animate-in fade-in zoom-in-95"
                style={{
                  width: INSERTION_GAP_SIZE,
                  height: '100%',
                  background:
                    'linear-gradient(90deg, transparent 45%, hsl(var(--primary) / 0.3) 50%, transparent 55%)',
                  borderRadius: 4,
                }}
              />
            )}
          </div>
        </div>

        {/* Scroll indicator - hidden when wrapping or all pieces visible */}
        {!wrap && (
          <div
            className={cn(
              'flex gap-2 justify-center items-center mt-2 text-muted-foreground',
              'transition-opacity duration-200',
              allPiecesVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
            )}
          >
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

        {/* Navigation buttons - hidden when wrapping or all pieces visible */}
        {!wrap && (
          <div
            className={cn(
              'flex gap-4 mt-2',
              'transition-opacity duration-200',
              allPiecesVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
            )}
          >
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={!canScrollLeft}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={!canScrollRight}
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    );
  }
);

PieceTray.displayName = 'PieceTray';

export default PieceTray;
