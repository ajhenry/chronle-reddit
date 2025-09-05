import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { cn } from '../../lib/utils';

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
  color?: string;
  disabled?: boolean; // Whether the piece is locked in place and cannot be dragged
  style?: React.CSSProperties; // Custom styles to apply to the tile
  className?: string; // Custom CSS classes to apply to the tile
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
  spacing: number;
  dragPreview: { item: DraggableItem; position: GridPosition; isValid: boolean } | null;
  draggedItemId: string | null;
  grabOffset: GridPosition | null;
  currentHoveredCell: GridPosition | null;
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
  onLayoutChange?: (layout: (string | null)[][]) => void;
};

function GridProvider({
  children,
  gridSize,
  cellSize,
  initialItems = [],
  onLayoutChange,
}: GridProviderProps) {
  const spacing = gridSize.spacing ?? 0;
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
    isValid: boolean;
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

  // Call onLayoutChange whenever tileGrid changes
  React.useEffect(() => {
    if (onLayoutChange) {
      const layout = tileGrid.map((row) => row.map((cell) => cell.occupyingItemId || null));
      onLayoutChange(layout);
    }
  }, [tileGrid, onLayoutChange]);

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

            // Always show drag preview, but mark it as invalid if position is not valid
            const isValid = isPositionValid(draggedItem, previewPosition, draggedItem.id);
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
      isPositionValid,
      getGlobalEventCoordinates,
    ]
  );

  // Global pointer up handler for drop
  const handleGlobalPointerUp = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!draggedItemId || !gridBounds || !grabOffset) {
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
      const isWithinBounds =
        cellX >= 0 && cellX < gridSize.width && cellY >= 0 && cellY < gridSize.height;

      if (isWithinBounds) {
        const draggedItem = items.find((item) => item.id === draggedItemId);

        if (!draggedItem) {
          return;
        }

        const dropPosition = {
          x: cellX - grabOffset.x,
          y: cellY - grabOffset.y,
        };

        // Validate drop position
        const isValid = isPositionValid(draggedItem, dropPosition, draggedItem.id);

        if (isValid) {
          moveItem(draggedItemId, dropPosition);
        }
      }

      // Clean up drag state
      setDraggedItemId(null);
      setGrabOffset(null);
      setDragPreview(null);
      setCurrentHoveredCell(null);
    },
    [
      draggedItemId,
      gridBounds,
      grabOffset,
      cellSize,
      spacing,
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
      spacing,
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
      spacing,
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
      ...style, // Apply custom styles
    }),
    [x, y, cellSize, spacing, style]
  );

  const getBackgroundClass = useCallback(() => {
    if (isOccupied) {
      return 'bg-blue-100 border-blue-300';
    }
    if (isHovered) {
      return 'bg-green-200';
    }
    // Base background - hover is handled in combinedClassName logic
    return 'bg-gray-50';
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
      return cn(defaultClasses, 'hover:bg-gray-100', customClasses);
    }

    // Custom hover classes present - use them as-is
    return cn(defaultClasses, customClasses);
  }, [getBackgroundClass, className, draggedItemId]);

  return (
    <div
      id={cellId}
      className={cn('border transition-colors', combinedClassName)}
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
  defaultClassName?: string;
};

const DraggableItemComponent = React.memo(
  ({ item, onDragStart, onDragEnd, className = '', defaultClassName }: DraggableItemProps) => {
    const { cellSize, spacing } = useGrid();
    const isDisabled = item.disabled ?? false;
    const [isDragging, setIsDragging] = useState(false);
    const [cursorType, setCursorType] = useState<'default' | 'move' | 'not-allowed'>('default');
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
        // Prevent dragging if the piece is disabled
        if (isDisabled) {
          return;
        }

        const coords = getEventCoordinates(e);

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

        // Check if the clicked position corresponds to an occupied cell in the shape
        const isOccupiedCell = item.shape.cells.some(
          (cell) => cell.x === clickedGridX && cell.y === clickedGridY
        );

        // Only allow dragging if clicking on an occupied cell
        if (!isOccupiedCell) {
          // For empty spaces, temporarily hide this element to allow events to reach underlying pieces
          // This handles both mouse and touch events by removing the element from the DOM temporarily
          if (itemRef.current) {
            const originalPointerEvents = itemRef.current.style.pointerEvents;
            itemRef.current.style.pointerEvents = 'none';

            // Forward the touch event to underlying pieces without hiding the element
            setTimeout(() => {
              const targetElement = document.elementFromPoint(coords.clientX, coords.clientY);
              if (targetElement && targetElement !== itemRef.current) {
                // Create a proper TouchEvent to forward
                try {
                  if ('touches' in e) {
                    const forwardedTouchEvent = new TouchEvent(e.type, {
                      touches: e.touches as unknown as Touch[],
                      changedTouches: e.changedTouches as unknown as Touch[],
                      bubbles: true,
                      cancelable: true,
                    });
                    targetElement.dispatchEvent(forwardedTouchEvent);
                  } else {
                    // Fallback for mouse events
                    const fallbackEvent = new MouseEvent(e.type, {
                      clientX: coords.clientX,
                      clientY: coords.clientY,
                      button: e.button,
                      buttons: e.buttons,
                      bubbles: true,
                      cancelable: true,
                    });
                    targetElement.dispatchEvent(fallbackEvent);
                  }
                } catch (error) {
                  // Fallback: create a simple mouse event if event creation fails
                  console.warn('Event forwarding failed, using mouse fallback:', error);
                  const fallbackEvent = new MouseEvent(
                    e.type === 'touchstart' ? 'mousedown' : e.type,
                    {
                      clientX: coords.clientX,
                      clientY: coords.clientY,
                      button: 'touches' in e ? 0 : e.button,
                      buttons: 'touches' in e ? 1 : e.buttons,
                      bubbles: true,
                      cancelable: true,
                    }
                  );
                  targetElement.dispatchEvent(fallbackEvent);
                }
              }

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
      [item, onDragStart, cellSize, spacing, getEventCoordinates, isDisabled]
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
        setCursorType(isDisabled ? 'not-allowed' : 'default');
      }
    }, [isDragging, isDisabled]);

    const itemStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        left: item.position.x * (cellSize.width + spacing),
        top: item.position.y * (cellSize.height + spacing),
        width: boundingBox.width * cellSize.width + (boundingBox.width - 1) * spacing,
        height: boundingBox.height * cellSize.height + (boundingBox.height - 1) * spacing,
        zIndex: isDragging ? 1000 : 1,
      }),
      [item.position, boundingBox, cellSize, spacing, isDragging]
    );

    // Render individual cells for the shape
    const shapeCells = useMemo(() => {
      // Check if content is a string with multiple letters to distribute
      const contentString = typeof item.content === 'string' ? item.content : '';
      const shouldDistributeLetters =
        contentString.length > 1 && item.shape.cells.length === contentString.length;

      return item.shape.cells.map((cell, index) => {
        const cellStyle = {
          position: 'absolute' as const,
          left: cell.x * (cellSize.width + spacing),
          top: cell.y * (cellSize.height + spacing),
          width: cellSize.width,
          height: cellSize.height,
          zIndex: isDragging ? 1001 : 2,
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
          <div
            key={`cell-${index}`}
            className={cn(
              'border border-white/30 flex justify-center items-center',
              item.color || 'bg-blue-500',
              isDragging ? 'opacity-70' : 'opacity-100',
              item.className || defaultClassName || ''
            )}
            style={cellStyle}
          >
            {cellContent && (
              <div className="p-1 text-xs font-semibold text-center text-white">{cellContent}</div>
            )}
          </div>
        );
      });
    }, [
      item.shape.cells,
      item.color,
      item.content,
      item.style,
      item.className,
      cellSize,
      spacing,
      isDragging,
      defaultClassName,
    ]);

    return (
      <div
        ref={itemRef}
        id={item.id}
        className={cn('transition-all select-none', className)}
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
    isValid,
    cellSize,
    spacing,
    defaultClassName,
  }: {
    item: DraggableItem;
    position: GridPosition;
    isValid: boolean;
    cellSize: GridSize;
    spacing: number;
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

      return item.shape.cells.map((cell, index) => {
        const cellStyle = {
          position: 'absolute' as const,
          left: cell.x * (cellSize.width + spacing),
          top: cell.y * (cellSize.height + spacing),
          width: cellSize.width,
          height: cellSize.height,
          zIndex: 1000,
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
          <div
            key={`preview-cell-${index}`}
            className={cn(
              'border-2 border-dashed flex justify-center items-center',
              item.color || 'bg-blue-500',
              item.className || defaultClassName || ''
            )}
            style={{
              ...cellStyle,
              backgroundColor: isValid
                ? 'rgba(59, 130, 246, 0.3)' // Semi-transparent blue for valid
                : 'rgba(239, 68, 68, 0.3)', // Semi-transparent red for invalid
              borderColor: isValid
                ? 'rgba(59, 130, 246, 0.6)' // Blue border for valid
                : 'rgba(239, 68, 68, 0.6)', // Red border for invalid
            }}
          >
            {cellContent && (
              <div
                className={cn(
                  'p-1 text-xs font-semibold text-center',
                  isValid ? 'text-blue-800' : 'text-red-800'
                )}
              >
                {cellContent}
              </div>
            )}
          </div>
        );
      });
    }, [
      item.shape.cells,
      item.color,
      item.content,
      item.style,
      item.className,
      cellSize,
      spacing,
      defaultClassName,
      isValid,
    ]);

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
  onLayoutChange?: (layout: (string | null)[][]) => void;
  className?: string;
  children?: ReactNode;
  getBoardTileStyle?: (x: number, y: number) => React.CSSProperties | undefined;
  getBoardTileClassName?: (x: number, y: number) => string | undefined;
  // Default classes that can be completely overridden
  defaultBoardTileClassName?: string;
  defaultItemClassName?: string;
};

function Grid({
  gridSize,
  cellSize,
  initialItems = [],
  onItemMove: _onItemMove,
  onItemAdd: _onItemAdd,
  onItemRemove: _onItemRemove,
  onLayoutChange,
  className = '',
  children,
  getBoardTileStyle,
  getBoardTileClassName,
  defaultBoardTileClassName,
  defaultItemClassName,
}: GridProps) {
  return (
    <GridProvider
      gridSize={gridSize}
      cellSize={cellSize}
      initialItems={initialItems}
      onLayoutChange={onLayoutChange}
    >
      <GridContent
        className={className}
        getBoardTileStyle={getBoardTileStyle}
        getBoardTileClassName={getBoardTileClassName}
        defaultBoardTileClassName={defaultBoardTileClassName}
        defaultItemClassName={defaultItemClassName}
      >
        {children}
      </GridContent>
    </GridProvider>
  );
}

// Internal Grid component that has access to context
function GridContent({
  className,
  children,
  getBoardTileStyle,
  getBoardTileClassName,
  defaultBoardTileClassName,
  defaultItemClassName,
}: {
  className: string;
  children: ReactNode;
  getBoardTileStyle?: (x: number, y: number) => React.CSSProperties | undefined;
  getBoardTileClassName?: (x: number, y: number) => string | undefined;
  defaultBoardTileClassName?: string;
  defaultItemClassName?: string;
}) {
  const {
    items,
    gridSize,
    cellSize,
    spacing,
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

  return (
    <div className={cn('inline-block', className)}>
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
            defaultClassName={defaultItemClassName}
          />
        ))}

        {/* Drag preview */}
        {dragPreview && (
          <DragPreviewComponent
            item={dragPreview.item}
            position={dragPreview.position}
            isValid={dragPreview.isValid}
            cellSize={cellSize}
            spacing={spacing}
            defaultClassName={defaultItemClassName}
          />
        )}

        {/* Custom children (for additional content) */}
        {children}
      </div>
    </div>
  );
}

export { Grid };
