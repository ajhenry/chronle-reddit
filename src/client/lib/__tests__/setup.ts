// Test setup file for vitest
import { beforeAll } from 'vitest';

beforeAll(() => {
  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    // Uncomment to suppress console.warn in tests
    // warn: vi.fn(),
    // error: vi.fn(),
  };
});

