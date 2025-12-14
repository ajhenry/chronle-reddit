import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  ReactNode,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { cn } from '../../lib/utils';
import { isDevelopment } from '../../lib/dev-utils';
import { DragMode } from '../../hooks/useDragMode';

// Auto-scroll configuration
const AUTO_SCROLL_CONFIG = {
  edgeThresholdPercent: 0.05, // Distance from viewport edge as percentage of viewport height (5%)
  minScrollSpeed: 0.2, // Minimum scroll speed at start of zone (pixels per frame)
  maxScrollSpeed: 8, // Maximum scroll speed at edge of screen (pixels per frame)
  exponent: 2, // Exponential curve factor for speed scaling
};

// Core types for the grid system
export type GridPosition = {
  x: number;
  y: number;
};

export type GridSize = {
  width: number;
  height: number;
  spacing?: number; // Spacing between cells in pixels
};

export type GridCellData = {
  position: GridPosition;
  isOccupied: boolean;
  occupyingItemId?: string | undefined;
  occupyingItemShapeIndex?: number | undefined; // Which part of the shape occupies this cell
};

// Shape definition - relative positions from origin
export type ItemShape = {
  name: string;
  cells: GridPosition[]; // Relative positions from item origin
  width: number; // Bounding box width
  height: number; // Bounding box height
};

export type DraggableItem = {
  id: string;
  position: GridPosition; // Origin position
  shape: ItemShape;
  content: ReactNode;
  disabled?: boolean; // Whether the piece is locked in place and cannot be dragged
  style?: React.CSSProperties; // Custom styles to apply to the tile
  className?: string; // Custom CSS classes to apply to the tile
};

// Ref type for external Grid control
export interface GridRef {
  // Start dragging a piece from an external source (e.g., piece tray modal)
  startExternalDrag: (
    item: Omit<DraggableItem, 'id'>,
    pointerPosition: { clientX: number; clientY: number }
  ) => void;
  // Add an item to the grid
  addItem: (item: Omit<DraggableItem, 'id'>) => string;
  // Remove an item from the grid
  removeItem: (itemId: string) => void;
  // Get current items
  getItems: () => DraggableItem[];
}

// Unique ID generation for grid instances
let gridInstanceCounter = 0;
const generateGridId = () => `grid-${++gridInstanceCounter}`;

// Predictable ID generation for grid cells
const generateCellId = (gridId: string, x: number, y: number) => `${gridId}-cell-${x}-${y}`;
const generateItemId = (gridId: string, itemIndex: number) => `${gridId}-item-${itemIndex}`;

// Shape utilities
const getItemOccupiedPositions = (item: DraggableItem): GridPosition[] => {
  return item.shape.cells.map((cell) => ({
    x: item.position.x + cell.x,
    y: item.position.y + cell.y,
  }));
};

const getItemBoundingBox = (item: DraggableItem): { width: number; height: number } => {
  return {
    width: item.shape.width,
    height: item.shape.height,
  };
};

// Tile tracking utilities
const createEmptyTileGrid = (gridSize: GridSize): GridCellData[][] => {
  const grid: GridCellData[][] = [];
  for (let y = 0; y < gridSize.height; y++) {
    const row: GridCellData[] = [];
    for (let x = 0; x < gridSize.width; x++) {
      row[x] = {
        position: { x, y },
        isOccupied: false,
      };
    }
    grid[y] = row;
  }
  return grid;
};

const updateTileOccupancy = (
  tileGrid: GridCellData[][],
  items: DraggableItem[]
): GridCellData[][] => {
  // Reset all tiles
  const newGrid = tileGrid.map(
    (row) =>
      row?.map((cell) => ({
        ...cell,
        isOccupied: false,
        occupyingItemId: undefined as string | undefined,
        occupyingItemShapeIndex: undefined as number | undefined,
      })) || []
  );

  // Mark occupied tiles
  items.forEach((item) => {
    const occupiedPositions = getItemOccupiedPositions(item);

    occupiedPositions.forEach((pos, shapeIndex) => {
      if (pos.y >= 0 && pos.y < newGrid.length) {
        const row = newGrid[pos.y];
        if (row && pos.x >= 0 && pos.x < row.length) {
          row[pos.x] = {
            position: row[pos.x]?.position || { x: pos.x, y: pos.y },
            isOccupied: true,
            occupyingItemId: item.id,
            occupyingItemShapeIndex: shapeIndex,
          };
        }
      }
    });
  });

  return newGrid;
};

// Grid context for managing state
type GridContextType = {
  gridId: string;
  items: DraggableItem[];
  tileGrid: GridCellData[][];
  gridSize: GridSize;
  cellSize: GridSize;
  spacing: number;
  disabled: boolean;
  dragMode: DragMode;
  dragPreview: { item: DraggableItem; position: GridPosition; isValid: boolean } | null;
  draggedItemId: string | null;
  grabOffset: GridPosition | null;
  currentHoveredCell: GridPosition | null;
  // Tap-to-drag specific state
  tapDragActiveItemId: string | null; // ID of item activated for tap-to-drag
  tapDragOriginalPosition: GridPosition | null; // Original position before tap-to-drag started
  // IDs of pieces that would be overlapped by the current drag preview
  overlappingPieceIds: string[];
  // IDs of pieces that are currently in invalid positions (on blocked tiles)
  invalidPositionItemIds: string[];
  // Ref to check if a drag just finished (to suppress post-drag click events)
  justFinishedDragRef: React.MutableRefObject<boolean>;
  setItems: (items: DraggableItem[]) => void;
  addItem: (item: Omit<DraggableItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  moveItem: (itemId: string, newPosition: GridPosition) => void;
  setDragPreview: (
    preview: { item: DraggableItem; position: GridPosition; isValid: boolean } | null
  ) => void;
  setDraggedItemId: (itemId: string | null) => void;
  setGrabOffset: (offset: GridPosition | null) => void;
  setGridBounds: (bounds: DOMRect | null) => void;
  setInitialPointerPosition: (position: { clientX: number; clientY: number }) => void;
  isPositionValid: (
    item: DraggableItem,
    newPosition: GridPosition,
    excludeItemId?: string
  ) => boolean;
  getCellData: (x: number, y: number) => GridCellData | null;
  // Tap-to-drag methods
  activateTapDrag: (itemId: string) => void;
  deactivateTapDrag: () => void;
  placeTapDragItem: () => void;
  // Auto-complete callback
  shouldAutoComplete: ((previewLayout: (string | null)[][]) => boolean) | null;
  // External drag methods
  startExternalDrag: (
    item: Omit<DraggableItem, 'id'>,
    pointerPosition: { clientX: number; clientY: number }
  ) => void;
  getGridBounds: () => DOMRect | null;
  // Ref to check if external drag was placed validly
  externalDragWasPlacedValidlyRef: React.MutableRefObject<boolean>;
  // Cell blocked check (for static preview validation)
  isCellBlocked: ((x: number, y: number) => boolean) | null;
};

const GridContext = createContext<GridContextType | null>(null);

const useGrid = (): GridContextType => {
  const context = useContext(GridContext);
  if (!context) {
    throw new Error('useGrid must be used within a GridProvider');
  }
  return context;
};

// Grid Provider component
type GridProviderProps = {
  children: ReactNode;
  gridSize: GridSize;
  cellSize: GridSize;
  initialItems?: Omit<DraggableItem, 'id'>[];
  onLayoutChange?: (layout: (string | null)[][]) => void;
  disabled?: boolean;
  dragMode?: DragMode;
  shouldAutoComplete?: (previewLayout: (string | null)[][]) => boolean;
  onDragStateChange?: (isActive: boolean) => void;
  isCellBlocked?: (x: number, y: number) => boolean;
  onPiecesRemoved?: (pieceIds: string[]) => void;
  onInvalidPlacement?: (itemId: string) => void;
};

function GridProvider({
  children,
  gridSize,
  cellSize,
  initialItems = [],
  onLayoutChange,
  disabled = false,
  dragMode = 'tap-to-drag',
  shouldAutoComplete,
  onDragStateChange,
  isCellBlocked,
  onPiecesRemoved,
  onInvalidPlacement,
}: GridProviderProps) {
  const spacing = gridSize.spacing ?? 0;
  const gridId = useMemo(() => generateGridId(), []);
  const [items, setItemsInternal] = useState<DraggableItem[]>(() =>
    initialItems.map((item, index) => ({
      ...item,
      id: item.shape.name || generateItemId(gridId, index),
    }))
  );

  // Wrap setItems to add debugging
  const setItems = useCallback(
    (updater: DraggableItem[] | ((prev: DraggableItem[]) => DraggableItem[])) => {
      console.log(`[setItems] Called`);
      console.trace('[setItems] Stack trace');
      setItemsInternal((prev) => {
        const newItems = typeof updater === 'function' ? updater(prev) : updater;
        console.log(`[setItems] prev: [${prev.map((i) => i.id).join(', ')}]`);
        console.log(`[setItems] new: [${newItems.map((i) => i.id).join(', ')}]`);
        return newItems;
      });
    },
    []
  );
  const [dragPreview, setDragPreview] = useState<{
    item: DraggableItem;
    position: GridPosition;
    isValid: boolean;
  } | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [grabOffset, setGrabOffset] = useState<GridPosition | null>(null);
  const [gridBounds, setGridBounds] = useState<DOMRect | null>(null);
  const [currentHoveredCell, setCurrentHoveredCell] = useState<GridPosition | null>(null);

  // Tap-to-drag state
  const [tapDragActiveItemId, setTapDragActiveItemId] = useState<string | null>(null);
  const [tapDragOriginalPosition, setTapDragOriginalPosition] = useState<GridPosition | null>(null);

  // Ref to track when a drag just ended - used to suppress click events immediately after drag
  // This prevents the mouseup from triggering a click that auto-places the piece
  const justFinishedDragRef = useRef<boolean>(false);

  // Notify parent when drag state changes
  useEffect(() => {
    onDragStateChange?.(!!tapDragActiveItemId);
  }, [tapDragActiveItemId, onDragStateChange]);

  // Compute overlapping piece IDs based on current drag state
  // This is used to show a warning indicator on pieces that would be removed
  const overlappingPieceIds = useMemo(() => {
    // If there's a drag preview, compute overlaps from that
    if (dragPreview) {
      const testItem = { ...dragPreview.item, position: dragPreview.position };
      const testPositions = getItemOccupiedPositions(testItem);
      const overlapping = new Set<string>();

      for (const otherItem of items) {
        if (otherItem.id === dragPreview.item.id) continue;
        const otherPositions = getItemOccupiedPositions(otherItem);
        for (const testPos of testPositions) {
          for (const otherPos of otherPositions) {
            if (testPos.x === otherPos.x && testPos.y === otherPos.y) {
              overlapping.add(otherItem.id);
              break;
            }
          }
          if (overlapping.has(otherItem.id)) break;
        }
      }
      return Array.from(overlapping);
    }

    // If there's an active tap-drag item (but not actively dragging), compute overlaps from current position
    if (tapDragActiveItemId && !draggedItemId) {
      const activeItem = items.find((i) => i.id === tapDragActiveItemId);
      if (activeItem) {
        const testPositions = getItemOccupiedPositions(activeItem);
        const overlapping = new Set<string>();

        for (const otherItem of items) {
          if (otherItem.id === tapDragActiveItemId) continue;
          const otherPositions = getItemOccupiedPositions(otherItem);
          for (const testPos of testPositions) {
            for (const otherPos of otherPositions) {
              if (testPos.x === otherPos.x && testPos.y === otherPos.y) {
                overlapping.add(otherItem.id);
                break;
              }
            }
            if (overlapping.has(otherItem.id)) break;
          }
        }
        return Array.from(overlapping);
      }
    }

    return [];
  }, [dragPreview, tapDragActiveItemId, draggedItemId, items]);

  // Compute invalid position item IDs - pieces that are currently on blocked tiles
  // This is used to show error styling on pieces in invalid positions
  const invalidPositionItemIds = useMemo(() => {
    if (!isCellBlocked) return [];

    const invalid: string[] = [];

    // Check the active tap-drag item if it exists and is not being actively dragged
    if (tapDragActiveItemId && !draggedItemId) {
      const activeItem = items.find((i) => i.id === tapDragActiveItemId);
      if (activeItem) {
        const occupiedPositions = getItemOccupiedPositions(activeItem);
        for (const pos of occupiedPositions) {
          if (pos.x >= 0 && pos.y >= 0 && isCellBlocked(pos.x, pos.y)) {
            invalid.push(tapDragActiveItemId);
            break;
          }
        }
      }
    }

    return invalid;
  }, [tapDragActiveItemId, draggedItemId, items, isCellBlocked]);

  // Store shouldAutoComplete in a ref to avoid stale closures
  const shouldAutoCompleteRef = useRef(shouldAutoComplete);
  shouldAutoCompleteRef.current = shouldAutoComplete;

  // Auto-scroll refs - using refs to avoid stale closure issues in animation loop
  const autoScrollFrameRef = useRef<number | null>(null);
  const currentPointerPositionRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const currentScrollVelocityRef = useRef<number>(0); // For smooth velocity interpolation
  const isDraggingRef = useRef<boolean>(false); // Track dragging state for animation loop
  const dragStartedInScrollZoneRef = useRef<boolean>(false); // Track if drag started in scroll zone
  const hasExitedScrollZoneRef = useRef<boolean>(false); // Track if user has exited scroll zone since drag start

  // Refs to store latest event handlers - allows effect to not re-run when callbacks change
  const handleGlobalPointerMoveRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {});
  const handleGlobalPointerUpRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {});

  // Ref to track if external drag was placed validly (used by GridContent effect)
  const externalDragWasPlacedValidlyRef = useRef<boolean>(false);

  // Ref to skip the onLayoutChange effect when we just handled overlapping pieces
  // This prevents double-calling onLayoutChange which can cause infinite loops
  const skipLayoutChangeEffectRef = useRef<boolean>(false);

  // Create and update tile grid
  const tileGrid = useMemo(() => {
    console.log(
      `[tileGrid memo] Recalculating - items count: ${items.length}, items: [${items.map((i) => i.id).join(', ')}]`
    );
    const emptyGrid = createEmptyTileGrid(gridSize);
    const result = updateTileOccupancy(emptyGrid, items);
    console.log(`[tileGrid memo] Done recalculating`);
    return result;
  }, [gridSize, items]);

  // Helper function to build a preview layout for auto-complete checking
  const buildPreviewLayout = useCallback(
    (previewItemId: string, previewPosition: GridPosition): (string | null)[][] => {
      const layout: (string | null)[][] = [];

      // Initialize empty layout
      for (let y = 0; y < gridSize.height; y++) {
        const row: (string | null)[] = [];
        for (let x = 0; x < gridSize.width; x++) {
          row[x] = null;
        }
        layout[y] = row;
      }

      // Fill in all items with their current positions (or preview position for the dragged item)
      for (const item of items) {
        const position = item.id === previewItemId ? previewPosition : item.position;
        const occupiedPositions = item.shape.cells.map((cell) => ({
          x: position.x + cell.x,
          y: position.y + cell.y,
        }));

        for (const pos of occupiedPositions) {
          if (pos.y >= 0 && pos.y < gridSize.height && pos.x >= 0 && pos.x < gridSize.width) {
            layout[pos.y]![pos.x] = item.id;
          }
        }
      }

      return layout;
    },
    [items, gridSize]
  );

  // Call onLayoutChange whenever tileGrid changes
  // Skip layout change notifications while in tap-drag mode (moves are counted on placement only)
  React.useEffect(() => {
    console.log(
      `[onLayoutChange Effect] START - skipFlag=${skipLayoutChangeEffectRef.current}, tapDragActiveItemId=${tapDragActiveItemId}, hasOnLayoutChange=${!!onLayoutChange}`
    );

    // Skip if we just handled overlapping pieces (to prevent double-calling)
    // We check and clear the flag, but only proceed if it was not set
    if (skipLayoutChangeEffectRef.current) {
      console.log(`[onLayoutChange Effect] SKIPPING - skipLayoutChangeEffectRef is true`);
      // Keep the flag true - it will be cleared after a timeout
      return;
    }

    if (onLayoutChange && !tapDragActiveItemId) {
      const layout = tileGrid.map((row) => row.map((cell) => cell.occupyingItemId || null));

      // Debug: Log layout changes in development
      const occupiedCells = layout.flat().filter((cell) => cell !== null).length;
      const totalCells = layout.flat().length;
      console.log(
        `[onLayoutChange Effect] Layout changed: ${occupiedCells}/${totalCells} cells occupied`
      );
      console.log(`[onLayoutChange Effect] Calling onLayoutChange callback`);

      onLayoutChange(layout);
      console.log(`[onLayoutChange Effect] onLayoutChange callback returned`);
    } else {
      console.log(
        `[onLayoutChange Effect] NOT calling onLayoutChange - onLayoutChange=${!!onLayoutChange}, tapDragActiveItemId=${tapDragActiveItemId}`
      );
    }

    console.log(`[onLayoutChange Effect] END`);
  }, [tileGrid, onLayoutChange, tapDragActiveItemId]); // NOTE: Do NOT add 'items' here - it causes infinite loops

  const addItem = useCallback(
    (item: Omit<DraggableItem, 'id'>) => {
      setItems((prev) => [
        ...prev,
        {
          ...item,
          id: item.shape.name || generateItemId(gridId, prev.length),
        },
      ]);
    },
    [gridId]
  );

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const moveItem = useCallback((itemId: string, newPosition: GridPosition) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, position: newPosition } : item))
    );
  }, []);

  const isPositionValid = useCallback(
    (item: DraggableItem, newPosition: GridPosition, excludeItemId?: string) => {
      const testItem = { ...item, position: newPosition };
      const occupiedPositions = getItemOccupiedPositions(testItem);

      // Check bounds
      for (const pos of occupiedPositions) {
        if (pos.x < 0 || pos.y < 0 || pos.x >= gridSize.width || pos.y >= gridSize.height) {
          return false;
        }
      }

      // Check for collisions with other items
      for (const pos of occupiedPositions) {
        const cellData = tileGrid[pos.y]?.[pos.x];
        if (cellData && cellData.isOccupied && cellData.occupyingItemId !== excludeItemId) {
          return false;
        }
      }

      return true;
    },
    [tileGrid, gridSize]
  );

  // Check if any cell of the item at the given position would be on a blocked tile
  const isPositionOnBlockedTile = useCallback(
    (item: DraggableItem, newPosition: GridPosition) => {
      if (!isCellBlocked) return false; // No blocked tiles if callback not provided

      const testItem = { ...item, position: newPosition };
      const occupiedPositions = getItemOccupiedPositions(testItem);

      for (const pos of occupiedPositions) {
        // Check bounds first
        if (pos.x < 0 || pos.y < 0 || pos.x >= gridSize.width || pos.y >= gridSize.height) {
          continue; // Out of bounds positions are handled separately
        }
        if (isCellBlocked(pos.x, pos.y)) {
          return true;
        }
      }

      return false;
    },
    [isCellBlocked, gridSize]
  );

  // Check if position is within grid bounds
  const isPositionWithinBounds = useCallback(
    (item: DraggableItem, newPosition: GridPosition) => {
      const testItem = { ...item, position: newPosition };
      const occupiedPositions = getItemOccupiedPositions(testItem);

      for (const pos of occupiedPositions) {
        if (pos.x < 0 || pos.y < 0 || pos.x >= gridSize.width || pos.y >= gridSize.height) {
          return false;
        }
      }

      return true;
    },
    [gridSize]
  );

  // Get IDs of items that would be overlapped by placing the item at the given position
  // Note: We check directly against items list instead of tileGrid because tileGrid
  // only stores one occupyingItemId per cell, so overlaps would be missed
  // Takes itemsList as parameter to avoid dependency on items state (prevents loops)
  const getOverlappingItemIds = useCallback(
    (
      item: DraggableItem,
      newPosition: GridPosition,
      excludeItemId: string | undefined,
      itemsList: DraggableItem[]
    ): string[] => {
      console.log(
        `[getOverlappingItemIds] START - placing item=${item.id} at (${newPosition.x}, ${newPosition.y}), excluding=${excludeItemId}`
      );
      console.log(
        `[getOverlappingItemIds] itemsList has ${itemsList.length} items: [${itemsList.map((i) => i.id).join(', ')}]`
      );

      const testItem = { ...item, position: newPosition };
      const testPositions = getItemOccupiedPositions(testItem);
      const overlappingIds = new Set<string>();

      console.log(`[getOverlappingItemIds] testPositions: ${JSON.stringify(testPositions)}`);

      // Check each item in the grid for overlaps
      for (const otherItem of itemsList) {
        // Skip the item being placed
        if (otherItem.id === excludeItemId) continue;

        // Get positions occupied by this other item
        const otherPositions = getItemOccupiedPositions(otherItem);

        // Check if any of the test positions overlap with this item's positions
        for (const testPos of testPositions) {
          for (const otherPos of otherPositions) {
            if (testPos.x === otherPos.x && testPos.y === otherPos.y) {
              console.log(
                `[getOverlappingItemIds] OVERLAP FOUND: item=${otherItem.id} at (${otherPos.x}, ${otherPos.y})`
              );
              overlappingIds.add(otherItem.id);
              break; // Found overlap with this item, move to next item
            }
          }
          if (overlappingIds.has(otherItem.id)) break; // Already found overlap
        }
      }

      const result = Array.from(overlappingIds);
      console.log(
        `[getOverlappingItemIds] END - returning overlapping IDs: [${result.join(', ')}]`
      );
      return result;
    },
    []
  );

  // Tap-to-drag methods
  const activateTapDrag = useCallback(
    (itemId: string) => {
      console.log(`[activateTapDrag] Activating drag mode for item=${itemId}`);
      const item = items.find((i) => i.id === itemId);
      if (item) {
        setTapDragActiveItemId(itemId);
        setTapDragOriginalPosition({ ...item.position });
        console.log(`[activateTapDrag] SUCCESS - tapDragActiveItemId is now ${itemId}`);
      } else {
        console.log(`[activateTapDrag] FAILED - item not found`);
      }
    },
    [items]
  );

  const deactivateTapDrag = useCallback(() => {
    console.log(`[deactivateTapDrag] Deactivating - tapDragActiveItemId=${tapDragActiveItemId}`);
    // Reset piece to original position if tap drag is active
    if (tapDragActiveItemId && tapDragOriginalPosition) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === tapDragActiveItemId ? { ...item, position: tapDragOriginalPosition } : item
        )
      );
    }
    setTapDragActiveItemId(null);
    setTapDragOriginalPosition(null);
    setDraggedItemId(null);
    setGrabOffset(null);
    setDragPreview(null);
  }, [tapDragActiveItemId, tapDragOriginalPosition]);

  const placeTapDragItem = useCallback(() => {
    console.log(`[placeTapDragItem] START - tapDragActiveItemId=${tapDragActiveItemId}`);
    console.log(
      `[placeTapDragItem] Current items: [${items.map((i) => `${i.id}@(${i.position.x},${i.position.y})`).join(', ')}]`
    );

    if (!tapDragActiveItemId) {
      console.log(`[placeTapDragItem] EARLY EXIT - no tapDragActiveItemId`);
      return;
    }

    const item = items.find((i) => i.id === tapDragActiveItemId);
    if (!item) {
      console.log(`[placeTapDragItem] EARLY EXIT - item not found, deactivating`);
      deactivateTapDrag();
      return;
    }

    console.log(
      `[placeTapDragItem] Placing item=${item.id} at (${item.position.x}, ${item.position.y})`
    );

    // Check if position is out of bounds
    const withinBounds = isPositionWithinBounds(item, item.position);
    console.log(`[placeTapDragItem] withinBounds=${withinBounds}`);
    if (!withinBounds) {
      console.log(`[placeTapDragItem] Out of bounds - handling reset`);
      // Out of bounds - handle based on where piece came from
      if (tapDragOriginalPosition) {
        // Piece was on board - reset to original position
        console.log(
          `[placeTapDragItem] Resetting to original position: (${tapDragOriginalPosition.x}, ${tapDragOriginalPosition.y})`
        );
        setItems((prev) =>
          prev.map((i) =>
            i.id === tapDragActiveItemId ? { ...i, position: tapDragOriginalPosition } : i
          )
        );
      } else {
        // Piece came from tray - remove it
        console.log(`[placeTapDragItem] Removing item (came from tray)`);
        setItems((prev) => prev.filter((i) => i.id !== tapDragActiveItemId));
        setTapDragActiveItemId(null);
        setTapDragOriginalPosition(null);
        setDraggedItemId(null);
        setGrabOffset(null);
        setDragPreview(null);
      }
      return;
    }

    // Check if position is on a blocked tile (e.g., black tile)
    const isOnBlockedTile = isPositionOnBlockedTile(item, item.position);
    console.log(`[placeTapDragItem] isOnBlockedTile=${isOnBlockedTile}`);
    if (isOnBlockedTile) {
      console.log(`[placeTapDragItem] On blocked tile - handling reset`);
      // Notify parent about invalid placement attempt (for showing toast)
      onInvalidPlacement?.(tapDragActiveItemId);
      // Blocked tile - return piece to tray, don't affect overlapping pieces
      if (tapDragOriginalPosition) {
        // Piece was on board - reset to original position
        console.log(
          `[placeTapDragItem] Resetting to original position: (${tapDragOriginalPosition.x}, ${tapDragOriginalPosition.y})`
        );
        setItems((prev) =>
          prev.map((i) =>
            i.id === tapDragActiveItemId ? { ...i, position: tapDragOriginalPosition } : i
          )
        );
      } else {
        // Piece came from tray - remove it
        console.log(`[placeTapDragItem] Removing item (came from tray)`);
        setItems((prev) => prev.filter((i) => i.id !== tapDragActiveItemId));
      }
      // Clear tap drag state
      setTapDragActiveItemId(null);
      setTapDragOriginalPosition(null);
      setDraggedItemId(null);
      setGrabOffset(null);
      setDragPreview(null);
      return;
    }

    // Check for overlapping pieces
    console.log(`[placeTapDragItem] Checking for overlapping pieces...`);
    const overlappingIds = getOverlappingItemIds(item, item.position, item.id, items);
    console.log(`[placeTapDragItem] overlappingIds: [${overlappingIds.join(', ')}]`);

    // Check if the piece actually moved from its original position
    const didMove =
      !tapDragOriginalPosition ||
      item.position.x !== tapDragOriginalPosition.x ||
      item.position.y !== tapDragOriginalPosition.y;
    console.log(
      `[placeTapDragItem] didMove=${didMove}, tapDragOriginalPosition=${tapDragOriginalPosition ? `(${tapDragOriginalPosition.x},${tapDragOriginalPosition.y})` : 'null'}`
    );

    // Position is valid (not on blocked tile), place the piece
    // If there are overlapping pieces, remove them and notify parent
    if (overlappingIds.length > 0) {
      console.log(`[placeTapDragItem] Removing overlapping pieces: ${overlappingIds.join(', ')}`);
      console.log(`[placeTapDragItem] Setting skipLayoutChangeEffectRef=true`);
      // Set flag to skip the effect while we handle this ourselves
      skipLayoutChangeEffectRef.current = true;
      setItems((prev) => {
        const newItems = prev.filter((i) => !overlappingIds.includes(i.id));
        console.log(
          `[placeTapDragItem] setItems filter: ${prev.length} -> ${newItems.length} items`
        );
        console.log(
          `[placeTapDragItem] New items after filter: [${newItems.map((i) => i.id).join(', ')}]`
        );
        return newItems;
      });
      // Notify parent about removed pieces
      console.log(`[placeTapDragItem] Calling onPiecesRemoved with [${overlappingIds.join(', ')}]`);
      onPiecesRemoved?.(overlappingIds);
    }

    // Position is valid, finalize the placement
    console.log(`[placeTapDragItem] Finalizing placement - clearing tap drag state`);
    setTapDragActiveItemId(null);
    setTapDragOriginalPosition(null);
    setDraggedItemId(null);
    setGrabOffset(null);
    setDragPreview(null);

    // Call onLayoutChange with the correct layout
    if ((didMove || overlappingIds.length > 0) && onLayoutChange) {
      console.log(`[placeTapDragItem] Building layout for onLayoutChange...`);
      // Build layout manually, excluding removed overlapping pieces
      const layout: (string | null)[][] = [];
      for (let y = 0; y < gridSize.height; y++) {
        const row: (string | null)[] = [];
        for (let x = 0; x < gridSize.width; x++) {
          row[x] = null;
        }
        layout[y] = row;
      }

      // Fill in items that are NOT being removed
      for (const gridItem of items) {
        if (overlappingIds.includes(gridItem.id)) continue; // Skip removed pieces

        const occupiedPositions = getItemOccupiedPositions(gridItem);
        for (const pos of occupiedPositions) {
          if (pos.y >= 0 && pos.y < gridSize.height && pos.x >= 0 && pos.x < gridSize.width) {
            layout[pos.y]![pos.x] = gridItem.id;
          }
        }
      }

      console.log(`[placeTapDragItem] Calling onLayoutChange`);
      onLayoutChange(layout);

      // Clear the skip flag after a short delay to allow state to settle
      if (overlappingIds.length > 0) {
        console.log(`[placeTapDragItem] Scheduling skipLayoutChangeEffectRef=false in 100ms`);
        setTimeout(() => {
          console.log(`[placeTapDragItem] Setting skipLayoutChangeEffectRef=false (from timeout)`);
          skipLayoutChangeEffectRef.current = false;
        }, 100);
      }
    } else {
      console.log(
        `[placeTapDragItem] Skipping onLayoutChange - didMove=${didMove}, overlappingIds.length=${overlappingIds.length}, onLayoutChange=${!!onLayoutChange}`
      );
    }

    console.log(`[placeTapDragItem] END`);
  }, [
    tapDragActiveItemId,
    tapDragOriginalPosition,
    items,
    isPositionWithinBounds,
    isPositionOnBlockedTile,
    deactivateTapDrag,
    onLayoutChange,
    onPiecesRemoved,
    onInvalidPlacement,
    gridSize,
    getOverlappingItemIds,
  ]);

  // Utility function to get coordinates from global mouse or touch events
  const getGlobalEventCoordinates = useCallback((e: MouseEvent | TouchEvent) => {
    if (e.type.startsWith('touch')) {
      // Touch event
      const touchEvent = e as TouchEvent;
      const touch = touchEvent.changedTouches?.[0] || touchEvent.touches?.[0];
      if (touch) {
        return { clientX: touch.clientX, clientY: touch.clientY };
      }
      // Fallback if no touch found
      return { clientX: 0, clientY: 0 };
    } else {
      // Mouse event
      const mouseEvent = e as MouseEvent;
      return { clientX: mouseEvent.clientX, clientY: mouseEvent.clientY };
    }
  }, []);

  // Helper function to check if a Y position is in a scroll zone
  const isInScrollZone = useCallback((clientY: number): boolean => {
    const viewportHeight = window.innerHeight;
    const edgeThreshold = viewportHeight * AUTO_SCROLL_CONFIG.edgeThresholdPercent;
    const distanceFromBottom = viewportHeight - clientY;
    return clientY < edgeThreshold || distanceFromBottom < edgeThreshold;
  }, []);

  // Calculate auto-scroll speed based on pointer position
  // Uses exponential scaling: slower at zone start (t=0), faster at screen edge (t=1)
  const calculateAutoScrollSpeed = useCallback(
    (clientY: number): number => {
      const viewportHeight = window.innerHeight;
      const edgeThreshold = viewportHeight * AUTO_SCROLL_CONFIG.edgeThresholdPercent;
      const { minScrollSpeed, maxScrollSpeed, exponent } = AUTO_SCROLL_CONFIG;

      // Check if pointer is currently in a scroll zone
      const currentlyInScrollZone = isInScrollZone(clientY);

      // If drag started in scroll zone, don't scroll until user exits and re-enters
      if (dragStartedInScrollZoneRef.current && !hasExitedScrollZoneRef.current) {
        // Check if user has exited the scroll zone
        if (!currentlyInScrollZone) {
          hasExitedScrollZoneRef.current = true;
        }
        // Don't scroll yet - user hasn't exited and re-entered
        return 0;
      }

      // Check if within top scroll zone
      if (clientY < edgeThreshold) {
        // t goes from 0 (at threshold boundary) to 1 (at screen edge)
        const t = 1 - clientY / edgeThreshold;
        // Exponential scaling: speed increases as cursor gets closer to edge
        const speed = minScrollSpeed + (maxScrollSpeed - minScrollSpeed) * Math.pow(t, exponent);
        return -speed; // Negative for scrolling up
      }

      // Check if within bottom scroll zone
      const distanceFromBottom = viewportHeight - clientY;
      if (distanceFromBottom < edgeThreshold) {
        // t goes from 0 (at threshold boundary) to 1 (at screen edge)
        const t = 1 - distanceFromBottom / edgeThreshold;
        // Exponential scaling: speed increases as cursor gets closer to edge
        const speed = minScrollSpeed + (maxScrollSpeed - minScrollSpeed) * Math.pow(t, exponent);
        return speed; // Positive for scrolling down
      }

      // Not in any scroll zone
      return 0;
    },
    [isInScrollZone]
  );

  // Auto-scroll animation loop with smooth velocity interpolation
  // Using refs instead of state to avoid stale closure issues
  const performAutoScroll = useCallback(() => {
    // Check ref instead of state to always get current value
    if (!isDraggingRef.current) {
      autoScrollFrameRef.current = null;
      currentScrollVelocityRef.current = 0;
      return;
    }

    // Get current pointer position from ref
    const pointerPos = currentPointerPositionRef.current;
    let targetSpeed = 0;

    if (pointerPos) {
      targetSpeed = calculateAutoScrollSpeed(pointerPos.clientY);
    }

    // Smooth velocity interpolation (lerp towards target)
    // Using different smoothing factors for acceleration vs deceleration
    const currentVelocity = currentScrollVelocityRef.current;
    const isAccelerating = Math.abs(targetSpeed) > Math.abs(currentVelocity);
    const smoothingFactor = isAccelerating ? 0.12 : 0.18; // Slower to speed up, faster to slow down

    // Lerp: current + (target - current) * factor
    const newVelocity = currentVelocity + (targetSpeed - currentVelocity) * smoothingFactor;

    // Update the velocity ref
    currentScrollVelocityRef.current = newVelocity;

    // Only scroll if velocity is significant (avoid micro-scrolls)
    if (Math.abs(newVelocity) > 0.1) {
      window.scrollBy({
        top: newVelocity,
        behavior: 'instant', // Use instant for animation-frame-based scrolling
      });
    }

    // Continue the animation loop as long as we're dragging
    autoScrollFrameRef.current = requestAnimationFrame(performAutoScroll);
  }, [calculateAutoScrollSpeed]);

  // Start auto-scroll when dragging begins
  const startAutoScroll = useCallback(() => {
    isDraggingRef.current = true;
    if (autoScrollFrameRef.current === null) {
      autoScrollFrameRef.current = requestAnimationFrame(performAutoScroll);
    }
  }, [performAutoScroll]);

  // Stop auto-scroll when dragging ends
  const stopAutoScroll = useCallback(() => {
    isDraggingRef.current = false;
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
    currentPointerPositionRef.current = null;
    currentScrollVelocityRef.current = 0;
    dragStartedInScrollZoneRef.current = false;
    hasExitedScrollZoneRef.current = false;
  }, []);

  // Set initial pointer position when drag starts (for immediate auto-scroll)
  const setInitialPointerPosition = useCallback(
    (position: { clientX: number; clientY: number }) => {
      currentPointerPositionRef.current = position;
      // Check if drag started in a scroll zone
      dragStartedInScrollZoneRef.current = isInScrollZone(position.clientY);
      hasExitedScrollZoneRef.current = false;
    },
    [isInScrollZone]
  );

  // Global pointer tracking during drag operations
  const handleGlobalPointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const coords = getGlobalEventCoordinates(e);

      // ALWAYS store current pointer position for auto-scroll (before any early returns)
      // This ensures auto-scroll works based on viewport position regardless of grid state
      currentPointerPositionRef.current = coords;

      // Prevent default touch behavior (scrolling) during drag
      // This is critical for preventing scroll during fast movements
      if (isDraggingRef.current && e.type.startsWith('touch')) {
        console.log(
          `[GlobalPointerMove] PREVENTING DEFAULT - isDraggingRef=${isDraggingRef.current}, type=${e.type}`
        );
        e.preventDefault();
        e.stopPropagation();
      } else if (e.type.startsWith('touch')) {
        console.log(
          `[GlobalPointerMove] NOT preventing default - isDraggingRef=${isDraggingRef.current}, draggedItemId=${draggedItemId}`
        );
      }

      // Early return for grid-related logic if not ready
      if (!draggedItemId || !gridBounds || !grabOffset) return;

      // Calculate pointer position relative to grid
      const pointerX = coords.clientX - gridBounds.left;
      const pointerY = coords.clientY - gridBounds.top;

      // Convert to grid coordinates
      const cellX = Math.floor(pointerX / (cellSize.width + spacing));
      const cellY = Math.floor(pointerY / (cellSize.height + spacing));

      // Check if pointer is within grid bounds
      if (cellX >= 0 && cellX < gridSize.width && cellY >= 0 && cellY < gridSize.height) {
        const newHoveredCell = { x: cellX, y: cellY };

        // Only update if cell changed
        if (
          !currentHoveredCell ||
          currentHoveredCell.x !== cellX ||
          currentHoveredCell.y !== cellY
        ) {
          setCurrentHoveredCell(newHoveredCell);

          // Calculate drag preview position
          const draggedItem = items.find((item) => item.id === draggedItemId);
          if (draggedItem) {
            const previewPosition = {
              x: cellX - grabOffset.x,
              y: cellY - grabOffset.y,
            };

            // Position is valid if:
            // 1. Within bounds
            // 2. Not on a blocked tile
            // Note: Overlapping pieces are OK - they will be removed on placement
            const withinBounds = isPositionWithinBounds(draggedItem, previewPosition);
            const isOnBlockedTile = isPositionOnBlockedTile(draggedItem, previewPosition);
            const isValid = withinBounds && !isOnBlockedTile;

            setDragPreview({
              item: draggedItem,
              position: previewPosition,
              isValid,
            });
          }
        }
      } else {
        setCurrentHoveredCell(null);
        setDragPreview(null);
      }
    },
    [
      draggedItemId,
      gridBounds,
      grabOffset,
      cellSize,
      spacing,
      gridSize,
      currentHoveredCell,
      items,
      isPositionWithinBounds,
      isPositionOnBlockedTile,
      getGlobalEventCoordinates,
    ]
  );

  // Global pointer up handler for drop
  const handleGlobalPointerUp = useCallback(
    (e: MouseEvent | TouchEvent) => {
      console.log(
        `[handleGlobalPointerUp] START - draggedItemId=${draggedItemId}, tapDragActiveItemId=${tapDragActiveItemId}`
      );
      console.log(
        `[handleGlobalPointerUp] Current items: [${items.map((i) => `${i.id}@(${i.position.x},${i.position.y})`).join(', ')}]`
      );

      const currentDraggedItemId = draggedItemId;

      if (!currentDraggedItemId || !gridBounds || !grabOffset) {
        console.log(
          `[handleGlobalPointerUp] EARLY EXIT - missing state: draggedItemId=${currentDraggedItemId}, gridBounds=${!!gridBounds}, grabOffset=${!!grabOffset}`
        );
        return;
      }

      const coords = getGlobalEventCoordinates(e);

      // Calculate pointer position relative to grid
      const pointerX = coords.clientX - gridBounds.left;
      const pointerY = coords.clientY - gridBounds.top;

      // Convert to grid coordinates
      const cellX = Math.floor(pointerX / (cellSize.width + spacing));
      const cellY = Math.floor(pointerY / (cellSize.height + spacing));

      // Check if pointer is within grid bounds
      const isPointerWithinBounds =
        cellX >= 0 && cellX < gridSize.width && cellY >= 0 && cellY < gridSize.height;

      let placedValidly = false;

      if (isPointerWithinBounds) {
        const draggedItem = items.find((item) => item.id === currentDraggedItemId);

        if (!draggedItem) {
          return;
        }

        const dropPosition = {
          x: cellX - grabOffset.x,
          y: cellY - grabOffset.y,
        };

        // Check if drop position is within bounds
        const withinBounds = isPositionWithinBounds(draggedItem, dropPosition);

        if (!withinBounds) {
          // Out of bounds - handle based on where piece came from
          if (tapDragActiveItemId === currentDraggedItemId && !tapDragOriginalPosition) {
            placedValidly = false;
          } else if (tapDragOriginalPosition) {
            setItems((prev) =>
              prev.map((item) =>
                item.id === currentDraggedItemId
                  ? { ...item, position: tapDragOriginalPosition }
                  : item
              )
            );
          }
        } else {
          // Check if drop position is on a blocked tile (e.g., black tile)
          const isOnBlockedTile = isPositionOnBlockedTile(draggedItem, dropPosition);

          // In tap-to-drag mode, allow dropping on blocked tiles - they will show error styling
          // and the toast will appear when user tries to PLACE the piece
          // In hold-to-drag mode, blocked tiles still prevent placement
          if (isOnBlockedTile && !tapDragActiveItemId) {
            // Hold-to-drag mode: Blocked tile - return piece to original position
            console.log(
              '[handleGlobalPointerUp] Drop on blocked tile in hold-to-drag mode, returning piece'
            );
            if (tapDragOriginalPosition) {
              setItems((prev) =>
                prev.map((item) =>
                  item.id === currentDraggedItemId
                    ? { ...item, position: tapDragOriginalPosition }
                    : item
                )
              );
            }
            placedValidly = false;
          } else {
            // Valid position OR tap-to-drag mode allows dropping on blocked tiles
            // Move the piece to the drop position
            moveItem(currentDraggedItemId, dropPosition);
            placedValidly = true;

            if (isOnBlockedTile) {
              console.log(
                '[handleGlobalPointerUp] Drop on blocked tile in tap-to-drag mode, piece will show error styling'
              );
            }

            // In tap-to-drag mode, DON'T remove overlapping pieces during drag
            // They will be removed when the piece is actually PLACED (via placeTapDragItem)
            // Only remove overlapping pieces immediately in hold-to-drag mode
            console.log(
              `[handleGlobalPointerUp] Checking overlap removal - tapDragActiveItemId=${tapDragActiveItemId}`
            );
            if (!tapDragActiveItemId) {
              console.log(`[handleGlobalPointerUp] In hold-to-drag mode, checking for overlaps...`);
              const overlappingIds = getOverlappingItemIds(
                draggedItem,
                dropPosition,
                draggedItem.id,
                items
              );

              if (overlappingIds.length > 0) {
                console.log(
                  `[handleGlobalPointerUp] Removing overlapping pieces: ${overlappingIds.join(', ')}`
                );
                setItems((prev) => {
                  const newItems = prev.filter((item) => !overlappingIds.includes(item.id));
                  console.log(
                    `[handleGlobalPointerUp] setItems filter: ${prev.length} -> ${newItems.length} items`
                  );
                  return newItems;
                });
                // Notify parent about removed pieces
                console.log(
                  `[handleGlobalPointerUp] Calling onPiecesRemoved with [${overlappingIds.join(', ')}]`
                );
                onPiecesRemoved?.(overlappingIds);
              } else {
                console.log(`[handleGlobalPointerUp] No overlapping pieces found`);
              }
            } else {
              console.log(
                `[handleGlobalPointerUp] In tap-to-drag mode, skipping overlap removal (will be done on placement)`
              );
            }

            // Check for auto-complete in tap-to-drag mode:
            // If piece is dropped at a position that would complete the puzzle, auto-finalize
            if (tapDragActiveItemId && shouldAutoCompleteRef.current) {
              const previewLayout = buildPreviewLayout(draggedItem.id, dropPosition);
              if (shouldAutoCompleteRef.current(previewLayout)) {
                console.log('[AutoComplete] Puzzle complete after drop, auto-finalizing placement');
                // Clear tap-drag state to finalize the placement
                setTapDragActiveItemId(null);
                setTapDragOriginalPosition(null);
                // Clean up drag state
                setDraggedItemId(null);
                setGrabOffset(null);
                setDragPreview(null);
                setCurrentHoveredCell(null);
                // Mark as valid placement
                externalDragWasPlacedValidlyRef.current = true;
                // Trigger layout change callback
                if (onLayoutChange) {
                  onLayoutChange(previewLayout);
                }
                return; // Early return since we've handled everything
              }
            }
          }
        }
      } else {
        // Dropped outside grid bounds
        if (tapDragActiveItemId === currentDraggedItemId && !tapDragOriginalPosition) {
          // Piece came from tray - will be removed by GridContent effect
          placedValidly = false;
        } else if (tapDragOriginalPosition) {
          // Piece was on board - reset to original position
          setItems((prev) =>
            prev.map((item) =>
              item.id === currentDraggedItemId
                ? { ...item, position: tapDragOriginalPosition }
                : item
            )
          );
        }
      }

      // Mark whether the drop was valid (for external drag tracking)
      externalDragWasPlacedValidlyRef.current = placedValidly;

      // Clean up drag state
      setDraggedItemId(null);
      setGrabOffset(null);
      setDragPreview(null);
      setCurrentHoveredCell(null);

      // Set flag to suppress click events immediately after drag ends
      // This prevents mouseup from triggering a click that auto-places the piece
      justFinishedDragRef.current = true;
      setTimeout(() => {
        justFinishedDragRef.current = false;
      }, 100); // 100ms should be enough to suppress the click
    },
    [
      draggedItemId,
      gridBounds,
      grabOffset,
      cellSize,
      spacing,
      gridSize,
      items,
      isPositionWithinBounds,
      isPositionOnBlockedTile,
      getOverlappingItemIds,
      moveItem,
      getGlobalEventCoordinates,
      tapDragActiveItemId,
      tapDragOriginalPosition,
      buildPreviewLayout,
      onLayoutChange,
      onPiecesRemoved,
    ]
  );

  // Keep refs updated with latest callbacks (avoids re-attaching event listeners when callbacks change)
  handleGlobalPointerMoveRef.current = handleGlobalPointerMove;
  handleGlobalPointerUpRef.current = handleGlobalPointerUp;

  // Auto-scroll effect - separate from event listeners to prevent restart on callback changes
  // This effect only depends on draggedItemId, so it won't restart when other callbacks change
  React.useEffect(() => {
    if (draggedItemId) {
      startAutoScroll();
      return () => {
        stopAutoScroll();
      };
    }
  }, [draggedItemId, startAutoScroll, stopAutoScroll]);

  // Set up global event listeners during drag
  // Uses refs for callbacks so effect only runs when draggedItemId changes (not when callbacks change)
  React.useEffect(() => {
    if (!draggedItemId) return;

    console.log(`[GlobalListeners] ATTACHING global listeners - draggedItemId=${draggedItemId}`);
    // Add dragging class to body to prevent scrolling
    document.body.classList.add('dragging-active');

    // Wrapper functions that call refs - allows callbacks to update without re-attaching listeners
    const handlePointerMove = (e: MouseEvent | TouchEvent) => handleGlobalPointerMoveRef.current(e);
    const handlePointerUp = (e: MouseEvent | TouchEvent) => handleGlobalPointerUpRef.current(e);

    // Mouse events
    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);

    // Touch events with passive: false to allow preventDefault
    document.addEventListener('touchmove', handlePointerMove, {
      passive: false,
      capture: true, // Use capture phase for better event control
    });
    document.addEventListener('touchend', handlePointerUp, {
      passive: false,
      capture: true,
    });

    return () => {
      console.log(
        `[GlobalListeners] REMOVING global listeners - draggedItemId was ${draggedItemId}`
      );
      // Remove dragging class from body
      document.body.classList.remove('dragging-active');

      // Mouse events
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseup', handlePointerUp);

      // Touch events (must match the options used when adding)
      document.removeEventListener('touchmove', handlePointerMove, {
        capture: true,
      } as EventListenerOptions);
      document.removeEventListener('touchend', handlePointerUp, {
        capture: true,
      } as EventListenerOptions);
    };
  }, [draggedItemId]);

  const getCellData = useCallback(
    (x: number, y: number): GridCellData | null => {
      if (y >= 0 && y < tileGrid.length) {
        const row = tileGrid[y];
        if (row && x >= 0 && x < row.length) {
          return row[x] || null;
        }
      }
      return null;
    },
    [tileGrid]
  );

  // Get grid bounds (for external drag calculations)
  const getGridBounds = useCallback(() => gridBounds, [gridBounds]);

  // Start external drag - allows starting a drag from outside the grid (e.g., piece tray modal)
  const startExternalDrag = useCallback(
    (
      itemData: Omit<DraggableItem, 'id'>,
      pointerPosition: { clientX: number; clientY: number }
    ) => {
      const currentGridBounds = gridBounds;
      if (!currentGridBounds) {
        console.warn('[startExternalDrag] Grid bounds not available');
        return;
      }

      // If there's an active tap-drag item, place it first to count the move correctly
      if (tapDragActiveItemId) {
        console.log(
          `[startExternalDrag] Placing active piece ${tapDragActiveItemId} before starting new drag`
        );
        placeTapDragItem();
      }

      // Generate ID for the new item
      const newItemId = itemData.shape.name || generateItemId(gridId, items.length);

      // Calculate initial grid position based on pointer position
      const pointerX = pointerPosition.clientX - currentGridBounds.left;
      const pointerY = pointerPosition.clientY - currentGridBounds.top;

      // Convert to grid coordinates, centering the piece on the pointer
      const cellX = Math.floor(pointerX / (cellSize.width + spacing));
      const cellY = Math.floor(pointerY / (cellSize.height + spacing));

      // Offset to center the piece shape on the pointer
      const centerOffsetX = Math.floor(itemData.shape.width / 2);
      const centerOffsetY = Math.floor(itemData.shape.height / 2);

      const initialPosition = {
        x: Math.max(0, Math.min(cellX - centerOffsetX, gridSize.width - itemData.shape.width)),
        y: Math.max(0, Math.min(cellY - centerOffsetY, gridSize.height - itemData.shape.height)),
      };

      // Create the new item
      const newItem: DraggableItem = {
        ...itemData,
        id: newItemId,
        position: initialPosition,
      };

      // Add item to the grid
      setItems((prev) => [...prev, newItem]);

      // Calculate grab offset (where on the piece the user "grabbed" it)
      const grabOffsetX = Math.min(centerOffsetX, itemData.shape.width - 1);
      const grabOffsetY = Math.min(centerOffsetY, itemData.shape.height - 1);

      // Set up drag state
      setGrabOffset({ x: grabOffsetX, y: grabOffsetY });
      setDraggedItemId(newItemId);

      // Set initial pointer position for auto-scroll
      setInitialPointerPosition(pointerPosition);

      // In tap-to-drag mode, also activate tap drag
      if (dragMode === 'tap-to-drag') {
        setTapDragActiveItemId(newItemId);
        setTapDragOriginalPosition(null); // No original position - item is new
      }

      console.log(
        `[startExternalDrag] Started drag for item=${newItemId} at position`,
        initialPosition
      );
    },
    [
      gridBounds,
      gridId,
      items.length,
      cellSize,
      spacing,
      gridSize,
      dragMode,
      setInitialPointerPosition,
      tapDragActiveItemId,
      placeTapDragItem,
    ]
  );

  const contextValue = useMemo(
    () => ({
      gridId,
      items,
      tileGrid,
      gridSize,
      cellSize,
      spacing,
      disabled,
      dragMode,
      dragPreview,
      draggedItemId,
      grabOffset,
      currentHoveredCell,
      tapDragActiveItemId,
      tapDragOriginalPosition,
      overlappingPieceIds,
      invalidPositionItemIds,
      setItems,
      addItem,
      removeItem,
      moveItem,
      setDragPreview,
      setDraggedItemId,
      setGrabOffset,
      setGridBounds,
      setInitialPointerPosition,
      isPositionValid,
      getCellData,
      activateTapDrag,
      deactivateTapDrag,
      placeTapDragItem,
      shouldAutoComplete: shouldAutoComplete || null,
      startExternalDrag,
      getGridBounds,
      externalDragWasPlacedValidlyRef,
      isCellBlocked: isCellBlocked || null,
      justFinishedDragRef,
    }),
    [
      gridId,
      items,
      tileGrid,
      gridSize,
      cellSize,
      spacing,
      disabled,
      dragMode,
      dragPreview,
      draggedItemId,
      grabOffset,
      currentHoveredCell,
      tapDragActiveItemId,
      tapDragOriginalPosition,
      overlappingPieceIds,
      invalidPositionItemIds,
      justFinishedDragRef,
      addItem,
      removeItem,
      moveItem,
      setDragPreview,
      setDraggedItemId,
      setGrabOffset,
      setGridBounds,
      setInitialPointerPosition,
      isPositionValid,
      getCellData,
      activateTapDrag,
      deactivateTapDrag,
      placeTapDragItem,
      shouldAutoComplete,
      startExternalDrag,
      getGridBounds,
      externalDragWasPlacedValidlyRef,
      isCellBlocked,
    ]
  );

  return <GridContext.Provider value={contextValue}>{children}</GridContext.Provider>;
}

// Grid Cell component - simplified for mouse-based approach
type GridCellProps = {
  x: number;
  y: number;
  className?: string;
  style?: React.CSSProperties;
};

const GridCell = React.memo(({ x, y, className = '', style }: GridCellProps) => {
  const { gridId, cellSize, spacing, getCellData, currentHoveredCell, draggedItemId } = useGrid();
  const cellId = generateCellId(gridId, x, y);

  const cellData = getCellData(x, y);
  const isOccupied = cellData?.isOccupied ?? false;
  const isHovered = currentHoveredCell?.x === x && currentHoveredCell.y === y && !!draggedItemId;

  const cellStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      left: x * (cellSize.width + spacing),
      top: y * (cellSize.height + spacing),
      width: cellSize.width,
      height: cellSize.height,
      touchAction: 'auto', // Allow scrolling on background cells
      ...style, // Apply custom styles
    }),
    [x, y, cellSize, spacing, style]
  );

  const getBackgroundClass = useCallback(() => {
    if (isOccupied) {
      return 'bg-accent/20 border-accent';
    }
    if (isHovered) {
      return 'bg-primary/20';
    }
    // Base background - hover is handled in combinedClassName logic
    return 'bg-card';
  }, [isOccupied, isHovered]);

  // Combine default classes with custom classes
  const combinedClassName = useMemo(() => {
    const defaultClasses = getBackgroundClass();
    const customClasses = className || '';

    // Handle hover behavior based on drag state and custom classes
    if (draggedItemId) {
      // When dragging, remove all hover classes (both custom and default)
      if (customClasses.includes('hover:')) {
        // Remove hover classes from custom classes when dragging
        const classesWithoutHover = customClasses
          .split(' ')
          .filter((cls) => !cls.startsWith('hover:'))
          .join(' ');
        return cn(defaultClasses, classesWithoutHover);
      }
      // No custom hover classes, just use default classes (no hover)
      return cn(defaultClasses, customClasses);
    }

    // Not dragging - add default hover if no custom hover classes
    if (!customClasses.includes('hover:')) {
      return cn(defaultClasses, 'hover:bg-accent transition-colors', customClasses);
    }

    // Custom hover classes present - use them as-is
    return cn(defaultClasses, customClasses);
  }, [getBackgroundClass, className, draggedItemId]);

  return (
    <div
      id={cellId}
      className={cn(
        'relative border-2 border-white transition-colors dark:border-transparent',
        combinedClassName
      )}
      style={cellStyle}
      data-testid={`grid-cell-${x}-${y}`}
      data-occupied={isOccupied}
      data-item-id={cellData?.occupyingItemId}
    >
      {/* Coordinate labels for dev mode */}
      {isDevelopment() && (
        <div className="absolute top-0 left-0 text-[10px] font-mono text-red-600 font-bold leading-none p-0.5 pointer-events-none select-none bg-white/80 rounded">
          {x},{y}
        </div>
      )}
    </div>
  );
});

GridCell.displayName = 'GridCell';

// Draggable Item component
type DraggableItemProps = {
  item: DraggableItem;
  onDragStart?: (item: DraggableItem, grabOffset?: GridPosition) => void;
  onDragEnd?: (item: DraggableItem) => void;
  className?: string;
  defaultClassName?: string;
};

const DraggableItemComponent = React.memo(
  ({ item, onDragStart, onDragEnd, className = '', defaultClassName }: DraggableItemProps) => {
    const {
      cellSize,
      spacing,
      disabled: gridDisabled,
      setInitialPointerPosition,
      dragMode,
      tapDragActiveItemId,
      tapDragOriginalPosition,
      overlappingPieceIds,
      invalidPositionItemIds,
      activateTapDrag,
      placeTapDragItem,
    } = useGrid();
    const isDisabled = (item.disabled ?? false) || gridDisabled;
    const [isDragging, setIsDragging] = useState(false);
    const [cursorType, setCursorType] = useState<'default' | 'move' | 'not-allowed'>('default');
    const itemRef = React.useRef<HTMLDivElement>(null);

    // Check if this item is the one being tap-dragged
    const isTapDragActive = tapDragActiveItemId === item.id;
    // Check if this piece came from the tray (no original position on board)
    const isFromTray = isTapDragActive && tapDragOriginalPosition === null;
    // Check if this piece is being overlapped by the currently dragging piece
    const isBeingOverlapped = overlappingPieceIds.includes(item.id);
    // Check if this piece is in an invalid position (on blocked tile)
    const isInInvalidPosition = invalidPositionItemIds.includes(item.id);

    const boundingBox = useMemo(() => getItemBoundingBox(item), [item]);

    // Utility function to get coordinates from mouse or touch events
    const getEventCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      if ('touches' in e) {
        // Touch event
        const touch = e.changedTouches?.[0] || e.touches?.[0];
        if (touch) {
          return { clientX: touch.clientX, clientY: touch.clientY };
        }
        // Fallback if no touch found
        return { clientX: 0, clientY: 0 };
      } else {
        // Mouse event
        return { clientX: e.clientX, clientY: e.clientY };
      }
    }, []);

    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (isDragging) return; // Don't change cursor while dragging

        const coords = getEventCoordinates(e);

        // Calculate which cell within the bounding box the mouse is over
        let mouseGridX = 0;
        let mouseGridY = 0;
        if (itemRef.current) {
          const rect = itemRef.current.getBoundingClientRect();
          const relativeX = coords.clientX - rect.left;
          const relativeY = coords.clientY - rect.top;

          // Convert pixel coordinates to grid coordinates within the bounding box
          mouseGridX = Math.floor(relativeX / (cellSize.width + spacing));
          mouseGridY = Math.floor(relativeY / (cellSize.height + spacing));
        }

        // Check if the mouse position corresponds to an occupied cell in the shape
        const isOverOccupiedCell = item.shape.cells.some(
          (cell) => cell.x === mouseGridX && cell.y === mouseGridY
        );

        // Update cursor based on whether we're over an occupied cell and if piece is disabled
        if (isDisabled) {
          setCursorType('not-allowed');
        } else {
          setCursorType(isOverOccupiedCell ? 'move' : 'default');
        }
      },
      [isDragging, item.shape.cells, cellSize, spacing, getEventCoordinates, isDisabled]
    );

    const handlePointerDown = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        console.log(
          `[PointerDown] item=${item.id}, type=${e.type}, disabled=${isDisabled}, dragMode=${dragMode}, tapDragActiveItemId=${tapDragActiveItemId}, isTapDragActive=${isTapDragActive}`
        );

        // Prevent dragging if the piece is disabled
        if (isDisabled) {
          console.log(`[PointerDown] EARLY RETURN: piece is disabled`);
          return;
        }

        // In tap-to-drag mode, allow clicks on other pieces to pass through to handleClick
        // Don't call preventDefault() - allow scrolling on non-active pieces
        if (dragMode === 'tap-to-drag' && tapDragActiveItemId && !isTapDragActive) {
          // Another piece is in tap-drag mode, let handleClick handle switching pieces
          console.log(
            `[PointerDown] Another piece is active - letting handleClick handle piece switching`
          );
          return;
        }

        const coords = getEventCoordinates(e);
        console.log(`[PointerDown] coords: clientX=${coords.clientX}, clientY=${coords.clientY}`);

        // Calculate which cell within the bounding box was clicked
        let clickedGridX = 0;
        let clickedGridY = 0;
        if (itemRef.current) {
          const rect = itemRef.current.getBoundingClientRect();
          const relativeX = coords.clientX - rect.left;
          const relativeY = coords.clientY - rect.top;

          // Convert pixel coordinates to grid coordinates within the bounding box
          clickedGridX = Math.floor(relativeX / (cellSize.width + spacing));
          clickedGridY = Math.floor(relativeY / (cellSize.height + spacing));
        }
        console.log(`[PointerDown] clickedGrid: x=${clickedGridX}, y=${clickedGridY}`);

        // Check if the clicked position corresponds to an occupied cell in the shape
        const isOccupiedCell = item.shape.cells.some(
          (cell) => cell.x === clickedGridX && cell.y === clickedGridY
        );
        console.log(`[PointerDown] isOccupiedCell=${isOccupiedCell}`);

        // Only allow dragging if clicking on an occupied cell
        if (!isOccupiedCell) {
          // For empty spaces (dead areas), allow the event to bubble naturally
          // This enables scrolling when touching dead areas of pieces
          // We don't call preventDefault() here so the browser can handle scrolling
          console.log(`[PointerDown] EARLY RETURN: not an occupied cell, allowing scroll`);
          return;
        }

        // In tap-to-drag mode, first tap activates drag mode
        if (dragMode === 'tap-to-drag') {
          // If this item is already in tap-drag mode, start actual dragging
          if (isTapDragActive) {
            // Prevent default for touch/mouse events to stop scrolling when dragging
            console.log(
              `[PointerDown] Active piece tapped again - starting drag, calling preventDefault()`
            );
            e.preventDefault();

            // Calculate grab offset - where on the piece the user clicked/touched
            const grabOffset: GridPosition = {
              x: clickedGridX,
              y: clickedGridY,
            };

            // Set initial pointer position for immediate auto-scroll support
            setInitialPointerPosition(coords);

            onDragStart?.(item, grabOffset);
          } else {
            // First touch on non-active piece - do nothing here
            // Let the browser handle touch naturally (allows scrolling)
            // Tap activation is handled by onClick instead
            console.log(
              `[PointerDown] Non-active piece touched - doing nothing, letting browser handle scroll. onClick will handle tap.`
            );
          }
          return;
        }

        // Hold-to-drag mode: immediate drag start
        // Prevent default for touch/mouse events to stop scrolling when dragging from an occupied cell
        console.log(`[PointerDown] Hold-to-drag mode - starting drag, calling preventDefault()`);
        e.preventDefault();

        // Calculate grab offset - where on the piece the user clicked/touched
        const grabOffset: GridPosition = {
          x: clickedGridX,
          y: clickedGridY,
        };

        // Set initial pointer position for immediate auto-scroll support
        setInitialPointerPosition(coords);

        onDragStart?.(item, grabOffset);
      },
      [
        item,
        onDragStart,
        cellSize,
        spacing,
        getEventCoordinates,
        isDisabled,
        setInitialPointerPosition,
        dragMode,
        tapDragActiveItemId,
        isTapDragActive,
      ]
    );

    const handlePointerUp = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        console.log(
          `[PointerUp] item=${item.id}, type=${e.type}, isTapDragActive=${isTapDragActive}`
        );
        // Always handle the pointer up locally for visual feedback
        setIsDragging(false);
        onDragEnd?.(item);

        const coords = getEventCoordinates(e);

        // Always forward the event to the document level so the global drop handler can process it
        // This ensures drops work regardless of which piece you're hovering over
        const globalMouseUpEvent = new MouseEvent('mouseup', {
          clientX: coords.clientX,
          clientY: coords.clientY,
          button: 'touches' in e ? 0 : e.button,
          buttons: 'touches' in e ? 1 : e.buttons,
          view: window,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(globalMouseUpEvent);
      },
      [item, onDragEnd, getEventCoordinates, isTapDragActive]
    );

    const handleMouseLeave = useCallback(() => {
      if (!isDragging) {
        setCursorType(isDisabled ? 'not-allowed' : 'default');
      }
    }, [isDragging, isDisabled]);

    // Handle click/tap to activate drag mode for non-active pieces
    // Using onClick because the browser only fires click for taps, not scroll gestures
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        console.log(
          `[Click] item=${item.id}, disabled=${isDisabled}, dragMode=${dragMode}, isTapDragActive=${isTapDragActive}, tapDragActiveItemId=${tapDragActiveItemId}`
        );
        console.log(
          `[Click] touchAction on this item would be: ${isTapDragActive ? 'none' : 'auto'}`
        );

        // Only handle clicks in tap-to-drag mode
        if (dragMode !== 'tap-to-drag' || isDisabled) {
          console.log(`[Click] Ignoring - not tap-to-drag mode or disabled`);
          return;
        }

        // Calculate which cell was clicked
        let clickedGridX = 0;
        let clickedGridY = 0;
        if (itemRef.current) {
          const rect = itemRef.current.getBoundingClientRect();
          const relativeX = e.clientX - rect.left;
          const relativeY = e.clientY - rect.top;
          clickedGridX = Math.floor(relativeX / (cellSize.width + spacing));
          clickedGridY = Math.floor(relativeY / (cellSize.height + spacing));
        }

        // Check if clicked on an occupied cell
        const isOccupiedCell = item.shape.cells.some(
          (cell) => cell.x === clickedGridX && cell.y === clickedGridY
        );

        if (!isOccupiedCell) {
          console.log(`[Click] Ignoring - not an occupied cell`);
          return;
        }

        // If this piece is already active, do nothing (keep it in drag mode)
        // User must click elsewhere (empty space) or the Place button to confirm placement
        if (isTapDragActive) {
          console.log(`[Click] Ignoring - piece is already active, click elsewhere to place`);
          return;
        }

        // If another piece is active and this piece is being overlapped,
        // don't auto-place - user should use "Place" button to confirm
        if (tapDragActiveItemId && isBeingOverlapped) {
          console.log(
            `[Click] Ignoring - this piece is being overlapped, user must click "Place" to confirm`
          );
          return;
        }

        // If another piece is active (and not overlapping this piece), place it first then activate this one
        if (tapDragActiveItemId) {
          console.log(`[Click] Placing current piece and activating item=${item.id}`);
          placeTapDragItem();
          activateTapDrag(item.id);
          return;
        }

        console.log(`[Click] Activating drag mode for item=${item.id}`);
        activateTapDrag(item.id);
      },
      [
        item,
        isDisabled,
        dragMode,
        isTapDragActive,
        tapDragActiveItemId,
        isBeingOverlapped,
        cellSize,
        spacing,
        activateTapDrag,
        placeTapDragItem,
      ]
    );

    const itemStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        left: item.position.x * (cellSize.width + spacing),
        top: item.position.y * (cellSize.height + spacing),
        width: boundingBox.width * cellSize.width + (boundingBox.width - 1) * spacing,
        height: boundingBox.height * cellSize.height + (boundingBox.height - 1) * spacing,
        zIndex: isDragging || isTapDragActive ? 1000 : 1,
      }),
      [item.position, boundingBox, cellSize, spacing, isDragging, isTapDragActive]
    );

    // Render individual cells for the shape
    const shapeCells = useMemo(() => {
      // Check if content is a string with multiple letters to distribute
      const contentString = typeof item.content === 'string' ? item.content : '';
      const shouldDistributeLetters =
        contentString.length > 1 && item.shape.cells.length === contentString.length;

      // Calculate half spacing for hit area extension
      const halfSpacing = spacing / 2;

      return item.shape.cells.map((cell, index) => {
        // Hit area style - extends into spacing to cover gaps between cells
        const hitAreaStyle: React.CSSProperties = {
          position: 'absolute' as const,
          // Position offset by half spacing to extend hit area
          left: cell.x * (cellSize.width + spacing) - halfSpacing,
          top: cell.y * (cellSize.height + spacing) - halfSpacing,
          // Size includes the spacing
          width: cellSize.width + spacing,
          height: cellSize.height + spacing,
          zIndex: isDragging || isTapDragActive ? 1001 : 2,
          // Block touch scrolling on letter cells in hold-to-drag mode or when piece is active
          touchAction: dragMode === 'hold-to-drag' || isTapDragActive ? 'none' : 'auto',
          pointerEvents: 'auto', // Hit area captures events
          cursor: isDisabled ? 'default' : 'pointer',
        };

        // Visual cell style - the actual displayed cell
        const cellStyle: React.CSSProperties = {
          position: 'absolute' as const,
          left: halfSpacing,
          top: halfSpacing,
          width: cellSize.width,
          height: cellSize.height,
          pointerEvents: 'none', // Visual cell doesn't need to capture events
          ...item.style, // Apply custom styles
        };

        // Get the letter for this cell
        let cellContent = '';
        if (shouldDistributeLetters && contentString[index]) {
          cellContent = contentString[index];
        } else if (index === 0) {
          cellContent = contentString || item.content?.toString() || '';
        }

        return (
          <div key={`cell-${index}`} style={hitAreaStyle}>
            <div
              className={cn(
                'flex justify-center items-center overflow-y-hidden',
                'border border-border dark:border-transparent',
                // Hide piece when actively dragging in tap-drag mode
                // Also hide piece from tray entirely (no original position to show)
                (isDragging && isTapDragActive) || isFromTray ? 'opacity-0' : 'opacity-100',
                // Show red breathing when this piece is being overlapped by dragging piece
                // or when in an invalid position (on blocked tile)
                (isBeingOverlapped || isInInvalidPosition) && 'animate-pulse-red',
                item.className || defaultClassName || ''
              )}
              style={cellStyle}
            >
              {cellContent && (
                <div
                  className={cn(
                    'p-1 text-xs font-semibold text-center text-primary-foreground pointer-events-none',
                    // Apply text-related classes from item.className to the text element
                    item.className
                  )}
                >
                  {cellContent}
                </div>
              )}
            </div>
          </div>
        );
      });
    }, [
      item.shape.cells,
      item.content,
      item.style,
      item.className,
      cellSize,
      spacing,
      isDragging,
      isTapDragActive,
      isFromTray,
      isBeingOverlapped,
      isInInvalidPosition,
      isDisabled,
      defaultClassName,
      dragMode,
    ]);

    // Determine touch action based on drag mode
    // - Hold-to-drag mode: always use 'none' to prevent scroll interference
    // - Tap-to-drag mode: allow scrolling on non-active pieces, block on active piece
    const getTouchAction = () => {
      let result: string;
      if (dragMode === 'hold-to-drag') {
        result = 'none'; // Prevent all touch scrolling in hold-to-drag mode
      } else if (isTapDragActive) {
        result = 'none'; // Active piece blocks scrolling
      } else {
        result = 'auto'; // Non-active pieces allow scrolling
      }
      // Only log when this is relevant (piece is being rendered)
      return result;
    };

    return (
      <div
        ref={itemRef}
        id={item.id}
        className={cn(
          'transition-all select-none',
          // Add scale effect when tap-drag is active
          isTapDragActive && 'scale-105',
          className
        )}
        style={{
          ...itemStyle,
          cursor: cursorType,
          touchAction: getTouchAction(),
          pointerEvents: 'none', // Wrapper doesn't capture events - only cells do (fixes dead space blocking)
          userSelect: 'none', // Prevent text selection
          WebkitUserSelect: 'none', // Prevent text selection on Safari
          WebkitTouchCallout: 'none', // Disable callout on iOS Safari
          WebkitTapHighlightColor: 'transparent', // Remove tap highlight on mobile
        }}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onMouseUp={handlePointerUp}
        onTouchEnd={handlePointerUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        data-testid={`draggable-item-${item.id}`}
        data-tap-drag-active={isTapDragActive}
      >
        {shapeCells}
      </div>
    );
  }
);

DraggableItemComponent.displayName = 'DraggableItem';

// Drag Preview Component - shows preview of shape at drop location
const DragPreviewComponent = React.memo(
  ({
    item,
    position,
    isValid,
    cellSize,
    spacing,
    getTileDraggingClassName,
    defaultClassName,
  }: {
    item: DraggableItem;
    position: GridPosition;
    isValid: boolean;
    cellSize: GridSize;
    spacing: number;
    getTileDraggingClassName?: (piece: DraggableItem, valid: boolean) => string | undefined;
    defaultClassName?: string;
  }) => {
    const boundingBox = useMemo(() => getItemBoundingBox(item), [item]);

    const previewStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        left: position.x * (cellSize.width + spacing),
        top: position.y * (cellSize.height + spacing),
        width: boundingBox.width * cellSize.width + (boundingBox.width - 1) * spacing,
        height: boundingBox.height * cellSize.height + (boundingBox.height - 1) * spacing,
        zIndex: 999, // Above everything else
        pointerEvents: 'none' as const, // Don't interfere with interactions
      }),
      [position, boundingBox, cellSize, spacing]
    );

    // Render individual cells for the shape preview
    const previewCells = useMemo(() => {
      // Check if content is a string with multiple letters to distribute
      const contentString = typeof item.content === 'string' ? item.content : '';
      const shouldDistributeLetters =
        contentString.length > 1 && item.shape.cells.length === contentString.length;

      // Get custom class name if function is provided
      const customDraggingClassName = getTileDraggingClassName
        ? getTileDraggingClassName(item, isValid)
        : undefined;

      return item.shape.cells.map((cell, index) => {
        const cellStyle: React.CSSProperties = {
          position: 'absolute' as const,
          left: cell.x * (cellSize.width + spacing),
          top: cell.y * (cellSize.height + spacing),
          width: cellSize.width,
          height: cellSize.height,
          zIndex: 1000,
          ...item.style, // Apply custom styles
          opacity: 1, // Always full opacity for preview
        };

        // Get the letter for this cell
        let cellContent = '';
        if (shouldDistributeLetters && contentString[index]) {
          cellContent = contentString[index];
        } else if (index === 0) {
          cellContent = contentString || item.content?.toString() || '';
        }

        return (
          <div
            key={`preview-cell-${index}`}
            className={cn(
              'flex justify-center items-center',
              'border border-border dark:border-transparent',
              item.className || defaultClassName || '',
              customDraggingClassName || '' // Add custom dragging class
            )}
            style={cellStyle}
          >
            {cellContent && (
              <div
                className={cn(
                  'p-1 text-xs font-semibold text-center text-primary-foreground',
                  // Apply text-related classes from item.className to the text element
                  item.className
                    ?.split(' ')
                    .filter(
                      (cls) =>
                        cls.startsWith('text-') ||
                        cls.startsWith('font-') ||
                        cls.startsWith('leading-') ||
                        cls.startsWith('tracking-')
                    )
                    .join(' ') || ''
                )}
              >
                {cellContent}
              </div>
            )}
          </div>
        );
      });
    }, [item, cellSize, spacing, defaultClassName, isValid, getTileDraggingClassName]);

    return <div style={previewStyle}>{previewCells}</div>;
  }
);

DragPreviewComponent.displayName = 'DragPreview';

// Scroll Zone Indicator Component - shows visible zones at top/bottom when dragging
const ScrollZoneIndicator = React.memo(
  ({ position, isVisible }: { position: 'top' | 'bottom'; isVisible: boolean }) => {
    const zoneHeight = `${AUTO_SCROLL_CONFIG.edgeThresholdPercent * 100}vh`;

    return (
      <div
        className={cn(
          'fixed left-0 right-0 pointer-events-none z-[9999]',
          'flex items-center justify-center',
          'bg-black/0 border-white/0',
          'transition-all duration-200 ease-out overflow-hidden',
          position === 'top' ? 'top-0 border-b origin-top' : 'bottom-0 border-t origin-bottom'
        )}
        style={{
          height: isVisible ? zoneHeight : '0',
        }}
      >
        <span
          className={cn(
            'text-sm font-medium tracking-wide text-white/50',
            'opacity-0 transition-opacity duration-150 delay-75'
          )}
        >
          Drag Here to Scroll
        </span>
      </div>
    );
  }
);

ScrollZoneIndicator.displayName = 'ScrollZoneIndicator';

// Bottom Banner - shows drag mode controls when a piece is being dragged
const BottomBanner = React.memo(
  ({
    isVisible,
    isDragMode,
    onPlace,
    onRemove,
    unplacedPieceCount,
  }: {
    isVisible: boolean;
    isDragMode: boolean;
    onPlace: () => void;
    onRemove: () => void;
    unplacedPieceCount: number;
  }) => {
    // Only show banner when in drag mode (piece is being dragged)
    const showBanner = isVisible && isDragMode;

    return (
      <div
        className={cn(
          'fixed right-0 bottom-0 left-0 z-[9998]',
          'flex flex-col',
          'backdrop-blur-sm bg-muted/95',
          'overflow-hidden transition-all duration-300 ease-out'
        )}
        style={{
          height: showBanner ? 'calc(60px + env(safe-area-inset-bottom, 0px))' : '0',
          paddingBottom: showBanner ? 'env(safe-area-inset-bottom, 0px)' : '0',
          pointerEvents: showBanner ? 'auto' : 'none',
        }}
      >
        {/* Main banner content */}
        <div
          className={cn(
            'flex flex-1 justify-between items-center px-4',
            'transition-opacity duration-200 delay-100',
            showBanner ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">Drag Mode</span>
            <span className="text-xs text-muted-foreground">
              {unplacedPieceCount} piece{unplacedPieceCount !== 1 ? 's' : ''} remaining
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRemove}
              className={cn(
                'px-4 py-2 font-bold rounded-md',
                'bg-muted text-foreground border border-border',
                'transition-all duration-150',
                'hover:bg-muted/80 active:scale-95'
              )}
            >
              Remove
            </button>
            <button
              onClick={onPlace}
              className={cn(
                'px-4 py-2 font-bold rounded-md bg-foreground text-background',
                'transition-all duration-150',
                'hover:bg-foreground/90 active:scale-95'
              )}
            >
              Place
            </button>
          </div>
        </div>
      </div>
    );
  }
);

BottomBanner.displayName = 'BottomBanner';

// Main Grid component
type GridProps = {
  gridSize: GridSize;
  cellSize: GridSize;
  initialItems?: Omit<DraggableItem, 'id'>[];
  onItemMove?: (item: DraggableItem, newPosition: GridPosition) => void;
  onItemAdd?: (item: DraggableItem) => void;
  onItemRemove?: (itemId: string) => void;
  onLayoutChange?: (layout: (string | null)[][]) => void;
  className?: string;
  children?: ReactNode;
  disabled?: boolean; // Whether all pieces are disabled and cannot be moved
  dragMode?: DragMode; // 'tap-to-drag' (default) or 'hold-to-drag'
  getBoardTileStyle?: (x: number, y: number) => React.CSSProperties | undefined;
  getBoardTileClassName?: (x: number, y: number) => string | undefined;
  getTileDraggingClassName?: (piece: DraggableItem, valid: boolean) => string | undefined;
  // Default classes that can be completely overridden
  defaultBoardTileClassName?: string;
  defaultItemClassName?: string;
  // Optional callback to check if placing a piece would complete the puzzle
  // If provided and returns true during drag, the piece will be auto-placed
  shouldAutoComplete?: (previewLayout: (string | null)[][]) => boolean;
  // Optional callback when drag state changes (piece selected/deselected in tap-to-drag mode)
  onDragStateChange?: (isActive: boolean) => void;
  // Hide the bottom banner
  hideBanner?: boolean;
  // Callback when an external drag results in an invalid drop (piece should return to tray)
  onExternalDragInvalid?: (itemId: string) => void;
  // Number of unplaced pieces (for display in banner)
  unplacedPieceCount?: number;
  // Callback to check if a cell is blocked (e.g., black tiles that pieces cannot be placed on)
  // When placing on a blocked cell, the dragging piece returns to tray without affecting other pieces
  isCellBlocked?: (x: number, y: number) => boolean;
  // Callback when overlapping pieces are removed (sent back to tray)
  onPiecesRemoved?: (pieceIds: string[]) => void;
  // Callback when user tries to place a piece in an invalid position (on blocked tile)
  onInvalidPlacement?: (itemId: string) => void;
  // Callback when a piece enters or leaves the grid bounds during drag
  // Useful for hiding the piece placeholder in the tray when dragging over the grid
  onDragOverGridChange?: (pieceId: string | null) => void;
};

const Grid = forwardRef<GridRef, GridProps>(function Grid(
  {
    gridSize,
    cellSize,
    initialItems = [],
    onItemMove: _onItemMove,
    onItemAdd: _onItemAdd,
    onItemRemove: _onItemRemove,
    onLayoutChange,
    className = '',
    children,
    disabled = false,
    dragMode = 'tap-to-drag',
    getBoardTileStyle,
    getBoardTileClassName,
    getTileDraggingClassName,
    defaultBoardTileClassName,
    defaultItemClassName,
    shouldAutoComplete,
    onDragStateChange,
    hideBanner = false,
    onExternalDragInvalid,
    unplacedPieceCount = 0,
    isCellBlocked,
    onPiecesRemoved,
    onInvalidPlacement,
    onDragOverGridChange,
  },
  ref
) {
  return (
    <GridProvider
      gridSize={gridSize}
      cellSize={cellSize}
      initialItems={initialItems}
      onLayoutChange={onLayoutChange}
      disabled={disabled}
      dragMode={dragMode}
      shouldAutoComplete={shouldAutoComplete}
      onDragStateChange={onDragStateChange}
      onInvalidPlacement={onInvalidPlacement}
      isCellBlocked={isCellBlocked}
      onPiecesRemoved={onPiecesRemoved}
    >
      <GridContent
        ref={ref}
        className={className}
        getBoardTileStyle={getBoardTileStyle}
        getBoardTileClassName={getBoardTileClassName}
        getTileDraggingClassName={getTileDraggingClassName}
        defaultBoardTileClassName={defaultBoardTileClassName}
        defaultItemClassName={defaultItemClassName}
        hideBanner={hideBanner}
        onExternalDragInvalid={onExternalDragInvalid}
        unplacedPieceCount={unplacedPieceCount}
        onDragOverGridChange={onDragOverGridChange}
        onPiecesRemoved={onPiecesRemoved}
      >
        {children}
      </GridContent>
    </GridProvider>
  );
});

// Internal Grid component that has access to context
const GridContent = forwardRef<
  GridRef,
  {
    className: string;
    children: ReactNode;
    getBoardTileStyle?: (x: number, y: number) => React.CSSProperties | undefined;
    getBoardTileClassName?: (x: number, y: number) => string | undefined;
    getTileDraggingClassName?: (piece: DraggableItem, valid: boolean) => string | undefined;
    defaultBoardTileClassName?: string;
    defaultItemClassName?: string;
    hideBanner?: boolean;
    onExternalDragInvalid?: (itemId: string) => void;
    unplacedPieceCount?: number;
    onDragOverGridChange?: (pieceId: string | null) => void;
    onPiecesRemoved?: (pieceIds: string[]) => void;
  }
>(function GridContent(
  {
    className,
    children,
    getBoardTileStyle,
    getBoardTileClassName,
    getTileDraggingClassName,
    defaultBoardTileClassName,
    defaultItemClassName,
    hideBanner = false,
    onExternalDragInvalid,
    unplacedPieceCount = 0,
    onDragOverGridChange,
    onPiecesRemoved,
  },
  ref
) {
  const {
    items,
    gridSize,
    cellSize,
    spacing,
    disabled,
    dragPreview,
    draggedItemId,
    dragMode,
    setDragPreview,
    setDraggedItemId,
    setGrabOffset,
    setGridBounds,
    tapDragActiveItemId,
    tapDragOriginalPosition,
    placeTapDragItem,
    deactivateTapDrag,
    startExternalDrag,
    addItem,
    removeItem,
    externalDragWasPlacedValidlyRef,
    isCellBlocked,
    justFinishedDragRef,
  } = useGrid();

  // Expose methods via ref for external control
  useImperativeHandle(
    ref,
    () => ({
      startExternalDrag,
      addItem: (item: Omit<DraggableItem, 'id'>) => {
        const newId = item.shape.name || `external-${Date.now()}`;
        addItem(item);
        return newId;
      },
      removeItem,
      getItems: () => items,
    }),
    [startExternalDrag, addItem, removeItem, items]
  );

  // Track external drag items to handle invalid drops
  const externalDragItemRef = useRef<string | null>(null);
  // Track if the external drag item came from tray (no original position)
  const externalDragFromTrayRef = useRef<boolean>(false);

  // When an external drag starts, track the item
  useEffect(() => {
    if (draggedItemId && !externalDragItemRef.current) {
      // Check if this is a newly added item (from external source like tray)
      const item = items.find((i) => i.id === draggedItemId);
      if (item) {
        externalDragItemRef.current = draggedItemId;
        externalDragWasPlacedValidlyRef.current = false;
        // Track if this came from tray (no original position in tap drag)
        externalDragFromTrayRef.current =
          tapDragActiveItemId === draggedItemId && !tapDragOriginalPosition;
      }
    } else if (!draggedItemId && externalDragItemRef.current) {
      // Drag ended - check if the placement was valid
      const itemId = externalDragItemRef.current;
      const item = items.find((i) => i.id === itemId);
      const wasFromTray = externalDragFromTrayRef.current;

      if (item && onExternalDragInvalid) {
        // Check if the drop was placed validly (tracked by handleGlobalPointerUp)
        const wasPlacedValidly = externalDragWasPlacedValidlyRef.current;

        // For external drags from tray, remove if the drop target was invalid
        // This ensures pieces return to tray when dropped on invalid spots
        if (!wasPlacedValidly && wasFromTray) {
          console.log(`[ExternalDrag] Invalid drop for ${itemId}, returning to tray`);
          onExternalDragInvalid(itemId);
          removeItem(itemId);
          // Also clean up tap drag state since piece is being removed
          deactivateTapDrag();
        }
      }

      externalDragItemRef.current = null;
      externalDragWasPlacedValidlyRef.current = false;
      externalDragFromTrayRef.current = false;
    }
  }, [
    draggedItemId,
    items,
    onExternalDragInvalid,
    removeItem,
    tapDragActiveItemId,
    tapDragOriginalPosition,
    deactivateTapDrag,
    externalDragWasPlacedValidlyRef,
  ]);

  // Track when a piece enters/leaves grid bounds during drag
  // This is used to hide the placeholder in the tray when dragging over the grid
  const prevDragOverGridRef = useRef<string | null>(null);
  useEffect(() => {
    // Determine if a piece is currently over the grid
    // A piece is "over the grid" when there's a drag preview (calculated during pointer move)
    const pieceOverGrid = dragPreview ? dragPreview.item.id : null;

    // Only call the callback if the state changed
    if (pieceOverGrid !== prevDragOverGridRef.current) {
      prevDragOverGridRef.current = pieceOverGrid;
      onDragOverGridChange?.(pieceOverGrid);
    }
  }, [dragPreview, onDragOverGridChange]);

  const gridRef = React.useRef<HTMLDivElement>(null);

  // Track scroll position to hide indicators when at top/bottom
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);

  // Capture grid bounds when component mounts or resizes
  React.useEffect(() => {
    if (gridRef.current) {
      setGridBounds(gridRef.current.getBoundingClientRect());
    }
  }, [setGridBounds, gridSize, cellSize]);

  // Update grid bounds and scroll state when page scrolls
  React.useEffect(() => {
    const updateScrollState = () => {
      if (gridRef.current) {
        setGridBounds(gridRef.current.getBoundingClientRect());
      }

      // Check if we can scroll up (not at top)
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setCanScrollUp(scrollTop > 5); // Small threshold to avoid floating point issues

      // Check if we can scroll down (not at bottom)
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const maxScroll = scrollHeight - clientHeight;
      setCanScrollDown(scrollTop < maxScroll - 5); // Small threshold
    };

    // Initial check
    updateScrollState();

    // Listen for scroll events on window and document
    window.addEventListener('scroll', updateScrollState, { passive: true });
    document.addEventListener('scroll', updateScrollState, { passive: true });

    // Also listen for resize events in case the viewport changes
    window.addEventListener('resize', updateScrollState, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrollState);
      document.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [setGridBounds]);

  const handleDragStart = useCallback(
    (item: DraggableItem, initialGrabOffset?: GridPosition) => {
      setDraggedItemId(item.id);
      setGrabOffset(initialGrabOffset || { x: 0, y: 0 });
      setDragPreview(null);
    },
    [setDraggedItemId, setDragPreview, setGrabOffset]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null);
    setGrabOffset(null);
    setDragPreview(null);
  }, [setDraggedItemId, setDragPreview, setGrabOffset]);

  // Generate grid cells
  const gridCells = useMemo(() => {
    const cells = [];
    for (let y = 0; y < gridSize.height; y++) {
      for (let x = 0; x < gridSize.width; x++) {
        cells.push(
          <GridCell
            key={`${x}-${y}`}
            x={x}
            y={y}
            style={getBoardTileStyle ? getBoardTileStyle(x, y) : undefined}
            className={
              getBoardTileClassName ? getBoardTileClassName(x, y) : defaultBoardTileClassName
            }
          />
        );
      }
    }
    return cells;
  }, [gridSize, getBoardTileStyle, getBoardTileClassName, defaultBoardTileClassName]);

  const gridStyle = useMemo(
    () => ({
      position: 'relative' as const,
      width: gridSize.width * cellSize.width + (gridSize.width - 1) * spacing,
      height: gridSize.height * cellSize.height + (gridSize.height - 1) * spacing,
    }),
    [gridSize, cellSize, spacing]
  );

  // Handle removing the currently active piece (returns it to tray)
  const handleRemovePiece = useCallback(() => {
    if (!tapDragActiveItemId) return;

    console.log(`[handleRemovePiece] Removing piece ${tapDragActiveItemId}`);

    // Remove the piece from the grid
    removeItem(tapDragActiveItemId);

    // Notify parent about the removed piece
    onPiecesRemoved?.([tapDragActiveItemId]);

    // Deactivate tap drag mode
    deactivateTapDrag();
  }, [tapDragActiveItemId, removeItem, onPiecesRemoved, deactivateTapDrag]);

  return (
    <>
      {/* Scroll zone indicators - animate in/out when dragging, hide when at scroll limits */}
      {/* Scroll zone indicators - show when piece is active in drag mode or actively dragging */}
      <ScrollZoneIndicator
        position="top"
        isVisible={(!!draggedItemId || !!tapDragActiveItemId) && canScrollUp}
      />
      <ScrollZoneIndicator
        position="bottom"
        isVisible={(!!draggedItemId || !!tapDragActiveItemId) && canScrollDown}
      />

      {/* Bottom Banner - shows drag mode controls when dragging */}
      <BottomBanner
        isVisible={!disabled && !hideBanner && dragMode === 'tap-to-drag' && unplacedPieceCount > 0}
        isDragMode={!!tapDragActiveItemId}
        onPlace={placeTapDragItem}
        onRemove={handleRemovePiece}
        unplacedPieceCount={unplacedPieceCount}
      />

      <div className={cn('inline-block', className)}>
        <div
          ref={gridRef}
          style={{
            ...gridStyle,
            pointerEvents: dragPreview ? 'none' : 'auto',
            // Allow scrolling on the grid - only the active piece blocks touch scrolling
            touchAction: 'auto',
          }}
          onTouchStart={(e) => {
            console.log(
              `[GridContainer TouchStart] target=${(e.target as HTMLElement).className}, tapDragActiveItemId=${tapDragActiveItemId}, draggedItemId=${draggedItemId}`
            );
          }}
          onTouchMove={(e) => {
            console.log(
              `[GridContainer TouchMove] touches=${e.touches.length}, tapDragActiveItemId=${tapDragActiveItemId}`
            );
          }}
          onClick={(e) => {
            // If there's an active tap-drag piece, clicking on empty space (not a piece) should place it
            if (!tapDragActiveItemId) return;

            // Suppress clicks that happen immediately after a drag ends
            // This prevents mouseup from triggering a click that auto-places the piece
            if (justFinishedDragRef.current) {
              console.log(`[GridContainer Click] Suppressing click - just finished dragging`);
              return;
            }

            // Check if the click was on a draggable item (piece)
            // We traverse up the DOM to see if any parent has the draggable-item data attribute
            let target = e.target as HTMLElement | null;
            while (target && target !== gridRef.current) {
              if (target.dataset?.testid?.startsWith('draggable-item-')) {
                // Click was on a piece - let the piece's click handler deal with it
                return;
              }
              target = target.parentElement;
            }

            // Click was on empty space (grid background/cell), place the piece
            console.log(`[GridContainer Click] Placing piece - clicked on empty space`);
            placeTapDragItem();
          }}
        >
          {/* Opacity overlay for drag mode - always rendered for smooth transitions */}
          <div
            className={cn(
              'absolute inset-0 pointer-events-none bg-background/50 z-[500]',
              'transition-opacity duration-200 ease-out',
              tapDragActiveItemId ? 'opacity-100' : 'opacity-0'
            )}
          />

          {/* Grid cells as drop zones */}
          {gridCells}

          {/* Draggable items */}
          {items.map((item) => (
            <DraggableItemComponent
              key={item.id}
              item={item}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              defaultClassName={defaultItemClassName}
            />
          ))}

          {/* Drag preview - shows when actively dragging */}
          {dragPreview && (
            <DragPreviewComponent
              item={dragPreview.item}
              position={dragPreview.position}
              isValid={dragPreview.isValid}
              cellSize={cellSize}
              spacing={spacing}
              getTileDraggingClassName={getTileDraggingClassName}
              defaultClassName={defaultItemClassName}
            />
          )}

          {/* Static preview - shows when in tap-drag mode but NOT actively dragging */}
          {tapDragActiveItemId &&
            !draggedItemId &&
            (() => {
              const activeItem = items.find((i) => i.id === tapDragActiveItemId);
              if (!activeItem) return null;

              // Check if current position is valid (within bounds and not on blocked tile)
              const withinBounds =
                activeItem.position.x >= 0 &&
                activeItem.position.y >= 0 &&
                activeItem.position.x + activeItem.shape.width <= gridSize.width &&
                activeItem.position.y + activeItem.shape.height <= gridSize.height;

              // Check blocked tiles using the callback if provided
              let isOnBlockedTile = false;
              if (isCellBlocked) {
                for (const cell of activeItem.shape.cells) {
                  const cellX = activeItem.position.x + cell.x;
                  const cellY = activeItem.position.y + cell.y;
                  if (isCellBlocked(cellX, cellY)) {
                    isOnBlockedTile = true;
                    break;
                  }
                }
              }

              const isValid = withinBounds && !isOnBlockedTile;

              return (
                <DragPreviewComponent
                  item={activeItem}
                  position={activeItem.position}
                  isValid={isValid}
                  cellSize={cellSize}
                  spacing={spacing}
                  getTileDraggingClassName={getTileDraggingClassName}
                  defaultClassName={defaultItemClassName}
                />
              );
            })()}

          {/* Custom children (for additional content) */}
          {children}
        </div>
      </div>
    </>
  );
});

export { Grid };
export type { DragMode } from '../../hooks/useDragMode';
