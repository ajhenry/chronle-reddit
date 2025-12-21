import { createContext, useContext } from 'react';
import { createStore, useStore, StoreApi } from 'zustand';
import { useShallow } from 'zustand/shallow';
import type { ReactNode } from 'react';
import { DragMode } from '../../hooks/useDragMode';

// Core types for the grid system
export interface GridPosition {
  x: number;
  y: number;
}

export interface GridSize {
  width: number;
  height: number;
  spacing?: number;
}

export interface GridCellData {
  position: GridPosition;
  isOccupied: boolean;
  occupyingItemId?: string | undefined;
  occupyingItemShapeIndex?: number | undefined;
}

export interface ItemShape {
  name: string;
  cells: GridPosition[];
  width: number;
  height: number;
}

export interface DraggableItem {
  id: string;
  position: GridPosition;
  shape: ItemShape;
  content: ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

// Store configuration passed when creating instance
export interface GridStoreConfig {
  gridId: string;
  gridSize: GridSize;
  cellSize: GridSize;
  spacing: number;
  disabled: boolean;
  dragMode: DragMode;
  initialItems: DraggableItem[];
  // Callbacks (stored as refs to avoid stale closures)
  onLayoutChange?: ((layout: (string | null)[][]) => void) | null;
  shouldAutoComplete?: ((previewLayout: (string | null)[][]) => boolean) | null;
  onDragStateChange?: ((isActive: boolean) => void) | null;
  isCellBlocked?: ((x: number, y: number) => boolean) | null;
  onPiecesRemoved?: ((pieceIds: string[]) => void) | null;
  onInvalidPlacement?: ((itemId: string) => void) | null;
}

// The full store state and actions
export interface GridStore {
  // Grid Configuration (read-only per instance)
  gridId: string;
  gridSize: GridSize;
  cellSize: GridSize;
  spacing: number;
  disabled: boolean;
  dragMode: DragMode;

  // Items State
  items: DraggableItem[];

  // Cached tile grid (updated when items change)
  tileGrid: GridCellData[][];

  // Cached derived state (updated when relevant state changes)
  overlappingPieceIds: string[];
  invalidPositionItemIds: string[];

  // Drag State
  draggedItemId: string | null;
  dragPreview: { item: DraggableItem; position: GridPosition; isValid: boolean } | null;
  grabOffset: GridPosition | null;
  gridBounds: DOMRect | null;
  currentHoveredCell: GridPosition | null;

  // Cursor Preview State (for dragging from external sources like tray)
  cursorPreview: {
    item: Omit<DraggableItem, 'id'>;
    itemId: string;
    grabOffset: GridPosition;
  } | null;
  cursorPosition: { clientX: number; clientY: number } | null;

  // Tap-Drag State
  tapDragActiveItemId: string | null;
  tapDragOriginalPosition: GridPosition | null;

  // Flags
  justFinishedDrag: boolean;
  skipLayoutChangeEffect: boolean;
  externalDragWasPlacedValidly: boolean;

  // Auto-scroll state (stored in refs in component, but tracked here for access)
  isDragging: boolean;
  dragStartedInScrollZone: boolean;
  hasExitedScrollZone: boolean;

  // Callback refs (updated externally)
  callbacks: {
    onLayoutChange: ((layout: (string | null)[][]) => void) | null;
    shouldAutoComplete: ((previewLayout: (string | null)[][]) => boolean) | null;
    onDragStateChange: ((isActive: boolean) => void) | null;
    isCellBlocked: ((x: number, y: number) => boolean) | null;
    onPiecesRemoved: ((pieceIds: string[]) => void) | null;
    onInvalidPlacement: ((itemId: string) => void) | null;
  };

  // Internal action to recompute derived state
  _recomputeDerivedState: () => void;

  // Actions - Items
  setItems: (items: DraggableItem[] | ((prev: DraggableItem[]) => DraggableItem[])) => void;
  addItem: (item: Omit<DraggableItem, 'id'>) => string;
  removeItem: (itemId: string) => void;
  moveItem: (itemId: string, newPosition: GridPosition) => void;

  // Actions - Drag State
  setDragPreview: (
    preview: { item: DraggableItem; position: GridPosition; isValid: boolean } | null
  ) => void;
  setDraggedItemId: (itemId: string | null) => void;
  setGrabOffset: (offset: GridPosition | null) => void;
  setGridBounds: (bounds: DOMRect | null) => void;
  setCurrentHoveredCell: (cell: GridPosition | null) => void;

  // Actions - Cursor Preview
  setCursorPreview: (
    preview: { item: Omit<DraggableItem, 'id'>; itemId: string; grabOffset: GridPosition } | null
  ) => void;
  setCursorPosition: (position: { clientX: number; clientY: number } | null) => void;
  // Transition cursor preview item to grid when cursor enters grid bounds
  transitionCursorPreviewToGrid: (gridPosition: GridPosition) => void;

  // Actions - Tap-Drag
  activateTapDrag: (itemId: string) => void;
  deactivateTapDrag: () => void;
  placeTapDragItem: () => void;

  // Actions - Auto-scroll
  setIsDragging: (isDragging: boolean) => void;
  setDragStartedInScrollZone: (inZone: boolean) => void;
  setHasExitedScrollZone: (exited: boolean) => void;

  // Actions - Flags
  setJustFinishedDrag: (value: boolean) => void;
  setSkipLayoutChangeEffect: (value: boolean) => void;
  setExternalDragWasPlacedValidly: (value: boolean) => void;

  // Actions - Callbacks
  updateCallbacks: (callbacks: Partial<GridStore['callbacks']>) => void;

  // Actions - External Drag
  startExternalDrag: (
    itemData: Omit<DraggableItem, 'id'>,
    pointerPosition: { clientX: number; clientY: number },
    grabOffset?: GridPosition
  ) => void;

  // Computed helpers (these use get() internally)
  isPositionValid: (
    item: DraggableItem,
    newPosition: GridPosition,
    excludeItemId?: string
  ) => boolean;
  isPositionWithinBounds: (item: DraggableItem, newPosition: GridPosition) => boolean;
  isPositionOnBlockedTile: (item: DraggableItem, newPosition: GridPosition) => boolean;
  getOverlappingItemIds: (
    item: DraggableItem,
    newPosition: GridPosition,
    excludeItemId: string | undefined
  ) => string[];
  getCellData: (x: number, y: number) => GridCellData | null;
  buildPreviewLayout: (previewItemId: string, previewPosition: GridPosition) => (string | null)[][];
}

// Utility functions
let gridInstanceCounter = 0;
export const generateGridId = () => `grid-${++gridInstanceCounter}`;
export const generateCellId = (gridId: string, x: number, y: number) => `${gridId}-cell-${x}-${y}`;
export const generateItemId = (gridId: string, itemIndex: number) => `${gridId}-item-${itemIndex}`;

export const getItemOccupiedPositions = (item: DraggableItem): GridPosition[] => {
  return item.shape.cells.map((cell) => ({
    x: item.position.x + cell.x,
    y: item.position.y + cell.y,
  }));
};

export const getItemBoundingBox = (item: DraggableItem): { width: number; height: number } => {
  return {
    width: item.shape.width,
    height: item.shape.height,
  };
};

export const createEmptyTileGrid = (gridSize: GridSize): GridCellData[][] => {
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

export const updateTileOccupancy = (
  tileGrid: GridCellData[][],
  items: DraggableItem[]
): GridCellData[][] => {
  const newGrid = tileGrid.map(
    (row) =>
      row?.map((cell) => ({
        ...cell,
        isOccupied: false,
        occupyingItemId: undefined as string | undefined,
        occupyingItemShapeIndex: undefined as number | undefined,
      })) || []
  );

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

// Helper to compute overlapping piece IDs
const computeOverlappingPieceIds = (
  items: DraggableItem[],
  dragPreview: GridStore['dragPreview'],
  tapDragActiveItemId: string | null,
  draggedItemId: string | null
): string[] => {
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
};

// Helper to compute invalid position item IDs
const computeInvalidPositionItemIds = (
  items: DraggableItem[],
  tapDragActiveItemId: string | null,
  draggedItemId: string | null,
  isCellBlocked: ((x: number, y: number) => boolean) | null
): string[] => {
  if (!isCellBlocked) return [];

  const invalid: string[] = [];

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
};

// Create the store factory
export const createGridStore = (config: GridStoreConfig) => {
  // Compute initial tile grid
  const initialTileGrid = updateTileOccupancy(
    createEmptyTileGrid(config.gridSize),
    config.initialItems
  );

  return createStore<GridStore>((set, get) => ({
    // Initial configuration
    gridId: config.gridId,
    gridSize: config.gridSize,
    cellSize: config.cellSize,
    spacing: config.spacing,
    disabled: config.disabled,
    dragMode: config.dragMode,

    // Initial state
    items: config.initialItems,
    tileGrid: initialTileGrid,
    overlappingPieceIds: [],
    invalidPositionItemIds: [],
    draggedItemId: null,
    dragPreview: null,
    grabOffset: null,
    gridBounds: null,
    currentHoveredCell: null,
    cursorPreview: null,
    cursorPosition: null,
    tapDragActiveItemId: null,
    tapDragOriginalPosition: null,
    justFinishedDrag: false,
    skipLayoutChangeEffect: false,
    externalDragWasPlacedValidly: false,
    isDragging: false,
    dragStartedInScrollZone: false,
    hasExitedScrollZone: false,

    callbacks: {
      onLayoutChange: config.onLayoutChange || null,
      shouldAutoComplete: config.shouldAutoComplete || null,
      onDragStateChange: config.onDragStateChange || null,
      isCellBlocked: config.isCellBlocked || null,
      onPiecesRemoved: config.onPiecesRemoved || null,
      onInvalidPlacement: config.onInvalidPlacement || null,
    },

    // Internal action to recompute derived state
    _recomputeDerivedState: () => {
      const state = get();
      const newTileGrid = updateTileOccupancy(createEmptyTileGrid(state.gridSize), state.items);
      const newOverlappingIds = computeOverlappingPieceIds(
        state.items,
        state.dragPreview,
        state.tapDragActiveItemId,
        state.draggedItemId
      );
      const newInvalidIds = computeInvalidPositionItemIds(
        state.items,
        state.tapDragActiveItemId,
        state.draggedItemId,
        state.callbacks.isCellBlocked
      );
      set({
        tileGrid: newTileGrid,
        overlappingPieceIds: newOverlappingIds,
        invalidPositionItemIds: newInvalidIds,
      });
    },

    // Items actions
    setItems: (updater) => {
      set((state) => ({
        items: typeof updater === 'function' ? updater(state.items) : updater,
      }));
      // Recompute derived state after items change
      get()._recomputeDerivedState();
    },

    addItem: (itemData) => {
      const state = get();
      const newId = itemData.shape.name || generateItemId(state.gridId, state.items.length);
      const newItem: DraggableItem = { ...itemData, id: newId };
      set({ items: [...state.items, newItem] });
      get()._recomputeDerivedState();
      return newId;
    },

    removeItem: (itemId) => {
      set((state) => ({
        items: state.items.filter((item) => item.id !== itemId),
      }));
      get()._recomputeDerivedState();
    },

    moveItem: (itemId, newPosition) => {
      set((state) => ({
        items: state.items.map((item) =>
          item.id === itemId ? { ...item, position: newPosition } : item
        ),
      }));
      get()._recomputeDerivedState();
    },

    // Drag state actions
    setDragPreview: (preview) => {
      set({ dragPreview: preview });
      get()._recomputeDerivedState();
    },
    setDraggedItemId: (itemId) => set({ draggedItemId: itemId }),
    setGrabOffset: (offset) => set({ grabOffset: offset }),
    setGridBounds: (bounds) => set({ gridBounds: bounds }),
    setCurrentHoveredCell: (cell) => set({ currentHoveredCell: cell }),

    // Cursor preview actions
    setCursorPreview: (preview) => set({ cursorPreview: preview }),
    setCursorPosition: (position) => set({ cursorPosition: position }),

    // Transition cursor preview item to grid when cursor enters grid bounds
    transitionCursorPreviewToGrid: (gridPosition) => {
      const state = get();
      const { cursorPreview, dragMode, callbacks } = state;

      if (!cursorPreview) return;

      const { item: itemData, itemId, grabOffset } = cursorPreview;

      // Create the full item with position
      const newItem: DraggableItem = {
        ...itemData,
        id: itemId,
        position: gridPosition,
      };

      // Check if position is valid
      const withinBounds =
        gridPosition.x >= 0 &&
        gridPosition.y >= 0 &&
        gridPosition.x + itemData.shape.width <= state.gridSize.width &&
        gridPosition.y + itemData.shape.height <= state.gridSize.height;

      let isOnBlockedTile = false;
      if (callbacks.isCellBlocked) {
        for (const cell of itemData.shape.cells) {
          const cellPosX = gridPosition.x + cell.x;
          const cellPosY = gridPosition.y + cell.y;
          if (callbacks.isCellBlocked(cellPosX, cellPosY)) {
            isOnBlockedTile = true;
            break;
          }
        }
      }

      const isValid = withinBounds && !isOnBlockedTile;

      // Add item to grid and set up drag state
      set((s) => ({
        items: [...s.items, newItem],
        cursorPreview: null,
        grabOffset: grabOffset,
        draggedItemId: itemId,
        tapDragActiveItemId: dragMode === 'tap-to-drag' ? itemId : null,
        tapDragOriginalPosition: null,
        dragPreview: {
          item: newItem,
          position: gridPosition,
          isValid,
        },
      }));

      if (dragMode === 'tap-to-drag') {
        callbacks.onDragStateChange?.(true);
      }

      get()._recomputeDerivedState();
    },

    // Tap-drag actions
    activateTapDrag: (itemId) => {
      const state = get();
      const item = state.items.find((i) => i.id === itemId);
      if (item) {
        set({
          tapDragActiveItemId: itemId,
          tapDragOriginalPosition: { ...item.position },
        });
        get()._recomputeDerivedState();
        state.callbacks.onDragStateChange?.(true);
      }
    },

    deactivateTapDrag: () => {
      const state = get();
      // Reset piece to original position if tap drag is active
      if (state.tapDragActiveItemId && state.tapDragOriginalPosition) {
        set((s) => ({
          items: s.items.map((item) =>
            item.id === s.tapDragActiveItemId
              ? { ...item, position: s.tapDragOriginalPosition! }
              : item
          ),
          tapDragActiveItemId: null,
          tapDragOriginalPosition: null,
          draggedItemId: null,
          grabOffset: null,
          dragPreview: null,
        }));
      } else {
        set({
          tapDragActiveItemId: null,
          tapDragOriginalPosition: null,
          draggedItemId: null,
          grabOffset: null,
          dragPreview: null,
        });
      }
      get()._recomputeDerivedState();
      state.callbacks.onDragStateChange?.(false);
    },

    placeTapDragItem: () => {
      const state = get();
      const { tapDragActiveItemId, tapDragOriginalPosition, items, callbacks, gridSize } = state;

      if (!tapDragActiveItemId) return;

      const item = items.find((i) => i.id === tapDragActiveItemId);
      if (!item) {
        get().deactivateTapDrag();
        return;
      }

      // Check if position is out of bounds
      const withinBounds = get().isPositionWithinBounds(item, item.position);
      if (!withinBounds) {
        if (tapDragOriginalPosition) {
          // Reset to original position
          set((s) => ({
            items: s.items.map((i) =>
              i.id === tapDragActiveItemId ? { ...i, position: tapDragOriginalPosition } : i
            ),
          }));
        } else {
          // Remove item (came from tray)
          set((s) => ({
            items: s.items.filter((i) => i.id !== tapDragActiveItemId),
            tapDragActiveItemId: null,
            tapDragOriginalPosition: null,
            draggedItemId: null,
            grabOffset: null,
            dragPreview: null,
          }));
        }
        callbacks.onDragStateChange?.(false);
        return;
      }

      // Check if position is on a blocked tile
      const isOnBlockedTile = get().isPositionOnBlockedTile(item, item.position);
      if (isOnBlockedTile) {
        callbacks.onInvalidPlacement?.(tapDragActiveItemId);
        if (tapDragOriginalPosition) {
          set((s) => ({
            items: s.items.map((i) =>
              i.id === tapDragActiveItemId ? { ...i, position: tapDragOriginalPosition } : i
            ),
          }));
        } else {
          set((s) => ({
            items: s.items.filter((i) => i.id !== tapDragActiveItemId),
          }));
        }
        set({
          tapDragActiveItemId: null,
          tapDragOriginalPosition: null,
          draggedItemId: null,
          grabOffset: null,
          dragPreview: null,
        });
        callbacks.onDragStateChange?.(false);
        return;
      }

      // Check for overlapping pieces
      const overlappingIds = get().getOverlappingItemIds(item, item.position, item.id);

      // Check if the piece actually moved
      const didMove =
        !tapDragOriginalPosition ||
        item.position.x !== tapDragOriginalPosition.x ||
        item.position.y !== tapDragOriginalPosition.y;

      // Remove overlapping pieces
      if (overlappingIds.length > 0) {
        set((s) => ({
          skipLayoutChangeEffect: true,
          items: s.items.filter((i) => !overlappingIds.includes(i.id)),
        }));
        callbacks.onPiecesRemoved?.(overlappingIds);
      }

      // Finalize placement
      set({
        tapDragActiveItemId: null,
        tapDragOriginalPosition: null,
        draggedItemId: null,
        grabOffset: null,
        dragPreview: null,
      });
      callbacks.onDragStateChange?.(false);

      // Call onLayoutChange with the correct layout
      if ((didMove || overlappingIds.length > 0) && callbacks.onLayoutChange) {
        const layout: (string | null)[][] = [];
        for (let y = 0; y < gridSize.height; y++) {
          const row: (string | null)[] = [];
          for (let x = 0; x < gridSize.width; x++) {
            row[x] = null;
          }
          layout[y] = row;
        }

        const currentItems = get().items;
        for (const gridItem of currentItems) {
          const occupiedPositions = getItemOccupiedPositions(gridItem);
          for (const pos of occupiedPositions) {
            if (pos.y >= 0 && pos.y < gridSize.height && pos.x >= 0 && pos.x < gridSize.width) {
              layout[pos.y]![pos.x] = gridItem.id;
            }
          }
        }

        callbacks.onLayoutChange(layout);

        if (overlappingIds.length > 0) {
          setTimeout(() => {
            set({ skipLayoutChangeEffect: false });
          }, 100);
        }
      }
    },

    // Auto-scroll actions
    setIsDragging: (isDragging) => set({ isDragging }),
    setDragStartedInScrollZone: (inZone) => set({ dragStartedInScrollZone: inZone }),
    setHasExitedScrollZone: (exited) => set({ hasExitedScrollZone: exited }),

    // Flag actions
    setJustFinishedDrag: (value) => set({ justFinishedDrag: value }),
    setSkipLayoutChangeEffect: (value) => set({ skipLayoutChangeEffect: value }),
    setExternalDragWasPlacedValidly: (value) => set({ externalDragWasPlacedValidly: value }),

    // Callback updates
    updateCallbacks: (newCallbacks) =>
      set((state) => ({
        callbacks: { ...state.callbacks, ...newCallbacks },
      })),

    // External drag
    startExternalDrag: (itemData, pointerPosition, grabOffset) => {
      const state = get();
      const { gridBounds, cellSize, spacing, gridSize, dragMode, items } = state;

      // If there's an active tap-drag item, place it first
      if (state.tapDragActiveItemId) {
        get().placeTapDragItem();
      }

      const newItemId = itemData.shape.name || generateItemId(state.gridId, items.length);

      // Use provided grab offset or calculate center as fallback
      const effectiveGrabOffset = grabOffset || {
        x: Math.floor(itemData.shape.width / 2),
        y: Math.floor(itemData.shape.height / 2),
      };

      // Clamp grab offset to valid range
      const clampedGrabOffset = {
        x: Math.max(0, Math.min(effectiveGrabOffset.x, itemData.shape.width - 1)),
        y: Math.max(0, Math.min(effectiveGrabOffset.y, itemData.shape.height - 1)),
      };

      // Check if cursor is already within grid bounds
      const isWithinGrid =
        gridBounds &&
        pointerPosition.clientX >= gridBounds.left &&
        pointerPosition.clientX <= gridBounds.right &&
        pointerPosition.clientY >= gridBounds.top &&
        pointerPosition.clientY <= gridBounds.bottom;

      if (isWithinGrid && gridBounds) {
        // Cursor is already over the grid - add item directly
        const pointerX = pointerPosition.clientX - gridBounds.left;
        const pointerY = pointerPosition.clientY - gridBounds.top;
        const cellX = Math.floor(pointerX / (cellSize.width + spacing));
        const cellY = Math.floor(pointerY / (cellSize.height + spacing));

        const initialPosition = {
          x: Math.max(
            0,
            Math.min(cellX - clampedGrabOffset.x, gridSize.width - itemData.shape.width)
          ),
          y: Math.max(
            0,
            Math.min(cellY - clampedGrabOffset.y, gridSize.height - itemData.shape.height)
          ),
        };

        const newItem: DraggableItem = {
          ...itemData,
          id: newItemId,
          position: initialPosition,
        };

        // Check if position is valid
        const withinBounds =
          initialPosition.x >= 0 &&
          initialPosition.y >= 0 &&
          initialPosition.x + itemData.shape.width <= gridSize.width &&
          initialPosition.y + itemData.shape.height <= gridSize.height;

        let isOnBlockedTile = false;
        if (state.callbacks.isCellBlocked) {
          for (const cell of itemData.shape.cells) {
            const cellPosX = initialPosition.x + cell.x;
            const cellPosY = initialPosition.y + cell.y;
            if (state.callbacks.isCellBlocked(cellPosX, cellPosY)) {
              isOnBlockedTile = true;
              break;
            }
          }
        }

        const isValid = withinBounds && !isOnBlockedTile;

        set((s) => ({
          items: [...s.items, newItem],
          grabOffset: clampedGrabOffset,
          draggedItemId: newItemId,
          tapDragActiveItemId: dragMode === 'tap-to-drag' ? newItemId : null,
          tapDragOriginalPosition: null,
          dragPreview: {
            item: newItem,
            position: initialPosition,
            isValid,
          },
          cursorPreview: null,
          cursorPosition: null,
        }));

        if (dragMode === 'tap-to-drag') {
          state.callbacks.onDragStateChange?.(true);
        }
      } else {
        // Cursor is outside grid - set up cursor preview
        // Item will be added to grid when cursor enters grid bounds
        set({
          cursorPreview: {
            item: itemData,
            itemId: newItemId,
            grabOffset: clampedGrabOffset,
          },
          cursorPosition: pointerPosition,
          // Mark that we're in an external drag state (for auto-scroll etc)
          isDragging: true,
        });

        // In tap-to-drag mode, notify that drag started even before entering grid
        if (dragMode === 'tap-to-drag') {
          state.callbacks.onDragStateChange?.(true);
        }
      }
    },

    // Computed helpers
    isPositionValid: (item, newPosition, excludeItemId) => {
      const state = get();
      const { gridSize, items } = state;
      const testItem = { ...item, position: newPosition };
      const occupiedPositions = getItemOccupiedPositions(testItem);

      // Check bounds
      for (const pos of occupiedPositions) {
        if (pos.x < 0 || pos.y < 0 || pos.x >= gridSize.width || pos.y >= gridSize.height) {
          return false;
        }
      }

      // Check for collisions
      const tileGrid = createEmptyTileGrid(gridSize);
      const updatedGrid = updateTileOccupancy(tileGrid, items);

      for (const pos of occupiedPositions) {
        const cellData = updatedGrid[pos.y]?.[pos.x];
        if (cellData && cellData.isOccupied && cellData.occupyingItemId !== excludeItemId) {
          return false;
        }
      }

      return true;
    },

    isPositionWithinBounds: (item, newPosition) => {
      const { gridSize } = get();
      const testItem = { ...item, position: newPosition };
      const occupiedPositions = getItemOccupiedPositions(testItem);

      for (const pos of occupiedPositions) {
        if (pos.x < 0 || pos.y < 0 || pos.x >= gridSize.width || pos.y >= gridSize.height) {
          return false;
        }
      }

      return true;
    },

    isPositionOnBlockedTile: (item, newPosition) => {
      const { gridSize, callbacks } = get();
      if (!callbacks.isCellBlocked) return false;

      const testItem = { ...item, position: newPosition };
      const occupiedPositions = getItemOccupiedPositions(testItem);

      for (const pos of occupiedPositions) {
        if (pos.x < 0 || pos.y < 0 || pos.x >= gridSize.width || pos.y >= gridSize.height) {
          continue;
        }
        if (callbacks.isCellBlocked(pos.x, pos.y)) {
          return true;
        }
      }

      return false;
    },

    getOverlappingItemIds: (item, newPosition, excludeItemId) => {
      const { items } = get();
      const testItem = { ...item, position: newPosition };
      const testPositions = getItemOccupiedPositions(testItem);
      const overlappingIds = new Set<string>();

      for (const otherItem of items) {
        if (otherItem.id === excludeItemId) continue;

        const otherPositions = getItemOccupiedPositions(otherItem);
        for (const testPos of testPositions) {
          for (const otherPos of otherPositions) {
            if (testPos.x === otherPos.x && testPos.y === otherPos.y) {
              overlappingIds.add(otherItem.id);
              break;
            }
          }
          if (overlappingIds.has(otherItem.id)) break;
        }
      }

      return Array.from(overlappingIds);
    },

    getCellData: (x, y) => {
      const { gridSize, items } = get();
      const tileGrid = createEmptyTileGrid(gridSize);
      const updatedGrid = updateTileOccupancy(tileGrid, items);

      if (y >= 0 && y < updatedGrid.length) {
        const row = updatedGrid[y];
        if (row && x >= 0 && x < row.length) {
          return row[x] || null;
        }
      }
      return null;
    },

    buildPreviewLayout: (previewItemId, previewPosition) => {
      const { gridSize, items } = get();
      const layout: (string | null)[][] = [];

      for (let y = 0; y < gridSize.height; y++) {
        const row: (string | null)[] = [];
        for (let x = 0; x < gridSize.width; x++) {
          row[x] = null;
        }
        layout[y] = row;
      }

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
  }));
};

// Context for store instance
export const GridStoreContext = createContext<StoreApi<GridStore> | null>(null);

// Hook for consuming the store with a selector
export function useGridStore<T>(selector: (state: GridStore) => T): T {
  const store = useContext(GridStoreContext);
  if (!store) {
    throw new Error('useGridStore must be used within a GridProvider');
  }
  return useStore(store, selector);
}

// Hook for consuming the store with shallow comparison (for arrays/objects)
export function useGridStoreShallow<T>(selector: (state: GridStore) => T): T {
  const store = useContext(GridStoreContext);
  if (!store) {
    throw new Error('useGridStoreShallow must be used within a GridProvider');
  }
  return useStore(store, useShallow(selector));
}

// Hook for getting the full store (for actions)
export function useGridStoreApi(): StoreApi<GridStore> {
  const store = useContext(GridStoreContext);
  if (!store) {
    throw new Error('useGridStoreApi must be used within a GridProvider');
  }
  return store;
}

// Selectors for derived state
export const selectTileGrid = (state: GridStore): GridCellData[][] => {
  return updateTileOccupancy(createEmptyTileGrid(state.gridSize), state.items);
};

export const selectOverlappingPieceIds = (state: GridStore): string[] => {
  const { dragPreview, tapDragActiveItemId, draggedItemId, items } = state;

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
};

export const selectInvalidPositionItemIds = (state: GridStore): string[] => {
  const { tapDragActiveItemId, draggedItemId, items, callbacks } = state;

  if (!callbacks.isCellBlocked) return [];

  const invalid: string[] = [];

  if (tapDragActiveItemId && !draggedItemId) {
    const activeItem = items.find((i) => i.id === tapDragActiveItemId);
    if (activeItem) {
      const occupiedPositions = getItemOccupiedPositions(activeItem);
      for (const pos of occupiedPositions) {
        if (pos.x >= 0 && pos.y >= 0 && callbacks.isCellBlocked(pos.x, pos.y)) {
          invalid.push(tapDragActiveItemId);
          break;
        }
      }
    }
  }

  return invalid;
};
