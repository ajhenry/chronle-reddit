import { useState, useEffect } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export function useViewport(): { breakpoint: Breakpoint; width: number; height: number } {
  const [viewport, setViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 768, breakpoint: 'lg' as Breakpoint };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      breakpoint: getBreakpoint(window.innerWidth),
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const breakpoint = getBreakpoint(width);

      setViewport({ width, height, breakpoint });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
