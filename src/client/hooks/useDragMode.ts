import { useState, useEffect, useCallback } from 'react';

export type DragMode = 'tap-to-drag' | 'hold-to-drag';

const DRAG_MODE_STORAGE_KEY = 'lettered-drag-mode';
const MD_BREAKPOINT = 768;

/**
 * Get viewport-based default drag mode.
 * md and larger (>=768px): hold-to-drag (desktop-friendly)
 * smaller than md (<768px): tap-to-drag (mobile-friendly)
 */
function getViewportDefault(): DragMode {
  if (typeof window === 'undefined') {
    return 'tap-to-drag';
  }
  return window.innerWidth >= MD_BREAKPOINT ? 'hold-to-drag' : 'tap-to-drag';
}

/**
 * Hook for managing drag mode preference.
 * Default is based on viewport size:
 * - md and larger (>=768px): hold-to-drag
 * - smaller than md (<768px): tap-to-drag
 * User can override via settings, which persists to localStorage.
 */
export function useDragMode() {
  // Track if user has explicitly set a preference
  const [hasUserPreference, setHasUserPreference] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DRAG_MODE_STORAGE_KEY);
      return stored === 'tap-to-drag' || stored === 'hold-to-drag';
    }
    return false;
  });

  const [dragMode, setDragModeState] = useState<DragMode>(() => {
    // If user has explicit preference, use it
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DRAG_MODE_STORAGE_KEY);
      if (stored === 'tap-to-drag' || stored === 'hold-to-drag') {
        return stored;
      }
    }
    // Otherwise use viewport-based default
    return getViewportDefault();
  });

  // Update drag mode when viewport changes (only if no user preference)
  useEffect(() => {
    if (hasUserPreference) return;

    const handleResize = () => {
      setDragModeState(getViewportDefault());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hasUserPreference]);

  // Sync to localStorage when user explicitly sets drag mode
  const setDragMode = useCallback((mode: DragMode) => {
    setDragModeState(mode);
    setHasUserPreference(true);
    localStorage.setItem(DRAG_MODE_STORAGE_KEY, mode);
  }, []);

  const toggleDragMode = useCallback(() => {
    setDragModeState((prev) => {
      const newMode = prev === 'tap-to-drag' ? 'hold-to-drag' : 'tap-to-drag';
      setHasUserPreference(true);
      localStorage.setItem(DRAG_MODE_STORAGE_KEY, newMode);
      return newMode;
    });
  }, []);

  return {
    dragMode,
    setDragMode,
    toggleDragMode,
    isTapToDrag: dragMode === 'tap-to-drag',
    isHoldToDrag: dragMode === 'hold-to-drag',
  };
}
