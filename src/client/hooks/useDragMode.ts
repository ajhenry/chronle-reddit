import { useState, useEffect, useCallback } from 'react';

export type DragMode = 'tap-to-drag' | 'hold-to-drag';

const DRAG_MODE_STORAGE_KEY = 'lettered-drag-mode';

/**
 * Hook for managing drag mode preference.
 * "tap-to-drag" (default): User taps to activate drag mode, then can drag scroll anywhere
 * "hold-to-drag": Original behavior where user holds and drags immediately
 */
export function useDragMode() {
  const [dragMode, setDragModeState] = useState<DragMode>(() => {
    // Initialize from localStorage or default to 'tap-to-drag'
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DRAG_MODE_STORAGE_KEY);
      if (stored === 'tap-to-drag' || stored === 'hold-to-drag') {
        return stored;
      }
    }
    return 'tap-to-drag';
  });

  // Sync to localStorage when drag mode changes
  useEffect(() => {
    localStorage.setItem(DRAG_MODE_STORAGE_KEY, dragMode);
  }, [dragMode]);

  const setDragMode = useCallback((mode: DragMode) => {
    setDragModeState(mode);
  }, []);

  const toggleDragMode = useCallback(() => {
    setDragModeState((prev) => (prev === 'tap-to-drag' ? 'hold-to-drag' : 'tap-to-drag'));
  }, []);

  return {
    dragMode,
    setDragMode,
    toggleDragMode,
    isTapToDrag: dragMode === 'tap-to-drag',
    isHoldToDrag: dragMode === 'hold-to-drag',
  };
}
