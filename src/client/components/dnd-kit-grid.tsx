import { useState, useCallback, useMemo, memo } from 'react';
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

// Draggable grid item component - memoized for performance
const DraggableGridItem = memo(
  ({ item, activeId }: { item: GridItem; activeId: string | null }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: item.id,
      data: { item },
    });

    // Memoize expensive color calculations
    const { shouldShowGroupColor, isPartOfDraggedGroup } = useMemo(() => {
      if (!activeId) return { shouldShowGroupColor: false, isPartOfDraggedGroup: false };

      const activeGroupId = pieceToGroup[activeId];
      if (!activeGroupId) return { shouldShowGroupColor: false, isPartOfDraggedGroup: false };

      const groupMembers = pieceGroups[activeGroupId];
      const isInGroup = groupMembers?.includes(item.id) || false;

      return {
        shouldShowGroupColor: isInGroup,
        isPartOfDraggedGroup: isInGroup,
      };
    }, [activeId, item.id]);

    // Memoize style calculations
    const style = useMemo(
      () => ({
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 1000 : 1,
        opacity: isDragging || isPartOfDraggedGroup ? 0 : 1,
      }),
      [transform, isDragging, isPartOfDraggedGroup]
    );

    // Memoize color calculation
    const color = useMemo(
      () => (shouldShowGroupColor ? 'bg-blue-500' : itemColors[item.id] || 'bg-gray-500'),
      [shouldShowGroupColor, item.id]
    );

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
);

DraggableGridItem.displayName = 'DraggableGridItem';

// Grid cell component for drop zones - memoized for performance
const GridCell = memo(
  ({
    x,
    y,
    cellSize,
    activeId,
    items,
    gridSize,
  }: {
    x: number;
    y: number;
    cellSize: { width: number; height: number };
    activeId: string | null;
    items: GridItem[];
    gridSize: { width: number; height: number };
  }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: `cell-${x}-${y}`,
      data: { x, y },
    });

    // Memoize validation logic to prevent recalculation on every render
    const { shouldShowPreview, isValidDropZone } = useMemo(() => {
      if (!activeId) {
        return { shouldShowPreview: false, isValidDropZone: true };
      }

      const groupId = pieceToGroup[activeId];

      // Helper function to validate if a position is within bounds
      const isValidPosition = (
        posX: number,
        posY: number,
        width: number = 1,
        height: number = 1
      ) => {
        return (
          posX >= 0 &&
          posY >= 0 &&
          posX + width <= gridSize.width &&
          posY + height <= gridSize.height
        );
      };

      if (!groupId) {
        // For single items
        const draggedItem = items.find((item) => item.id === activeId);
        return {
          shouldShowPreview: isOver,
          isValidDropZone:
            !draggedItem || isValidPosition(x, y, draggedItem.width, draggedItem.height),
        };
      }

      // For grouped items
      const groupMembers = pieceGroups[groupId];
      const draggedItem = items.find((item) => item.id === activeId);

      if (!draggedItem || !groupMembers) {
        return { shouldShowPreview: false, isValidDropZone: true };
      }

      // Check if this cell should show preview for grouped items
      const showPreview = groupMembers.some((memberId) => {
        const member = items.find((item) => item.id === memberId);
        if (!member) return false;
        return member.position.x === x && member.position.y === y;
      });

      // Check if this cell is a valid drop zone
      const deltaX = x - draggedItem.position.x;
      const deltaY = y - draggedItem.position.y;

      const isValid = isOver
        ? groupMembers.every((memberId) => {
            const member = items.find((item) => item.id === memberId);
            if (!member) return true;

            const newX = member.position.x + deltaX;
            const newY = member.position.y + deltaY;

            return isValidPosition(newX, newY, member.width, member.height);
          })
        : true;

      return {
        shouldShowPreview: showPreview,
        isValidDropZone: isValid,
      };
    }, [activeId, items, x, y, gridSize, isOver]);

    // Memoize background class calculation
    const backgroundClass = useMemo(() => {
      if (shouldShowPreview) {
        return isValidDropZone ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300';
      }
      return 'bg-gray-50';
    }, [shouldShowPreview, isValidDropZone]);

    // Memoize style object
    const cellStyle = useMemo(
      () => ({
        left: x * cellSize.width,
        top: y * cellSize.height,
        width: cellSize.width,
        height: cellSize.height,
      }),
      [x, y, cellSize]
    );

    return (
      <div
        ref={setNodeRef}
        className={`absolute border border-gray-200 transition-colors ${backgroundClass}`}
        style={cellStyle}
      />
    );
  }
);

GridCell.displayName = 'GridCell';

export function DndKitGrid({
  gridSize = { width: 12, height: 8 },
  cellSize = { width: 80, height: 80 },
  onPositionChange,
}: GridProps) {
  const [items, setItems] = useState<GridItem[]>(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragStartPositions, setDragStartPositions] = useState<{ [key: string]: GridPosition }>({});

  const activeItem = items.find((item) => item.id === activeId);

  // Helper function to validate if a position is within bounds
  const isValidPosition = useCallback(
    (x: number, y: number, width: number = 1, height: number = 1) => {
      return x >= 0 && y >= 0 && x + width <= gridSize.width && y + height <= gridSize.height;
    },
    [gridSize]
  );

  // Helper function to validate if entire group fits within bounds
  const isGroupPositionValid = useCallback(
    (groupMembers: string[], deltaX: number, deltaY: number, currentItems: GridItem[]) => {
      for (const memberId of groupMembers) {
        const member = currentItems.find((item) => item.id === memberId);
        const startPos = dragStartPositions[memberId];
        if (!member || !startPos) continue;

        const newX = startPos.x + deltaX;
        const newY = startPos.y + deltaY;

        if (!isValidPosition(newX, newY, member.width, member.height)) {
          return false;
        }
      }
      return true;
    },
    [dragStartPositions, isValidPosition]
  );

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

  const handleDragMoveInternal = useCallback(
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
        // Validate if the group movement is within bounds before applying
        const isValidMove = isGroupPositionValid(groupMembers, cellDeltaX, cellDeltaY, items);

        if (isValidMove) {
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
      }
    },
    [items, gridSize, dragStartPositions, isGroupPositionValid]
  );

  // Throttle drag move events for better performance
  const throttledDragMove = useMemo(() => {
    let timeoutId: number | null = null;
    let lastUpdateTime = 0;
    const throttleMs = 16; // ~60fps

    return (event: DragMoveEvent) => {
      const now = Date.now();

      if (now - lastUpdateTime < throttleMs) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => handleDragMoveInternal(event), throttleMs);
        return;
      }

      lastUpdateTime = now;
      handleDragMoveInternal(event);
    };
  }, [handleDragMoveInternal]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const draggedId = active.id as string;

      const originalPositions = { ...dragStartPositions };
      setActiveId(null);
      setDragStartPositions({});

      if (!over) {
        // No valid drop target, restore original positions
        setItems((prevItems) =>
          prevItems.map((item) => {
            const originalPos = originalPositions[item.id];
            if (originalPos) {
              return { ...item, position: originalPos };
            }
            return item;
          })
        );
        return;
      }

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

              // Validate the final drop position
              const isValidDrop = isGroupPositionValid(groupMembers, deltaX, deltaY, items);

              if (isValidDrop) {
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
              } else {
                // Invalid drop, restore original positions
                console.warn('Drop position is out of bounds. Restoring original positions.');
                setItems((prevItems) =>
                  prevItems.map((item) => {
                    if (groupMembers.includes(item.id)) {
                      const originalPos = originalPositions[item.id];
                      if (originalPos) {
                        return { ...item, position: originalPos };
                      }
                    }
                    return item;
                  })
                );
              }
            }
          } else {
            // Move single item - validate position
            const draggedItem = items.find((item) => item.id === draggedId);
            if (
              draggedItem &&
              isValidPosition(targetX, targetY, draggedItem.width, draggedItem.height)
            ) {
              setItems((prevItems) =>
                prevItems.map((item) =>
                  item.id === draggedId ? { ...item, position: { x: targetX, y: targetY } } : item
                )
              );
            } else {
              // Invalid drop for single item, restore original position
              console.warn('Drop position is out of bounds. Restoring original position.');
              const originalPos = originalPositions[draggedId];
              if (originalPos) {
                setItems((prevItems) =>
                  prevItems.map((item) =>
                    item.id === draggedId ? { ...item, position: originalPos } : item
                  )
                );
              }
            }
          }
        }
      }

      // Call the position change callback with current items state
      // Note: This will be called asynchronously after state updates
      setTimeout(() => {
        setItems((currentItems) => {
          onPositionChange?.(currentItems);
          return currentItems;
        });
      }, 0);
    },
    [items, gridSize, onPositionChange, isValidPosition, isGroupPositionValid, dragStartPositions]
  );

  // Memoize grid cells creation for better performance
  const gridCells = useMemo(() => {
    const cells = [];
    for (let y = 0; y < gridSize.height; y++) {
      for (let x = 0; x < gridSize.width; x++) {
        cells.push(
          <GridCell
            key={`${x}-${y}`}
            x={x}
            y={y}
            cellSize={cellSize}
            activeId={activeId}
            items={items}
            gridSize={gridSize}
          />
        );
      }
    }
    return cells;
  }, [gridSize, cellSize, activeId, items]);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={throttledDragMove}
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
            <li>• Out-of-bounds validation with visual feedback</li>
            <li>• Green highlighting for valid drop zones, red for invalid</li>
            <li>• Automatic position restoration for invalid drops</li>
            <li>• Built with DND Kit for better performance and control</li>
            <li>• Highly optimized with React.memo and memoization</li>
            <li>• Throttled drag events at 60fps for smooth performance</li>
            <li>• Minimal re-renders with smart component memoization</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export { DndKitGrid as DndGrid };
