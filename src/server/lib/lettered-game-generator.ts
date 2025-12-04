import type { GridCell, GridPosition, LetterPiece, LetteredGameData } from '../../shared/types/api';

// Intermediate GridCell type for piece generation with skipped tracking
type GenerationGridCell = GridCell & {
  isSkipped: boolean; // true for letters that failed piece generation but should be handled by stranded cleanup
};

// Available color classes for tetris pieces
const PIECE_COLOR_CLASSES = [
  'piece-color-red',
  'piece-color-orange',
  'piece-color-amber',
  'piece-color-yellow',
  'piece-color-lime',
  'piece-color-green',
  'piece-color-emerald',
  'piece-color-teal',
  'piece-color-cyan',
  'piece-color-sky',
  'piece-color-blue',
  'piece-color-indigo',
  'piece-color-violet',
  'piece-color-purple',
  'piece-color-fuchsia',
  'piece-color-pink',
  'piece-color-rose',
  'piece-color-gray',
  'piece-color-slate',
  'piece-color-zinc',
];

// Color assignment tracker to ensure no duplicate colors
class ColorAssigner {
  private usedColors: Set<string> = new Set();
  private availableColors: string[] = [...PIECE_COLOR_CLASSES];
  private random: () => number;

  constructor(randomFunc: () => number = Math.random) {
    this.random = randomFunc;
    // Shuffle available colors for better distribution
    this.shuffleColors();
  }

  private shuffleColors(): void {
    for (let i = this.availableColors.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [this.availableColors[i], this.availableColors[j]] = [
        this.availableColors[j]!,
        this.availableColors[i]!,
      ];
    }
  }

  getNextColor(): string {
    // If we've used all colors, reset and reshuffle (for games with many pieces)
    if (this.usedColors.size >= PIECE_COLOR_CLASSES.length) {
      console.log('⚠️ All colors used, resetting color pool');
      this.usedColors.clear();
      this.shuffleColors();
    }

    // Find the first unused color
    let selectedColor = this.availableColors.find((color) => !this.usedColors.has(color));

    // Fallback to random selection if shuffled order doesn't work
    if (!selectedColor) {
      selectedColor = PIECE_COLOR_CLASSES[Math.floor(this.random() * PIECE_COLOR_CLASSES.length)]!;
    }

    this.usedColors.add(selectedColor);
    console.log(
      `🎨 Assigned color: ${selectedColor} (${this.usedColors.size}/${PIECE_COLOR_CLASSES.length} colors used)`
    );
    return selectedColor;
  }

  reset(): void {
    this.usedColors.clear();
    this.shuffleColors();
  }
}

// Create an empty 8x8 grid
export const createEmptyGrid = (): GridCell[][] => {
  return Array(8)
    .fill(null)
    .map(() =>
      Array(8)
        .fill(null)
        .map(() => ({
          letter: null,
          isLetter: false,
          isPreFilled: false,
          isSpace: false,
          isUnused: true, // Start with all unused, will be updated when placing phrase
        }))
    );
};

// Pretty print the board for debugging
export const printBoard = (grid: GridCell[][], title: string = 'Board'): void => {
  console.log(`\n=== ${title} ===`);
  console.log(`Dimensions: ${grid.length} x ${grid[0]?.length || 0}`);

  // Print column headers
  const colHeader =
    '  ' + Array.from({ length: grid[0]?.length || 0 }, (_, i) => i.toString()).join(' ');
  console.log(colHeader);

  // Print top border
  console.log('  ' + '─'.repeat((grid[0]?.length || 0) * 2));

  for (let row = 0; row < grid.length; row++) {
    let rowStr = row.toString().padStart(2) + '│';

    for (let col = 0; col < (grid[row]?.length || 0); col++) {
      const cell = grid[row]?.[col];
      if (!cell) {
        rowStr += '░░';
        continue;
      }

      if (cell.isUnused) {
        rowStr += '░░';
      } else if (cell.isSpace) {
        rowStr += '  ';
      } else if (cell.letter) {
        if (cell.isPreFilled) {
          rowStr += `\x1b[32m${cell.letter}\x1b[0m`; // Green for pre-filled
        } else {
          rowStr += `\x1b[36m${cell.letter}\x1b[0m`; // Cyan for regular letters
        }
      } else {
        rowStr += '░░';
      }
    }

    console.log(rowStr);
  }

  console.log('  ' + '─'.repeat((grid[0]?.length || 0) * 2));

  // Print legend
  console.log(
    "Legend: \x1b[32mGreen\x1b[0m=Pre-filled, \x1b[36mCyan\x1b[0m=Letters, ░░=Unused, ' '=Space\n"
  );
};

// Create a configurable grid with max 9 columns and variable rows
export const createConfigurableGrid = (rows: number, columns: number = 9): GridCell[][] => {
  // Enforce max 9 columns as reOn ested
  const actualColumns = Math.min(columns, 9);

  return Array(rows)
    .fill(null)
    .map(() =>
      Array(actualColumns)
        .fill(null)
        .map(() => ({
          letter: null,
          isLetter: false,
          isPreFilled: false,
          isSpace: false,
          isUnused: true, // Start with all unused, will be updated when placing phrase
        }))
    );
};

// Create an empty 9x9 grid for initial phrase placement (backward compatibility)
export const create9x9Grid = (): GridCell[][] => {
  return createConfigurableGrid(9, 9);
};

/**
 * Example usage of configurable grid system:
 *
 * // Create a 12x9 grid (12 rows, 9 columns max)
 * const largeGrid = createConfigurableGrid(12, 9);
 *
 * // Place a phrase on the configurable grid
 * const placedGrid = placePhraseOnGrid(largeGrid, "YOUR PHRASE HERE");
 *
 * // The system will automatically:
 * // - Enforce max 9 columns
 * // - Calculate appropriate letter limits based on grid size
 * // - Use dynamic bounds checking throughout all algorithms
 */

// Place a phrase on a configurable grid (max 9 columns, variable rows)
export const placePhraseOnGrid = (grid: GridCell[][], phrase: string): GridCell[][] => {
  const words = phrase
    .toUpperCase()
    .split(' ')
    .filter((word) => word.length > 0);
  const totalLetters = words.join('').length;

  // Get grid dimensions
  const gridRows = grid.length;
  const gridCols = grid[0]?.length || 9;

  // Check for individual words that are too long (max 9 characters per word)
  const maxWordLength = Math.min(9, gridCols);
  const longWords = words.filter((word) => word.length > maxWordLength);
  if (longWords.length > 0) {
    throw new Error(
      `Words cannot be longer than ${maxWordLength} characters. Found: ${longWords.join(', ')}`
    );
  }

  // Calculate maximum letters based on grid size (allow more letters for larger grids)
  const maxLetters = gridRows * gridCols;
  if (totalLetters > maxLetters) {
    throw new Error(
      `Phrase has too many letters for ${gridRows}x${gridCols} grid (max ${maxLetters})`
    );
  }

  // Use the configurable algorithm for grid layout
  const result = generatePhraseLayoutOnGrid(grid, words);
  if (!result) {
    throw new Error(`Could not generate valid layout for phrase on ${gridRows}x${gridCols} grid`);
  }

  return result;
};

// Place a phrase on a 9x9 grid for initial layout following lettered.md algorithm (backward compatibility)
export const placePhraseOn9x9Grid = (grid: GridCell[][], phrase: string): GridCell[][] => {
  return placePhraseOnGrid(grid, phrase);
};

// Generate phrase layout on configurable grid following lettered.md algorithm
const generatePhraseLayoutOnGrid = (grid: GridCell[][], words: string[]): GridCell[][] | null => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

  // Create a more balanced layout by intelligently grouping words
  const balancedLayout = createBalancedPhraseLayout(newGrid, words);

  return balancedLayout;
};

// Generate phrase layout on 9x9 grid following lettered.md algorithm exactly (backward compatibility)
const generatePhraseLayoutOn9x9Grid = (
  grid: GridCell[][],
  words: string[]
): GridCell[][] | null => {
  return generatePhraseLayoutOnGrid(grid, words);
};

// Create a balanced phrase layout that groups words more intelligently
const createBalancedPhraseLayout = (grid: GridCell[][], words: string[]): GridCell[][] | null => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

  // Get grid dimensions
  const gridRows = grid.length;
  const gridCols = grid[0]?.length || 9;

  // Group words intelligently for better balance
  const wordGroups = groupWordsForBalance(words);

  console.log(
    `📝 Word groups for balanced layout: ${wordGroups.map((group) => `"${group.join(' ')}"`).join(' | ')}`
  );

  // Place each group on a separate row, centered
  let currentRow = 1; // Start at row 1 for better balance

  for (const wordGroup of wordGroups) {
    if (currentRow >= gridRows - 1) {
      return null; // Not enough space
    }

    const groupText = wordGroup.join(' ');
    const groupLength = groupText.length;

    // Center the group in the row (use available column width)
    const targetWidth = Math.min(9, gridCols);
    const startCol = Math.max(0, Math.floor((targetWidth - groupLength) / 2));

    console.log(`📍 Placing group "${groupText}" at row ${currentRow}, start col ${startCol}`);

    // Place the group
    let col = startCol;
    for (let i = 0; i < groupText.length; i++) {
      const char = groupText[i];
      if (char === ' ') {
        // Place space
        if (currentRow >= 0 && currentRow < gridRows && col >= 0 && col < gridCols) {
          const spaceCell = newGrid[currentRow]?.[col];
          if (spaceCell) {
            spaceCell.letter = null;
            spaceCell.isLetter = false;
            spaceCell.isPreFilled = false;
            spaceCell.isSpace = true;
            spaceCell.isUnused = false;
          }
        }
      } else {
        // Place letter
        if (currentRow >= 0 && currentRow < gridRows && col >= 0 && col < gridCols && char) {
          const cell = newGrid[currentRow]?.[col];
          if (cell) {
            cell.letter = char;
            cell.isLetter = true;
            cell.isPreFilled = false;
            cell.isSpace = false;
            cell.isUnused = false;
          }
        }
      }
      col++;
    }

    currentRow++;
  }

  return newGrid;
};

// Group words for better balance and visual appeal
const groupWordsForBalance = (words: string[]): string[][] => {
  const groups: string[][] = [];

  if (words.length === 0) return groups;

  // General algorithm for other phrases
  let currentGroup: string[] = [];
  let currentLength = 0;
  const maxGroupLength = 8; // Target width

  for (const word of words) {
    const wordWithSpace = currentLength > 0 ? word.length + 1 : word.length;

    // If adding this word would exceed the max length, start a new group
    if (currentLength + wordWithSpace > maxGroupLength && currentGroup.length > 0) {
      groups.push([...currentGroup]);
      currentGroup = [word];
      currentLength = word.length;
    } else {
      currentGroup.push(word);
      currentLength += wordWithSpace;
    }
  }

  // Add the last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

// Trim the board to remove excess empty space and center based on phrase bounds following lettered.md algorithm
export const trimBoard = (grid: GridCell[][]): GridCell[][] => {
  if (grid.length === 0) return grid;

  const gridHeight = grid.length;
  const gridWidth = grid[0]?.length || 0;

  console.log('gridWidth', gridWidth);
  console.log('gridHeight', gridHeight);

  // Special trimming rule: if first column has letters, width is 9, and last column is empty, trim the last column
  let effectiveGridWidth = gridWidth;
  if (gridWidth === 9) {
    // Check if first column (index 0) has any letter spots
    const firstColumnHasLetters = grid.some((row) => {
      const cell = row[0];
      return cell && !cell.isUnused && !cell.isSpace && cell.letter;
    });

    // Check if last column (index 8) has no letters
    const lastColumnHasLetters = grid.some((row) => {
      const cell = row[8];
      return cell && !cell.isUnused && !cell.isSpace && cell.letter;
    });

    // If first column has letters and last column is empty, trim the last column
    if (firstColumnHasLetters && !lastColumnHasLetters) {
      effectiveGridWidth = 8;
      console.log('🎯 Special trimming rule applied: trimming last column (width 9->8)');
    }
  }

  // Find the bounds of non-unused cells (the phrase) within the effective width
  let minRow = gridHeight;
  let maxRow = -1;
  let minCol = effectiveGridWidth;
  let maxCol = -1;

  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < effectiveGridWidth; col++) {
      const cell = grid[row]?.[col];
      if (cell && !cell.isUnused && !cell.isSpace && cell.letter) {
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        minCol = Math.min(minCol, col);
        maxCol = Math.max(maxCol, col);
      }
    }
  }

  // If no letters found, return original grid
  if (minRow === gridHeight || maxRow === -1) {
    console.log('No letters found for trimming, returning original grid');
    return grid;
  }

  // Calculate the dimensions of the phrase area
  const phraseHeight = maxRow - minRow + 1;
  const phraseWidth = maxCol - minCol + 1;
  const letterCount = phraseHeight * phraseWidth;

  console.log(
    `Trimming: Phrase bounds [${minRow},${minCol}] to [${maxRow},${maxCol}] (${phraseHeight}x${phraseWidth}, ${letterCount} letters)`
  );

  // Create a more balanced layout by extracting the phrase content and repositioning it
  const phraseContent = extractPhraseContent(grid, minRow, maxRow, minCol, maxCol);

  // Create a balanced layout
  const balancedGrid = createBalancedLayout(phraseContent, gridHeight, gridWidth);

  console.log(`Trimmed result: ${balancedGrid.length}x${balancedGrid[0]?.length || 0}`);

  return balancedGrid;
};

// Extract the phrase content from the grid
const extractPhraseContent = (
  grid: GridCell[][],
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number
): GridCell[][] => {
  const content: GridCell[][] = [];

  for (let row = minRow; row <= maxRow; row++) {
    const contentRow: GridCell[] = [];
    for (let col = minCol; col <= maxCol; col++) {
      const cell = grid[row]?.[col];
      if (cell) {
        contentRow.push({ ...cell });
      }
    }
    if (contentRow.length > 0) {
      content.push(contentRow);
    }
  }

  return content;
};

// Create a balanced layout with proper centering and padding
const createBalancedLayout = (
  phraseContent: GridCell[][],
  maxHeight: number,
  maxWidth: number
): GridCell[][] => {
  // Determine optimal target dimensions - no vertical padding, only horizontal centering
  const contentHeight = phraseContent.length;
  const contentWidth = phraseContent[0]?.length || 0;

  // Use exact content height (no vertical padding)
  let targetHeight = contentHeight;
  let targetWidth: number;

  // Determine target width based on content width
  if (contentWidth <= 6) {
    targetWidth = 8;
    // If the width is odd, we can add 1 to the width
    if (contentWidth % 2 === 1) {
      targetWidth++;
    }
  } else if (contentWidth <= 7) {
    targetWidth = Math.min(9, Math.max(8, contentWidth + 2));
  } else {
    targetWidth = Math.max(8, contentWidth);
  }

  // Ensure dimensions don't exceed grid bounds
  targetHeight = Math.min(targetHeight, maxHeight);
  targetWidth = Math.min(targetWidth, maxWidth);

  console.log(
    `Balanced Layout: Content ${contentHeight}x${contentWidth} -> Target ${targetHeight}x${targetWidth}`
  );

  // Create the target grid
  const balancedGrid: GridCell[][] = [];
  for (let row = 0; row < targetHeight; row++) {
    const gridRow: GridCell[] = [];
    for (let col = 0; col < targetWidth; col++) {
      gridRow.push({
        letter: null,
        isLetter: false,
        isPreFilled: false,
        isSpace: false,
        isUnused: true,
      });
    }
    balancedGrid.push(gridRow);
  }

  // No vertical centering (startRow = 0), only horizontal centering
  const startRow = 0;
  const startCol = Math.max(0, Math.floor((targetWidth - contentWidth) / 2));

  console.log(
    `Centering: Content ${contentHeight}x${contentWidth} placed at [${startRow},${startCol}] in ${targetHeight}x${targetWidth} grid`
  );

  // Copy content to the centered position
  for (let row = 0; row < contentHeight; row++) {
    for (let col = 0; col < contentWidth; col++) {
      const sourceCell = phraseContent[row]?.[col];
      const targetCell = balancedGrid[startRow + row]?.[startCol + col];

      if (sourceCell && targetCell) {
        targetCell.letter = sourceCell.letter;
        targetCell.isLetter = sourceCell.isLetter;
        targetCell.isPreFilled = sourceCell.isPreFilled;
        targetCell.isSpace = sourceCell.isSpace;
        targetCell.isUnused = sourceCell.isUnused;
      }
    }
  }

  return balancedGrid;
};

// Generate letter pieces using the new algorithm from lettered.md
export const generateLetterPieces = (
  grid: GridCell[][],
  seed?: number
): { pieces: LetterPiece[]; solution: Record<string, GridPosition> } => {
  // Create intermediate grid with skipped tracking for piece generation
  const generationGrid: GenerationGridCell[][] = grid.map((row) =>
    row.map((cell) => ({ ...cell, isSkipped: false }))
  );
  // Get all available letters (non-pre-filled) with their grid positions
  const availableLetters: Array<{ letter: string; position: GridPosition }> = [];
  const preFilledLetters: string[] = [];

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row]!.length; col++) {
      const cell = grid[row]?.[col];
      if (cell?.letter && !cell.isUnused && !cell.isSpace) {
        if (cell.isPreFilled) {
          preFilledLetters.push(cell.letter);
        } else {
          availableLetters.push({
            letter: cell.letter,
            position: { row, col },
          });
        }
      }
    }
  }

  if (availableLetters.length === 0) {
    return { pieces: [], solution: {} };
  }

  // Use the new algorithm from lettered.md
  const skippedLetters: Array<{ letter: string; position: GridPosition }> = [];
  const { pieces, solution } = generatePiecesWithNewAlgorithm(
    availableLetters,
    generationGrid,
    seed,
    skippedLetters
  );
  return { pieces, solution };
};

// Enhanced seeded random number generator with better entropy
const seededRandom = (seed: number) => {
  let x = Math.sin(seed) * 10000;
  let y = Math.cos(seed + 1) * 10000;
  let z = Math.tan(seed + 2) * 10000;

  return () => {
    // Use multiple mathematical operations for better randomness
    x = Math.sin(x + y) * 10000;
    y = Math.cos(y + z) * 10000;
    z = Math.tan(z + x) * 10000;

    // Combine multiple sources of entropy
    const combined = x - Math.floor(x) + (y - Math.floor(y)) + (z - Math.floor(z));
    return combined / 3 - Math.floor(combined / 3);
  };
};

// Enhanced shuffle with multiple randomization passes
const shuffleArray = <T>(array: T[], random: () => number): void => {
  // Multiple shuffle passes for better randomization
  for (let pass = 0; pass < 3; pass++) {
    // Fisher-Yates shuffle algorithm with seeded random
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const temp = array[i];
      array[i] = array[j]!;
      array[j] = temp!;
    }
  }
};

// Generate pieces using the new scanner algorithm from lettered.md
const generatePiecesWithNewAlgorithm = (
  availableLetters: Array<{ letter: string; position: GridPosition }>,
  grid: GenerationGridCell[][],
  seed?: number,
  skippedLetters?: Array<{ letter: string; position: GridPosition }>
): { pieces: LetterPiece[]; solution: Record<string, GridPosition> } => {
  console.log(`🔢 New Scanner Algorithm: Total available letters: ${availableLetters.length}`);
  console.log(
    `📝 Available letters: ${availableLetters.map((l) => `${l.letter}(${l.position.row},${l.position.col})`).join(', ')}`
  );

  // Initialize seeded random generator
  const random = seed ? seededRandom(seed) : Math.random;

  // Initialize color assigner to ensure unique colors
  const colorAssigner = new ColorAssigner(random);

  const usedLetters = new Set<string>();
  const pieces: LetterPiece[] = [];
  const solution: Record<string, GridPosition> = {};

  // Continue until all letters are used
  while (usedLetters.size < availableLetters.length) {
    console.log(
      `🔄 Piece generation round: ${usedLetters.size}/${availableLetters.length} letters used, ${pieces.length} pieces created`
    );

    // Step 1: Pick a random number 2-6 for piece size with some variation
    const baseSize = Math.floor(random() * 5) + 2; // 2-6
    const sizeVariation = Math.floor(random() * 3) - 1; // -1, 0, or 1
    const pieceSize = Math.max(2, Math.min(6, baseSize + sizeVariation)); // Keep within 2-6 range
    console.log(
      `🎯 Starting new piece with target size: ${pieceSize} (base: ${baseSize}, variation: ${sizeVariation})`
    );

    // Step 2: Find next available letter using scanner from top-left
    const startingLetter = findNextAvailableLetterWithScanner(
      availableLetters,
      usedLetters,
      random
    );
    if (!startingLetter) {
      console.log(`⏹️ No more available letters found. Stopping generation.`);
      break;
    }

    console.log(
      `🎯 Starting piece with letter: ${startingLetter.letter} at (${startingLetter.position.row},${startingLetter.position.col})`
    );

    // Step 3-7: Build piece by randomly selecting adjacent letters
    const result = buildPieceWithRandomDirections(
      startingLetter,
      availableLetters,
      usedLetters,
      random,
      colorAssigner
    );
    if (result && result.piece.letters.length >= 1) {
      pieces.push(result.piece);
      solution[result.piece.id] = result.gridPosition;
      console.log(
        `✅ Generated piece ${pieces.length}: "${result.piece.letters.join('')}" (${result.piece.letters.length} letters) at position (${result.gridPosition.row},${result.gridPosition.col})`
      );
    } else {
      // Mark starting letter as used so scanner won't retry it
      const startKey = `${startingLetter.position.row},${startingLetter.position.col}`;
      usedLetters.add(startKey);
      console.log('startingLetter', startingLetter, startKey);

      // Add starting letter to skipped letters list for later processing
      if (skippedLetters) {
        skippedLetters.push({
          letter: startingLetter.letter,
          position: startingLetter.position,
        });
      }

      // Mark starting letter as skipped so scanner won't retry it, but stranded cleanup can still find it
      const startCell = grid[startingLetter.position.row]?.[startingLetter.position.col];
      if (startCell) {
        startCell.isSkipped = true;
      }
      console.log(
        `❌ Piece generation failed, adding starting letter to skipped list - will be handled by stranded cleanup`
      );
    }
  }

  console.log('skippedLetters', skippedLetters);

  // Remove any skipped letters from the used letters set
  for (const skippedLetter of skippedLetters ?? []) {
    const key = `${skippedLetter.position.row},${skippedLetter.position.col}`;
    usedLetters.delete(key);
  }

  // Step 11a: Try to generate pieces from skipped letters
  if (skippedLetters && skippedLetters.length > 0) {
    console.log(`🔄 Attempting to generate pieces from ${skippedLetters.length} skipped letters`);
    handleSkippedLetters(
      pieces,
      solution,
      skippedLetters,
      availableLetters,
      usedLetters,
      random,
      colorAssigner
    );
  }

  // Step 11b: Handle any remaining stranded pieces
  handleStrandedPieces(pieces, solution, grid, usedLetters, random, colorAssigner);

  console.log(
    `🏁 New algorithm complete: ${pieces.length} pieces generated, ${usedLetters.size}/${availableLetters.length} letters used, ${skippedLetters?.length || 0} skipped letters collected`
  );

  // Validate that all letters were used
  if (usedLetters.size !== availableLetters.length) {
    console.log(`⚠️ Letter count mismatch: used ${usedLetters.size}/${availableLetters.length}`);
  }

  // Shuffle the pieces using the same seeded RNG for reproducibility
  if (seed !== undefined) {
    const random = seededRandom(seed + 12345); // Use a different seed offset for shuffling
    shuffleArray(pieces, random);
    console.log(`🔀 Shuffled ${pieces.length} pieces for better randomization`);
  }

  return { pieces, solution };
};

// Find next available letter using scanner from top-left (Step 2)
const findNextAvailableLetterWithScanner = (
  availableLetters: Array<{ letter: string; position: GridPosition }>,
  usedLetters: Set<string>,
  random?: () => number
): { letter: string; position: GridPosition } | null => {
  console.log(`🔍 Scanner: Finding next available letter`);

  // Filter available letters that haven't been used yet
  const unusedAvailableLetters = availableLetters.filter((letter) => {
    const key = `${letter.position.row},${letter.position.col}`;
    return !usedLetters.has(key);
  });

  if (unusedAvailableLetters.length === 0) {
    console.log(`❌ Scanner found no available letters`);
    return null;
  }

  // Pick a random available letter for more randomness
  const randomIndex = random ? Math.floor(random() * unusedAvailableLetters.length) : 0;
  const selectedLetter = unusedAvailableLetters[randomIndex];

  console.log(
    `✅ Scanner found ${unusedAvailableLetters.length} available letters, picked: ${selectedLetter!.letter} at (${selectedLetter!.position.row},${selectedLetter!.position.col})`
  );
  return selectedLetter!;
};

// Build piece by randomly selecting adjacent directions (Steps 3-7)
const buildPieceWithRandomDirections = (
  startingLetter: { letter: string; position: GridPosition },
  availableLetters: Array<{ letter: string; position: GridPosition }>,
  usedLetters: Set<string>,
  random: () => number,
  colorAssigner: ColorAssigner
): { piece: LetterPiece; gridPosition: GridPosition } | null => {
  const pieceLetters: string[] = [];
  const piecePositions: GridPosition[] = [];
  let currentPos = startingLetter.position;

  // Step 3: Mark starting letter as used
  const startKey = `${startingLetter.position.row},${startingLetter.position.col}`;
  usedLetters.add(startKey);
  pieceLetters.push(startingLetter.letter);
  piecePositions.push(startingLetter.position);

  console.log(`📝 Started piece with: "${pieceLetters.join('')}"`);

  // Step 5-7: Keep adding letters until no more adjacent letters are available
  while (true) {
    // Find all valid adjacent letters (up, down, left, right)
    const adjacentLetters = findAdjacentLetters(currentPos, availableLetters, usedLetters);

    if (adjacentLetters.length === 0) {
      console.log(`🛑 No adjacent letters available from (${currentPos.row},${currentPos.col})`);
      break;
    }

    // Check if we've reached the maximum piece size (5 letters)
    if (pieceLetters.length >= 5) {
      console.log(`📏 Reached maximum piece size (5 letters): "${pieceLetters.join('')}"`);
      break;
    }

    // Step 5: Pick random direction
    const randomIndex = Math.floor(random() * adjacentLetters.length);
    const selectedLetter = adjacentLetters[randomIndex];

    if (!selectedLetter) {
      console.log(`❌ No valid adjacent letter found`);
      break;
    }

    console.log(
      `➡️ Adding ${selectedLetter.letter} at (${selectedLetter.position.row},${selectedLetter.position.col})`
    );

    // Step 6: Add to piece and mark as used
    const newKey = `${selectedLetter.position.row},${selectedLetter.position.col}`;
    usedLetters.add(newKey);
    pieceLetters.push(selectedLetter.letter);
    piecePositions.push(selectedLetter.position);
    currentPos = selectedLetter.position;

    console.log(`📝 Piece now: "${pieceLetters.join('')}" (${pieceLetters.length} letters)`);
  }

  // Step 9: Validate minimum size
  if (pieceLetters.length < 2) {
    console.log(`❌ Piece too small (${pieceLetters.length} letters), discarding`);
    // Undo changes
    for (const pos of piecePositions) {
      usedLetters.delete(`${pos.row},${pos.col}`);
    }
    return null;
  }

  // Step 10: Validate connectivity (sides only, not corners)
  if (!isPieceConnected(piecePositions)) {
    console.log(`❌ Piece not properly connected: "${pieceLetters.join('')}". Undoing changes.`);
    // Undo changes
    for (const pos of piecePositions) {
      usedLetters.delete(`${pos.row},${pos.col}`);
    }
    return null;
  }

  // Create normalized shape
  const minRow = Math.min(...piecePositions.map((p) => p.row));
  const minCol = Math.min(...piecePositions.map((p) => p.col));
  const shape = piecePositions.map((pos) => ({
    row: pos.row - minRow,
    col: pos.col - minCol,
  }));

  const finalPiece = {
    id: `piece-${Date.now()}-${random().toString(36).substr(2, 9)}`,
    letters: pieceLetters,
    shape,
    color: colorAssigner.getNextColor(),
  };

  // Track the grid position (anchor point) where this piece was generated
  const gridPosition: GridPosition = { row: minRow, col: minCol };

  console.log(
    `✅ Created piece: "${pieceLetters.join('')}" with shape ${shape.map((s) => `(${s.row},${s.col})`).join(' ')} at grid position (${gridPosition.row},${gridPosition.col})`
  );

  return { piece: finalPiece, gridPosition };
};

// Find adjacent letters in 4 directions (up, down, left, right)
const findAdjacentLetters = (
  currentPos: GridPosition,
  availableLetters: Array<{ letter: string; position: GridPosition }>,
  usedLetters: Set<string>
): Array<{ letter: string; position: GridPosition }> => {
  const adjacent: Array<{ letter: string; position: GridPosition }> = [];
  const directions = [
    { row: -1, col: 0, name: 'up' }, // up
    { row: 0, col: 1, name: 'right' }, // right
    { row: 1, col: 0, name: 'down' }, // down
    { row: 0, col: -1, name: 'left' }, // left
  ];

  for (const direction of directions) {
    const nextPos = {
      row: currentPos.row + direction.row,
      col: currentPos.col + direction.col,
    };

    const nextKey = `${nextPos.row},${nextPos.col}`;

    // Skip if already used
    if (usedLetters.has(nextKey)) continue;

    // Check if this position is in the available letters list
    const availableLetter = availableLetters.find(
      (letter) => letter.position.row === nextPos.row && letter.position.col === nextPos.col
    );

    if (availableLetter) {
      adjacent.push({
        letter: availableLetter.letter,
        position: nextPos,
      });
    }
  }

  return adjacent;
};

// Handle skipped letters by attempting to generate smaller pieces from them
const handleSkippedLetters = (
  pieces: LetterPiece[],
  solution: Record<string, GridPosition>,
  skippedLetters: Array<{ letter: string; position: GridPosition }>,
  availableLetters: Array<{ letter: string; position: GridPosition }>,
  usedLetters: Set<string>,
  random: () => number,
  colorAssigner: ColorAssigner
): void => {
  console.log(`🔄 Processing ${skippedLetters.length} skipped letters for piece generation`);

  for (const skippedLetter of skippedLetters) {
    const key = `${skippedLetter.position.row},${skippedLetter.position.col}`;

    // Skip if already used
    if (usedLetters.has(key)) {
      console.log(
        `⏭️ Skipped letter ${skippedLetter.letter} at (${skippedLetter.position.row},${skippedLetter.position.col}) already used`
      );
      continue;
    }

    // Try to generate a piece from this skipped letter
    const result = buildPieceWithRandomDirections(
      skippedLetter,
      availableLetters,
      usedLetters,
      random,
      colorAssigner
    );

    if (result && result.piece.letters.length >= 2) {
      pieces.push(result.piece);
      solution[result.piece.id] = result.gridPosition;
      console.log(
        `✅ Generated piece from skipped letter: "${result.piece.letters.join('')}" (${result.piece.letters.length} letters) at position (${result.gridPosition.row},${result.gridPosition.col})`
      );
    } else {
      console.log(
        `❌ Failed to generate piece from skipped letter ${skippedLetter.letter} at (${skippedLetter.position.row},${skippedLetter.position.col})`
      );
    }
  }

  console.log(`✅ Skipped letters processing complete: ${pieces.length} total pieces now`);
};

// Handle stranded pieces by connecting them to nearest piece (Step 11)
const handleStrandedPieces = (
  pieces: LetterPiece[],
  solution: Record<string, GridPosition>,
  grid: GenerationGridCell[][],
  usedLetters: Set<string>,
  random: () => number,
  colorAssigner: ColorAssigner
): void => {
  // Find all stranded letters: unused cells that have letters and aren't pre-filled
  const strandedLetters: Array<{ letter: string; position: GridPosition }> = [];

  // Create a mapping of positions to pieces for faster lookup
  const positionToPiece = new Map<string, LetterPiece>();

  console.log(`🔧 Building position mapping for ${pieces.length} pieces:`);
  for (const piece of pieces) {
    console.log(`  Piece: ${piece.letters.join('')} (${piece.shape.length} positions)`);
  }

  // Reconstruct piece positions by finding the correct offset for each piece
  for (const piece of pieces) {
    let pieceMapped = false;

    // Try to find the correct offset by checking each used position as a potential anchor
    for (const usedKey of usedLetters) {
      if (pieceMapped) break; // Already found the correct mapping for this piece

      const parts = usedKey.split(',');
      const usedRow = parseInt(parts[0]!);
      const usedCol = parseInt(parts[1]!);

      // Try each shape position as a potential anchor point
      for (let shapeIndex = 0; shapeIndex < piece.shape.length; shapeIndex++) {
        if (pieceMapped) break;

        const anchorShape = piece.shape[shapeIndex];
        if (!anchorShape) continue;

        // Calculate the grid offset for this piece
        const offsetRow = usedRow - anchorShape.row;
        const offsetCol = usedCol - anchorShape.col;

        // Check if all positions in this piece match with this offset
        let allPositionsMatch = true;
        for (const shapePos of piece.shape) {
          const expectedRow = offsetRow + shapePos.row;
          const expectedCol = offsetCol + shapePos.col;
          const expectedKey = `${expectedRow},${expectedCol}`;

          if (!usedLetters.has(expectedKey)) {
            allPositionsMatch = false;
            break;
          }
        }

        if (allPositionsMatch) {
          // Verify this piece doesn't conflict with already mapped positions
          let hasConflict = false;
          for (const shapePos of piece.shape) {
            const gridRow = offsetRow + shapePos.row;
            const gridCol = offsetCol + shapePos.col;
            const gridKey = `${gridRow},${gridCol}`;

            if (positionToPiece.has(gridKey)) {
              hasConflict = true;
              break;
            }
          }

          if (!hasConflict) {
            // This offset works and doesn't conflict - record all its positions
            console.log(
              `  ✅ Mapped ${piece.letters.join('')} at offset (${offsetRow},${offsetCol})`
            );
            for (const shapePos of piece.shape) {
              const gridRow = offsetRow + shapePos.row;
              const gridCol = offsetCol + shapePos.col;
              const gridKey = `${gridRow},${gridCol}`;
              positionToPiece.set(gridKey, piece);
            }
            pieceMapped = true;
            break;
          }
        }
      }
    }

    if (!pieceMapped) {
      console.log(
        `  ❌ Could not map ${piece.letters.join('')} - no valid non-conflicting position found`
      );
    }
  }

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row]!.length; col++) {
      const cell = grid[row]?.[col];
      if (cell?.isSkipped) {
        console.log('cell', cell);
        const key = `${row},${col}`;
        console.log('key', key);
        console.log('usedLetters', usedLetters);
        if (!usedLetters.has(key)) {
          strandedLetters.push({
            letter: cell.letter!,
            position: { row, col },
          });
        }
      }
    }
  }

  if (strandedLetters.length === 0) {
    console.log(`✅ No stranded pieces to handle`);
    return;
  }

  console.log(`🔄 Handling ${strandedLetters.length} stranded pieces`);

  // Debug: Show position mapping summary
  const pieceCounts = new Map<string, number>();
  for (const [, piece] of positionToPiece) {
    const pieceName = piece.letters.join('');
    pieceCounts.set(pieceName, (pieceCounts.get(pieceName) || 0) + 1);
  }

  console.log(`📊 Mapping summary:`);
  for (const [pieceName, count] of pieceCounts) {
    console.log(`  ${pieceName}: ${count} positions`);
  }

  console.log(`📍 Full position to piece mapping:`);
  for (const [pos, piece] of positionToPiece) {
    console.log(`  ${pos} -> ${piece.letters.join('')}`);
  }

  for (const strandedLetter of strandedLetters) {
    console.log(
      `🔍 Processing stranded ${strandedLetter.letter} at (${strandedLetter.position.row},${strandedLetter.position.col})`
    );

    // First, check for direct neighbors (up, down, left, right)
    let adjacentPiece: LetterPiece | null = null;
    const directions = [
      { row: -1, col: 0, name: 'up' }, // up
      { row: 1, col: 0, name: 'down' }, // down
      { row: 0, col: -1, name: 'left' }, // left
      { row: 0, col: 1, name: 'right' }, // right
    ];

    for (const direction of directions) {
      const neighborPos = {
        row: strandedLetter.position.row + direction.row,
        col: strandedLetter.position.col + direction.col,
      };

      console.log(`  Checking ${direction.name}: (${neighborPos.row},${neighborPos.col})`);

      // Check bounds
      if (
        neighborPos.row < 0 ||
        neighborPos.row >= grid.length ||
        neighborPos.col < 0 ||
        neighborPos.col >= grid[0]!.length
      ) {
        console.log(`    ❌ Out of bounds`);
        continue;
      }

      // Check if this neighbor position is used by any piece
      const neighborKey = `${neighborPos.row},${neighborPos.col}`;
      if (usedLetters.has(neighborKey)) {
        console.log(`    ✅ Position (${neighborPos.row},${neighborPos.col}) is used`);
        // Use our position-to-piece mapping to find which piece contains this neighbor
        const neighborPiece = positionToPiece.get(neighborKey);
        console.log(`    🔍 Neighbor piece: ${neighborPiece?.letters.join('') || 'null'}`);
        if (neighborPiece && neighborPiece.letters.length < 6) {
          adjacentPiece = neighborPiece;
          console.log(`    🎯 Found valid adjacent piece: ${neighborPiece.letters.join('')}`);
          break;
        } else if (neighborPiece) {
          console.log(
            `    ❌ Piece ${neighborPiece.letters.join('')} is full (${neighborPiece.letters.length}/6)`
          );
        }
      } else {
        console.log(`    ❌ Position (${neighborPos.row},${neighborPos.col}) is not used`);
      }
    }

    if (!adjacentPiece) {
      console.log(`  ❌ No valid adjacent pieces found for ${strandedLetter.letter}`);
    }

    // Only connect to direct neighbors - no fallback to nearest piece

    if (adjacentPiece && adjacentPiece.letters.length < 6) {
      console.log(
        `🔗 Connecting stranded ${strandedLetter.letter} to piece "${adjacentPiece.letters.join('')}"`
      );

      // Find the correct offset for the adjacent piece by using the position-to-piece mapping
      let pieceOffsetRow = 0;
      let pieceOffsetCol = 0;
      let foundOffset = false;

      // Find one position that belongs to the adjacent piece
      for (const [posKey, piece] of positionToPiece) {
        if (piece === adjacentPiece) {
          const parts = posKey.split(',');
          const rowStr = parts[0];
          const colStr = parts[1];
          if (!rowStr || !colStr) continue;
          const row = parseInt(rowStr);
          const col = parseInt(colStr);

          // Find which shape position corresponds to this grid position
          for (const shapePos of adjacentPiece.shape) {
            const testOffsetRow = row - shapePos.row;
            const testOffsetCol = col - shapePos.col;

            // Verify this offset works for all positions of the piece
            let offsetValid = true;
            for (const testShapePos of adjacentPiece.shape) {
              const expectedRow = testOffsetRow + testShapePos.row;
              const expectedCol = testOffsetCol + testShapePos.col;
              const expectedKey = `${expectedRow},${expectedCol}`;

              if (positionToPiece.get(expectedKey) !== adjacentPiece) {
                offsetValid = false;
                break;
              }
            }

            if (offsetValid) {
              pieceOffsetRow = testOffsetRow;
              pieceOffsetCol = testOffsetCol;
              foundOffset = true;
              break;
            }
          }

          if (foundOffset) break;
        }
      }

      if (!foundOffset) {
        console.log(`❌ Could not find valid offset for piece ${adjacentPiece.letters.join('')}`);
      } else {
        // Calculate the relative position of the stranded letter
        const relativeRow = strandedLetter.position.row - pieceOffsetRow;
        const relativeCol = strandedLetter.position.col - pieceOffsetCol;

        console.log(`📍 Piece offset: (${pieceOffsetRow},${pieceOffsetCol})`);
        console.log(`📍 Stranded letter relative position: (${relativeRow},${relativeCol})`);

        // Add the stranded letter to the piece
        adjacentPiece.letters.push(strandedLetter.letter);
        adjacentPiece.shape.push({ row: relativeRow, col: relativeCol });

        // Re-normalize the shape to ensure min row/col are 0
        const minRow = Math.min(...adjacentPiece.shape.map((pos) => pos.row));
        const minCol = Math.min(...adjacentPiece.shape.map((pos) => pos.col));
        adjacentPiece.shape = adjacentPiece.shape.map((pos) => ({
          row: pos.row - minRow,
          col: pos.col - minCol,
        }));

        // Update the solution position to reflect the new anchor point after normalization
        const oldSolutionPos = solution[adjacentPiece.id];
        if (oldSolutionPos) {
          solution[adjacentPiece.id] = {
            row: pieceOffsetRow + minRow,
            col: pieceOffsetCol + minCol,
          };
          console.log(
            `🔄 Updated solution position from (${oldSolutionPos.row},${oldSolutionPos.col}) to (${solution[adjacentPiece.id]!.row},${solution[adjacentPiece.id]!.col})`
          );
        }

        // Update the used letters set
        usedLetters.add(`${strandedLetter.position.row},${strandedLetter.position.col}`);

        // Update the position-to-piece mapping
        positionToPiece.set(
          `${strandedLetter.position.row},${strandedLetter.position.col}`,
          adjacentPiece
        );

        console.log(
          `✅ Successfully added ${strandedLetter.letter} to piece "${adjacentPiece.letters.join('')}"`
        );
        console.log(
          `📍 Final shape: ${adjacentPiece.shape.map((pos) => `(${pos.row},${pos.col})`).join(' ')}`
        );
      }
    } else {
      // Create new piece if no suitable piece found
      console.log(`⚠️ Creating new piece for stranded letter ${strandedLetter.letter}`);
      const singlePiece = {
        id: `piece-${Date.now()}-${random().toString(36).substr(2, 9)}`,
        letters: [strandedLetter.letter],
        shape: [{ row: 0, col: 0 }],
        color: colorAssigner.getNextColor(),
      };
      pieces.push(singlePiece);
      solution[singlePiece.id] = strandedLetter.position;
      usedLetters.add(`${strandedLetter.position.row},${strandedLetter.position.col}`);
      positionToPiece.set(
        `${strandedLetter.position.row},${strandedLetter.position.col}`,
        singlePiece
      );

      console.log(
        `📍 Added new single piece: ${strandedLetter.position.row},${strandedLetter.position.col} -> ${singlePiece.letters.join('')} to solution`
      );
    }
  }

  console.log(`✅ Stranded pieces handled, final piece count: ${pieces.length}`);
};

// Generate pieces using the exact algorithm from lettered.md
const generatePiecesWithBacktracking = (
  availableLetters: Array<{ letter: string; position: GridPosition }>,
  phrase: string
): LetterPiece[] => {
  const totalLetters = availableLetters.length;
  console.log(`🔢 Piece Generation Debug: Total available letters: ${totalLetters}`);
  console.log(
    `📝 Available letters: ${availableLetters.map((l) => `${l.letter}(${l.position.row},${l.position.col})`).join(', ')}`
  );

  // Determine number of pieces based on algorithm from lettered.md:
  // "For example, for 'PEANUT BUTTER IS GOOD' we can choose 4 pieces that are 2-5 letters long each.
  // This is decided by taking the (number of letters - count of anchor letters) and dividing it by 3 for puzzles less than 24 letters,
  // 4 for puzzles between 24 and 28 letters, and 5 for puzzles longer than 28 letters."
  let targetPieceCount: number;
  if (totalLetters < 24) {
    targetPieceCount = Math.floor(totalLetters / 3);
  } else if (totalLetters <= 28) {
    targetPieceCount = Math.floor(totalLetters / 4);
  } else {
    targetPieceCount = Math.floor(totalLetters / 5);
  }

  console.log(
    `🎯 Target piece count determined: ${targetPieceCount} (using divisor ${totalLetters < 24 ? 3 : totalLetters <= 28 ? 4 : 5})`
  );

  // Start with calculated count but if generation fails, reduce count
  const targetPieceCounts = [targetPieceCount];
  if (targetPieceCount > 3) targetPieceCounts.push(targetPieceCount - 1);
  if (targetPieceCount > 4) targetPieceCounts.push(targetPieceCount - 2);
  targetPieceCounts.push(3); // minimum fallback

  console.log(`📊 Piece count options to try: ${targetPieceCounts.join(', ')}`);

  for (const pieceCount of targetPieceCounts) {
    console.log(`🔄 Attempting to generate ${pieceCount} pieces...`);
    const result = generatePiecesWithExactAlgorithm(availableLetters, pieceCount, phrase);
    if (result) {
      console.log(`✅ Successfully generated ${pieceCount} pieces with backtracking algorithm`);
      return result;
    } else {
      console.log(`❌ Failed to generate ${pieceCount} pieces, trying next count...`);
    }
  }

  // Ultimate fallback
  console.log(`🔄 All piece count attempts failed, using fallback algorithm...`);
  return createFallbackPieces(availableLetters);
};

// Generate pieces using the exact algorithm from lettered.md
const generatePiecesWithExactAlgorithm = (
  availableLetters: Array<{ letter: string; position: GridPosition }>,
  targetPieceCount: number,
  phrase: string
): LetterPiece[] | null => {
  console.log(
    `🔍 Backtracking Algorithm Debug: Starting with target piece count: ${targetPieceCount}`
  );

  // Algorithm from lettered.md:
  // - From there, start the generation of the letter pieces also using a backtracking algorithm.
  // - This is a recursive backtracking algorithm
  // - Choose the specifications of the pieces before starting the algorithm.
  // - For example, for "PEANUT BUTTER IS GOOD" we can choose 4 pieces that are 2-5 letters long each.

  // Create a copy of the filled out board layout for tracking
  const gridCopy = availableLetters.map((letter) => ({ ...letter }));
  const usedLetters = new Set<string>();

  const pieces: LetterPiece[] = [];
  let totalLettersUsed = 0;
  let pieceGenerationAttempts = 0;

  console.log(
    `📋 Initial state: ${availableLetters.length} letters available, ${usedLetters.size} used`
  );

  // Continue until all letters are used
  while (totalLettersUsed < availableLetters.length) {
    console.log(
      `🔄 Piece generation round ${pieceGenerationAttempts + 1}: ${totalLettersUsed}/${availableLetters.length} letters used, ${pieces.length}/${targetPieceCount} pieces created`
    );

    // Find next available letter by starting at 0,0 and moving towards the right
    const startingLetter = findNextAvailableLetterForPiece(gridCopy, usedLetters);

    if (!startingLetter) {
      console.log(`⏹️ No more available letters found. Stopping generation.`);
      break;
    }

    console.log(
      `🎯 Starting new piece with letter: ${startingLetter.letter} at (${startingLetter.position.row},${startingLetter.position.col})`
    );

    // Generate piece using the backtracking algorithm from lettered.md
    const piece = generateSinglePieceWithBacktracking(startingLetter, gridCopy, usedLetters, 9, 9);

    if (!piece || piece.letters.length < 2) {
      console.log(
        `❌ Piece generation failed or piece too small (${piece?.letters.length || 0} letters). Skipping starting letter - will be handled by stranded cleanup.`
      );
      pieceGenerationAttempts++;
      continue;
    }

    pieces.push(piece);
    totalLettersUsed += piece.letters.length;

    console.log(
      `✅ Successfully generated piece ${pieces.length}: "${piece.letters.join('')}" (${piece.letters.length} letters)`
    );
    console.log(
      `📊 Updated state: ${totalLettersUsed}/${availableLetters.length} letters used, ${pieces.length}/${targetPieceCount} pieces created`
    );

    // If we have enough pieces and all letters are used, we're done
    if (pieces.length >= targetPieceCount && totalLettersUsed === availableLetters.length) {
      console.log(
        `🎉 Target reached: ${pieces.length} pieces created, all ${totalLettersUsed} letters used`
      );
      break;
    }

    pieceGenerationAttempts++;
  }

  console.log(
    `🏁 Backtracking complete: ${pieces.length} pieces generated, ${totalLettersUsed}/${availableLetters.length} letters used`
  );

  // Validate final result
  if (totalLettersUsed !== availableLetters.length || pieces.length === 0) {
    console.log(
      `❌ Validation failed: Used ${totalLettersUsed}/${availableLetters.length} letters, created ${pieces.length} pieces`
    );
    return null; // Failed to generate valid solution
  }

  // Check that no piece contains complete words (optional validation)
  if (containsCompleteWords(pieces, phrase)) {
    console.log(`❌ Word validation failed: Some pieces contain complete words from the phrase`);
    return null;
  }

  console.log(`✅ All validations passed. Returning ${pieces.length} valid pieces.`);
  return pieces;
};

// Validate that a piece is connected via sides (not corners)
const isPieceConnected = (positions: GridPosition[]): boolean => {
  if (positions.length <= 1) return true;

  // Use BFS to check connectivity - only allow side connections (up, down, left, right)
  const visited = new Set<string>();
  const startPos = positions[0];
  if (!startPos) return false;
  const queue = [startPos];
  visited.add(`${startPos.row},${startPos.col}`);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Check all 4 side directions (not corners)
    const directions = [
      { row: -1, col: 0 }, // up
      { row: 0, col: 1 }, // right
      { row: 1, col: 0 }, // down
      { row: 0, col: -1 }, // left
    ];

    for (const direction of directions) {
      const nextPos = {
        row: current.row + direction.row,
        col: current.col + direction.col,
      };

      const nextKey = `${nextPos.row},${nextPos.col}`;

      // Check if this position is in our piece and not visited
      if (!visited.has(nextKey)) {
        const found = positions.find((p) => p.row === nextPos.row && p.col === nextPos.col);
        if (found) {
          visited.add(nextKey);
          queue.push(found);
        }
      }
    }
  }

  // Check if all positions were visited (fully connected)
  return visited.size === positions.length;
};

// Find next available letter by scanning from top-left following lettered.md algorithm
const findNextAvailableLetterForPiece = (
  gridCopy: Array<{ letter: string; position: GridPosition }>,
  usedLetters: Set<string>
): { letter: string; position: GridPosition } | null => {
  console.log(
    `🔍 Letter Tracking Debug: Finding next available letter from ${gridCopy.length} total letters, ${usedLetters.size} already used`
  );

  // Scan from top-left to bottom-right as specified in algorithm
  for (const letter of gridCopy) {
    const key = `${letter.position.row},${letter.position.col}`;
    if (!usedLetters.has(key)) {
      console.log(
        `✅ Found available letter: ${letter.letter} at (${letter.position.row},${letter.position.col})`
      );
      return letter;
    } else {
      console.log(
        `⏭️ Letter ${letter.letter} at (${letter.position.row},${letter.position.col}) already used, skipping`
      );
    }
  }

  console.log(`❌ No available letters found`);
  return null;
};

// Generate single piece using the backtracking algorithm from lettered.md
const generateSinglePieceWithBacktracking = (
  startingLetter: { letter: string; position: GridPosition },
  gridCopy: Array<{ letter: string; position: GridPosition }>,
  usedLetters: Set<string>,
  gridRows: number,
  gridCols: number
): LetterPiece | null => {
  console.log(
    `🔧 Individual Piece Debug: Starting piece generation from ${startingLetter.letter} at (${startingLetter.position.row},${startingLetter.position.col})`
  );

  const pieceLetters: string[] = [];
  const piecePositions: GridPosition[] = [];
  const currentPath: GridPosition[] = [];

  // Initialize with starting letter
  pieceLetters.push(startingLetter.letter);
  piecePositions.push(startingLetter.position);
  currentPath.push(startingLetter.position);

  const startKey = `${startingLetter.position.row},${startingLetter.position.col}`;
  usedLetters.add(startKey);

  console.log(
    `📝 Piece state: Started with "${pieceLetters.join('')}" (${pieceLetters.length} letters)`
  );

  // Recursive function to build the piece
  const buildPiece = (currentPos: GridPosition, depth: number = 0): boolean => {
    const indent = '  '.repeat(depth);
    console.log(
      `${indent}🔄 Build step ${depth}: Current piece "${pieceLetters.join('')}" (${pieceLetters.length} letters) at (${currentPos.row},${currentPos.col})`
    );

    // If we've reached 5 letters, this is a valid piece (maximum size)
    if (pieceLetters.length >= 5) {
      console.log(
        `${indent}✅ Maximum size reached: "${pieceLetters.join('')}" (${pieceLetters.length} letters)`
      );
      return true;
    }

    // If we have 2 or more letters and no more valid moves, this is valid
    if (pieceLetters.length >= 2) {
      // Check if there are any valid moves left
      let hasValidMoves = false;
      const directions = [
        { row: -1, col: 0, name: 'up' },
        { row: 0, col: 1, name: 'right' },
        { row: 1, col: 0, name: 'down' },
        { row: 0, col: -1, name: 'left' },
      ];

      for (const direction of directions) {
        const nextPos = {
          row: currentPos.row + direction.row,
          col: currentPos.col + direction.col,
        };

        if (
          nextPos.row < 0 ||
          nextPos.row >= gridRows ||
          nextPos.col < 0 ||
          nextPos.col >= gridCols
        ) {
          continue;
        }

        const nextKey = `${nextPos.row},${nextPos.col}`;
        const nextLetter = gridCopy.find(
          (letter) => letter.position.row === nextPos.row && letter.position.col === nextPos.col
        );

        if (nextLetter && !usedLetters.has(nextKey)) {
          hasValidMoves = true;
          break;
        }
      }

      if (!hasValidMoves) {
        console.log(
          `${indent}✅ No more valid moves, piece complete: "${pieceLetters.join('')}" (${pieceLetters.length} letters)`
        );
        return true;
      }
    }

    // Try directions: up, down, left, right (clockwise)
    const directions = [
      { row: -1, col: 0, name: 'up' }, // up
      { row: 0, col: 1, name: 'right' }, // right
      { row: 1, col: 0, name: 'down' }, // down
      { row: 0, col: -1, name: 'left' }, // left
    ];

    for (const direction of directions) {
      const nextPos = {
        row: currentPos.row + direction.row,
        col: currentPos.col + direction.col,
      };

      console.log(
        `${indent}➡️ Trying direction ${direction.name}: (${nextPos.row},${nextPos.col})`
      );

      // Check bounds (using dynamic grid dimensions)
      if (
        nextPos.row < 0 ||
        nextPos.row >= gridRows ||
        nextPos.col < 0 ||
        nextPos.col >= gridCols
      ) {
        console.log(`${indent}🚫 Out of bounds`);
        continue;
      }

      const nextKey = `${nextPos.row},${nextPos.col}`;
      const nextLetter = gridCopy.find(
        (letter) => letter.position.row === nextPos.row && letter.position.col === nextPos.col
      );

      // Check if position has a letter and is not used
      if (!nextLetter) {
        console.log(`${indent}🚫 No letter at this position`);
        continue;
      }

      if (usedLetters.has(nextKey)) {
        console.log(`${indent}🚫 Letter already used: ${nextLetter.letter}`);
        continue;
      }

      console.log(`${indent}✅ Adding letter ${nextLetter.letter} to piece`);

      // Add to current path
      currentPath.push(nextPos);
      pieceLetters.push(nextLetter.letter);
      piecePositions.push(nextPos);
      usedLetters.add(nextKey);

      console.log(
        `${indent}📝 Piece now: "${pieceLetters.join('')}" (${pieceLetters.length} letters)`
      );

      // Recursively continue building
      if (buildPiece(nextPos, depth + 1)) {
        return true;
      }

      // Backtrack
      console.log(`${indent}⬅️ Backtracking from ${nextLetter.letter}, removing from piece`);
      currentPath.pop();
      pieceLetters.pop();
      piecePositions.pop();
      usedLetters.delete(nextKey);

      console.log(
        `${indent}📝 After backtrack: "${pieceLetters.join('')}" (${pieceLetters.length} letters)`
      );
    }

    // Check if we have a valid piece size
    const isValidSize = pieceLetters.length >= 2 && pieceLetters.length <= 5;
    console.log(
      `${indent}🏁 Direction exploration complete. Valid size: ${isValidSize} (${pieceLetters.length} letters)`
    );
    return isValidSize;
  };

  const success = buildPiece(startingLetter.position);

  console.log(
    `🏁 Piece generation result: success=${success}, letters=${pieceLetters.length}, piece="${pieceLetters.join('')}"`
  );

  if (!success || pieceLetters.length < 2 || pieceLetters.length > 5) {
    console.log(
      `❌ Invalid piece: success=${success}, size=${pieceLetters.length}. Undoing changes.`
    );
    // Undo the changes if piece is invalid
    for (const pos of piecePositions) {
      const key = `${pos.row},${pos.col}`;
      usedLetters.delete(key);
    }
    return null;
  }

  // Additional validation: ensure the piece is connected via sides (not corners)
  if (!isPieceConnected(piecePositions)) {
    console.log(`❌ Piece not properly connected: "${pieceLetters.join('')}". Undoing changes.`);
    // Undo the changes if piece is invalid
    for (const pos of piecePositions) {
      const key = `${pos.row},${pos.col}`;
      usedLetters.delete(key);
    }
    return null;
  }

  // Create normalized shape
  const minRow = Math.min(...piecePositions.map((p) => p.row));
  const minCol = Math.min(...piecePositions.map((p) => p.col));
  const shape = piecePositions.map((pos) => ({
    row: pos.row - minRow,
    col: pos.col - minCol,
  }));

  const finalPiece = {
    id: `piece-${Date.now()}`, // Temporary ID
    letters: pieceLetters,
    shape,
    color:
      PIECE_COLOR_CLASSES[Math.floor(Math.random() * PIECE_COLOR_CLASSES.length)] ||
      'piece-color-red',
  };

  console.log(
    `✅ Piece completed: "${pieceLetters.join('')}" with shape ${shape.map((s) => `(${s.row},${s.col})`).join(' ')}`
  );

  return finalPiece;
};

// Check if any piece contains a complete word from the phrase
const containsCompleteWords = (pieces: LetterPiece[], phrase: string): boolean => {
  const words = phrase
    .toUpperCase()
    .split(' ')
    .filter((word) => word.length > 1); // Only check words longer than 1 letter

  for (const piece of pieces) {
    const pieceText = piece.letters.join('');

    // Check if this piece is exactly a complete word
    for (const word of words) {
      if (pieceText === word) {
        return true;
      }

      // Also check reverse (in case letters are in reverse order)
      const reverseWord = word.split('').reverse().join('');
      if (pieceText === reverseWord) {
        return true;
      }
    }
  }

  return false;
};

// Create fallback pieces when backtracking fails
const createFallbackPieces = (
  availableLetters: Array<{ letter: string; position: GridPosition }>
): LetterPiece[] => {
  console.log(`🔄 Fallback Debug: Creating fallback pieces for ${availableLetters.length} letters`);

  const pieces: LetterPiece[] = [];
  const used = new Set<string>();

  console.log(
    `📋 Starting fallback piece creation with ${availableLetters.length} available letters`
  );

  // Group letters into simple linear pieces
  for (let i = 0; i < availableLetters.length; i++) {
    const letter = availableLetters[i];
    if (!letter) continue;

    const posKey = `${letter.position.row},${letter.position.col}`;

    if (used.has(posKey)) {
      console.log(
        `⏭️ Skipping already used letter: ${letter.letter} at (${letter.position.row},${letter.position.col})`
      );
      continue;
    }

    const pieceLetters = [letter.letter];
    const piecePositions = [letter.position];
    used.add(posKey);

    console.log(
      `🔨 Starting new fallback piece with: ${letter.letter} at (${letter.position.row},${letter.position.col})`
    );

    // Try to add one more adjacent letter
    for (const otherLetter of availableLetters) {
      if (!otherLetter) continue;

      const otherPosKey = `${otherLetter.position.row},${otherLetter.position.col}`;
      if (used.has(otherPosKey)) continue;

      const rowDiff = Math.abs(letter.position.row - otherLetter.position.row);
      const colDiff = Math.abs(letter.position.col - otherLetter.position.col);

      if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
        console.log(
          `➕ Adding adjacent letter: ${otherLetter.letter} at (${otherLetter.position.row},${otherLetter.position.col})`
        );
        pieceLetters.push(otherLetter.letter);
        piecePositions.push(otherLetter.position);
        used.add(otherPosKey);
        break;
      }
    }

    // Ensure minimum 2 letters per piece
    if (pieceLetters.length < 2) {
      console.log(
        `❌ Piece too small (${pieceLetters.length} letters), skipping: "${pieceLetters.join('')}"`
      );
      continue; // Skip single letter pieces
    }

    console.log(
      `✅ Created fallback piece: "${pieceLetters.join('')}" (${pieceLetters.length} letters)`
    );

    // Create simple shape
    const shape = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ];

    const newPiece = {
      id: `piece-${pieces.length + 1}`,
      letters: pieceLetters,
      shape,
      color: PIECE_COLOR_CLASSES[pieces.length % PIECE_COLOR_CLASSES.length] || 'piece-color-red',
    };

    pieces.push(newPiece);
    console.log(
      `📦 Added piece ${pieces.length}: "${newPiece.letters.join('')}" with color ${newPiece.color}`
    );
  }

  console.log(`🔄 Handling remaining single letters...`);

  // Handle any remaining single letters by adding them to existing pieces
  const remainingLetters = availableLetters.filter((letter) => {
    if (!letter) return false;
    const posKey = `${letter.position.row},${letter.position.col}`;
    return !used.has(posKey);
  });

  console.log(`📊 Found ${remainingLetters.length} remaining letters to distribute`);

  for (const remainingLetter of remainingLetters) {
    if (!remainingLetter) continue;

    console.log(
      `🔄 Distributing remaining letter: ${remainingLetter.letter} at (${remainingLetter.position.row},${remainingLetter.position.col})`
    );

    // Find the smallest piece to add this letter to
    if (pieces.length === 0) {
      console.log(`❌ No pieces available to add remaining letter to`);
      continue;
    }

    let smallestPiece = pieces[0];
    if (!smallestPiece) continue;

    for (const piece of pieces) {
      if (piece.letters.length < smallestPiece.letters.length) {
        smallestPiece = piece;
      }
    }

    if (smallestPiece && smallestPiece.letters.length < 5) {
      console.log(
        `➕ Adding ${remainingLetter.letter} to smallest piece "${smallestPiece.letters.join('')}"`
      );
      smallestPiece.letters.push(remainingLetter.letter);
      // Extend the shape horizontally
      const maxCol = Math.max(...smallestPiece.shape.map((pos) => pos.col));
      smallestPiece.shape.push({ row: 0, col: maxCol + 1 });
      console.log(
        `📝 Updated piece: "${smallestPiece.letters.join('')}" (${smallestPiece.letters.length} letters)`
      );
    } else {
      console.log(
        `❌ Could not add remaining letter - no suitable piece found or piece already at max size`
      );
    }
  }

  console.log(`✅ Fallback piece creation complete: ${pieces.length} pieces created`);
  pieces.forEach((piece, i) => {
    console.log(
      `  Fallback Piece ${i + 1}: "${piece.letters.join('')}" (${piece.shape.length} letters)`
    );
  });

  return pieces;
};

// Select anchor letters using the algorithm specified in lettered.md
export const addPreFilledLetters = (grid: GridCell[][], phrase: string): GridCell[][] => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  return selectOptimalAnchorsWithConnectivityCheck(newGrid, phrase);
};

// Select anchor letters using the algorithm from lettered.md exactly
const selectAnchorLettersAlgorithm = (grid: GridCell[][], phrase: string): GridCell[][] => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

  // Algorithm from lettered.md:
  // 1. Get the length of the phrase including spaces. For phrases less than 28 letters, use 2 anchor letters. For phrases longer than 28 letters, use 3 anchor letters.
  const phraseLength = phrase.length; // Including spaces
  const anchorCount = phraseLength < 28 ? 2 : 3;

  // Find all letter positions
  const letterPositions: GridPosition[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row]!.length; col++) {
      const cell = newGrid[row]?.[col];
      if (cell?.letter && !cell.isUnused && !cell.isSpace) {
        letterPositions.push({ row, col });
      }
    }
  }

  if (letterPositions.length < anchorCount) {
    // If less than required anchors, make all letters pre-filled
    for (const pos of letterPositions) {
      const cell = newGrid[pos.row]?.[pos.col];
      if (cell) {
        cell.isPreFilled = true;
      }
    }
    return newGrid;
  }

  // 2. Choose the first random anchor letter.
  // 3. Mark the letter as pre-filled.
  // 4. Check the validity of the board.
  // 5. If the board is invalid, remove the letter from the grid and choose a new random anchor letter.
  // 6. If the board is valid, continue to the next anchor letter.
  // 7. If there are no more anchor letters to choose, return the board layout.

  const maxAttemptsPerAnchor = 20;
  const selectedAnchors: GridPosition[] = [];

  for (let anchorIndex = 0; anchorIndex < anchorCount; anchorIndex++) {
    let foundValidAnchor = false;

    for (let attempt = 0; attempt < maxAttemptsPerAnchor; attempt++) {
      // Choose random anchor letter from remaining available letters
      const availablePositions = letterPositions.filter(
        (pos) =>
          !selectedAnchors.some((selected) => selected.row === pos.row && selected.col === pos.col)
      );

      if (availablePositions.length === 0) {
        break;
      }

      const randomIndex = Math.floor(Math.random() * availablePositions.length);
      const candidateAnchor = availablePositions[randomIndex];

      if (!candidateAnchor) continue;

      // Create test grid with current anchors plus candidate
      const testGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

      // Mark all selected anchors as pre-filled
      for (const pos of selectedAnchors) {
        const cell = testGrid[pos.row]?.[pos.col];
        if (cell) {
          cell.isPreFilled = true;
        }
      }

      // Mark candidate as pre-filled
      const candidateCell = testGrid[candidateAnchor.row]?.[candidateAnchor.col];
      if (candidateCell) {
        candidateCell.isPreFilled = true;
      }

      // Check validity of the board
      if (validateBoardState(testGrid)) {
        selectedAnchors.push(candidateAnchor);
        foundValidAnchor = true;
        break;
      }
    }

    if (!foundValidAnchor) {
      // Could not find a valid anchor, use fallback
      break;
    }
  }

  // Mark selected anchors as pre-filled in the final grid
  for (const pos of selectedAnchors) {
    const cell = newGrid[pos.row]?.[pos.col];
    if (cell) {
      cell.isPreFilled = true;
    }
  }

  return newGrid;
};

// Validate board state according to lettered.md requirements exactly
const validateBoardState = (grid: GridCell[][]): boolean => {
  // The valid board state from lettered.md:
  // - No single letter is stranded. This means that every letter is reachable from at least one other letter and only on the sides of the letter. No corners.
  // - No letter overflows the bounds of the grid.
  // - There is at least 2 anchor pieces.

  let anchorCount = 0;
  const letterPositions: GridPosition[] = [];

  // Count anchors and collect all letter positions
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row]!.length; col++) {
      const cell = grid[row]?.[col];
      if (cell?.letter && !cell.isUnused && !cell.isSpace) {
        letterPositions.push({ row, col });
        if (cell.isPreFilled) {
          anchorCount++;
        }
      }
    }
  }

  // Check minimum anchor requirement
  if (anchorCount < 2) {
    return false;
  }

  // Check bounds (no letter overflows the bounds of the grid)
  for (const pos of letterPositions) {
    if (pos.row < 0 || pos.row >= grid.length || pos.col < 0 || pos.col >= (grid[0]?.length || 0)) {
      return false;
    }
  }

  // Check connectivity: No single letter is stranded
  // Every letter must be reachable from at least one other letter via sides (not corners)
  return validateConnectivity(grid);
};

// Select optimal anchors with connectivity validation
const selectOptimalAnchorsWithConnectivityCheck = (
  grid: GridCell[][],
  phrase: string
): GridCell[][] => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  const letterPositions: GridPosition[] = [];

  // Find all letter positions
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row]!.length; col++) {
      const cell = newGrid[row]?.[col];
      if (cell?.letter && !cell.isUnused && !cell.isSpace) {
        letterPositions.push({ row, col });
      }
    }
  }

  // For every 8 letters, select 1 from every 8 randomly and mark it as used
  const maxDistanceBetweenAnchors = letterPositions.length < 16 ? 6 : 8;
  for (let i = 0; i < letterPositions.length; i += maxDistanceBetweenAnchors) {
    const randomIndex = Math.floor(Math.random() * maxDistanceBetweenAnchors);
    const selectedLetter = letterPositions[i + randomIndex];
    if (selectedLetter) {
      // Mark it as pre-filled
      const cell = newGrid[selectedLetter.row]?.[selectedLetter.col];
      if (cell) {
        cell.isPreFilled = true;
      }
    }
  }

  return newGrid;
};

// Select well-distributed anchor letters across the grid
const selectWellDistributedAnchors = (
  positions: GridPosition[],
  count: number,
  seed: number
): GridPosition[] => {
  if (positions.length <= count) {
    return [...positions];
  }

  const selected: GridPosition[] = [];
  const minDistance = 2; // Minimum Manhattan distance between anchors

  // Sort positions for deterministic selection
  const sortedPositions = [...positions].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  // Select first anchor (deterministic based on seed)
  const firstIndex = seed % sortedPositions.length;
  const firstAnchor = sortedPositions[firstIndex];
  if (firstAnchor) {
    selected.push(firstAnchor);
  }

  // Select remaining anchors ensuring good distribution
  let attempts = 0;
  const maxAttempts = positions.length * 3;

  while (selected.length < count && attempts < maxAttempts) {
    // Find candidate positions that are far enough from existing anchors
    const candidates = sortedPositions.filter((pos) => {
      // Skip if already selected
      if (selected.some((sel) => sel.row === pos.row && sel.col === pos.col)) {
        return false;
      }

      // Check minimum distance from all selected anchors
      return selected.every((anchor) => {
        const distance = Math.abs(anchor.row - pos.row) + Math.abs(anchor.col - pos.col);
        return distance >= minDistance;
      });
    });

    if (candidates.length === 0) {
      // Reduce minimum distance requirement if no candidates found
      const relaxedCandidates = sortedPositions.filter((pos) => {
        return !selected.some((sel) => sel.row === pos.row && sel.col === pos.col);
      });

      if (relaxedCandidates.length > 0) {
        // Select the one with maximum minimum distance to existing anchors
        let bestCandidate = relaxedCandidates[0];
        let bestMinDistance = 0;

        for (const candidate of relaxedCandidates) {
          const minDistToAnchors = Math.min(
            ...selected.map(
              (anchor) =>
                Math.abs(anchor.row - candidate.row) + Math.abs(anchor.col - candidate.col)
            )
          );

          if (
            minDistToAnchors > bestMinDistance ||
            (minDistToAnchors === bestMinDistance && (seed + attempts) % 2 === 0)
          ) {
            bestMinDistance = minDistToAnchors;
            bestCandidate = candidate;
          }
        }

        if (bestCandidate) {
          selected.push(bestCandidate);
        }
      }
    } else {
      // Select from valid candidates
      const candidateIndex = (seed + attempts + selected.length) % candidates.length;
      const selectedCandidate = candidates[candidateIndex];
      if (selectedCandidate) {
        selected.push(selectedCandidate);
      }
    }

    attempts++;
  }

  return selected;
};

// Validate that all letters are connected (no stranded single letters)
const validateConnectivity = (grid: GridCell[][]): boolean => {
  // Create a copy of the grid for validation
  const validationGrid: (string | null)[][] = Array(grid.length)
    .fill(null)
    .map(() => Array(grid[0]?.length || 0).fill(null));

  // Populate validation grid with letters, excluding anchor/pre-filled letters
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row]!.length; col++) {
      const cell = grid[row]?.[col];
      if (cell?.letter && !cell.isUnused && !cell.isSpace && !cell.isPreFilled) {
        validationGrid[row]![col] = cell.letter;
      }
    }
  }

  // Find all non-anchor letter positions
  const letterPositions: GridPosition[] = [];
  for (let row = 0; row < validationGrid.length; row++) {
    for (let col = 0; col < validationGrid[row]!.length; col++) {
      if (validationGrid[row]![col] !== null) {
        letterPositions.push({ row, col });
      }
    }
  }

  // If there are fewer than 2 non-anchor letters, they are automatically connected
  if (letterPositions.length < 2) {
    return true;
  }

  // Check that each letter has at least one adjacent letter (side connection)
  for (const pos of letterPositions) {
    const hasAdjacentLetter = letterPositions.some((otherPos) => {
      if (otherPos.row === pos.row && otherPos.col === pos.col) return false;

      // Check 4-directional adjacency (sides only, not corners)
      const rowDiff = Math.abs(otherPos.row - pos.row);
      const colDiff = Math.abs(otherPos.col - pos.col);

      return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    });

    if (!hasAdjacentLetter) {
      return false; // Found a stranded letter
    }
  }

  return true;
};

// Generate solution positions for each piece
// This function now prefers tracked solutions from generation but falls back to the old method
export const generateSolutionPositions = (
  pieces: LetterPiece[],
  grid: GridCell[][],
  trackedSolution?: Record<string, GridPosition>
): Record<string, GridPosition> => {
  // If we have a tracked solution from generation, use it
  if (trackedSolution) {
    console.log(`✅ Using tracked solution positions from generation`);
    return trackedSolution;
  }

  // Fallback to old method if no tracked solution provided (for backwards compatibility)
  console.log(`⚠️ No tracked solution provided, falling back to position search`);
  return generateSolutionPositionsFallback(pieces, grid);
};

// Fallback method: search for positions after generation (deprecated but kept for compatibility)
const generateSolutionPositionsFallback = (
  pieces: LetterPiece[],
  grid: GridCell[][]
): Record<string, GridPosition> => {
  const solutions: Record<string, GridPosition> = {};

  for (const piece of pieces) {
    // Find the single correct position for this piece
    const correctPosition = findCorrectPiecePosition(piece, grid);
    if (correctPosition) {
      solutions[piece.id] = correctPosition;
    }
  }

  return solutions;
};

// Find the correct position for a piece on the grid (where it was originally placed)
const findCorrectPiecePosition = (piece: LetterPiece, grid: GridCell[][]): GridPosition | null => {
  // Try every possible position on the grid
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row]!.length; col++) {
      if (isValidPiecePlacement(piece, { row, col }, grid)) {
        return { row, col };
      }
    }
  }

  console.warn(
    `Could not find correct position for piece ${piece.id} with letters "${piece.letters.join('')}"`
  );
  return null;
};

// Check if a piece can be placed at a specific position and matches the grid letters
const isValidPiecePlacement = (
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

    // The piece letter should match the grid letter
    const pieceLetter = piece.letters[i];
    if (pieceLetter && cell?.letter && pieceLetter !== cell.letter) {
      return false;
    }
  }

  return true;
};

// Export helper functions for testing
export {
  generatePhraseLayoutOn9x9Grid,
  selectAnchorLettersAlgorithm,
  generatePiecesWithBacktracking,
  validateBoardState,
  validateConnectivity,
  testGameSolution,
  PIECE_COLOR_CLASSES,
};

// Generate initial piece positions for the extended area (below main grid)
export const generateInitialPiecePositions = (
  pieces: LetterPiece[],
  grid: GridCell[][]
): { positions: Record<string, GridPosition>; totalRows: number } => {
  const initialPositions: Record<string, GridPosition> = {};
  const trayGap = 1; // Visual gap between phrase area and piece tray
  const extendedStartRow = grid.length + trayGap; // Start below the main grid with gap
  const maxCols = grid[0]?.length || 8;
  const maxRows = 35; // Maximum rows for piece placement
  const pieceSpacing = 1; // One cell gap between pieces

  // Track occupied positions to prevent overlaps
  const occupiedPositions = new Set<string>();

  // Track the furthest row occupied by any piece
  let maxOccupiedRow = extendedStartRow;

  // Sort pieces by size (largest first) for better packing
  const sortedPieces = [...pieces].sort((a, b) => {
    const aSize = a.shape.length;
    const bSize = b.shape.length;
    return bSize - aSize;
  });

  for (const piece of sortedPieces) {
    // Calculate bounding box
    const width = Math.max(...piece.shape.map((pos) => pos.col)) + 1;
    const height = Math.max(...piece.shape.map((pos) => pos.row)) + 1;

    // Find a valid position for this piece with comprehensive search
    let placed = false;

    // Try every possible position systematically
    for (
      let currentRow = extendedStartRow;
      currentRow <= extendedStartRow + maxRows - height && !placed;
      currentRow++
    ) {
      for (let currentCol = 0; currentCol <= maxCols - width && !placed; currentCol++) {
        // Try to place the piece at current position
        const pieceLeft = currentCol;
        const pieceTop = currentRow;

        // Check for overlaps with existing pieces (only check actual piece positions, not spacing)
        let hasOverlap = false;

        // Check each cell that would be occupied by the piece's actual shape
        for (const shapePos of piece.shape) {
          const checkRow = pieceTop + shapePos.row;
          const checkCol = pieceLeft + shapePos.col;
          const positionKey = `${checkCol},${checkRow}`;

          if (occupiedPositions.has(positionKey)) {
            hasOverlap = true;
            break;
          }
        }

        if (!hasOverlap) {
          // Place the piece here
          initialPositions[piece.id] = { row: pieceTop, col: pieceLeft };

          // Mark only the actual piece positions as occupied (with spacing buffer)
          for (const shapePos of piece.shape) {
            const occupyRow = pieceTop + shapePos.row;
            const occupyCol = pieceLeft + shapePos.col;

            // Track the furthest row occupied
            maxOccupiedRow = Math.max(maxOccupiedRow, occupyRow);

            // Mark the piece position and surrounding buffer
            for (
              let bufferRow = occupyRow - pieceSpacing;
              bufferRow <= occupyRow + pieceSpacing;
              bufferRow++
            ) {
              for (
                let bufferCol = occupyCol - pieceSpacing;
                bufferCol <= occupyCol + pieceSpacing;
                bufferCol++
              ) {
                if (
                  bufferRow >= extendedStartRow &&
                  bufferRow < extendedStartRow + maxRows &&
                  bufferCol >= 0 &&
                  bufferCol < maxCols
                ) {
                  occupiedPositions.add(`${bufferCol},${bufferRow}`);
                }
              }
            }
          }

          placed = true;
          console.log(
            `Placed piece ${piece.id} at (${pieceTop}, ${pieceLeft}) with size ${width}x${height}`
          );
        }
      }
    }

    // If piece still couldn't be placed after comprehensive search, try without spacing buffer
    if (!placed) {
      console.warn(`⚠️ Could not place piece ${piece.id} with spacing, trying without buffer...`);

      for (
        let currentRow = extendedStartRow;
        currentRow <= extendedStartRow + maxRows - height && !placed;
        currentRow++
      ) {
        for (let currentCol = 0; currentCol <= maxCols - width && !placed; currentCol++) {
          const pieceLeft = currentCol;
          const pieceTop = currentRow;

          // Check for overlaps with existing pieces (only actual piece positions)
          let hasOverlap = false;

          for (const shapePos of piece.shape) {
            const checkRow = pieceTop + shapePos.row;
            const checkCol = pieceLeft + shapePos.col;

            // Check if this exact position is occupied by another piece (not spacing buffer)
            for (const [placedPieceId, placedPosition] of Object.entries(initialPositions)) {
              const placedPiece = pieces.find((p) => p.id === placedPieceId);
              if (!placedPiece) continue;

              for (const placedShapePos of placedPiece.shape) {
                const placedRow = placedPosition.row + placedShapePos.row;
                const placedCol = placedPosition.col + placedShapePos.col;

                if (placedRow === checkRow && placedCol === checkCol) {
                  hasOverlap = true;
                  break;
                }
              }
              if (hasOverlap) break;
            }
            if (hasOverlap) break;
          }

          if (!hasOverlap) {
            // Place the piece here
            initialPositions[piece.id] = { row: pieceTop, col: pieceLeft };

            // Mark only the actual piece positions as occupied
            for (const shapePos of piece.shape) {
              const occupyRow = pieceTop + shapePos.row;
              const occupyCol = pieceLeft + shapePos.col;
              occupiedPositions.add(`${occupyCol},${occupyRow}`);
              // Track the furthest row occupied
              maxOccupiedRow = Math.max(maxOccupiedRow, occupyRow);
            }

            placed = true;
            console.log(
              `Placed piece ${piece.id} at (${pieceTop}, ${pieceLeft}) without spacing buffer`
            );
          }
        }
      }
    }

    // If piece STILL cannot be placed, this indicates a serious problem - expand the available area
    if (!placed) {
      console.error(
        `❌ CRITICAL: Could not place piece ${piece.id} anywhere! Expanding placement area...`
      );

      // Expand search area vertically
      const expandedMaxRows = maxRows + 10;

      for (
        let currentRow = extendedStartRow;
        currentRow <= extendedStartRow + expandedMaxRows - height && !placed;
        currentRow++
      ) {
        for (let currentCol = 0; currentCol <= maxCols - width && !placed; currentCol++) {
          const pieceLeft = currentCol;
          const pieceTop = currentRow;

          // Check for overlaps with existing pieces
          let hasOverlap = false;

          for (const shapePos of piece.shape) {
            const checkRow = pieceTop + shapePos.row;
            const checkCol = pieceLeft + shapePos.col;

            for (const [placedPieceId, placedPosition] of Object.entries(initialPositions)) {
              const placedPiece = pieces.find((p) => p.id === placedPieceId);
              if (!placedPiece) continue;

              for (const placedShapePos of placedPiece.shape) {
                const placedRow = placedPosition.row + placedShapePos.row;
                const placedCol = placedPosition.col + placedShapePos.col;

                if (placedRow === checkRow && placedCol === checkCol) {
                  hasOverlap = true;
                  break;
                }
              }
              if (hasOverlap) break;
            }
            if (hasOverlap) break;
          }

          if (!hasOverlap) {
            initialPositions[piece.id] = { row: pieceTop, col: pieceLeft };
            // Track the furthest row occupied
            for (const shapePos of piece.shape) {
              const occupyRow = pieceTop + shapePos.row;
              maxOccupiedRow = Math.max(maxOccupiedRow, occupyRow);
            }
            placed = true;
            console.log(`Placed piece ${piece.id} at (${pieceTop}, ${pieceLeft}) in expanded area`);
          }
        }
      }
    }

    // If we STILL can't place it, something is very wrong
    if (!placed) {
      throw new Error(
        `FATAL: Cannot place piece ${piece.id} anywhere without overlaps. This should never happen.`
      );
    }
  }

  // Calculate total rows: furthest piece bottom + 1 row buffer
  const totalRows = maxOccupiedRow + 2; // +1 for 0-indexing, +1 for buffer

  console.log(`Successfully placed all ${pieces.length} pieces without overlaps`);
  console.log(
    `Piece tray trimmed to ${totalRows} total rows (grid: ${grid.length}, pieces extend to row ${maxOccupiedRow})`
  );

  return { positions: initialPositions, totalRows };
};

// Test if a generated game solution correctly reconstructs the original phrase
const testGameSolution = (
  game: LetteredGameData
): { isValid: boolean; errors: string[]; reconstructedPhrase: string } => {
  const errors: string[] = [];

  try {
    // Create a working grid to place pieces
    const workingGrid: (string | null)[][] = [];
    for (let row = 0; row < game.rows; row++) {
      workingGrid[row] = [];
      for (let col = 0; col < game.cols; col++) {
        workingGrid[row]![col] = null;
      }
    }

    // Place each piece at its solution position
    for (const [pieceId, position] of Object.entries(game.solution)) {
      const piece = game.pieces.find((p) => p.id === pieceId);
      if (!piece) {
        errors.push(`Piece ${pieceId} not found in pieces array`);
        continue;
      }

      // Place each letter of the piece
      for (let i = 0; i < piece.shape.length; i++) {
        const shapePos = piece.shape[i];
        if (!shapePos) continue;

        const gridRow = position.row + shapePos.row;
        const gridCol = position.col + shapePos.col;
        const letter = piece.letters[i];

        // Check bounds
        if (gridRow < 0 || gridRow >= game.rows || gridCol < 0 || gridCol >= game.cols) {
          errors.push(`Piece ${pieceId} extends outside grid bounds at (${gridRow},${gridCol})`);
          continue;
        }

        // Check for conflicts
        if (workingGrid[gridRow]![gridCol] !== null) {
          errors.push(
            `Conflict at (${gridRow},${gridCol}): trying to place '${letter}' but '${workingGrid[gridRow]![gridCol]}' already there`
          );
          continue;
        }

        workingGrid[gridRow]![gridCol] = letter;
      }
    }

    // Count total letters placed by pieces
    let totalPieceLetters = 0;
    for (let row = 0; row < game.rows; row++) {
      for (let col = 0; col < game.cols; col++) {
        if (workingGrid[row]![col] !== null) {
          totalPieceLetters++;
        }
      }
    }

    // Count expected letters (total letters in phrase minus spaces)
    const expectedLetters = game.phrase.replace(/\s/g, '').length;
    const anchorLetterCount = game.grid.flat().filter((cell) => cell.isPreFilled).length;
    // This needs to account for anchor letters that are already placed
    if (totalPieceLetters + anchorLetterCount !== expectedLetters) {
      errors.push(
        `Letter count mismatch: placed ${totalPieceLetters} letters but expected ${expectedLetters} (anchor letters: ${anchorLetterCount})`
      );
    }

    // Verify that all pieces are accounted for in the solution
    const solutionPieceIds = new Set(Object.keys(game.solution));
    const allPieceIds = new Set(game.pieces.map((p) => p.id));

    for (const pieceId of allPieceIds) {
      if (!solutionPieceIds.has(pieceId)) {
        errors.push(`Piece ${pieceId} is not included in the solution`);
      }
    }

    for (const pieceId of solutionPieceIds) {
      if (!allPieceIds.has(pieceId)) {
        errors.push(`Solution references piece ${pieceId} which doesn't exist`);
      }
    }
  } catch (error) {
    errors.push(`Test failed with error: ${error}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    reconstructedPhrase: game.phrase, // Return original phrase since we can't reconstruct it from secure grid
  };
};

// Generate a complete mock game following the new process
export const generateMockGame = (
  category: string,
  phrase: string,
  seed?: number
): LetteredGameData => {
  try {
    console.log(`\n🎮 Generating game for phrase: "${phrase}"\n`);

    // Step 1: Generate proper square phrase using a configurable grid
    console.log('Step 1: Creating initial configurable grid...');
    const initialGrid = createConfigurableGrid(100, 9); // Start with Nx9 for compatibility
    printBoard(initialGrid, 'Step 1: Initial Configurable Grid');

    console.log('Step 2: Placing phrase on grid...');
    const placedGrid = placePhraseOnGrid(initialGrid, phrase);
    printBoard(placedGrid, 'Step 2: After Placing Phrase');

    // Step 3: Add pre-filled letters (anchor letters) to create the square puzzle
    console.log('Step 3: Adding anchor letters...');
    const boardWithAnchors = addPreFilledLetters(placedGrid, phrase);
    printBoard(boardWithAnchors, 'Step 3: After Adding Anchor Letters');

    // Step 4: Trim the board after the square puzzle is created
    console.log('Step 4: Trimming and centering board...');
    const trimmedGrid = trimBoard(boardWithAnchors);
    printBoard(trimmedGrid, 'Step 4: After Trimming & Centering');

    // Step 5: Generate pieces (with tracked solution positions)
    console.log('Step 5: Generating letter pieces...');
    const { pieces, solution: trackedSolution } = generateLetterPieces(trimmedGrid, seed);
    console.log(`Generated ${pieces.length} pieces:`);
    pieces.forEach((piece, i) => {
      console.log(
        `  Piece ${i + 1}: "${piece.letters.join('')}" (${piece.shape.length} letters, color: ${piece.color})`
      );
    });

    // Step 6: Generate initial piece positions
    console.log('Step 6: Generating initial piece positions...');
    const { positions: initialPiecePositions, totalRows: pieceTrayRows } =
      generateInitialPiecePositions(pieces, trimmedGrid);
    console.log(
      `Generated initial positions for ${Object.keys(initialPiecePositions).length} pieces (total rows: ${pieceTrayRows})`
    );

    // Step 7: Use tracked solution from piece generation
    console.log('Step 7: Using tracked solution positions...');
    const solution = trackedSolution;
    console.log(`Using tracked solutions for ${Object.keys(solution).length} pieces`);

    console.log('\n✅ Game generation complete!\n');

    // Create secure grid
    const secureGrid = createSecureGrid(trimmedGrid);

    return {
      id: 'mock-game-1',
      category,
      phrase,
      grid: secureGrid,
      rows: trimmedGrid.length,
      cols: trimmedGrid[0]?.length || 0,
      pieces,
      initialPiecePositions,
      solution,
      seed: seed ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error generating mock game:', error);
    // Return a simpler fallback game
    console.log('Falling back to simple game generation...');
    return generateFallbackGame(category, phrase);
  }
};

// Convert grid to secure format (remove non-pre-filled letters, keep isLetter)
export const createSecureGrid = (grid: GridCell[][]): GridCell[][] => {
  return grid.map((row) =>
    row.map((cell) => ({
      ...cell,
      letter: cell.isPreFilled ? cell.letter : null, // Keep pre-filled letters, remove others for security
    }))
  );
};

// Fallback game with a simpler layout
const generateFallbackGame = (category: string, phrase: string): LetteredGameData => {
  const grid = createEmptyGrid();
  const words = phrase
    .toUpperCase()
    .split(' ')
    .filter((word) => word.length > 0);

  // Check for individual words that are too long
  const maxWordLength = 9;
  const longWords = words.filter((word) => word.length > maxWordLength);
  if (longWords.length > 0) {
    throw new Error(
      `Words cannot be longer than ${maxWordLength} characters. Found: ${longWords.join(', ')}`
    );
  }

  // Simple horizontal layout
  const currentRow = 2;
  let currentCol = 1;

  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      if (currentCol < 8 && grid[currentRow]?.[currentCol]) {
        grid[currentRow][currentCol] = {
          letter: word[i] || null,
          isLetter: true,
          isPreFilled: i % 3 === 0, // Every 3rd letter is pre-filled
          isSpace: false,
          isUnused: false,
        };
        currentCol++;
      }
    }
    // Add space between words
    if (currentCol < 8 && grid[currentRow]?.[currentCol]) {
      grid[currentRow][currentCol] = {
        letter: null,
        isLetter: false,
        isPreFilled: false,
        isSpace: true,
        isUnused: false,
      };
      currentCol++;
    }
  }

  const { pieces, solution: trackedSolution } = generateLetterPieces(grid);
  const { positions: initialPiecePositions } = generateInitialPiecePositions(pieces, grid);
  const solution = trackedSolution;

  // Create secure grid
  const secureGrid = createSecureGrid(grid);

  return {
    id: 'fallback-game-1',
    category,
    phrase,
    grid: secureGrid,
    rows: 8,
    cols: 8,
    pieces,
    initialPiecePositions,
    solution,
    seed: null, // fallback games don't use seeds
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};
