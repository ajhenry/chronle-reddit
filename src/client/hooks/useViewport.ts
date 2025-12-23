import { useState, useEffect, useCallback } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export function useViewport(): { breakpoint: Breakpoint; width: number; height: number } {
  const getViewportSize = useCallback(() => {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 768 };
    }
    // Use document.documentElement for more accurate size in iframes
    // Falls back to window.innerWidth/Height if not available
    const width = document.documentElement?.clientWidth || window.innerWidth;
    const height = document.documentElement?.clientHeight || window.innerHeight;
    return { width, height };
  }, []);

  const [viewport, setViewport] = useState(() => {
    const { width, height } = getViewportSize();
    return {
      width,
      height,
      breakpoint: getBreakpoint(width),
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const { width, height } = getViewportSize();
      const breakpoint = getBreakpoint(width);

      setViewport((prev) => {
        // Only update if values actually changed
        if (prev.width === width && prev.height === height && prev.breakpoint === breakpoint) {
          return prev;
        }
        return { width, height, breakpoint };
      });
    };

    // Listen for window resize events (works for standalone and some iframe scenarios)
    window.addEventListener('resize', handleResize);

    // Use ResizeObserver on document body to detect container size changes
    // This is crucial for iframes where the container can resize without triggering window.resize
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(document.documentElement);
    }

    // Initial size check in case the iframe loaded with a different size
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [getViewportSize]);

  return viewport;
}

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

export function useIsMobile(): boolean {
  const { breakpoint } = useViewport();
  return breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md';
}
