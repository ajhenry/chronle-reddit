import { useState, useCallback, useRef, useMemo, memo } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

type GridLayouts = {
  lg: Layout[];
  md: Layout[];
  sm: Layout[];
  xs: Layout[];
  xxs: Layout[];
};

type GridProps = {
  cols?: { lg: number; md: number; sm: number; xs: number; xxs: number };
  rowHeight?: number;
  onLayoutChange?: (layout: Layout[], layouts: { [key: string]: Layout[] }) => void;
  isDraggable?: boolean;
  isResizable?: boolean;
  compactType?: 'vertical' | 'horizontal' | null;
};

// Group definitions - pieces that should move together
const pieceGroups: { [key: string]: string[] } = {
  'group1': ['a', 'b'],
};

// Lookup map from piece ID to its group
const pieceToGroup: { [key: string]: string } = {
  'a': 'group1',
  'b': 'group1',
};

// Lookup map from piece ID to its parent key (shared within groups)
const pieceToParent: { [key: string]: string } = {
  'a': 'group1',
  'b': 'group1',
};

// Default layouts for different breakpoints - starting with two pieces
const defaultLayouts: GridLayouts = {
  lg: [
    { i: 'a', x: 5, y: 2, w: 1, h: 1 },
    { i: 'b', x: 6, y: 2, w: 1, h: 1 },
  ],
  md: [
    { i: 'a', x: 4, y: 2, w: 1, h: 1 },
    { i: 'b', x: 5, y: 2, w: 1, h: 1 },
  ],
  sm: [
    { i: 'a', x: 2, y: 2, w: 1, h: 1 },
    { i: 'b', x: 3, y: 2, w: 1, h: 1 },
  ],
  xs: [
    { i: 'a', x: 1, y: 2, w: 1, h: 1 },
    { i: 'b', x: 2, y: 2, w: 1, h: 1 },
  ],
  xxs: [
    { i: 'a', x: 0, y: 2, w: 1, h: 1 },
    { i: 'b', x: 1, y: 2, w: 1, h: 1 },
  ],
};

// Grid item colors
const itemColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-indigo-500',
  'bg-pink-500',
];

// Grid item component - memoized for performance
const GridItem = memo(
  ({ itemKey, parentKey: _parentKey }: { itemKey: string; parentKey: string }) => {
    // Memoize color calculation
    const color = useMemo(() => {
      const colorIndex = itemKey.charCodeAt(0) % itemColors.length;
      return itemColors[colorIndex];
    }, [itemKey]);

    return (
      <div
        className={`flex justify-center items-center p-4 font-semibold text-white rounded-lg cursor-move ${color}`}
      >
        <span className="text-xl">{itemKey.toUpperCase()}</span>
      </div>
    );
  }
);

GridItem.displayName = 'GridItem';

export function Grid({
  cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
  rowHeight = 60,
  onLayoutChange,
  isDraggable = true,
  isResizable = false,
  compactType = null,
}: GridProps) {
  const [layouts, setLayouts] = useState<GridLayouts>(defaultLayouts);
  const isDraggingRef = useRef<string | null>(null);
  const dragStartPositions = useRef<{ [key: string]: { x: number; y: number } }>({});

  const handleDragStart = useCallback(
    (
      layout: Layout[],
      _oldItem: Layout,
      newItem: Layout,
      _placeholder: Layout,
      _e: MouseEvent,
      _element: HTMLElement
    ) => {
      const draggedItemId = newItem.i;
      const groupId = pieceToGroup[draggedItemId];

      if (groupId) {
        isDraggingRef.current = groupId;
        const groupPieces = pieceGroups[groupId] || [];

        // Store initial positions for all pieces in the group
        dragStartPositions.current = {};
        groupPieces.forEach((pieceId) => {
          const piece = layout.find((item) => item.i === pieceId);
          if (piece) {
            dragStartPositions.current[pieceId] = { x: piece.x, y: piece.y };
          }
        });
      }
    },
    []
  );

  const handleDragStop = useCallback(
    (
      _layout: Layout[],
      _oldItem: Layout,
      _newItem: Layout,
      _placeholder: Layout,
      _e: MouseEvent,
      _element: HTMLElement
    ) => {
      isDraggingRef.current = null;
      dragStartPositions.current = {};
    },
    []
  );

  // Helper function to validate if entire group fits within bounds
  const isGroupPositionValid = useCallback(
    (
      groupPieces: string[],
      deltaX: number,
      deltaY: number,
      layout: Layout[],
      breakpoint: string = 'lg'
    ) => {
      const maxCols = cols[breakpoint as keyof typeof cols] || cols.lg || 12;

      for (const pieceId of groupPieces) {
        const startPos = dragStartPositions.current[pieceId];
        if (!startPos) continue;

        const newX = startPos.x + deltaX;
        const newY = startPos.y + deltaY;

        // Check if new position is out of bounds
        if (newX < 0 || newX >= maxCols || newY < 0) {
          return false;
        }

        // Check if piece extends beyond grid width
        const piece = layout.find((item) => item.i === pieceId);
        if (piece && newX + piece.w > maxCols) {
          return false;
        }
      }

      return true;
    },
    [cols]
  );

  const handleLayoutChange = useCallback(
    (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
      let updatedLayout = layout;
      let updatedAllLayouts = allLayouts;

      // If we're currently dragging a group, update all group members
      if (isDraggingRef.current && Object.keys(dragStartPositions.current).length > 0) {
        const groupId = isDraggingRef.current;
        const groupPieces = pieceGroups[groupId] || [];

        // Find which piece was actually moved by comparing with start positions
        let draggedPiece: Layout | null = null;
        let deltaX = 0;
        let deltaY = 0;

        for (const piece of layout) {
          if (groupPieces.includes(piece.i)) {
            const startPos = dragStartPositions.current[piece.i];
            if (startPos && (piece.x !== startPos.x || piece.y !== startPos.y)) {
              draggedPiece = piece;
              deltaX = piece.x - startPos.x;
              deltaY = piece.y - startPos.y;
              break;
            }
          }
        }

        // Validate bounds before applying group movement
        if (draggedPiece) {
          const currentBreakpoint = 'lg'; // You might want to track actual breakpoint
          const isValidMove = isGroupPositionValid(
            groupPieces,
            deltaX,
            deltaY,
            layout,
            currentBreakpoint
          );

          if (!isValidMove) {
            // Restore original positions if move is invalid
            updatedLayout = layout.map((item) => {
              if (groupPieces.includes(item.i)) {
                const startPos = dragStartPositions.current[item.i];
                if (startPos) {
                  return {
                    ...item,
                    x: startPos.x,
                    y: startPos.y,
                  };
                }
              }
              return item;
            });

            console.warn('Drop position is out of bounds. Restoring original positions.');
          } else {
            // Apply valid group movement
            updatedLayout = layout.map((item) => {
              if (groupPieces.includes(item.i) && item.i !== draggedPiece!.i) {
                const startPos = dragStartPositions.current[item.i];
                if (startPos) {
                  return {
                    ...item,
                    x: startPos.x + deltaX,
                    y: startPos.y + deltaY,
                  };
                }
              }
              return item;
            });
          }

          // Update all layouts for all breakpoints
          updatedAllLayouts = { ...allLayouts };
          Object.keys(updatedAllLayouts).forEach((breakpoint) => {
            if (updatedAllLayouts[breakpoint]) {
              const isBreakpointValid = isGroupPositionValid(
                groupPieces,
                deltaX,
                deltaY,
                updatedAllLayouts[breakpoint],
                breakpoint
              );

              updatedAllLayouts[breakpoint] = updatedAllLayouts[breakpoint].map((item) => {
                if (groupPieces.includes(item.i) && draggedPiece && item.i !== draggedPiece.i) {
                  const startPos = dragStartPositions.current[item.i];
                  if (startPos) {
                    if (isBreakpointValid) {
                      return {
                        ...item,
                        x: startPos.x + deltaX,
                        y: startPos.y + deltaY,
                      };
                    } else {
                      // Restore original position for this breakpoint
                      return {
                        ...item,
                        x: startPos.x,
                        y: startPos.y,
                      };
                    }
                  }
                }
                return item;
              });
            }
          });
        }
      }

      setLayouts(updatedAllLayouts as GridLayouts);
      onLayoutChange?.(updatedLayout, updatedAllLayouts);
    },
    [onLayoutChange, isGroupPositionValid]
  );

  const handleBreakpointChange = useCallback((_breakpoint: string) => {
    // Breakpoint change handler - currently not used but required by react-grid-layout
  }, []);

  // Memoize grid background styles for better performance
  const gridBackgroundStyle = useMemo(() => {
    const currentCols = cols.lg || 12;
    return {
      backgroundSize: `${100 / currentCols}% ${rowHeight}px`,
      backgroundPosition: '10px 10px', // Match container padding and margin
    };
  }, [cols.lg, rowHeight]);

  // Memoize responsive grid layout props for better performance
  const gridLayoutProps = useMemo(
    () => ({
      layouts,
      cols,
      rowHeight,
      isDraggable,
      isResizable,
      compactType,
      preventCollision: true,
      margin: [10, 10] as [number, number],
      containerPadding: [10, 10] as [number, number],
      breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
      useCSSTransforms: true,
      autoSize: true,
    }),
    [layouts, cols, rowHeight, isDraggable, isResizable, compactType]
  );

  return (
    <div className="p-4 w-full min-h-screen bg-background" style={gridBackgroundStyle}>
      <ResponsiveGridLayout
        className="layout"
        onLayoutChange={handleLayoutChange}
        onBreakpointChange={handleBreakpointChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        {...gridLayoutProps}
      >
        {useMemo(
          () =>
            ['a', 'b'].map((key) => (
              <div key={key}>
                <GridItem itemKey={key} parentKey={pieceToParent[key] || key} />
              </div>
            )),
          []
        )}
      </ResponsiveGridLayout>
    </div>
  );
}

// Example usage component
export function GridExample() {
  const handleLayoutChange = useCallback(
    (layout: Layout[], layouts: { [key: string]: Layout[] }) => {
      console.log('Layout changed:', { layout, layouts });
    },
    []
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-gray-800">Draggable Grid Layout</h1>
          <p className="text-gray-600">
            A responsive grid layout with two grouped draggable pieces (A and B). When you drag
            either piece, both pieces move together as a group. The layout prevents collision and
            adapts to different screen sizes.
          </p>
        </div>

        <Grid
          onLayoutChange={handleLayoutChange}
          rowHeight={60}
          isDraggable={true}
          isResizable={false}
          compactType={null}
        />

        <div className="p-4 mt-6 bg-white rounded-lg shadow">
          <h3 className="mb-2 text-lg font-semibold text-gray-800">Features:</h3>
          <ul className="space-y-1 text-gray-600">
            <li>• Drag either piece A or B to move both pieces together as a group</li>
            <li>• Fixed item sizes (no resizing)</li>
            <li>• No automatic compaction or repositioning</li>
            <li>• Responsive breakpoints (lg, md, sm, xs, xxs)</li>
            <li>• Collision prevention enabled</li>
            <li>• Visible grid lines for alignment</li>
            <li>• Out-of-bounds validation - prevents drops outside grid boundaries</li>
            <li>• Automatic position restoration for invalid drops</li>
            <li>• Performance optimized with React.memo and memoization</li>
            <li>• Efficient re-rendering with minimal DOM updates</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export { Grid as DndGrid };
