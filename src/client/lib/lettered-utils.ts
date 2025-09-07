import { GridCell, GridPosition, LetterPiece } from '../../shared/types/api';
import { Breakpoint } from '../hooks/useViewport';

// Responsive cell size map for different breakpoints
export const RESPONSIVE_CELL_SIZES: Record<Breakpoint, { width: number; height: number }> = {
  xs: { width: 40, height: 40 },
  sm: { width: 40, height: 40 },
  md: { width: 48, height: 48 },
  lg: { width: 50, height: 50 },
  xl: { width: 56, height: 56 },
};

export const RESPONSIVE_CELL_SPACING: Record<Breakpoint, number> = {
  xs: 4,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 8,
};

// Get responsive cell size based on current breakpoint and grid size
export const getResponsiveCellSize = (
  breakpoint: Breakpoint,
  _gridRows?: number,
  gridCols?: number
): { width: number; height: number } => {
  // Special case: use size 36 when the grid width is 9
  if (gridCols === 9) {
    return { width: 36, height: 36 };
  }

  // Otherwise use responsive sizing
  return RESPONSIVE_CELL_SIZES[breakpoint];
};

// Get responsive cell spacing based on current breakpoint
export const getResponsiveCellSpacing = (breakpoint: Breakpoint): number => {
  return RESPONSIVE_CELL_SPACING[breakpoint];
};

// Check if a piece can be placed at a specific position and matches the grid letters
export const isValidPiecePlacement = (
  piece: LetterPiece,
  position: GridPosition,
  grid: GridCell[][]
): boolean => {
  // Check bounds
  for (const shapePos of piece.shape) {
    const gridRow = position.row + shapePos.row;
    const gridCol = position.col + shapePos.col;

    if (gridRow < 0 || gridRow >= grid.length || gridCol < 0 || gridCol >= grid[0]!.length) {
      return false;
    }

    const cell = grid[gridRow]?.[gridCol];
    if (!cell || cell.isUnused || cell.isSpace) {
      return false;
    }
  }

  // Check if all piece letters match the grid letters
  for (let i = 0; i < piece.shape.length; i++) {
    const shapePos = piece.shape[i];
    if (!shapePos) continue;

    const gridRow = position.row + shapePos.row;
    const gridCol = position.col + shapePos.col;
    const cell = grid[gridRow]?.[gridCol];

    // In secure mode: check letter match for pre-filled cells, just presence for others
    const pieceLetter = piece.letters[i];
    if (cell?.isPreFilled && pieceLetter && cell?.letter && pieceLetter !== cell.letter) {
      return false; // Pre-filled cells must match exactly
    } else if (
      !cell?.isPreFilled &&
      pieceLetter &&
      (!cell?.isLetter || cell?.isSpace || cell?.isUnused)
    ) {
      return false; // Non-pre-filled cells must have letters and be valid
    }
  }

  return true;
};
