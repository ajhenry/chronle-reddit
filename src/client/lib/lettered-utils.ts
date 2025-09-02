import { GridCell, GridPosition, LetterPiece, LetteredGameData } from '../../shared/types/api';

// Available colors for tetris pieces
const PIECE_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#84CC16', // lime
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
];

// Generate random piece shapes that connect via sides (not just corners) - DEPRECATED
export const generateRandomPieceShape = (letterCount: number): GridPosition[] => {
  if (letterCount < 2 || letterCount > 5) {
    throw new Error('Piece must have 2-5 letters');
  }

  const shape: GridPosition[] = [{ row: 0, col: 0 }]; // Start with first position

  for (let i = 1; i < letterCount; i++) {
    // Find all possible adjacent positions to existing shape
    const possiblePositions: GridPosition[] = [];

    for (const existingPos of shape) {
      // Check all 4 directions (up, down, left, right)
      const adjacentPositions = [
        { row: existingPos.row - 1, col: existingPos.col }, // up
        { row: existingPos.row + 1, col: existingPos.col }, // down
        { row: existingPos.row, col: existingPos.col - 1 }, // left
        { row: existingPos.row, col: existingPos.col + 1 }, // right
      ];

      for (const adjPos of adjacentPositions) {
        // Check if this position is not already in the shape
        if (!shape.some((pos) => pos.row === adjPos.row && pos.col === adjPos.col)) {
          possiblePositions.push(adjPos);
        }
      }
    }

    // Remove duplicates
    const uniquePositions = possiblePositions.filter(
      (pos, index, arr) => arr.findIndex((p) => p.row === pos.row && p.col === pos.col) === index
    );

    if (uniquePositions.length === 0) {
      throw new Error('Cannot generate valid piece shape');
    }

    // Pick a random adjacent position
    const randomPos = uniquePositions[Math.floor(Math.random() * uniquePositions.length)];
    if (randomPos) {
      shape.push(randomPos);
    } else {
      break; // No more positions available
    }
  }

  // Normalize shape to start from (0,0)
  const minRow = Math.min(...shape.map((pos) => pos.row));
  const minCol = Math.min(...shape.map((pos) => pos.col));

  return shape.map((pos) => ({
    row: pos.row - minRow,
    col: pos.col - minCol,
  }));
};

// Create an empty 8x8 grid
export const createEmptyGrid = (): GridCell[][] => {
  return Array(8)
    .fill(null)
    .map(() =>
      Array(8)
        .fill(null)
        .map(() => ({
          letter: null,
          isPreFilled: false,
          isSpace: false,
          isUnused: true, // Start with all unused, will be updated when placing phrase
        }))
    );
};

// Place a phrase on the grid using the algorithm specified in lettered.md
export const placePhraseOnGrid = (grid: GridCell[][], phrase: string): GridCell[][] => {
  const words = phrase.toUpperCase().split(' ');
  const totalLetters = words.join('').length;

  if (totalLetters > 28) {
    throw new Error('Phrase has too many letters (max 28)');
  }

  if (words.length > 5) {
    throw new Error('Phrase has too many words (max 5)');
  }

  // Use the algorithm specified in lettered.md
  const result = generateBoardLayoutAlgorithm(grid, words);
  if (!result) {
    throw new Error('Could not generate valid layout for phrase');
  }

  return result;
};

// Generate board layout using the algorithm specified in lettered.md
const generateBoardLayoutAlgorithm = (grid: GridCell[][], words: string[]): GridCell[][] | null => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

  // Algorithm from lettered.md:
  // 1. Break the phrase up into words (already done)
  // 2. Calculate the length of the longest word, this is a guideline for the size of the square
  const longestWordLength = Math.max(...words.map((word) => word.length));

  // 3. Choose the first word in the phrase and place it in the square
  // 4. Choose the next word in the phrase, combine the previous word with the next word separated by a space, if it fits in the grid, and is less than the length of the longest word+2, place it in the same row as the first word
  // 5. If the next word does not fit, place it in a new row
  // 6. Repeat until all words are placed
  // 7. If there are no more words to place, return the board layout

  const gridSize = 8;
  const margin = 1; // Leave some margin

  // Calculate the optimal starting position to center the layout
  const totalCharsWithSpaces = words.join(' ').length;
  const estimatedRows = Math.ceil(totalCharsWithSpaces / longestWordLength);

  const startRow = Math.max(margin, Math.floor((gridSize - estimatedRows) / 2));
  const startCol = margin;

  let currentRow = startRow;
  let currentCol = startCol;
  let currentRowText = ''; // Track the current row text to check against longest word+2

  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];
    if (!word) continue;

    // Combine previous words with the next word to check if it fits
    const potentialRowText = currentRowText.length === 0 ? word : currentRowText + ' ' + word;

    // Check if combined text fits in current row (longest word+2 rule and grid bounds)
    if (
      currentRowText.length === 0 ||
      (potentialRowText.length <= longestWordLength + 2 &&
        startCol + potentialRowText.length <= gridSize - margin)
    ) {
      // Place word in current row
      if (currentRowText.length > 0) {
        // Add space before word (except first word)
        if (currentRow >= 0 && currentRow < gridSize && currentCol >= 0 && currentCol < gridSize) {
          const spaceCell = newGrid[currentRow]?.[currentCol];
          if (spaceCell) {
            spaceCell.letter = null;
            spaceCell.isPreFilled = false;
            spaceCell.isSpace = true;
            spaceCell.isUnused = false;
          }
        }
        currentCol++;
      }

      // Place word letters
      for (let i = 0; i < word.length; i++) {
        if (currentRow >= 0 && currentRow < gridSize && currentCol >= 0 && currentCol < gridSize) {
          const cell = newGrid[currentRow]?.[currentCol];
          if (cell) {
            cell.letter = word[i] || null;
            cell.isPreFilled = false;
            cell.isSpace = false;
            cell.isUnused = false;
          }
        }
        currentCol++;
      }

      // Update current row text
      currentRowText = potentialRowText;
    } else {
      // Move to next row
      currentRow++;
      currentCol = startCol;
      currentRowText = '';

      // Check if we still have space
      if (currentRow >= gridSize - margin) {
        return null; // Not enough space
      }

      // Place word in new row
      for (let i = 0; i < word.length; i++) {
        if (currentRow >= 0 && currentRow < gridSize && currentCol >= 0 && currentCol < gridSize) {
          const cell = newGrid[currentRow]?.[currentCol];
          if (cell) {
            cell.letter = word[i] || null;
            cell.isPreFilled = false;
            cell.isSpace = false;
            cell.isUnused = false;
          }
        }
        currentCol++;
      }

      // Update current row text for new row
      currentRowText = word;
    }
  }

  return newGrid;
};

// Validate that all letters are connected (no stranded single letters)
// Implements the algorithm from lettered.md:
// - Create a 2d grid of the board
// - Remove any anchor letters from the grid by setting the letter to null
// - For each letter in the grid, check if it is reachable from at least one other letter and only on the sides of the letter. No corners.
const validateConnectivity = (grid: GridCell[][]): boolean => {
  // Create a copy of the grid for validation
  const validationGrid: (string | null)[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Populate validation grid with letters, excluding anchor/pre-filled letters
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = grid[row]?.[col];
      if (cell?.letter && !cell.isUnused && !cell.isSpace && !cell.isPreFilled) {
        validationGrid[row]![col] = cell.letter;
      }
    }
  }

  // Find all non-anchor letter positions
  const letterPositions: GridPosition[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
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

// Select anchor letters using the algorithm specified in lettered.md
export const addPreFilledLetters = (grid: GridCell[][], phrase: string): GridCell[][] => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

  // Use the anchor selection algorithm from lettered.md
  const gridWithAnchors = selectAnchorLettersAlgorithm(newGrid, phrase);

  // Validate connectivity after anchors are selected
  if (!validateConnectivity(gridWithAnchors)) {
    // If connectivity fails, try with fewer anchors
    console.warn('Initial anchor selection failed connectivity check, trying with fewer anchors');
    return selectOptimalAnchorsWithConnectivityCheck(newGrid, phrase);
  }

  return gridWithAnchors;
};

// Select anchor letters using the algorithm from lettered.md
const selectAnchorLettersAlgorithm = (grid: GridCell[][], phrase: string): GridCell[][] => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

  // Algorithm from lettered.md:
  // 1. Get the length of the phrase including spaces. For phrases less than 28 letters, use 2 anchor letters. For phrases longer than 28 letters, use 3 anchor letters.
  const phraseLength = phrase.length; // Including spaces
  const anchorCount = phraseLength < 28 ? 2 : 3;

  // Find all letter positions
  const letterPositions: GridPosition[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = newGrid[row]?.[col];
      if (cell?.letter && !cell.isUnused && !cell.isSpace) {
        letterPositions.push({ row, col });
      }
    }
  }

  if (letterPositions.length < 2) {
    // If less than 2 letters, make all pre-filled
    for (const pos of letterPositions) {
      const cell = newGrid[pos.row]?.[pos.col];
      if (cell) {
        cell.isPreFilled = true;
      }
    }
    return newGrid;
  }

  // Try multiple times to find valid anchor placements
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Create a test grid
    const testGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

    // Select random anchor letters
    const selectedAnchors = selectRandomAnchors(letterPositions, anchorCount, phrase, attempt);

    // Mark selected positions as pre-filled
    for (const pos of selectedAnchors) {
      const cell = testGrid[pos.row]?.[pos.col];
      if (cell) {
        cell.isPreFilled = true;
      }
    }

    // Check validity of the board
    if (validateBoardState(testGrid)) {
      return testGrid;
    }
  }

  // Fallback: use minimum anchors (just 2)
  console.warn('Could not find valid anchor configuration, using fallback');
  const fallbackAnchors = letterPositions.slice(0, Math.min(2, letterPositions.length));
  for (const pos of fallbackAnchors) {
    const cell = newGrid[pos.row]?.[pos.col];
    if (cell) {
      cell.isPreFilled = true;
    }
  }

  return newGrid;
};

// Select random anchor letters with deterministic seed
const selectRandomAnchors = (
  letterPositions: GridPosition[],
  count: number,
  phrase: string,
  seed: number
): GridPosition[] => {
  if (letterPositions.length <= count) {
    return [...letterPositions];
  }

  // Create deterministic pseudo-random selection based on phrase and seed
  const deterministicSeed =
    phrase.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + seed;

  const selected: GridPosition[] = [];
  const available = [...letterPositions];

  for (let i = 0; i < count && available.length > 0; i++) {
    const index = (deterministicSeed + i * 7) % available.length;
    const chosen = available[index];
    if (chosen) {
      selected.push(chosen);
      available.splice(index, 1);
    }
  }

  return selected;
};

// Validate board state according to lettered.md requirements
const validateBoardState = (grid: GridCell[][]): boolean => {
  // The valid board state is:
  // - No single letter is stranded. This means that every letter is reachable from at least one other letter and only on the sides of the letter. No corners.
  // - No letter overflows the bounds of the grid.
  // - There is at least 2 anchor pieces.

  let anchorCount = 0;
  const letterPositions: GridPosition[] = [];

  // Count anchors and collect all letter positions
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
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

  // Check connectivity using the existing function
  return validateConnectivity(grid);
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

// Select optimal anchors with connectivity validation
const selectOptimalAnchorsWithConnectivityCheck = (
  grid: GridCell[][],
  phrase: string
): GridCell[][] => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  const letterPositions: GridPosition[] = [];

  // Find all letter positions
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = newGrid[row]?.[col];
      if (cell?.letter && !cell.isUnused && !cell.isSpace) {
        letterPositions.push({ row, col });
      }
    }
  }

  if (letterPositions.length < 2) {
    // If less than 2 letters, make all pre-filled
    for (const pos of letterPositions) {
      const cell = newGrid[pos.row]?.[pos.col];
      if (cell) {
        cell.isPreFilled = true;
      }
    }
    return newGrid;
  }

  // Try different anchor counts starting from minimum and increasing until connectivity works
  for (
    let anchorCount = 2;
    anchorCount <= Math.min(letterPositions.length - 1, Math.floor(letterPositions.length / 2));
    anchorCount++
  ) {
    // Try multiple anchor combinations for this count
    for (let attempt = 0; attempt < 5; attempt++) {
      // Reset grid
      const testGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

      // Select anchors for this attempt
      const seed = phrase.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + attempt;
      const selectedAnchors = selectWellDistributedAnchors(letterPositions, anchorCount, seed);

      // Mark selected positions as pre-filled
      for (const pos of selectedAnchors) {
        const cell = testGrid[pos.row]?.[pos.col];
        if (cell) {
          cell.isPreFilled = true;
        }
      }

      // Test connectivity
      if (validateConnectivity(testGrid)) {
        return testGrid;
      }
    }
  }

  // Fallback: use minimum anchors (just 2)
  console.warn('Could not find connected anchor configuration, using fallback');
  const fallbackAnchors = letterPositions.slice(0, 2);
  for (const pos of fallbackAnchors) {
    const cell = newGrid[pos.row]?.[pos.col];
    if (cell) {
      cell.isPreFilled = true;
    }
  }

  return newGrid;
};

// Generate tetris pieces using backtracking algorithm
export const generateLetterPieces = (grid: GridCell[][], phrase: string): LetterPiece[] => {
  // Get all available letters (non-pre-filled) with their grid positions
  const availableLetters: Array<{ letter: string; position: GridPosition }> = [];
  const preFilledLetters: string[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
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

  // Debug logging for testing
  if (typeof window !== 'undefined' && '__TESTING__' in window) {
    console.log(`DEBUG: Pre-filled letters: ${preFilledLetters.join('')}`);
    console.log(`DEBUG: Available letters: ${availableLetters.map((l) => l.letter).join('')}`);
  }

  if (availableLetters.length === 0) {
    return [];
  }

  // Use backtracking algorithm to generate optimal pieces
  return generatePiecesWithBacktracking(availableLetters, phrase);
};

// Generate pieces using backtracking algorithm from lettered.md
const generatePiecesWithBacktracking = (
  availableLetters: Array<{ letter: string; position: GridPosition }>,
  phrase: string
): LetterPiece[] => {
  const totalLetters = availableLetters.length;

  // Determine number of pieces based on algorithm from lettered.md with max 6 pieces
  let targetPieceCount: number;
  if (totalLetters < 24) {
    targetPieceCount = Math.max(3, Math.min(6, Math.floor(totalLetters / 3)));
  } else if (totalLetters <= 28) {
    targetPieceCount = Math.max(4, Math.min(6, Math.floor(totalLetters / 4)));
  } else {
    targetPieceCount = Math.max(5, Math.min(6, Math.floor(totalLetters / 5)));
  }

  // Try piece counts in order: start with target, then reduce if generation fails (max 6)
  const targetPieceCounts = [targetPieceCount];
  if (targetPieceCount > 3) targetPieceCounts.push(Math.min(6, targetPieceCount - 1));
  if (targetPieceCount > 4) targetPieceCounts.push(Math.min(6, targetPieceCount - 2));
  targetPieceCounts.push(3); // minimum

  for (const pieceCount of targetPieceCounts) {
    // Try multiple times to avoid complete words in pieces
    const maxRetries = 5;
    for (let retry = 0; retry < maxRetries; retry++) {
      const result = tryGeneratePiecesWithNewAlgorithm(availableLetters, pieceCount, phrase, retry);
      if (result && !containsCompleteWords(result, phrase) && !hasTooManySmallPieces(result)) {
        return result;
      }
    }
  }

  // Fallback: create simple linear pieces
  const fallbackPieces = createFallbackPieces(availableLetters);

  // Check fallback pieces for complete words and small piece issues
  if (containsCompleteWords(fallbackPieces, phrase)) {
    console.warn('Even fallback pieces contain complete words - this may make the puzzle too easy');
  }

  if (hasTooManySmallPieces(fallbackPieces)) {
    console.warn('Even fallback pieces have too many small pieces - puzzle may be too fragmented');
  }

  return fallbackPieces;
};

// Check if any piece contains a complete word from the phrase
const containsCompleteWords = (pieces: LetterPiece[], phrase: string): boolean => {
  const words = phrase
    .toUpperCase()
    .split(' ')
    .filter((word) => word.length > 1); // Only check words longer than 1 letter

  // Debug logging for testing
  if (typeof window !== 'undefined' && '__TESTING__' in window) {
    console.log(`DEBUG: Checking pieces for complete words from: "${phrase}"`);
    console.log(`DEBUG: Words to check: [${words.join(', ')}]`);
    console.log(
      `DEBUG: Generated pieces:`,
      pieces.map((p) => p.letters.join(''))
    );
  }

  for (const piece of pieces) {
    const pieceText = piece.letters.join('');

    // Check if this piece is exactly a complete word
    for (const word of words) {
      if (pieceText === word) {
        console.log(`Found exact word "${word}" as piece: ${pieceText}`);
        return true;
      }

      // Also check reverse (in case letters are in reverse order)
      const reverseWord = word.split('').reverse().join('');
      if (pieceText === reverseWord) {
        console.log(`Found exact word "${word}" (reversed) as piece: ${pieceText}`);
        return true;
      }
    }
  }

  if (typeof window !== 'undefined' && '__TESTING__' in window) {
    console.log(`DEBUG: No complete words found in pieces`);
  }

  return false;
};

// Check if majority of pieces are only 2 characters (too small)
const hasTooManySmallPieces = (pieces: LetterPiece[]): boolean => {
  if (pieces.length === 0) return false;

  const twoCharacterPieces = pieces.filter((piece) => piece.letters.length === 2).length;
  const totalPieces = pieces.length;
  const majorityThreshold = Math.ceil(totalPieces / 2); // More than half

  // Debug logging for testing
  if (typeof window !== 'undefined' && '__TESTING__' in window) {
    console.log(
      `DEBUG: Piece size distribution:`,
      pieces.map((p) => p.letters.length)
    );
    console.log(
      `DEBUG: ${twoCharacterPieces}/${totalPieces} pieces are 2 characters (threshold: ${majorityThreshold})`
    );
  }

  const hasTooMany = twoCharacterPieces >= majorityThreshold;

  if (hasTooMany) {
    console.log(`Too many small pieces: ${twoCharacterPieces}/${totalPieces} are 2 characters`);
  }

  return hasTooMany;
};

// Try to generate pieces using the new algorithm from lettered.md
const tryGeneratePiecesWithNewAlgorithm = (
  availableLetters: Array<{ letter: string; position: GridPosition }>,
  targetPieceCount: number,
  phrase: string,
  retryIndex: number = 0
): LetterPiece[] | null => {
  // Create a grid representation for the algorithm
  const gridMap = new Map<string, { letter: string; position: GridPosition }>();
  for (const item of availableLetters) {
    const key = `${item.position.row},${item.position.col}`;
    gridMap.set(key, item);
  }

  // Create a copy of the grid for tracking used letters
  const usedGrid = new Set<string>();
  const pieces: Array<{ letters: string[]; positions: GridPosition[]; shape: GridPosition[] }> = [];

  // Main algorithm loop from lettered.md - continue until all letters are used (max 6 pieces)
  while (usedGrid.size < availableLetters.length && pieces.length < 6) {
    // Find next available starting letter by scanning from top-left to bottom-right
    const startingLetter = findNextAvailableStartingLetter(gridMap, usedGrid);

    if (!startingLetter) {
      break; // No more available letters
    }

    // Calculate desired piece size based on remaining letters and target piece count
    const remainingLetters = availableLetters.length - usedGrid.size;
    const remainingPieceSlots = Math.max(1, targetPieceCount - pieces.length);
    const targetPieceSize = Math.min(
      5,
      Math.max(2, Math.floor(remainingLetters / remainingPieceSlots))
    );

    // Generate piece using backtracking direction traversal
    const piece = generatePieceWithDirectionTraversal(
      startingLetter,
      gridMap,
      usedGrid,
      phrase,
      targetPieceSize,
      retryIndex
    );

    if (!piece || piece.letters.length < 2) {
      // Mark this letter as used to avoid infinite loop
      const startKey = `${startingLetter.position.row},${startingLetter.position.col}`;
      usedGrid.add(startKey);
      continue;
    }

    // Add valid piece
    pieces.push(piece);

    // Mark all letters in this piece as used
    for (const pos of piece.positions) {
      const key = `${pos.row},${pos.col}`;
      usedGrid.add(key);
    }
  }

  // Check if we have valid pieces and all letters are used
  const totalUsedLetters = pieces.reduce((sum, piece) => sum + piece.letters.length, 0);

  // If we have leftover letters (either from reaching 6 pieces or algorithm limitations),
  // add them to existing pieces
  if (totalUsedLetters < availableLetters.length && pieces.length > 0) {
    const remainingLetters = availableLetters.filter((letter) => {
      const key = `${letter.position.row},${letter.position.col}`;
      return !usedGrid.has(key);
    });

    // Add remaining letters to the pieces that have room (< 5 letters)
    // If no pieces have room, add to the smallest pieces first
    for (const remainingLetter of remainingLetters) {
      let pieceWithRoom = pieces.find((piece) => piece.letters.length < 5);

      if (!pieceWithRoom) {
        // If no pieces have room for more letters, add to the smallest piece
        pieceWithRoom = pieces.reduce((smallest, current) =>
          current.letters.length < smallest.letters.length ? current : smallest
        );
      }

      if (pieceWithRoom) {
        pieceWithRoom.letters.push(remainingLetter.letter);
        // Extend shape horizontally
        const maxCol = Math.max(...pieceWithRoom.shape.map((pos) => pos.col));
        pieceWithRoom.shape.push({ row: 0, col: maxCol + 1 });
      }
    }
  }

  const finalTotalUsedLetters = pieces.reduce((sum, piece) => sum + piece.letters.length, 0);

  if (pieces.length === 0 || finalTotalUsedLetters !== availableLetters.length) {
    return null; // Failed to generate valid solution
  }

  // Convert to LetterPiece format
  return pieces.map((piece, index) => ({
    id: `piece-${index + 1}`,
    letters: piece.letters,
    shape: piece.shape,
    color: PIECE_COLORS[index % PIECE_COLORS.length] || '#EF4444',
  }));
};

// Find next available starting letter by scanning from 0,0 to 7,7
const findNextAvailableStartingLetter = (
  gridMap: Map<string, { letter: string; position: GridPosition }>,
  usedGrid: Set<string>
): { letter: string; position: GridPosition } | null => {
  // Scan from top-left to bottom-right as specified in algorithm
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const key = `${row},${col}`;
      const letterItem = gridMap.get(key);

      if (letterItem && !usedGrid.has(key)) {
        return letterItem;
      }
    }
  }

  return null;
};

// Generate piece using direction traversal algorithm from lettered.md
const generatePieceWithDirectionTraversal = (
  startingLetter: { letter: string; position: GridPosition },
  gridMap: Map<string, { letter: string; position: GridPosition }>,
  usedGrid: Set<string>,
  phrase: string,
  targetPieceSize?: number,
  retryIndex: number = 0
): { letters: string[]; positions: GridPosition[]; shape: GridPosition[] } | null => {
  const seed =
    phrase.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + retryIndex * 1000;
  const maxPieceSize = Math.min(5, targetPieceSize || 5);
  const minPieceSize = 2;

  // Initialize piece with starting letter
  const pieceLetters = [startingLetter.letter];
  const piecePositions = [startingLetter.position];

  // Direction vectors: up, down, left, right
  const directions = [
    { row: -1, col: 0 }, // up
    { row: 1, col: 0 }, // down
    { row: 0, col: -1 }, // left
    { row: 0, col: 1 }, // right
  ];

  // Recursive backtracking function
  const buildPiece = (
    currentPos: GridPosition,
    currentPath: GridPosition[],
    visitedInPath: Set<string>,
    randomSeed: number
  ): boolean => {
    // Check if piece is complete (reached desired size or no more moves)
    if (currentPath.length >= maxPieceSize) {
      return currentPath.length >= minPieceSize;
    }

    // If we've reached the target size, accept the piece
    if (currentPath.length >= (targetPieceSize || maxPieceSize)) {
      return true;
    }

    // Shuffle directions based on seed for deterministic randomness
    const shuffledDirections = [...directions].sort((a, b) => {
      const aHash = (a.row * 31 + a.col) * randomSeed;
      const bHash = (b.row * 31 + b.col) * randomSeed;
      return (aHash % 997) - (bHash % 997);
    });

    // Try each direction
    for (const direction of shuffledDirections) {
      const nextPos = {
        row: currentPos.row + direction.row,
        col: currentPos.col + direction.col,
      };

      // Check bounds
      if (nextPos.row < 0 || nextPos.row >= 8 || nextPos.col < 0 || nextPos.col >= 8) {
        continue;
      }

      const nextKey = `${nextPos.row},${nextPos.col}`;
      const nextLetter = gridMap.get(nextKey);

      // Check if position has a letter and is not used globally or in current piece
      if (!nextLetter || usedGrid.has(nextKey) || visitedInPath.has(nextKey)) {
        continue;
      }

      // Add to current path
      currentPath.push(nextPos);
      visitedInPath.add(nextKey);
      pieceLetters.push(nextLetter.letter);
      piecePositions.push(nextPos);

      // Recursively continue building
      const success = buildPiece(nextPos, currentPath, visitedInPath, randomSeed + 1);

      if (success) {
        return true;
      }

      // Backtrack: remove from current path
      currentPath.pop();
      visitedInPath.delete(nextKey);
      pieceLetters.pop();
      piecePositions.pop();
    }

    // Check if we reached the starting letter again - if so, backtrack to try different starting letter
    const hasCircledBack =
      currentPath.length > 1 &&
      currentPos.row === startingLetter.position.row &&
      currentPos.col === startingLetter.position.col;

    if (hasCircledBack) {
      return false; // Force backtrack to try different starting letter
    }

    // If we have at least minimum size, accept the piece
    return currentPath.length >= minPieceSize;
  };

  // Start the recursive building process
  const initialPath = [startingLetter.position];
  const initialVisited = new Set([`${startingLetter.position.row},${startingLetter.position.col}`]);

  const success = buildPiece(startingLetter.position, initialPath, initialVisited, seed);

  if (!success || pieceLetters.length < minPieceSize) {
    return null;
  }

  // Create normalized shape
  const minRow = Math.min(...piecePositions.map((p) => p.row));
  const minCol = Math.min(...piecePositions.map((p) => p.col));
  const shape = piecePositions.map((p) => ({
    row: p.row - minRow,
    col: p.col - minCol,
  }));

  // Validate piece connectivity (sides only)
  if (!validatePieceConnectivity(shape)) {
    return null;
  }

  return {
    letters: pieceLetters,
    positions: piecePositions,
    shape,
  };
};

// Backtracking algorithm for piece generation
const backtrackPieceGeneration = (
  availableLetters: Array<{ letter: string; position: GridPosition }>,
  targetSizes: number[],
  currentPieces: Array<{ letters: string[]; positions: GridPosition[]; shape: GridPosition[] }>,
  usedPositions: Set<string>,
  seed: number
): Array<{ letters: string[]; positions: GridPosition[]; shape: GridPosition[] }> | null => {
  // Base case: all pieces generated
  if (currentPieces.length >= targetSizes.length) {
    // Check if all letters are used
    const totalUsed = currentPieces.reduce((sum, piece) => sum + piece.letters.length, 0);

    if (totalUsed === availableLetters.length) {
      return currentPieces;
    } else if (totalUsed < availableLetters.length) {
      // Handle remaining letters by adding them to existing pieces
      const remainingCount = availableLetters.length - totalUsed;
      const finalPieces = [...currentPieces];

      // Find pieces with room to add letters (less than 5 letters)
      const piecesWithRoom = finalPieces.filter((piece) => piece.letters.length < 5);

      if (
        piecesWithRoom.length > 0 &&
        remainingCount <=
          piecesWithRoom.length * (5 - Math.min(...piecesWithRoom.map((p) => p.letters.length)))
      ) {
        // We can distribute remaining letters to existing pieces
        const unusedLetters = availableLetters.filter((letter) => {
          const posKey = `${letter.position.row},${letter.position.col}`;
          return !usedPositions.has(posKey);
        });

        let letterIndex = 0;
        for (const piece of piecesWithRoom) {
          while (piece.letters.length < 5 && letterIndex < unusedLetters.length) {
            const letter = unusedLetters[letterIndex];
            if (letter) {
              piece.letters.push(letter.letter);
              // Extend shape
              const maxCol = Math.max(...piece.shape.map((pos) => pos.col));
              piece.shape.push({ row: 0, col: maxCol + 1 });
            }
            letterIndex++;
          }
          if (letterIndex >= unusedLetters.length) break;
        }

        return finalPieces;
      }
    }

    return null;
  }

  const currentPieceIndex = currentPieces.length;
  const targetSize = targetSizes[currentPieceIndex];

  // Find unused starting positions
  const unusedLetters = availableLetters.filter((letter) => {
    const posKey = `${letter.position.row},${letter.position.col}`;
    return !usedPositions.has(posKey);
  });

  if (unusedLetters.length === 0) {
    return null; // No more letters available
  }

  // Try different starting positions (deterministic order based on seed)
  const startPositions = [...unusedLetters].sort((a, b) => {
    const aKey = a.position.row * 8 + a.position.col;
    const bKey = b.position.row * 8 + b.position.col;
    return ((aKey + seed + currentPieceIndex) % 997) - ((bKey + seed + currentPieceIndex) % 997);
  });

  for (const startLetter of startPositions) {
    const piece = generateConnectedPiece(
      startLetter,
      targetSize || 2,
      availableLetters,
      usedPositions,
      seed + currentPieceIndex
    );

    if (piece && piece.letters.length >= 2 && piece.letters.length <= 5) {
      // Add this piece and recurse
      const newUsedPositions = new Set(usedPositions);
      for (const pos of piece.positions) {
        newUsedPositions.add(`${pos.row},${pos.col}`);
      }

      const result = backtrackPieceGeneration(
        availableLetters,
        targetSizes,
        [...currentPieces, piece],
        newUsedPositions,
        seed
      );

      if (result) {
        return result;
      }
    }
  }

  return null; // No valid piece found from any starting position
};

// Generate a connected piece starting from a specific letter
const generateConnectedPiece = (
  startLetter: { letter: string; position: GridPosition },
  targetSize: number,
  availableLetters: Array<{ letter: string; position: GridPosition }>,
  usedPositions: Set<string>,
  seed: number
): { letters: string[]; positions: GridPosition[]; shape: GridPosition[] } | null => {
  const pieceLetters = [startLetter.letter];
  const piecePositions = [startLetter.position];
  const pieceUsed = new Set([`${startLetter.position.row},${startLetter.position.col}`]);

  // Add starting position to used set for this piece generation
  const tempUsed = new Set(usedPositions);
  tempUsed.add(`${startLetter.position.row},${startLetter.position.col}`);

  let attempts = 0;
  const maxAttempts = availableLetters.length * 2;

  while (pieceLetters.length < targetSize && attempts < maxAttempts) {
    // Find adjacent unused letters
    const adjacentCandidates = availableLetters.filter((letter) => {
      const posKey = `${letter.position.row},${letter.position.col}`;

      if (tempUsed.has(posKey) || pieceUsed.has(posKey)) {
        return false;
      }

      // Check if adjacent to any letter in current piece (sides only, not corners)
      return piecePositions.some((pos) => {
        const rowDiff = Math.abs(pos.row - letter.position.row);
        const colDiff = Math.abs(pos.col - letter.position.col);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
      });
    });

    if (adjacentCandidates.length === 0) {
      break; // No more adjacent letters available
    }

    // Select next letter deterministically
    const candidateIndex = (seed + attempts + pieceLetters.length) % adjacentCandidates.length;
    const nextLetter = adjacentCandidates[candidateIndex];

    if (nextLetter) {
      pieceLetters.push(nextLetter.letter);
      piecePositions.push(nextLetter.position);
      const posKey = `${nextLetter.position.row},${nextLetter.position.col}`;
      pieceUsed.add(posKey);
      tempUsed.add(posKey);
    }

    attempts++;
  }

  if (pieceLetters.length < 2) {
    return null; // Piece must have at least 2 letters
  }

  // Create normalized shape
  const minRow = Math.min(...piecePositions.map((p) => p.row));
  const minCol = Math.min(...piecePositions.map((p) => p.col));
  const shape = piecePositions.map((p) => ({
    row: p.row - minRow,
    col: p.col - minCol,
  }));

  // Validate piece connectivity (sides only)
  if (!validatePieceConnectivity(shape)) {
    return null;
  }

  return {
    letters: pieceLetters,
    positions: piecePositions,
    shape,
  };
};

// Validate that a piece is properly connected via sides
const validatePieceConnectivity = (shape: GridPosition[]): boolean => {
  if (shape.length <= 1) return true;

  // Check that each position (except first) is connected to at least one other via sides
  for (let i = 0; i < shape.length; i++) {
    const pos = shape[i];
    if (!pos) continue;

    const hasConnection = shape.some((other, j) => {
      if (i === j || !other) return false;
      const rowDiff = Math.abs(pos.row - other.row);
      const colDiff = Math.abs(pos.col - other.col);
      return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    });

    if (!hasConnection) {
      return false;
    }
  }

  return true;
};

// Create fallback pieces when backtracking fails
const createFallbackPieces = (
  availableLetters: Array<{ letter: string; position: GridPosition }>
): LetterPiece[] => {
  const pieces: LetterPiece[] = [];
  const used = new Set<string>();

  // Group letters into simple linear pieces
  for (let i = 0; i < availableLetters.length; i++) {
    const letter = availableLetters[i];
    if (!letter) continue;

    const posKey = `${letter.position.row},${letter.position.col}`;

    if (used.has(posKey)) continue;

    const pieceLetters = [letter.letter];
    const piecePositions = [letter.position];
    used.add(posKey);

    // Try to add one more adjacent letter
    for (const otherLetter of availableLetters) {
      if (!otherLetter) continue;

      const otherPosKey = `${otherLetter.position.row},${otherLetter.position.col}`;
      if (used.has(otherPosKey)) continue;

      const rowDiff = Math.abs(letter.position.row - otherLetter.position.row);
      const colDiff = Math.abs(letter.position.col - otherLetter.position.col);

      if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
        pieceLetters.push(otherLetter.letter);
        piecePositions.push(otherLetter.position);
        used.add(otherPosKey);
        break;
      }
    }

    // Ensure minimum 2 letters per piece
    if (pieceLetters.length < 2) {
      continue; // Skip single letter pieces
    }

    // Create simple shape
    const shape = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ];

    pieces.push({
      id: `piece-${pieces.length + 1}`,
      letters: pieceLetters,
      shape,
      color: PIECE_COLORS[pieces.length % PIECE_COLORS.length] || '#EF4444',
    });
  }

  // Handle any remaining single letters by adding them to existing pieces
  const remainingLetters = availableLetters.filter((letter) => {
    if (!letter) return false;
    const posKey = `${letter.position.row},${letter.position.col}`;
    return !used.has(posKey);
  });

  for (const remainingLetter of remainingLetters) {
    if (!remainingLetter) continue;

    // Find the smallest piece to add this letter to
    if (pieces.length === 0) continue;

    let smallestPiece = pieces[0];
    if (!smallestPiece) continue;

    for (const piece of pieces) {
      if (piece.letters.length < smallestPiece.letters.length) {
        smallestPiece = piece;
      }
    }

    if (smallestPiece && smallestPiece.letters.length < 5) {
      smallestPiece.letters.push(remainingLetter.letter);
      // Extend the shape horizontally
      const maxCol = Math.max(...smallestPiece.shape.map((pos) => pos.col));
      smallestPiece.shape.push({ row: 0, col: maxCol + 1 });
    }
  }

  return pieces;
};

// Generate a complete mock game
export const generateMockGame = (category: string, phrase: string): LetteredGameData => {
  let grid = createEmptyGrid();

  try {
    grid = placePhraseOnGrid(grid, phrase);
    grid = addPreFilledLetters(grid, phrase);
    const pieces = generateLetterPieces(grid, phrase);

    return {
      id: 'mock-game-1',
      category,
      phrase,
      grid,
      pieces,
      solution: [], // Would be calculated based on piece placement
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating mock game:', error);
    // Return a simpler fallback game
    return generateFallbackGame(category, phrase);
  }
};

// Fallback game with a simpler layout
const generateFallbackGame = (category: string, phrase: string): LetteredGameData => {
  const grid = createEmptyGrid();
  const words = phrase.toUpperCase().split(' ');

  // Simple horizontal layout
  const currentRow = 2;
  let currentCol = 1;

  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      if (currentCol < 8 && grid[currentRow]?.[currentCol]) {
        grid[currentRow][currentCol] = {
          letter: word[i] || null,
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
        isPreFilled: false,
        isSpace: true,
        isUnused: false,
      };
      currentCol++;
    }
  }

  const pieces = generateLetterPieces(grid, phrase);

  return {
    id: 'fallback-game-1',
    category,
    phrase,
    grid,
    pieces,
    solution: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

// Sample mock games
export const MOCK_GAMES = [
  generateMockGame('Things people say when eating it', 'Peanut butter is good'),
  generateMockGame('Common phrases', 'Better late than never'),
  generateMockGame('Food items', 'Pizza and burgers'),
  generateMockGame('Food items', 'Break a leg out there'),
  generateMockGame('Food items', 'Twenty percent is too much'),
  generateMockGame('Food items', 'Yippie ki yay mother lover'),
];
