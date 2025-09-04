import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCenter,
  DragMoveEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

type GridPosition = {
  x: number;
  y: number;
};

type GridItem = {
  id: string;
  position: GridPosition;
  width: number;
  height: number;
};

type GroupDefinition = {
  [groupId: string]: string[];
};

type GridProps = {
  gridSize?: { width: number; height: number };
  cellSize?: { width: number; height: number };
  onPositionChange?: (items: GridItem[]) => void;
};

// Group definitions - pieces that should move together
const pieceGroups: GroupDefinition = {
  'group1': ['a', 'b'],
};

// Lookup map from piece ID to its group
const pieceToGroup: { [key: string]: string } = {
  'a': 'group1',
  'b': 'group1',
};

// Initial positions for pieces
const initialItems: GridItem[] = [
  { id: 'a', position: { x: 5, y: 2 }, width: 1, height: 1 },
  { id: 'b', position: { x: 6, y: 2 }, width: 1, height: 1 },
];

// Grid item colors
const itemColors: { [key: string]: string } = {
  'a': 'bg-blue-500',
  'b': 'bg-blue-500',
  'c': 'bg-purple-500',
  'd': 'bg-red-500',
  'e': 'bg-yellow-500',
  'f': 'bg-indigo-500',
  'g': 'bg-pink-500',
};

// Draggable grid item component
function DraggableGridItem({ item, activeId }: { item: GridItem; activeId: string | null }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  // Check if this item should show group color during drag
  const shouldShowGroupColor = () => {
    if (!activeId) return false;

    const activeGroupId = pieceToGroup[activeId];
    if (!activeGroupId) return false; // Single item, use normal color

    // For grouped items, show blue color for all group members when any member is being dragged
    const groupMembers = pieceGroups[activeGroupId];
    return groupMembers?.includes(item.id) || false;
  };

  // Check if this item is part of the group being dragged
  const isPartOfDraggedGroup = () => {
    if (!activeId) return false;
    const activeGroupId = pieceToGroup[activeId];
    if (!activeGroupId) return false;
    const groupMembers = pieceGroups[activeGroupId];
    return groupMembers?.includes(item.id) || false;
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging || isPartOfDraggedGroup() ? 0 : 1,
  };

  const color = shouldShowGroupColor() ? 'bg-blue-500' : itemColors[item.id] || 'bg-gray-500';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex justify-center items-center w-full h-full font-semibold text-white rounded-lg cursor-move select-none ${color}`}
      data-item-id={item.id}
    >
      <span className="text-xl">{item.id.toUpperCase()}</span>
    </div>
  );
}

// Grid cell component for drop zones
function GridCell({
  x,
  y,
  cellSize,
  activeId,
  items,
}: {
  x: number;
  y: number;
  cellSize: { width: number; height: number };
  activeId: string | null;
  items: GridItem[];
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${x}-${y}`,
    data: { x, y },
  });

  // Check if this cell should show preview for grouped items
  const shouldShowPreview = () => {
    if (!activeId) return false;

    const groupId = pieceToGroup[activeId];

    // For single items, only show preview when hovering
    if (!groupId) return isOver;

    // For grouped items, show preview for all group member positions
    const groupMembers = pieceGroups[groupId];
    const draggedItem = items.find((item) => item.id === activeId);

    if (!draggedItem || !groupMembers) return false;

    // Calculate current positions of all group members
    return groupMembers.some((memberId) => {
      const member = items.find((item) => item.id === memberId);
      if (!member) return false;

      return member.position.x === x && member.position.y === y;
    });
  };

  return (
    <div
      ref={setNodeRef}
      className={`absolute border border-gray-200 transition-colors ${
        shouldShowPreview() ? 'bg-blue-100 border-blue-300' : 'bg-gray-50'
      }`}
      style={{
        left: x * cellSize.width,
        top: y * cellSize.height,
        width: cellSize.width,
        height: cellSize.height,
      }}
    />
  );
}

export function DndKitGrid({
  gridSize = { width: 12, height: 8 },
  cellSize = { width: 80, height: 80 },
  onPositionChange,
}: GridProps) {
  const [items, setItems] = useState<GridItem[]>(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragStartPositions, setDragStartPositions] = useState<{ [key: string]: GridPosition }>({});

  const activeItem = items.find((item) => item.id === activeId);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const draggedId = active.id as string;
      setActiveId(draggedId);

      // Store initial positions for group members
      const groupId = pieceToGroup[draggedId];
      if (groupId) {
        const groupMembers = pieceGroups[groupId];
        const startPositions: { [key: string]: GridPosition } = {};

        if (groupMembers) {
          groupMembers.forEach((memberId) => {
            const item = items.find((item) => item.id === memberId);
            if (item) {
              startPositions[memberId] = { ...item.position };
            }
          });
        }

        setDragStartPositions(startPositions);
      } else {
        const item = items.find((item) => item.id === draggedId);
        if (item) {
          setDragStartPositions({ [draggedId]: { ...item.position } });
        }
      }
    },
    [items]
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { active, over } = event;
      const draggedId = active.id as string;
      const groupId = pieceToGroup[draggedId];

      if (!groupId || !over) return;

      // Use dnd-kit's collision detection to determine target position
      if (!over.id.toString().startsWith('cell-')) return;

      const overIdParts = over.id.toString().split('-');
      const targetX = parseInt(overIdParts[1]!, 10);
      const targetY = parseInt(overIdParts[2]!, 10);

      const draggedItem = items.find((item) => item.id === draggedId);
      if (!draggedItem) return;

      const cellDeltaX = targetX - draggedItem.position.x;
      const cellDeltaY = targetY - draggedItem.position.y;

      const groupMembers = pieceGroups[groupId];

      if (groupMembers) {
        setItems((prevItems) =>
          prevItems.map((item) => {
            if (groupMembers.includes(item.id)) {
              const startPos = dragStartPositions[item.id];
              if (startPos) {
                const newX = Math.max(
                  0,
                  Math.min(gridSize.width - item.width, startPos.x + cellDeltaX)
                );
                const newY = Math.max(
                  0,
                  Math.min(gridSize.height - item.height, startPos.y + cellDeltaY)
                );

                return {
                  ...item,
                  position: { x: newX, y: newY },
                };
              }
            }
            return item;
          })
        );
      }
    },
    [cellSize, gridSize, dragStartPositions]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const draggedId = active.id as string;

      setActiveId(null);
      setDragStartPositions({});

      if (!over) return;

      // If dropped on a grid cell, snap to that position
      if (over.id.toString().startsWith('cell-')) {
        const overIdParts = over.id.toString().split('-');
        const x = overIdParts[1];
        const y = overIdParts[2];

        if (x && y) {
          const targetX = parseInt(x, 10);
          const targetY = parseInt(y, 10);

          const groupId = pieceToGroup[draggedId];

          if (groupId) {
            // Move entire group
            const groupMembers = pieceGroups[groupId];
            const draggedItem = items.find((item) => item.id === draggedId);

            if (draggedItem && groupMembers) {
              const deltaX = targetX - draggedItem.position.x;
              const deltaY = targetY - draggedItem.position.y;

              setItems((prevItems) =>
                prevItems.map((item) => {
                  if (groupMembers.includes(item.id)) {
                    const newX = Math.max(
                      0,
                      Math.min(gridSize.width - item.width, item.position.x + deltaX)
                    );
                    const newY = Math.max(
                      0,
                      Math.min(gridSize.height - item.height, item.position.y + deltaY)
                    );

                    return {
                      ...item,
                      position: { x: newX, y: newY },
                    };
                  }
                  return item;
                })
              );
            }
          } else {
            // Move single item
            setItems((prevItems) =>
              prevItems.map((item) =>
                item.id === draggedId ? { ...item, position: { x: targetX, y: targetY } } : item
              )
            );
          }
        }
      }

      // Call the position change callback
      onPositionChange?.(items);
    },
    [items, gridSize, onPositionChange]
  );

  // Create grid cells for drop zones
  const gridCells = [];
  for (let y = 0; y < gridSize.height; y++) {
    for (let x = 0; x < gridSize.width; x++) {
      gridCells.push(
        <GridCell
          key={`${x}-${y}`}
          x={x}
          y={y}
          cellSize={cellSize}
          activeId={activeId}
          items={items}
        />
      );
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6 w-full min-h-screen bg-background">
        <div
          className="relative bg-white border-2 border-gray-300"
          style={{
            width: gridSize.width * cellSize.width,
            height: gridSize.height * cellSize.height,
          }}
        >
          {/* Grid cells for drop zones */}
          {gridCells}

          {/* Draggable items */}
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                left: item.position.x * cellSize.width,
                top: item.position.y * cellSize.height,
                width: item.width * cellSize.width,
                height: item.height * cellSize.height,
                padding: '2px',
              }}
            >
              <DraggableGridItem item={item} activeId={activeId} />
            </div>
          ))}
        </div>
      </div>

      {/* Drag overlay for the item being dragged */}
      <DragOverlay>
        {activeItem ? (
          <div className="relative">
            {(() => {
              const groupId = pieceToGroup[activeItem.id];
              if (groupId) {
                // Show entire group in drag overlay
                const groupMembers = pieceGroups[groupId];
                if (!groupMembers) return null;

                const groupItems = items.filter((item) => groupMembers.includes(item.id));
                const activeItemStartPos = dragStartPositions[activeItem.id];

                return groupItems.map((item) => {
                  const itemStartPos = dragStartPositions[item.id];
                  if (!activeItemStartPos || !itemStartPos) return null;

                  const relativeX = (itemStartPos.x - activeItemStartPos.x) * cellSize.width;
                  const relativeY = (itemStartPos.y - activeItemStartPos.y) * cellSize.height;

                  return (
                    <div
                      key={item.id}
                      className="flex absolute justify-center items-center font-semibold text-white bg-blue-500 rounded-lg"
                      style={{
                        left: relativeX,
                        top: relativeY,
                        width: item.width * cellSize.width - 4,
                        height: item.height * cellSize.height - 4,
                      }}
                    >
                      <span className="text-xl">{item.id.toUpperCase()}</span>
                    </div>
                  );
                });
              } else {
                // Show single item
                return (
                  <div
                    className={`flex justify-center items-center font-semibold text-white rounded-lg ${
                      itemColors[activeItem.id] || 'bg-gray-500'
                    }`}
                    style={{
                      width: activeItem.width * cellSize.width - 4,
                      height: activeItem.height * cellSize.height - 4,
                    }}
                  >
                    <span className="text-xl">{activeItem.id.toUpperCase()}</span>
                  </div>
                );
              }
            })()}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Example usage component
export function DndKitGridExample() {
  const handlePositionChange = useCallback((items: GridItem[]) => {
    console.log('Items positions changed:', items);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-gray-800">DND Kit Grid Layout</h1>
          <p className="text-gray-600">
            A grid layout with grouped draggable pieces (A and B) built with DND Kit. When you drag
            either piece, both pieces move together as a group. Items snap to grid positions when
            dropped.
          </p>
        </div>

        <DndKitGrid
          gridSize={{ width: 8, height: 8 }}
          cellSize={{ width: 80, height: 80 }}
          onPositionChange={handlePositionChange}
        />

        <div className="p-4 mt-6 bg-white rounded-lg shadow">
          <h3 className="mb-2 text-lg font-semibold text-gray-800">Features:</h3>
          <ul className="space-y-1 text-gray-600">
            <li>• Drag either piece A or B to move both pieces together as a group</li>
            <li>• Drag overlay shows the entire group being moved</li>
            <li>• Smooth drag animations with real-time movement</li>
            <li>• Grid-based positioning with snap-to-grid on drop</li>
            <li>• Visual feedback during drag operations</li>
            <li>• Collision detection and boundary constraints</li>
            <li>• Built with DND Kit for better performance and control</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export { DndKitGrid as DndGrid };
