import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

// Core types for the grid system
type GridPosition = {
  x: number;
  y: number;
};

type GridSize = {
  width: number;
  height: number;
};

type GridCellData = {
  position: GridPosition;
  isOccupied: boolean;
  occupyingItemId?: string | undefined;
  occupyingItemShapeIndex?: number | undefined; // Which part of the shape occupies this cell
};

// Shape definition - relative positions from origin
type ItemShape = {
  name: string;
  cells: GridPosition[]; // Relative positions from item origin
  width: number; // Bounding box width
  height: number; // Bounding box height
};

// Predefined shapes
const PREDEFINED_SHAPES: Record<string, ItemShape> = {
  single: {
    name: 'single',
    cells: [{ x: 0, y: 0 }],
    width: 1,
    height: 1,
  },
  horizontal2: {
    name: 'horizontal2',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    width: 2,
    height: 1,
  },
  vertical2: {
    name: 'vertical2',
    cells: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ],
    width: 1,
    height: 2,
  },
  L: {
    name: 'L',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ],
    width: 2,
    height: 2,
  },
  U: {
    name: 'U',
    cells: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    width: 3,
    height: 2,
  },
  T: {
    name: 'T',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ],
    width: 3,
    height: 2,
  },
  plus: {
    name: 'plus',
    cells: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    width: 3,
    height: 3,
  },
};

type DraggableItem = {
  id: string;
  position: GridPosition; // Origin position
  shape: ItemShape;
  content: ReactNode;
  color?: string;
};

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
  dragPreview: { item: DraggableItem; position: GridPosition } | null;
  draggedItemId: string | null;
  grabOffset: GridPosition | null;
  currentHoveredCell: GridPosition | null;
  setItems: (items: DraggableItem[]) => void;
  addItem: (item: Omit<DraggableItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  moveItem: (itemId: string, newPosition: GridPosition) => void;
  setDragPreview: (preview: { item: DraggableItem; position: GridPosition } | null) => void;
  setDraggedItemId: (itemId: string | null) => void;
  setGrabOffset: (offset: GridPosition | null) => void;
  setGridBounds: (bounds: DOMRect | null) => void;
  isPositionValid: (
    item: DraggableItem,
    newPosition: GridPosition,
    excludeItemId?: string
  ) => boolean;
  getCellData: (x: number, y: number) => GridCellData | null;
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
};

function GridProvider({ children, gridSize, cellSize, initialItems = [] }: GridProviderProps) {
  const gridId = useMemo(() => generateGridId(), []);
  const [items, setItems] = useState<DraggableItem[]>(() =>
    initialItems.map((item, index) => ({
      ...item,
      id: generateItemId(gridId, index),
    }))
  );
  const [dragPreview, setDragPreview] = useState<{
    item: DraggableItem;
    position: GridPosition;
  } | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [grabOffset, setGrabOffset] = useState<GridPosition | null>(null);
  const [gridBounds, setGridBounds] = useState<DOMRect | null>(null);
  const [currentHoveredCell, setCurrentHoveredCell] = useState<GridPosition | null>(null);

  // Create and update tile grid
  const tileGrid = useMemo(() => {
    const emptyGrid = createEmptyTileGrid(gridSize);
    return updateTileOccupancy(emptyGrid, items);
  }, [gridSize, items]);

  const addItem = useCallback(
    (item: Omit<DraggableItem, 'id'>) => {
      setItems((prev) => [
        ...prev,
        {
          ...item,
          id: generateItemId(gridId, prev.length),
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

  // Global pointer tracking during drag operations
  const handleGlobalPointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!draggedItemId || !gridBounds || !grabOffset) return;

      // Prevent default touch behavior (scrolling) during drag
      if (e.type.startsWith('touch')) {
        e.preventDefault();
      }

      const coords = getGlobalEventCoordinates(e);

      // Calculate pointer position relative to grid
      const pointerX = coords.clientX - gridBounds.left;
      const pointerY = coords.clientY - gridBounds.top;

      // Convert to grid coordinates
      const cellX = Math.floor(pointerX / cellSize.width);
      const cellY = Math.floor(pointerY / cellSize.height);

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

            // Check if position is valid
            if (isPositionValid(draggedItem, previewPosition, draggedItem.id)) {
              setDragPreview({ item: draggedItem, position: previewPosition });
            } else {
              setDragPreview(null);
            }
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
      gridSize,
      currentHoveredCell,
      items,
      isPositionValid,
      getGlobalEventCoordinates,
    ]
  );

  // Global pointer up handler for drop
  const handleGlobalPointerUp = useCallback(
    (e: MouseEvent | TouchEvent) => {
      console.log('=== POINTER UP DEBUG ===');
      console.log('draggedItemId:', draggedItemId);
      console.log('gridBounds:', gridBounds);
      console.log('grabOffset:', grabOffset);

      if (!draggedItemId || !gridBounds || !grabOffset) {
        console.log('Early return - missing required data');
        return;
      }

      const coords = getGlobalEventCoordinates(e);

      // Calculate pointer position relative to grid
      const pointerX = coords.clientX - gridBounds.left;
      const pointerY = coords.clientY - gridBounds.top;
      console.log('Pointer position:', { clientX: coords.clientX, clientY: coords.clientY });
      console.log('Grid bounds:', { left: gridBounds.left, top: gridBounds.top });
      console.log('Relative pointer position:', { pointerX, pointerY });

      // Convert to grid coordinates
      const cellX = Math.floor(pointerX / cellSize.width);
      const cellY = Math.floor(pointerY / cellSize.height);
      console.log('Cell size:', cellSize);
      console.log('Grid size:', gridSize);
      console.log('Calculated cell coordinates:', { cellX, cellY });

      // Check if pointer is within grid bounds
      const isWithinBounds =
        cellX >= 0 && cellX < gridSize.width && cellY >= 0 && cellY < gridSize.height;
      console.log('Is within bounds:', isWithinBounds);

      if (isWithinBounds) {
        const draggedItem = items.find((item) => item.id === draggedItemId);
        console.log('Dragged item found:', !!draggedItem);
        if (draggedItem) {
          console.log('Dragged item:', {
            id: draggedItem.id,
            position: draggedItem.position,
            shape: draggedItem.shape.name,
          });
        }

        if (!draggedItem) {
          console.log('No dragged item found, returning');
          return;
        }

        const dropPosition = {
          x: cellX - grabOffset.x,
          y: cellY - grabOffset.y,
        };
        console.log('Drop position:', dropPosition);

        // Validate drop position
        const isValid = isPositionValid(draggedItem, dropPosition, draggedItem.id);
        console.log('Is position valid:', isValid);

        if (isValid) {
          console.log('Moving item to position:', dropPosition);
          moveItem(draggedItemId, dropPosition);
        } else {
          console.log('Position not valid, not moving item');
        }
      } else {
        console.log('Mouse outside grid bounds, not dropping');
      }

      // Clean up drag state
      console.log('Cleaning up drag state');
      setDraggedItemId(null);
      setGrabOffset(null);
      setDragPreview(null);
      setCurrentHoveredCell(null);
      console.log('=== END POINTER UP DEBUG ===');
    },
    [
      draggedItemId,
      gridBounds,
      grabOffset,
      cellSize,
      gridSize,
      items,
      isPositionValid,
      moveItem,
      getGlobalEventCoordinates,
    ]
  );

  // Set up global event listeners during drag
  React.useEffect(() => {
    if (draggedItemId) {
      const handlePointerMove = (e: MouseEvent | TouchEvent) => handleGlobalPointerMove(e);
      const handlePointerUp = (e: MouseEvent | TouchEvent) => handleGlobalPointerUp(e);

      // Mouse events
      document.addEventListener('mousemove', handlePointerMove);
      document.addEventListener('mouseup', handlePointerUp);

      // Touch events
      document.addEventListener('touchmove', handlePointerMove, { passive: false });
      document.addEventListener('touchend', handlePointerUp, { passive: false });

      return () => {
        // Mouse events
        document.removeEventListener('mousemove', handlePointerMove);
        document.removeEventListener('mouseup', handlePointerUp);

        // Touch events
        document.removeEventListener('touchmove', handlePointerMove);
        document.removeEventListener('touchend', handlePointerUp);
      };
    }
  }, [draggedItemId, handleGlobalPointerMove, handleGlobalPointerUp]);

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

  const contextValue = useMemo(
    () => ({
      gridId,
      items,
      tileGrid,
      gridSize,
      cellSize,
      dragPreview,
      draggedItemId,
      grabOffset,
      currentHoveredCell,
      setItems,
      addItem,
      removeItem,
      moveItem,
      setDragPreview,
      setDraggedItemId,
      setGrabOffset,
      setGridBounds,
      isPositionValid,
      getCellData,
    }),
    [
      gridId,
      items,
      tileGrid,
      gridSize,
      cellSize,
      dragPreview,
      draggedItemId,
      grabOffset,
      currentHoveredCell,
      addItem,
      removeItem,
      moveItem,
      setDragPreview,
      setDraggedItemId,
      setGrabOffset,
      setGridBounds,
      isPositionValid,
      getCellData,
    ]
  );

  return <GridContext.Provider value={contextValue}>{children}</GridContext.Provider>;
}

// Grid Cell component - simplified for mouse-based approach
type GridCellProps = {
  x: number;
  y: number;
  className?: string;
};

const GridCell = React.memo(({ x, y, className = '' }: GridCellProps) => {
  const { gridId, cellSize, getCellData, currentHoveredCell, draggedItemId } = useGrid();
  const cellId = generateCellId(gridId, x, y);

  const cellData = getCellData(x, y);
  const isOccupied = cellData?.isOccupied ?? false;
  const isHovered = currentHoveredCell?.x === x && currentHoveredCell.y === y && !!draggedItemId;

  const cellStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      left: x * cellSize.width,
      top: y * cellSize.height,
      width: cellSize.width,
      height: cellSize.height,
    }),
    [x, y, cellSize]
  );

  const getBackgroundClass = useCallback(() => {
    if (isOccupied) {
      return 'bg-blue-100 border-blue-300';
    }
    if (isHovered) {
      return 'bg-green-200';
    }
    return 'bg-gray-50 hover:bg-gray-100';
  }, [isOccupied, isHovered]);

  return (
    <div
      id={cellId}
      className={`border transition-colors ${getBackgroundClass()} ${className}`}
      style={cellStyle}
      data-testid={`grid-cell-${x}-${y}`}
      data-occupied={isOccupied}
      data-item-id={cellData?.occupyingItemId}
    />
  );
});

GridCell.displayName = 'GridCell';

// Draggable Item component
type DraggableItemProps = {
  item: DraggableItem;
  onDragStart?: (item: DraggableItem, grabOffset?: GridPosition) => void;
  onDragEnd?: (item: DraggableItem) => void;
  className?: string;
};

const DraggableItemComponent = React.memo(
  ({ item, onDragStart, onDragEnd, className = '' }: DraggableItemProps) => {
    const { cellSize } = useGrid();
    const [isDragging, setIsDragging] = useState(false);
    const [cursorType, setCursorType] = useState<'default' | 'move'>('default');
    const itemRef = React.useRef<HTMLDivElement>(null);

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
          mouseGridX = Math.floor(relativeX / cellSize.width);
          mouseGridY = Math.floor(relativeY / cellSize.height);
        }

        // Check if the mouse position corresponds to an occupied cell in the shape
        const isOverOccupiedCell = item.shape.cells.some(
          (cell) => cell.x === mouseGridX && cell.y === mouseGridY
        );

        // Debug logging to help troubleshoot
        console.log(
          `Piece ${item.id} at (${item.position.x}, ${item.position.y}): mouse at (${mouseGridX}, ${mouseGridY}), isOverOccupied: ${isOverOccupiedCell}`
        );

        // Update cursor based on whether we're over an occupied cell
        setCursorType(isOverOccupiedCell ? 'move' : 'default');
      },
      [isDragging, item.shape.cells, item.position, item.id, cellSize, getEventCoordinates]
    );

    const handlePointerDown = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        const coords = getEventCoordinates(e);

        // Calculate which cell within the bounding box was clicked
        let clickedGridX = 0;
        let clickedGridY = 0;
        if (itemRef.current) {
          const rect = itemRef.current.getBoundingClientRect();
          const relativeX = coords.clientX - rect.left;
          const relativeY = coords.clientY - rect.top;

          // Convert pixel coordinates to grid coordinates within the bounding box
          clickedGridX = Math.floor(relativeX / cellSize.width);
          clickedGridY = Math.floor(relativeY / cellSize.height);
        }

        // Check if the clicked position corresponds to an occupied cell in the shape
        const isOccupiedCell = item.shape.cells.some(
          (cell) => cell.x === clickedGridX && cell.y === clickedGridY
        );

        // Only allow dragging if clicking on an occupied cell
        if (!isOccupiedCell) {
          // For empty spaces, temporarily disable pointer events to let the click pass through
          if (itemRef.current) {
            const originalPointerEvents = itemRef.current.style.pointerEvents;
            itemRef.current.style.pointerEvents = 'none';

            // Create a new mouse event at the same position to pass through to underlying pieces
            const passThroughEvent = new MouseEvent(e.type, {
              clientX: coords.clientX,
              clientY: coords.clientY,
              button: 'touches' in e ? 0 : e.button,
              buttons: 'touches' in e ? 1 : e.buttons,
              bubbles: true,
              cancelable: true,
            });

            // Dispatch the event after a tiny delay to allow pointer-events to take effect
            setTimeout(() => {
              document
                .elementFromPoint(coords.clientX, coords.clientY)
                ?.dispatchEvent(passThroughEvent);
              // Restore original pointer events
              if (itemRef.current) {
                itemRef.current.style.pointerEvents = originalPointerEvents;
              }
            }, 0);
          }
          return; // Don't process this click in the current piece
        }

        e.preventDefault();
        setIsDragging(true);

        // Calculate grab offset - where on the piece the user clicked/touched
        const grabOffset: GridPosition = {
          x: clickedGridX,
          y: clickedGridY,
        };

        onDragStart?.(item, grabOffset);
      },
      [item, onDragStart, cellSize, getEventCoordinates]
    );

    const handlePointerUp = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
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
      [item, onDragEnd, getEventCoordinates]
    );

    const handleMouseLeave = useCallback(() => {
      if (!isDragging) {
        setCursorType('default');
      }
    }, [isDragging]);

    const itemStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        left: item.position.x * cellSize.width,
        top: item.position.y * cellSize.height,
        width: boundingBox.width * cellSize.width,
        height: boundingBox.height * cellSize.height,
        zIndex: isDragging ? 1000 : 1,
      }),
      [item.position, boundingBox, cellSize, isDragging]
    );

    // Render individual cells for the shape
    const shapeCells = useMemo(() => {
      return item.shape.cells.map((cell, index) => {
        const cellStyle = {
          position: 'absolute' as const,
          left: cell.x * cellSize.width,
          top: cell.y * cellSize.height,
          width: cellSize.width,
          height: cellSize.height,
          zIndex: isDragging ? 1001 : 2,
        };

        return (
          <div
            key={`cell-${index}`}
            className={`border border-white/30 flex justify-center items-center ${
              item.color || 'bg-blue-500'
            } ${isDragging ? 'opacity-70' : 'opacity-100'}`}
            style={cellStyle}
          >
            {index === 0 && (
              <div className="p-1 text-xs font-semibold text-center text-white">{item.content}</div>
            )}
          </div>
        );
      });
    }, [item.shape.cells, item.color, item.content, cellSize, isDragging]);

    return (
      <div
        ref={itemRef}
        id={item.id}
        className={`transition-all select-none ${className}`}
        style={{
          ...itemStyle,
          cursor: cursorType,
          touchAction: 'none', // Prevent default touch behaviors like scrolling
        }}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onMouseUp={handlePointerUp}
        onTouchEnd={handlePointerUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        data-testid={`draggable-item-${item.id}`}
      >
        {shapeCells}
      </div>
    );
  }
);

DraggableItemComponent.displayName = 'DraggableItem';

// Drag Preview Component - shows semi-transparent preview of shape
const DragPreviewComponent = React.memo(
  ({
    item,
    position,
    cellSize,
  }: {
    item: DraggableItem;
    position: GridPosition;
    cellSize: GridSize;
  }) => {
    const boundingBox = useMemo(() => getItemBoundingBox(item), [item]);

    const previewStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        left: position.x * cellSize.width,
        top: position.y * cellSize.height,
        width: boundingBox.width * cellSize.width,
        height: boundingBox.height * cellSize.height,
        zIndex: 999, // Above everything else
        pointerEvents: 'none' as const, // Don't interfere with interactions
      }),
      [position, boundingBox, cellSize]
    );

    // Render individual cells for the shape preview
    const previewCells = useMemo(() => {
      return item.shape.cells.map((cell, index) => {
        const cellStyle = {
          position: 'absolute' as const,
          left: cell.x * cellSize.width,
          top: cell.y * cellSize.height,
          width: cellSize.width,
          height: cellSize.height,
          zIndex: 1000,
        };

        return (
          <div
            key={`preview-cell-${index}`}
            className={`border-2 border-dashed border-gray-400 flex justify-center items-center ${
              item.color || 'bg-blue-500'
            }`}
            style={{
              ...cellStyle,
              backgroundColor: 'rgba(59, 130, 246, 0.3)', // Semi-transparent blue
              borderColor: 'rgba(59, 130, 246, 0.6)',
            }}
          >
            {index === 0 && (
              <div className="p-1 text-xs font-semibold text-center text-blue-800">
                {item.content}
              </div>
            )}
          </div>
        );
      });
    }, [item.shape.cells, item.color, item.content, cellSize]);

    return <div style={previewStyle}>{previewCells}</div>;
  }
);

DragPreviewComponent.displayName = 'DragPreview';

// Main Grid component
type GridProps = {
  gridSize: GridSize;
  cellSize: GridSize;
  initialItems?: Omit<DraggableItem, 'id'>[];
  onItemMove?: (item: DraggableItem, newPosition: GridPosition) => void;
  onItemAdd?: (item: DraggableItem) => void;
  onItemRemove?: (itemId: string) => void;
  showGridLines?: boolean;
  className?: string;
  children?: ReactNode;
};

function Grid({
  gridSize,
  cellSize,
  initialItems = [],
  onItemMove: _onItemMove,
  onItemAdd: _onItemAdd,
  onItemRemove: _onItemRemove,
  showGridLines = true,
  className = '',
  children,
}: GridProps) {
  return (
    <GridProvider gridSize={gridSize} cellSize={cellSize} initialItems={initialItems}>
      <GridContent showGridLines={showGridLines} className={className}>
        {children}
      </GridContent>
    </GridProvider>
  );
}

// Internal Grid component that has access to context
function GridContent({
  showGridLines,
  className,
  children,
}: {
  showGridLines: boolean;
  className: string;
  children: ReactNode;
}) {
  const {
    items,
    gridSize,
    cellSize,
    dragPreview,
    setDragPreview,
    setDraggedItemId,
    setGrabOffset,
    setGridBounds,
  } = useGrid();

  const gridRef = React.useRef<HTMLDivElement>(null);

  // Capture grid bounds when component mounts or resizes
  React.useEffect(() => {
    if (gridRef.current) {
      setGridBounds(gridRef.current.getBoundingClientRect());
    }
  }, [setGridBounds, gridSize, cellSize]);

  // Update grid bounds when page scrolls
  React.useEffect(() => {
    const updateGridBounds = () => {
      if (gridRef.current) {
        setGridBounds(gridRef.current.getBoundingClientRect());
      }
    };

    // Listen for scroll events on window and document
    window.addEventListener('scroll', updateGridBounds, { passive: true });
    document.addEventListener('scroll', updateGridBounds, { passive: true });

    // Also listen for resize events in case the viewport changes
    window.addEventListener('resize', updateGridBounds, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateGridBounds);
      document.removeEventListener('scroll', updateGridBounds);
      window.removeEventListener('resize', updateGridBounds);
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
        cells.push(<GridCell key={`${x}-${y}`} x={x} y={y} />);
      }
    }
    return cells;
  }, [gridSize]);

  const gridStyle = useMemo(
    () => ({
      position: 'relative' as const,
      width: gridSize.width * cellSize.width,
      height: gridSize.height * cellSize.height,
      border: showGridLines ? '2px solid #e5e7eb' : 'none',
      backgroundColor: '#f9fafb',
    }),
    [gridSize, cellSize, showGridLines]
  );

  return (
    <div className={`inline-block ${className}`}>
      <div ref={gridRef} style={gridStyle}>
        {/* Grid cells as drop zones */}
        {gridCells}

        {/* Draggable items */}
        {items.map((item) => (
          <DraggableItemComponent
            key={item.id}
            item={item}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        ))}

        {/* Drag preview */}
        {dragPreview && (
          <DragPreviewComponent
            item={dragPreview.item}
            position={dragPreview.position}
            cellSize={cellSize}
          />
        )}

        {/* Custom children (for additional content) */}
        {children}
      </div>
    </div>
  );
}

// Demo component showcasing multiple grid instances with unique IDs
const GridDemo = () => {
  const [grid1Items, setGrid1Items] = useState<Omit<DraggableItem, 'id'>[]>([
    {
      position: { x: 1, y: 1 },
      shape: PREDEFINED_SHAPES.L!,
      content: 'L',
      color: 'bg-blue-500',
    },
    {
      position: { x: 4, y: 2 },
      shape: PREDEFINED_SHAPES.U!,
      content: 'U',
      color: 'bg-green-500',
    },
    {
      position: { x: 0, y: 4 },
      shape: PREDEFINED_SHAPES.T!,
      content: 'T',
      color: 'bg-yellow-500',
    },
  ]);

  const [grid2Items, setGrid2Items] = useState<Omit<DraggableItem, 'id'>[]>([
    {
      position: { x: 0, y: 0 },
      shape: PREDEFINED_SHAPES.single!,
      content: '1',
      color: 'bg-purple-500',
    },
    {
      position: { x: 2, y: 1 },
      shape: PREDEFINED_SHAPES.plus!,
      content: '+',
      color: 'bg-red-500',
    },
    {
      position: { x: 1, y: 3 },
      shape: PREDEFINED_SHAPES.vertical2!,
      content: 'I',
      color: 'bg-indigo-500',
    },
  ]);

  const handleGrid1ItemMove = useCallback((item: DraggableItem, newPosition: GridPosition) => {
    setGrid1Items((prev) =>
      prev.map((prevItem) =>
        prevItem.content === item.content ? { ...prevItem, position: newPosition } : prevItem
      )
    );
  }, []);

  const handleGrid2ItemMove = useCallback((item: DraggableItem, newPosition: GridPosition) => {
    setGrid2Items((prev) =>
      prev.map((prevItem) =>
        prevItem.content === item.content ? { ...prevItem, position: newPosition } : prevItem
      )
    );
  }, []);

  return (
    <div className="p-8 min-h-screen bg-gray-100">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-4xl font-bold text-center text-gray-800">
          Dragging Grid System Demo
        </h1>

        <div className="mb-8">
          <p className="mx-auto max-w-3xl text-center text-gray-600">
            This demo showcases a custom grid system with unique IDs for each grid instance. Each
            grid generates predictable IDs for its cells and items. Try dragging the L, U, T, and
            Plus shapes around to see the drag preview, boundary validation, and collision detection
            in action.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 mb-8 lg:grid-cols-2">
          {/* First Grid */}
          <div className="p-6 rounded-lg shadow-lg bg-background">
            <h2 className="mb-4 text-2xl font-semibold text-gray-800">Grid Instance 1</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Grid Size: 8x6 | Cell Size: 50x50px</p>
            </div>
            <Grid
              gridSize={{ width: 8, height: 6 }}
              cellSize={{ width: 50, height: 50 }}
              initialItems={grid1Items}
              onItemMove={handleGrid1ItemMove}
              showGridLines={true}
            />
          </div>

          {/* Second Grid */}
          <div className="p-6 rounded-lg shadow-lg bg-background">
            <h2 className="mb-4 text-2xl font-semibold text-gray-800">Grid Instance 2</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Grid Size: 6x5 | Cell Size: 55x55px</p>
            </div>
            <Grid
              gridSize={{ width: 6, height: 5 }}
              cellSize={{ width: 55, height: 55 }}
              initialItems={grid2Items}
              onItemMove={handleGrid2ItemMove}
              showGridLines={true}
            />
          </div>
        </div>

        {/* Features Section */}
        <div className="p-6 rounded-lg shadow-lg bg-background">
          <h3 className="mb-6 text-2xl font-semibold text-gray-800">Features</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start space-x-3">
              <div className="flex flex-shrink-0 justify-center items-center w-8 h-8 bg-blue-500 rounded-full">
                <span className="text-sm font-semibold text-white">1</span>
              </div>
              <div>
                <h4 className="mb-2 font-semibold text-gray-800">Arbitrary Shapes</h4>
                <p className="text-sm text-gray-600">
                  Support for L, U, T, Plus, and custom shapes with individual cell occupancy
                  tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex flex-shrink-0 justify-center items-center w-8 h-8 bg-green-500 rounded-full">
                <span className="text-sm font-semibold text-white">2</span>
              </div>
              <div>
                <h4 className="mb-2 font-semibold text-gray-800">Tile-Level Tracking</h4>
                <p className="text-sm text-gray-600">
                  Each grid cell tracks which item occupies it and which part of the shape it
                  represents.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex flex-shrink-0 justify-center items-center w-8 h-8 bg-purple-500 rounded-full">
                <span className="text-sm font-semibold text-white">3</span>
              </div>
              <div>
                <h4 className="mb-2 font-semibold text-gray-800">Drag Preview</h4>
                <p className="text-sm text-gray-600">
                  See a semi-transparent preview of where your shape will be placed before dropping.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex flex-shrink-0 justify-center items-center w-8 h-8 bg-red-500 rounded-full">
                <span className="text-sm font-semibold text-white">4</span>
              </div>
              <div>
                <h4 className="mb-2 font-semibold text-gray-800">Visual Shape Rendering</h4>
                <p className="text-sm text-gray-600">
                  Each shape is rendered as individual cells showing its exact geometric form.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex flex-shrink-0 justify-center items-center w-8 h-8 bg-yellow-500 rounded-full">
                <span className="text-sm font-semibold text-white">5</span>
              </div>
              <div>
                <h4 className="mb-2 font-semibold text-gray-800">Unique Grid IDs</h4>
                <p className="text-sm text-gray-600">
                  Each grid instance gets a unique ID (e.g., grid-1, grid-2) for identification.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex flex-shrink-0 justify-center items-center w-8 h-8 bg-indigo-500 rounded-full">
                <span className="text-sm font-semibold text-white">6</span>
              </div>
              <div>
                <h4 className="mb-2 font-semibold text-gray-800">Advanced Collision Detection</h4>
                <p className="text-sm text-gray-600">
                  Shape-based collision detection prevents overlaps and out-of-bounds placement.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex flex-shrink-0 justify-center items-center w-8 h-8 bg-pink-500 rounded-full">
                <span className="text-sm font-semibold text-white">7</span>
              </div>
              <div>
                <h4 className="mb-2 font-semibold text-gray-800">Predictable Cell IDs</h4>
                <p className="text-sm text-gray-600">
                  Grid cells have predictable IDs like "grid-1-cell-2-3" for easy targeting and
                  debugging.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { GridDemo as Grid };
