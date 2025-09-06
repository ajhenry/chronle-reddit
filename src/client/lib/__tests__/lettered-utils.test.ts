import { describe, it, expect } from 'vitest';
import {
  getResponsiveCellSize,
  getResponsiveCellSpacing,
  RESPONSIVE_CELL_SIZES,
  RESPONSIVE_CELL_SPACING,
  isValidPiecePlacement,
} from '../lettered-utils';
import { GridCell, GridPosition, LetterPiece } from '../../../shared/types/api';
import { Breakpoint } from '../../hooks/useViewport';

describe('Lettered Game Utils', () => {
  describe('Responsive Cell Sizes', () => {
    it('should return correct cell sizes for each breakpoint', () => {
      const breakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];

      breakpoints.forEach((breakpoint) => {
        const size = getResponsiveCellSize(breakpoint);
        expect(size).toHaveProperty('width');
        expect(size).toHaveProperty('height');
        expect(typeof size.width).toBe('number');
        expect(typeof size.height).toBe('number');
        expect(size.width).toBeGreaterThan(0);
        expect(size.height).toBeGreaterThan(0);
      });
    });

    it('should match the RESPONSIVE_CELL_SIZES constant', () => {
      const breakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];

      breakpoints.forEach((breakpoint) => {
        expect(getResponsiveCellSize(breakpoint)).toEqual(RESPONSIVE_CELL_SIZES[breakpoint]);
      });
    });
  });

  describe('Responsive Cell Spacing', () => {
    it('should return correct cell spacing for each breakpoint', () => {
      const breakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];

      breakpoints.forEach((breakpoint) => {
        const spacing = getResponsiveCellSpacing(breakpoint);
        expect(typeof spacing).toBe('number');
        expect(spacing).toBeGreaterThanOrEqual(0);
      });
    });

    it('should match the RESPONSIVE_CELL_SPACING constant', () => {
      const breakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];

      breakpoints.forEach((breakpoint) => {
        expect(getResponsiveCellSpacing(breakpoint)).toEqual(RESPONSIVE_CELL_SPACING[breakpoint]);
      });
    });
  });

  describe('isValidPiecePlacement', () => {
    let mockGrid: GridCell[][];
    let mockPiece: LetterPiece;

    beforeEach(() => {
      // Create a simple 4x4 grid for testing
      mockGrid = Array(4)
        .fill(null)
        .map(() =>
          Array(4)
            .fill(null)
            .map(() => ({
              letter: null,
              isPreFilled: false,
              isSpace: false,
              isUnused: true,
            }))
        );

      // Add some letters to the grid
      mockGrid[0]![0] = { letter: 'T', isPreFilled: false, isSpace: false, isUnused: false };
      mockGrid[0]![1] = { letter: 'E', isPreFilled: false, isSpace: false, isUnused: false };
      mockGrid[1]![0] = { letter: 'S', isPreFilled: false, isSpace: false, isUnused: false };
      mockGrid[1]![1] = { letter: 'T', isPreFilled: false, isSpace: false, isUnused: false };

      // Create a simple piece
      mockPiece = {
        id: 'test-piece',
        letters: ['T', 'E'],
        shape: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
        color: '#FF0000',
      };
    });

    it('should return true for valid piece placement', () => {
      const position: GridPosition = { row: 0, col: 0 };
      const result = isValidPiecePlacement(mockPiece, position, mockGrid);
      expect(result).toBe(true);
    });

    it('should return false when piece extends outside grid bounds', () => {
      const position: GridPosition = { row: 3, col: 3 }; // Would put piece at (3,3) and (3,4) - out of bounds
      const result = isValidPiecePlacement(mockPiece, position, mockGrid);
      expect(result).toBe(false);
    });

    it('should return false when trying to place on unused cells', () => {
      const position: GridPosition = { row: 2, col: 2 }; // Grid cells at (2,2) and (2,3) are unused
      const result = isValidPiecePlacement(mockPiece, position, mockGrid);
      expect(result).toBe(false);
    });

    it('should return false when letters do not match grid letters', () => {
      // Create a piece with different letters
      const wrongPiece: LetterPiece = {
        id: 'wrong-piece',
        letters: ['X', 'Y'],
        shape: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
        color: '#FF0000',
      };

      const position: GridPosition = { row: 0, col: 0 };
      const result = isValidPiecePlacement(wrongPiece, position, mockGrid);
      expect(result).toBe(false);
    });

    it('should handle single-cell pieces', () => {
      const singlePiece: LetterPiece = {
        id: 'single-piece',
        letters: ['T'],
        shape: [{ row: 0, col: 0 }],
        color: '#FF0000',
      };

      const position: GridPosition = { row: 0, col: 0 };
      const result = isValidPiecePlacement(singlePiece, position, mockGrid);
      expect(result).toBe(true);
    });
  });
});
