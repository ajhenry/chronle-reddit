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
  setItems: (items: DraggableItem[]) => void;
  addItem: (item: Omit<DraggableItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  moveItem: (itemId: string, newPosition: GridPosition) => void;
  setDragPreview: (preview: { item: DraggableItem; position: GridPosition } | null) => void;
  setDraggedItemId: (itemId: string | null) => void;
  setGrabOffset: (offset: GridPosition | null) => void;
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
      setItems,
      addItem,
      removeItem,
      moveItem,
      setDragPreview,
      setDraggedItemId,
      setGrabOffset,
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
      addItem,
      removeItem,
      moveItem,
      setDragPreview,
      setDraggedItemId,
      setGrabOffset,
      isPositionValid,
      getCellData,
    ]
  );

  return <GridContext.Provider value={contextValue}>{children}</GridContext.Provider>;
}

// Grid Cell component - serves as drop zone with predictable ID
type GridCellProps = {
  x: number;
  y: number;
  isValidDropZone?: boolean;
  onDrop?: (itemId: string, position: GridPosition) => void;
  draggedItemId?: string | null;
  className?: string;
};

const GridCell = React.memo(
  ({
    x,
    y,
    isValidDropZone: _isValidDropZone = true,
    onDrop,
    draggedItemId,
    className = '',
  }: GridCellProps) => {
    const { gridId, cellSize, isPositionValid, items, getCellData, setDragPreview, grabOffset } =
      useGrid();
    const cellId = generateCellId(gridId, x, y);
    const [isHovered, setIsHovered] = useState(false);

    const cellData = getCellData(x, y);
    const isOccupied = cellData?.isOccupied ?? false;

    // Check if this cell is a valid drop zone based on dragged item
    const isValidDrop = useMemo(() => {
      if (!draggedItemId || !grabOffset) return !isOccupied;

      const draggedItem = items.find((item) => item.id === draggedItemId);
      if (!draggedItem) return !isOccupied;

      // Validate grab offset bounds
      if (grabOffset.x < 0 || grabOffset.y < 0 ||
          grabOffset.x >= draggedItem.shape.width ||
          grabOffset.y >= draggedItem.shape.height) {
        return !isOccupied;
      }

      // Calculate where the piece would actually be placed accounting for grab offset
      const actualPosition = {
        x: x - grabOffset.x,
        y: y - grabOffset.y,
      };

      return isPositionValid(draggedItem, actualPosition, draggedItem.id);
    }, [draggedItemId, items, isPositionValid, x, y, isOccupied, grabOffset]);

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovered(true);

        // Set drag preview if we have a dragged item and valid drop
        if (draggedItemId && isValidDrop && grabOffset) {
          const draggedItem = items.find((item) => item.id === draggedItemId);
          if (draggedItem) {
            // Calculate the position where the piece should be placed
            // so that the grabbed point aligns with the current cell
            const previewPosition = {
              x: x - grabOffset.x,
              y: y - grabOffset.y,
            };
            setDragPreview({ item: draggedItem, position: previewPosition });
          }
          e.dataTransfer.dropEffect = 'move';
        } else {
          setDragPreview(null);
          e.dataTransfer.dropEffect = 'none';
        }
      },
      [isValidDrop, draggedItemId, items, setDragPreview, x, y, grabOffset]
    );

    const handleDragLeave = useCallback(() => {
      setIsHovered(false);
      // Clear drag preview when leaving
      setDragPreview(null);
    }, [setDragPreview]);

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovered(false);
        setDragPreview(null);

        if (!isValidDrop || !grabOffset || !draggedItemId) return;

        const draggedItem = items.find((item) => item.id === draggedItemId);
        if (!draggedItem) return;

        // Validate grab offset bounds
        if (grabOffset.x < 0 || grabOffset.y < 0 ||
            grabOffset.x >= draggedItem.shape.width ||
            grabOffset.y >= draggedItem.shape.height) {
          return;
        }

        const itemId = e.dataTransfer.getData('text/plain');
        if (itemId && onDrop) {
          // Calculate the position where the piece should be placed
          // so that the grabbed point aligns with the current cell
          const dropPosition = {
            x: x - grabOffset.x,
            y: y - grabOffset.y,
          };
          onDrop(itemId, dropPosition);
        }
      },
      [isValidDrop, onDrop, x, y, setDragPreview, grabOffset, draggedItemId, items]
    );

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
        return isValidDrop ? 'bg-green-200' : 'bg-red-200';
      }
      return 'bg-gray-50 hover:bg-gray-100';
    }, [isOccupied, isHovered, isValidDrop]);

    return (
      <div
        id={cellId}
        className={`border transition-colors ${getBackgroundClass()} ${className}`}
        style={cellStyle}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid={`grid-cell-${x}-${y}`}
        data-occupied={isOccupied}
        data-item-id={cellData?.occupyingItemId}
      />
    );
  }
);

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
    const itemRef = React.useRef<HTMLDivElement>(null);

    const boundingBox = useMemo(() => getItemBoundingBox(item), [item]);

    const handleDragStart = useCallback(
      (e: React.DragEvent) => {
        setIsDragging(true);
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';

        // Calculate grab offset - where on the piece the user clicked
        let grabOffset: GridPosition = { x: 0, y: 0 };
        if (itemRef.current) {
          const rect = itemRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          // Convert pixel coordinates to grid coordinates
          const gridX = Math.floor(mouseX / cellSize.width);
          const gridY = Math.floor(mouseY / cellSize.height);

          // Clamp to shape bounds
          grabOffset = {
            x: Math.max(0, Math.min(gridX, item.shape.width - 1)),
            y: Math.max(0, Math.min(gridY, item.shape.height - 1)),
          };
        }

        onDragStart?.(item, grabOffset);
      },
      [item, onDragStart, cellSize]
    );

    const handleDragEnd = useCallback(() => {
      setIsDragging(false);
      onDragEnd?.(item);
    }, [item, onDragEnd]);

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
        draggable
        className={`cursor-move select-none transition-all ${isDragging ? 'shadow-lg scale-105' : ''} ${className}`}
        style={itemStyle}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
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
  onItemMove,
  onItemAdd: _onItemAdd,
  onItemRemove: _onItemRemove,
  showGridLines = true,
  className = '',
  children,
}: GridProps) {
  return (
    <GridProvider gridSize={gridSize} cellSize={cellSize} initialItems={initialItems}>
      <GridContent onItemMove={onItemMove} showGridLines={showGridLines} className={className}>
        {children}
      </GridContent>
    </GridProvider>
  );
}

// Internal Grid component that has access to context
function GridContent({
  onItemMove,
  showGridLines,
  className,
  children,
}: {
  onItemMove?: (item: DraggableItem, newPosition: GridPosition) => void;
  showGridLines: boolean;
  className: string;
  children: ReactNode;
}) {
  const {
    items,
    moveItem,
    isPositionValid,
    gridSize,
    cellSize,
    dragPreview,
    setDragPreview,
    draggedItemId,
    setDraggedItemId,
    setGrabOffset,
  } = useGrid();

  const handleItemMove = useCallback(
    (itemId: string, newPosition: GridPosition) => {
      // Find the item being moved
      const item = items.find((item) => item.id === itemId);
      if (item && isPositionValid(item, newPosition, item.id)) {
        moveItem(itemId, newPosition);
        onItemMove?.(item, newPosition);
      }
    },
    [items, moveItem, isPositionValid, onItemMove]
  );

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
            onDrop={handleItemMove}
            draggedItemId={draggedItemId}
          />
        );
      }
    }
    return cells;
  }, [gridSize, handleItemMove, draggedItemId]);

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
      <div style={gridStyle}>
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
