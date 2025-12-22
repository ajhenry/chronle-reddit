import { GridCell, GridPosition, LetterPiece } from '../../shared/types/api';
import { Breakpoint } from '../hooks/useViewport';

// Responsive cell size map for different breakpoints
export const RESPONSIVE_CELL_SIZES: Record<
  number,
  Record<Breakpoint, { width: number; height: number }> | undefined
> = {
  9: {
    xs: { width: 32, height: 32 },
    sm: { width: 32, height: 32 },
    md: { width: 32, height: 32 },
    lg: { width: 32, height: 32 },
    xl: { width: 50, height: 50 },
  },
  8: {
    xs: { width: 38, height: 38 },
    sm: { width: 38, height: 38 },
    md: { width: 38, height: 38 },
    lg: { width: 38, height: 38 },
    xl: { width: 62, height: 62 },
  },
};

export const RESPONSIVE_CELL_SPACING: Record<Breakpoint, number> = {
  xs: 4,
  sm: 4,
  md: 4,
  lg: 4,
  xl: 6,
};

// Get responsive cell size based on current breakpoint and grid size
export const getResponsiveCellSize = (
  breakpoint: Breakpoint,
  _gridRows?: number,
  gridCols?: number
): { width: number; height: number } => {
  // Otherwise use responsive sizing
  return RESPONSIVE_CELL_SIZES[gridCols ?? 9]?.[breakpoint] ?? { width: 40, height: 40 };
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
    } else if (
      !cell?.isPreFilled &&
      pieceLetter &&
      cell?.isLetter &&
      cell?.letter &&
      pieceLetter !== cell.letter
    ) {
      return false; // Non-pre-filled cells with letters must match exactly
    }
  }

  return true;
};
