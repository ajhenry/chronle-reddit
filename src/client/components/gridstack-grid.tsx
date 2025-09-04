import { useEffect, useRef, useState } from 'react';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

type GridItemData = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  color: string;
};

type GridStackGridProps = {
  onLayoutChange?: (items: GridItemData[]) => void;
  isDraggable?: boolean;
  isResizable?: boolean;
  columns?: number;
  margin?: number;
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

// Default grid items
const defaultItems: GridItemData[] = [
  { id: 'a', x: 0, y: 0, w: 2, h: 2, content: 'A', color: itemColors[0] },
  { id: 'b', x: 2, y: 0, w: 4, h: 2, content: 'B', color: itemColors[1] },
  { id: 'c', x: 6, y: 0, w: 2, h: 2, content: 'C', color: itemColors[2] },
  { id: 'd', x: 0, y: 2, w: 3, h: 2, content: 'D', color: itemColors[3] },
  { id: 'e', x: 3, y: 2, w: 3, h: 2, content: 'E', color: itemColors[4] },
  { id: 'f', x: 0, y: 4, w: 4, h: 1, content: 'F', color: itemColors[5] },
  { id: 'g', x: 4, y: 4, w: 4, h: 1, content: 'G', color: itemColors[6] },
];

export function GridStackGrid({
  onLayoutChange,
  isDraggable = true,
  isResizable = true,
  columns = 8,
  margin = 10,
}: GridStackGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<GridStack | null>(null);
  const [items, setItems] = useState<GridItemData[]>(defaultItems);

  useEffect(() => {
    if (!gridRef.current) return;

    // Initialize GridStack
    const grid = GridStack.init(
      {
        column: columns,
        cellHeight: 70,
        margin: margin,
        disableDrag: !isDraggable,
        disableResize: !isResizable,
        float: false, // Prevent automatic floating/compaction
        removable: false,
        acceptWidgets: false,
      },
      gridRef.current
    );

    gridInstanceRef.current = grid;

    // Add change event listener
    grid.on('change', (event, items) => {
      if (items && items.length > 0) {
        const updatedItems = items.map((item) => ({
          id: item.id || '',
          x: item.x || 0,
          y: item.y || 0,
          w: item.w || 1,
          h: item.h || 1,
          content: item.content?.toString() || '',
          color:
            item.el?.querySelector('[data-color]')?.getAttribute('data-color') || itemColors[0],
        }));
        setItems(updatedItems);
        onLayoutChange?.(updatedItems);
      }
    });

    // Add initial items
    defaultItems.forEach((item) => {
      const widget = grid.addWidget({
        id: item.id,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        content: `
          <div class="grid-stack-item-content flex justify-center items-center p-4 font-semibold text-white rounded-lg cursor-move ${item.color} hover:opacity-90" data-color="${item.color}">
            <span class="text-2xl font-bold drop-shadow-lg">${item.content}</span>
          </div>
        `,
      });
    });

    // Cleanup function
    return () => {
      if (gridInstanceRef.current) {
        gridInstanceRef.current.destroy(false);
        gridInstanceRef.current = null;
      }
    };
  }, [columns, margin, isDraggable, isResizable, onLayoutChange]);

  // Create grid background styles for visible grid lines
  const gridBackgroundStyle = {
    backgroundImage: `
      linear-gradient(to right, #e5e7eb 1px, transparent 1px),
      linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
    `,
    backgroundSize: `${100 / columns}% ${70 + margin}px`,
    backgroundPosition: '0 0',
  };

  useEffect(() => {
    // Add custom CSS for grid item styling
    const style = document.createElement('style');
    style.textContent = `
      .grid-stack-item-content {
        border: 2px solid rgba(0, 0, 0, 0.1) !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        transition: all 0.2s ease !important;
      }
      
      .grid-stack-item:hover .grid-stack-item-content {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
        transform: translateY(-1px) !important;
      }
      
      .grid-stack-item.ui-draggable-dragging .grid-stack-item-content {
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3) !important;
        transform: rotate(2deg) !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="p-4 w-full min-h-screen bg-background">
      <div ref={gridRef} className="grid-stack relative" style={gridBackgroundStyle} />
    </div>
  );
}

// Example usage component
export function GridStackExample() {
  const handleLayoutChange = (items: GridItemData[]) => {
    console.log('GridStack layout changed:', items);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-gray-800">GridStack.js Example</h1>
          <p className="text-gray-600">
            A simple example using GridStack.js for drag and drop grid layout. Items can be dragged
            around and resized. GridStack provides smooth animations and automatic collision
            handling.
          </p>
        </div>

        <GridStackGrid
          onLayoutChange={handleLayoutChange}
          isDraggable={true}
          isResizable={true}
          columns={8}
          margin={10}
        />

        <div className="p-4 mt-6 bg-white rounded-lg shadow">
          <h3 className="mb-2 text-lg font-semibold text-gray-800">GridStack.js Features:</h3>
          <ul className="space-y-1 text-gray-600">
            <li>• Drag items to reposition them</li>
            <li>• Resize items by dragging corners</li>
            <li>• Visible grid lines for alignment</li>
            <li>• Colorful grid items with hover effects</li>
            <li>• Smooth animations and transitions</li>
            <li>• Enhanced visual feedback during dragging</li>
            <li>• Automatic collision detection and resolution</li>
            <li>• Responsive grid system</li>
            <li>• Lightweight and performant</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default GridStackGrid;
