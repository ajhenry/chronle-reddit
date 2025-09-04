import { useState, useCallback, useRef } from 'react';
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

// Grid item component
function GridItem({ itemKey, parentKey: _parentKey }: { itemKey: string; parentKey: string }) {
  const colorIndex = itemKey.charCodeAt(0) % itemColors.length;
  const color = itemColors[colorIndex];

  return (
    <div
      className={`flex justify-center items-center p-4 font-semibold text-white rounded-lg cursor-move ${color}`}
    >
      <span className="text-xl">{itemKey.toUpperCase()}</span>
    </div>
  );
}

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

        // If we found the dragged piece, update all other pieces in the group
        if (draggedPiece) {
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

          // Update all layouts for all breakpoints
          updatedAllLayouts = { ...allLayouts };
          Object.keys(updatedAllLayouts).forEach((breakpoint) => {
            if (updatedAllLayouts[breakpoint]) {
              updatedAllLayouts[breakpoint] = updatedAllLayouts[breakpoint].map((item) => {
                if (groupPieces.includes(item.i) && draggedPiece && item.i !== draggedPiece.i) {
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
          });
        }
      }

      setLayouts(updatedAllLayouts as GridLayouts);
      onLayoutChange?.(updatedLayout, updatedAllLayouts);
    },
    [onLayoutChange]
  );

  const handleBreakpointChange = useCallback((_breakpoint: string) => {
    // Breakpoint change handler - currently not used but required by react-grid-layout
  }, []);

  // Create grid background styles that align with actual grid boundaries
  const currentCols = cols.lg || 12;
  const gridBackgroundStyle = {
    backgroundSize: `${100 / currentCols}% ${rowHeight}px`,
    backgroundPosition: '10px 10px', // Match container padding and margin
  };

  return (
    <div className="p-4 w-full min-h-screen bg-background" style={gridBackgroundStyle}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        onBreakpointChange={handleBreakpointChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        cols={cols}
        rowHeight={rowHeight}
        isDraggable={isDraggable}
        isResizable={isResizable}
        compactType={compactType}
        preventCollision={true}
        margin={[10, 10]}
        containerPadding={[10, 10]}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        useCSSTransforms={true}
        autoSize={true}
      >
        {['a', 'b'].map((key) => (
          <div key={key}>
            <GridItem itemKey={key} parentKey={pieceToParent[key] || key} />
          </div>
        ))}
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
          </ul>
        </div>
      </div>
    </div>
  );
}

export { Grid as DndGrid };
