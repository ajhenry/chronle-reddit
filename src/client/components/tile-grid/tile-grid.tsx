import React, {
  ReactNode,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
} from 'react';
import { StoreApi } from 'zustand';
import { cn } from '../../lib/utils';
import { isDevelopment } from '../../lib/dev-utils';
import { DragMode } from '../../hooks/useDragMode';
import {
  GridStoreContext,
  createGridStore,
  useGridStore,
  useGridStoreApi,
  generateGridId,
  generateCellId,
  getItemBoundingBox,
  type GridStore,
  type GridPosition,
  type GridSize,
  type GridCellData,
  type DraggableItem,
  type ItemShape,
} from './tile-grid-store';

// Re-export types for consumers
export type { GridPosition, GridSize, GridCellData, DraggableItem, ItemShape };

// Auto-scroll configuration
const AUTO_SCROLL_CONFIG = {
  edgeThresholdPercent: 0.05,
  minScrollSpeed: 0.2,
  maxScrollSpeed: 8,
  exponent: 2,
};

// Ref type for external Grid control
export interface GridRef {
  startExternalDrag: (
    item: Omit<DraggableItem, 'id'>,
    pointerPosition: { clientX: number; clientY: number }
  ) => void;
  addItem: (item: Omit<DraggableItem, 'id'>) => string;
  removeItem: (itemId: string) => void;
  getItems: () => DraggableItem[];
}

// Grid Provider component
interface GridProviderProps {
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
}

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

  // Create store instance once
  const storeRef = useRef<StoreApi<GridStore> | null>(null);
  if (!storeRef.current) {
    const gridId = generateGridId();
    const itemsWithIds = initialItems.map((item, index) => ({
      ...item,
      id: item.shape.name || `${gridId}-item-${index}`,
    }));

    storeRef.current = createGridStore({
      gridId,
      gridSize,
      cellSize,
      spacing,
      disabled,
      dragMode,
      initialItems: itemsWithIds,
      onLayoutChange,
      shouldAutoComplete,
      onDragStateChange,
      isCellBlocked,
      onPiecesRemoved,
      onInvalidPlacement,
    });
  }

  // Update callbacks when they change (to avoid stale closures)
  useEffect(() => {
    storeRef.current?.getState().updateCallbacks({
      onLayoutChange: onLayoutChange || null,
      shouldAutoComplete: shouldAutoComplete || null,
      onDragStateChange: onDragStateChange || null,
      isCellBlocked: isCellBlocked || null,
      onPiecesRemoved: onPiecesRemoved || null,
      onInvalidPlacement: onInvalidPlacement || null,
    });
  }, [
    onLayoutChange,
    shouldAutoComplete,
    onDragStateChange,
    isCellBlocked,
    onPiecesRemoved,
    onInvalidPlacement,
  ]);

  // Handle layout changes via subscription
  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;

    // Subscribe to tileGrid changes for layout updates
    const unsubscribe = store.subscribe((state, prevState) => {
      if (state.tileGrid === prevState.tileGrid) return;
      if (state.skipLayoutChangeEffect) return;
      if (state.tapDragActiveItemId) return;
      if (!state.callbacks.onLayoutChange) return;

      const layout = state.tileGrid.map((row) => row.map((cell) => cell.occupyingItemId || null));
      state.callbacks.onLayoutChange(layout);
    });

    return unsubscribe;
  }, []);

  return <GridStoreContext.Provider value={storeRef.current}>{children}</GridStoreContext.Provider>;
}

// Grid Cell component
interface GridCellProps {
  x: number;
  y: number;
  className?: string;
  style?: React.CSSProperties;
}

const GridCell = React.memo(({ x, y, className = '', style }: GridCellProps) => {
  const gridId = useGridStore((s) => s.gridId);
  const cellSize = useGridStore((s) => s.cellSize);
  const spacing = useGridStore((s) => s.spacing);
  const currentHoveredCell = useGridStore((s) => s.currentHoveredCell);
  const draggedItemId = useGridStore((s) => s.draggedItemId);
  // Get cell data from cached tile grid
  const cellData = useGridStore((s) => {
    const row = s.tileGrid[y];
    return row?.[x] || null;
  });

  const cellId = generateCellId(gridId, x, y);
  const isOccupied = cellData?.isOccupied ?? false;
  const isHovered = currentHoveredCell?.x === x && currentHoveredCell.y === y && !!draggedItemId;

  const cellStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      left: x * (cellSize.width + spacing),
      top: y * (cellSize.height + spacing),
      width: cellSize.width,
      height: cellSize.height,
      touchAction: 'auto',
      ...style,
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
    return 'bg-card';
  }, [isOccupied, isHovered]);

  const combinedClassName = useMemo(() => {
    const defaultClasses = getBackgroundClass();
    const customClasses = className || '';

    if (draggedItemId) {
      if (customClasses.includes('hover:')) {
        const classesWithoutHover = customClasses
          .split(' ')
          .filter((cls) => !cls.startsWith('hover:'))
          .join(' ');
        return cn(defaultClasses, classesWithoutHover);
      }
      return cn(defaultClasses, customClasses);
    }

    if (!customClasses.includes('hover:')) {
      return cn(defaultClasses, 'hover:bg-accent transition-colors', customClasses);
    }

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
      {isDevelopment() && (
        <div className="pointer-events-none absolute left-0 top-0 select-none rounded bg-white/80 p-0.5 font-mono text-[10px] font-bold leading-none text-red-600">
          {x},{y}
        </div>
      )}
    </div>
  );
});

GridCell.displayName = 'GridCell';

// Draggable Item component
interface DraggableItemProps {
  item: DraggableItem;
  onDragStart?: (item: DraggableItem, grabOffset?: GridPosition) => void;
  onDragEnd?: (item: DraggableItem) => void;
  className?: string;
  defaultClassName?: string;
}

const DraggableItemComponent = React.memo(
  ({ item, onDragStart, onDragEnd, className = '', defaultClassName }: DraggableItemProps) => {
    const cellSize = useGridStore((s) => s.cellSize);
    const spacing = useGridStore((s) => s.spacing);
    const gridDisabled = useGridStore((s) => s.disabled);
    const dragMode = useGridStore((s) => s.dragMode);
    const tapDragActiveItemId = useGridStore((s) => s.tapDragActiveItemId);
    const tapDragOriginalPosition = useGridStore((s) => s.tapDragOriginalPosition);
    const overlappingPieceIds = useGridStore((s) => s.overlappingPieceIds);
    const invalidPositionItemIds = useGridStore((s) => s.invalidPositionItemIds);
    const store = useGridStoreApi();

    const isDisabled = (item.disabled ?? false) || gridDisabled;
    const [isDragging, setIsDragging] = useState(false);
    const [cursorType, setCursorType] = useState<'default' | 'move' | 'not-allowed'>('default');
    const itemRef = useRef<HTMLDivElement>(null);

    const isTapDragActive = tapDragActiveItemId === item.id;
    const isFromTray = isTapDragActive && tapDragOriginalPosition === null;
    const isBeingOverlapped = overlappingPieceIds.includes(item.id);
    const isInInvalidPosition = invalidPositionItemIds.includes(item.id);

    const boundingBox = useMemo(() => getItemBoundingBox(item), [item]);

    const getEventCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      if ('touches' in e) {
        const touch = e.changedTouches?.[0] || e.touches?.[0];
        if (touch) {
          return { clientX: touch.clientX, clientY: touch.clientY };
        }
        return { clientX: 0, clientY: 0 };
      }
      return { clientX: e.clientX, clientY: e.clientY };
    }, []);

    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (isDragging) return;

        const coords = getEventCoordinates(e);
        let mouseGridX = 0;
        let mouseGridY = 0;

        if (itemRef.current) {
          const rect = itemRef.current.getBoundingClientRect();
          const relativeX = coords.clientX - rect.left;
          const relativeY = coords.clientY - rect.top;
          mouseGridX = Math.floor(relativeX / (cellSize.width + spacing));
          mouseGridY = Math.floor(relativeY / (cellSize.height + spacing));
        }

        const isOverOccupiedCell = item.shape.cells.some(
          (cell) => cell.x === mouseGridX && cell.y === mouseGridY
        );

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
        if (isDisabled) return;

        if (dragMode === 'tap-to-drag' && tapDragActiveItemId && !isTapDragActive) {
          return;
        }

        const coords = getEventCoordinates(e);
        let clickedGridX = 0;
        let clickedGridY = 0;

        if (itemRef.current) {
          const rect = itemRef.current.getBoundingClientRect();
          const relativeX = coords.clientX - rect.left;
          const relativeY = coords.clientY - rect.top;
          clickedGridX = Math.floor(relativeX / (cellSize.width + spacing));
          clickedGridY = Math.floor(relativeY / (cellSize.height + spacing));
        }

        const isOccupiedCell = item.shape.cells.some(
          (cell) => cell.x === clickedGridX && cell.y === clickedGridY
        );

        if (!isOccupiedCell) return;

        if (dragMode === 'tap-to-drag') {
          if (isTapDragActive) {
            e.preventDefault();
            const grabOffset: GridPosition = { x: clickedGridX, y: clickedGridY };
            onDragStart?.(item, grabOffset);
          }
          return;
        }

        e.preventDefault();
        const grabOffset: GridPosition = { x: clickedGridX, y: clickedGridY };
        onDragStart?.(item, grabOffset);
      },
      [
        item,
        onDragStart,
        cellSize,
        spacing,
        getEventCoordinates,
        isDisabled,
        dragMode,
        tapDragActiveItemId,
        isTapDragActive,
      ]
    );

    const handlePointerUp = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(false);
        onDragEnd?.(item);

        const coords = getEventCoordinates(e);
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

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (dragMode !== 'tap-to-drag' || isDisabled) return;

        let clickedGridX = 0;
        let clickedGridY = 0;

        if (itemRef.current) {
          const rect = itemRef.current.getBoundingClientRect();
          const relativeX = e.clientX - rect.left;
          const relativeY = e.clientY - rect.top;
          clickedGridX = Math.floor(relativeX / (cellSize.width + spacing));
          clickedGridY = Math.floor(relativeY / (cellSize.height + spacing));
        }

        const isOccupiedCell = item.shape.cells.some(
          (cell) => cell.x === clickedGridX && cell.y === clickedGridY
        );

        if (!isOccupiedCell) return;

        if (isTapDragActive) return;

        if (tapDragActiveItemId && isBeingOverlapped) return;

        if (tapDragActiveItemId) {
          store.getState().placeTapDragItem();
          store.getState().activateTapDrag(item.id);
          return;
        }

        store.getState().activateTapDrag(item.id);
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
        store,
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

    const shapeCells = useMemo(() => {
      const contentString = typeof item.content === 'string' ? item.content : '';
      const shouldDistributeLetters =
        contentString.length > 1 && item.shape.cells.length === contentString.length;
      const halfSpacing = spacing / 2;

      return item.shape.cells.map((cell, index) => {
        const hitAreaStyle: React.CSSProperties = {
          position: 'absolute' as const,
          left: cell.x * (cellSize.width + spacing) - halfSpacing,
          top: cell.y * (cellSize.height + spacing) - halfSpacing,
          width: cellSize.width + spacing,
          height: cellSize.height + spacing,
          zIndex: isDragging || isTapDragActive ? 1001 : 2,
          touchAction: dragMode === 'hold-to-drag' || isTapDragActive ? 'none' : 'auto',
          pointerEvents: 'auto',
          cursor: isDisabled ? 'default' : 'pointer',
        };

        const cellStyle: React.CSSProperties = {
          position: 'absolute' as const,
          left: halfSpacing,
          top: halfSpacing,
          width: cellSize.width,
          height: cellSize.height,
          pointerEvents: 'none',
          ...item.style,
        };

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
                'flex items-center justify-center overflow-y-hidden',
                'border border-border dark:border-transparent',
                (isDragging && isTapDragActive) || isFromTray ? 'opacity-0' : 'opacity-100',
                (isBeingOverlapped || isInInvalidPosition) && 'animate-pulse-red',
                item.className || defaultClassName || ''
              )}
              style={cellStyle}
            >
              {cellContent && (
                <div
                  className={cn(
                    'pointer-events-none p-1 text-center text-xs font-semibold text-primary-foreground',
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

    const getTouchAction = () => {
      if (dragMode === 'hold-to-drag') return 'none';
      if (isTapDragActive) return 'none';
      return 'auto';
    };

    return (
      <div
        ref={itemRef}
        id={item.id}
        className={cn('select-none transition-all', isTapDragActive && 'scale-105', className)}
        style={{
          ...itemStyle,
          cursor: cursorType,
          touchAction: getTouchAction(),
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
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

// Drag Preview Component
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
        zIndex: 999,
        pointerEvents: 'none' as const,
      }),
      [position, boundingBox, cellSize, spacing]
    );

    const previewCells = useMemo(() => {
      const contentString = typeof item.content === 'string' ? item.content : '';
      const shouldDistributeLetters =
        contentString.length > 1 && item.shape.cells.length === contentString.length;
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
          ...item.style,
          opacity: 1,
        };

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
              'flex items-center justify-center',
              'border border-border dark:border-transparent',
              item.className || defaultClassName || '',
              customDraggingClassName || ''
            )}
            style={cellStyle}
          >
            {cellContent && (
              <div
                className={cn(
                  'p-1 text-center text-xs font-semibold text-primary-foreground',
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

// Scroll Zone Indicator Component
const ScrollZoneIndicator = React.memo(
  ({ position, isVisible }: { position: 'top' | 'bottom'; isVisible: boolean }) => {
    const zoneHeight = `${AUTO_SCROLL_CONFIG.edgeThresholdPercent * 100}vh`;

    return (
      <div
        className={cn(
          'pointer-events-none fixed left-0 right-0 z-[9999]',
          'flex items-center justify-center',
          'border-white/0 bg-black/0',
          'overflow-hidden transition-all duration-200 ease-out',
          position === 'top' ? 'top-0 origin-top border-b' : 'bottom-0 origin-bottom border-t'
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

// Bottom Banner
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
                'border border-border bg-muted text-foreground',
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
interface GridProps {
  gridSize: GridSize;
  cellSize: GridSize;
  initialItems?: Omit<DraggableItem, 'id'>[];
  onItemMove?: (item: DraggableItem, newPosition: GridPosition) => void;
  onItemAdd?: (item: DraggableItem) => void;
  onItemRemove?: (itemId: string) => void;
  onLayoutChange?: (layout: (string | null)[][]) => void;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  dragMode?: DragMode;
  getBoardTileStyle?: (x: number, y: number) => React.CSSProperties | undefined;
  getBoardTileClassName?: (x: number, y: number) => string | undefined;
  getTileDraggingClassName?: (piece: DraggableItem, valid: boolean) => string | undefined;
  defaultBoardTileClassName?: string;
  defaultItemClassName?: string;
  shouldAutoComplete?: (previewLayout: (string | null)[][]) => boolean;
  onDragStateChange?: (isActive: boolean) => void;
  hideBanner?: boolean;
  onExternalDragInvalid?: (itemId: string) => void;
  unplacedPieceCount?: number;
  isCellBlocked?: (x: number, y: number) => boolean;
  onPiecesRemoved?: (pieceIds: string[]) => void;
  onInvalidPlacement?: (itemId: string) => void;
  onDragOverGridChange?: (pieceId: string | null) => void;
}

const Grid = forwardRef<GridRef, GridProps>(function Grid(
  {
    gridSize,
    cellSize,
    initialItems = [],
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

// Internal Grid component with access to store
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
  const store = useGridStoreApi();
  const items = useGridStore((s) => s.items);
  const gridSize = useGridStore((s) => s.gridSize);
  const cellSize = useGridStore((s) => s.cellSize);
  const spacing = useGridStore((s) => s.spacing);
  const disabled = useGridStore((s) => s.disabled);
  const dragPreview = useGridStore((s) => s.dragPreview);
  const draggedItemId = useGridStore((s) => s.draggedItemId);
  const dragMode = useGridStore((s) => s.dragMode);
  const tapDragActiveItemId = useGridStore((s) => s.tapDragActiveItemId);
  const tapDragOriginalPosition = useGridStore((s) => s.tapDragOriginalPosition);
  const justFinishedDrag = useGridStore((s) => s.justFinishedDrag);
  const isCellBlocked = useGridStore((s) => s.callbacks.isCellBlocked);

  // Expose methods via ref
  useImperativeHandle(
    ref,
    () => ({
      startExternalDrag: store.getState().startExternalDrag,
      addItem: (itemData: Omit<DraggableItem, 'id'>) => {
        return store.getState().addItem(itemData);
      },
      removeItem: store.getState().removeItem,
      getItems: () => store.getState().items,
    }),
    [store]
  );

  // Track external drag items
  const externalDragItemRef = useRef<string | null>(null);
  const externalDragFromTrayRef = useRef<boolean>(false);

  useEffect(() => {
    if (draggedItemId && !externalDragItemRef.current) {
      const item = items.find((i) => i.id === draggedItemId);
      if (item) {
        externalDragItemRef.current = draggedItemId;
        store.getState().setExternalDragWasPlacedValidly(false);
        externalDragFromTrayRef.current =
          tapDragActiveItemId === draggedItemId && !tapDragOriginalPosition;
      }
    } else if (!draggedItemId && externalDragItemRef.current) {
      const itemId = externalDragItemRef.current;
      const item = items.find((i) => i.id === itemId);
      const wasFromTray = externalDragFromTrayRef.current;

      if (item && onExternalDragInvalid) {
        const wasPlacedValidly = store.getState().externalDragWasPlacedValidly;

        if (!wasPlacedValidly && wasFromTray) {
          onExternalDragInvalid(itemId);
          store.getState().removeItem(itemId);
          store.getState().deactivateTapDrag();
        }
      }

      externalDragItemRef.current = null;
      store.getState().setExternalDragWasPlacedValidly(false);
      externalDragFromTrayRef.current = false;
    }
  }, [
    draggedItemId,
    items,
    onExternalDragInvalid,
    tapDragActiveItemId,
    tapDragOriginalPosition,
    store,
  ]);

  // Track drag over grid changes
  const prevDragOverGridRef = useRef<string | null>(null);
  useEffect(() => {
    const pieceOverGrid = dragPreview ? dragPreview.item.id : null;
    if (pieceOverGrid !== prevDragOverGridRef.current) {
      prevDragOverGridRef.current = pieceOverGrid;
      onDragOverGridChange?.(pieceOverGrid);
    }
  }, [dragPreview, onDragOverGridChange]);

  const gridRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);

  // Auto-scroll refs
  const autoScrollFrameRef = useRef<number | null>(null);
  const currentPointerPositionRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const currentScrollVelocityRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartedInScrollZoneRef = useRef<boolean>(false);
  const hasExitedScrollZoneRef = useRef<boolean>(false);

  // Capture grid bounds
  useEffect(() => {
    if (gridRef.current) {
      store.getState().setGridBounds(gridRef.current.getBoundingClientRect());
    }
  }, [store, gridSize, cellSize]);

  // Update grid bounds and scroll state on scroll
  useEffect(() => {
    const updateScrollState = () => {
      if (gridRef.current) {
        store.getState().setGridBounds(gridRef.current.getBoundingClientRect());
      }

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setCanScrollUp(scrollTop > 5);

      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const maxScroll = scrollHeight - clientHeight;
      setCanScrollDown(scrollTop < maxScroll - 5);
    };

    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    document.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrollState);
      document.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [store]);

  // Auto-scroll helpers
  const isInScrollZone = useCallback((clientY: number): boolean => {
    const viewportHeight = window.innerHeight;
    const edgeThreshold = viewportHeight * AUTO_SCROLL_CONFIG.edgeThresholdPercent;
    const distanceFromBottom = viewportHeight - clientY;
    return clientY < edgeThreshold || distanceFromBottom < edgeThreshold;
  }, []);

  const calculateAutoScrollSpeed = useCallback(
    (clientY: number): number => {
      const viewportHeight = window.innerHeight;
      const edgeThreshold = viewportHeight * AUTO_SCROLL_CONFIG.edgeThresholdPercent;
      const { minScrollSpeed, maxScrollSpeed, exponent } = AUTO_SCROLL_CONFIG;

      const currentlyInScrollZone = isInScrollZone(clientY);

      if (dragStartedInScrollZoneRef.current && !hasExitedScrollZoneRef.current) {
        if (!currentlyInScrollZone) {
          hasExitedScrollZoneRef.current = true;
        }
        return 0;
      }

      if (clientY < edgeThreshold) {
        const t = 1 - clientY / edgeThreshold;
        const speed = minScrollSpeed + (maxScrollSpeed - minScrollSpeed) * Math.pow(t, exponent);
        return -speed;
      }

      const distanceFromBottom = viewportHeight - clientY;
      if (distanceFromBottom < edgeThreshold) {
        const t = 1 - distanceFromBottom / edgeThreshold;
        const speed = minScrollSpeed + (maxScrollSpeed - minScrollSpeed) * Math.pow(t, exponent);
        return speed;
      }

      return 0;
    },
    [isInScrollZone]
  );

  const performAutoScroll = useCallback(() => {
    if (!isDraggingRef.current) {
      autoScrollFrameRef.current = null;
      currentScrollVelocityRef.current = 0;
      return;
    }

    const pointerPos = currentPointerPositionRef.current;
    let targetSpeed = 0;

    if (pointerPos) {
      targetSpeed = calculateAutoScrollSpeed(pointerPos.clientY);
    }

    const currentVelocity = currentScrollVelocityRef.current;
    const isAccelerating = Math.abs(targetSpeed) > Math.abs(currentVelocity);
    const smoothingFactor = isAccelerating ? 0.12 : 0.18;

    const newVelocity = currentVelocity + (targetSpeed - currentVelocity) * smoothingFactor;
    currentScrollVelocityRef.current = newVelocity;

    if (Math.abs(newVelocity) > 0.1) {
      window.scrollBy({ top: newVelocity, behavior: 'instant' });
    }

    autoScrollFrameRef.current = requestAnimationFrame(performAutoScroll);
  }, [calculateAutoScrollSpeed]);

  const startAutoScroll = useCallback(() => {
    isDraggingRef.current = true;
    if (autoScrollFrameRef.current === null) {
      autoScrollFrameRef.current = requestAnimationFrame(performAutoScroll);
    }
  }, [performAutoScroll]);

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

  const setInitialPointerPosition = useCallback(
    (position: { clientX: number; clientY: number }) => {
      currentPointerPositionRef.current = position;
      dragStartedInScrollZoneRef.current = isInScrollZone(position.clientY);
      hasExitedScrollZoneRef.current = false;
    },
    [isInScrollZone]
  );

  // Global event coordinate helper
  const getGlobalEventCoordinates = useCallback((e: MouseEvent | TouchEvent) => {
    if (e.type.startsWith('touch')) {
      const touchEvent = e as TouchEvent;
      const touch = touchEvent.changedTouches?.[0] || touchEvent.touches?.[0];
      if (touch) {
        return { clientX: touch.clientX, clientY: touch.clientY };
      }
      return { clientX: 0, clientY: 0 };
    }
    const mouseEvent = e as MouseEvent;
    return { clientX: mouseEvent.clientX, clientY: mouseEvent.clientY };
  }, []);

  // Global pointer move handler
  const handleGlobalPointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const coords = getGlobalEventCoordinates(e);
      currentPointerPositionRef.current = coords;

      if (isDraggingRef.current && e.type.startsWith('touch')) {
        e.preventDefault();
        e.stopPropagation();
      }

      const state = store.getState();
      const { draggedItemId, gridBounds, grabOffset, cellSize, spacing, gridSize, items } = state;

      if (!draggedItemId || !gridBounds || !grabOffset) return;

      const pointerX = coords.clientX - gridBounds.left;
      const pointerY = coords.clientY - gridBounds.top;
      const cellX = Math.floor(pointerX / (cellSize.width + spacing));
      const cellY = Math.floor(pointerY / (cellSize.height + spacing));

      if (cellX >= 0 && cellX < gridSize.width && cellY >= 0 && cellY < gridSize.height) {
        const currentHoveredCell = state.currentHoveredCell;
        if (
          !currentHoveredCell ||
          currentHoveredCell.x !== cellX ||
          currentHoveredCell.y !== cellY
        ) {
          store.getState().setCurrentHoveredCell({ x: cellX, y: cellY });

          const draggedItem = items.find((item) => item.id === draggedItemId);
          if (draggedItem) {
            const previewPosition = {
              x: cellX - grabOffset.x,
              y: cellY - grabOffset.y,
            };

            const withinBounds = state.isPositionWithinBounds(draggedItem, previewPosition);
            const isOnBlockedTile = state.isPositionOnBlockedTile(draggedItem, previewPosition);
            const isValid = withinBounds && !isOnBlockedTile;

            store.getState().setDragPreview({
              item: draggedItem,
              position: previewPosition,
              isValid,
            });
          }
        }
      } else {
        store.getState().setCurrentHoveredCell(null);
        store.getState().setDragPreview(null);
      }
    },
    [store, getGlobalEventCoordinates]
  );

  // Global pointer up handler
  const handleGlobalPointerUp = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const state = store.getState();
      const {
        draggedItemId: currentDraggedItemId,
        gridBounds,
        grabOffset,
        cellSize,
        spacing,
        gridSize,
        items,
        tapDragActiveItemId,
        tapDragOriginalPosition,
        callbacks,
      } = state;

      if (!currentDraggedItemId || !gridBounds || !grabOffset) return;

      const coords = getGlobalEventCoordinates(e);
      const pointerX = coords.clientX - gridBounds.left;
      const pointerY = coords.clientY - gridBounds.top;
      const cellX = Math.floor(pointerX / (cellSize.width + spacing));
      const cellY = Math.floor(pointerY / (cellSize.height + spacing));

      const isPointerWithinBounds =
        cellX >= 0 && cellX < gridSize.width && cellY >= 0 && cellY < gridSize.height;

      let placedValidly = false;

      if (isPointerWithinBounds) {
        const draggedItem = items.find((item) => item.id === currentDraggedItemId);
        if (!draggedItem) return;

        const dropPosition = {
          x: cellX - grabOffset.x,
          y: cellY - grabOffset.y,
        };

        const withinBounds = state.isPositionWithinBounds(draggedItem, dropPosition);

        if (!withinBounds) {
          if (tapDragActiveItemId === currentDraggedItemId && !tapDragOriginalPosition) {
            placedValidly = false;
          } else if (tapDragOriginalPosition) {
            store
              .getState()
              .setItems((prev) =>
                prev.map((item) =>
                  item.id === currentDraggedItemId
                    ? { ...item, position: tapDragOriginalPosition }
                    : item
                )
              );
          }
        } else {
          const isOnBlockedTile = state.isPositionOnBlockedTile(draggedItem, dropPosition);

          if (isOnBlockedTile && !tapDragActiveItemId) {
            if (tapDragOriginalPosition) {
              store
                .getState()
                .setItems((prev) =>
                  prev.map((item) =>
                    item.id === currentDraggedItemId
                      ? { ...item, position: tapDragOriginalPosition }
                      : item
                  )
                );
            }
            placedValidly = false;
          } else {
            store.getState().moveItem(currentDraggedItemId, dropPosition);
            placedValidly = true;

            if (!tapDragActiveItemId) {
              const overlappingIds = state.getOverlappingItemIds(
                draggedItem,
                dropPosition,
                draggedItem.id
              );

              if (overlappingIds.length > 0) {
                store
                  .getState()
                  .setItems((prev) => prev.filter((item) => !overlappingIds.includes(item.id)));
                callbacks.onPiecesRemoved?.(overlappingIds);
              }
            }

            if (tapDragActiveItemId && callbacks.shouldAutoComplete) {
              const previewLayout = state.buildPreviewLayout(draggedItem.id, dropPosition);
              if (callbacks.shouldAutoComplete(previewLayout)) {
                store.setState({
                  tapDragActiveItemId: null,
                  tapDragOriginalPosition: null,
                  draggedItemId: null,
                  grabOffset: null,
                  dragPreview: null,
                  currentHoveredCell: null,
                  externalDragWasPlacedValidly: true,
                });
                callbacks.onLayoutChange?.(previewLayout);
                callbacks.onDragStateChange?.(false);
                return;
              }
            }
          }
        }
      } else {
        if (tapDragActiveItemId === currentDraggedItemId && !tapDragOriginalPosition) {
          placedValidly = false;
        } else if (tapDragOriginalPosition) {
          store
            .getState()
            .setItems((prev) =>
              prev.map((item) =>
                item.id === currentDraggedItemId
                  ? { ...item, position: tapDragOriginalPosition }
                  : item
              )
            );
        }
      }

      store.getState().setExternalDragWasPlacedValidly(placedValidly);
      store.setState({
        draggedItemId: null,
        grabOffset: null,
        dragPreview: null,
        currentHoveredCell: null,
      });

      store.getState().setJustFinishedDrag(true);
      setTimeout(() => {
        store.getState().setJustFinishedDrag(false);
      }, 100);
    },
    [store, getGlobalEventCoordinates]
  );

  // Keep refs for event handlers
  const handleGlobalPointerMoveRef = useRef(handleGlobalPointerMove);
  const handleGlobalPointerUpRef = useRef(handleGlobalPointerUp);
  handleGlobalPointerMoveRef.current = handleGlobalPointerMove;
  handleGlobalPointerUpRef.current = handleGlobalPointerUp;

  // Auto-scroll effect
  useEffect(() => {
    if (draggedItemId) {
      startAutoScroll();
      return () => stopAutoScroll();
    }
  }, [draggedItemId, startAutoScroll, stopAutoScroll]);

  // Global event listeners
  useEffect(() => {
    if (!draggedItemId) return;

    document.body.classList.add('dragging-active');

    const handlePointerMove = (e: MouseEvent | TouchEvent) => handleGlobalPointerMoveRef.current(e);
    const handlePointerUp = (e: MouseEvent | TouchEvent) => handleGlobalPointerUpRef.current(e);

    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchmove', handlePointerMove, { passive: false, capture: true });
    document.addEventListener('touchend', handlePointerUp, { passive: false, capture: true });

    return () => {
      document.body.classList.remove('dragging-active');
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchmove', handlePointerMove, {
        capture: true,
      } as EventListenerOptions);
      document.removeEventListener('touchend', handlePointerUp, {
        capture: true,
      } as EventListenerOptions);
    };
  }, [draggedItemId]);

  const handleDragStart = useCallback(
    (item: DraggableItem, initialGrabOffset?: GridPosition) => {
      store.getState().setDraggedItemId(item.id);
      store.getState().setGrabOffset(initialGrabOffset || { x: 0, y: 0 });
      store.getState().setDragPreview(null);
      if (initialGrabOffset) {
        const rect = gridRef.current?.getBoundingClientRect();
        if (rect) {
          const clientX =
            rect.left + item.position.x * (cellSize.width + spacing) + cellSize.width / 2;
          const clientY =
            rect.top + item.position.y * (cellSize.height + spacing) + cellSize.height / 2;
          setInitialPointerPosition({ clientX, clientY });
        }
      }
    },
    [store, cellSize, spacing, setInitialPointerPosition]
  );

  const handleDragEnd = useCallback(() => {
    store.getState().setDraggedItemId(null);
    store.getState().setGrabOffset(null);
    store.getState().setDragPreview(null);
  }, [store]);

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

  const handleRemovePiece = useCallback(() => {
    if (!tapDragActiveItemId) return;
    store.getState().removeItem(tapDragActiveItemId);
    onPiecesRemoved?.([tapDragActiveItemId]);
    store.getState().deactivateTapDrag();
  }, [tapDragActiveItemId, store, onPiecesRemoved]);

  const handlePlacePiece = useCallback(() => {
    store.getState().placeTapDragItem();
  }, [store]);

  const handleGridClick = useCallback(
    (e: React.MouseEvent) => {
      if (!tapDragActiveItemId) return;
      if (justFinishedDrag) return;

      let target = e.target as HTMLElement | null;
      while (target && target !== gridRef.current) {
        if (target.dataset?.testid?.startsWith('draggable-item-')) {
          return;
        }
        target = target.parentElement;
      }

      store.getState().placeTapDragItem();
    },
    [tapDragActiveItemId, justFinishedDrag, store]
  );

  return (
    <>
      <ScrollZoneIndicator
        position="top"
        isVisible={(!!draggedItemId || !!tapDragActiveItemId) && canScrollUp}
      />
      <ScrollZoneIndicator
        position="bottom"
        isVisible={(!!draggedItemId || !!tapDragActiveItemId) && canScrollDown}
      />

      <BottomBanner
        isVisible={!disabled && !hideBanner && dragMode === 'tap-to-drag' && unplacedPieceCount > 0}
        isDragMode={!!tapDragActiveItemId}
        onPlace={handlePlacePiece}
        onRemove={handleRemovePiece}
        unplacedPieceCount={unplacedPieceCount}
      />

      <div className={cn('inline-block', className)}>
        <div
          ref={gridRef}
          style={{
            ...gridStyle,
            pointerEvents: dragPreview ? 'none' : 'auto',
            touchAction: 'auto',
          }}
          onClick={handleGridClick}
        >
          <div
            className={cn(
              'absolute inset-0 pointer-events-none z-[500] bg-background/50',
              'transition-opacity duration-200 ease-out',
              tapDragActiveItemId ? 'opacity-100' : 'opacity-0'
            )}
          />

          {gridCells}

          {items.map((item) => (
            <DraggableItemComponent
              key={item.id}
              item={item}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              defaultClassName={defaultItemClassName}
            />
          ))}

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

          {tapDragActiveItemId &&
            !draggedItemId &&
            (() => {
              const activeItem = items.find((i) => i.id === tapDragActiveItemId);
              if (!activeItem) return null;

              const withinBounds =
                activeItem.position.x >= 0 &&
                activeItem.position.y >= 0 &&
                activeItem.position.x + activeItem.shape.width <= gridSize.width &&
                activeItem.position.y + activeItem.shape.height <= gridSize.height;

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

          {children}
        </div>
      </div>
    </>
  );
});

export { Grid };
export type { DragMode } from '../../hooks/useDragMode';
