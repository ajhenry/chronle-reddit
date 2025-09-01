// Development mode utilities

/**
 * Check if the app is running in development mode
 */
export const isDevelopment = (): boolean => {
  // Check various environment indicators
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process !== 'undefined' &&
    globalThis.process.env?.NODE_ENV === 'development'
  ) {
    return true;
  }

  // Check for localhost
  if (typeof window !== 'undefined') {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.')
    );
  }

  // Check for Vite dev server
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return true;
  }

  return false;
};

/**
 * Development mode feature flags
 */
export const devFeatures = {
  showDevTools: isDevelopment(),
  enableDebugLogging: isDevelopment(),
  showPerformanceMetrics: isDevelopment(),
  allowTestData: isDevelopment(),
};

/**
 * Development logger - only logs in development mode
 */
export const devLog = {
  info: (...args: any[]) => {
    if (isDevelopment()) {
      console.log('[DEV]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment()) {
      console.warn('[DEV]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment()) {
      console.error('[DEV]', ...args);
    }
  },
};
