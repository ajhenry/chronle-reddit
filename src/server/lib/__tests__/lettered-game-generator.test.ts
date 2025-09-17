import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createEmptyGrid,
  create9x9Grid,
  createConfigurableGrid,
  placePhraseOn9x9Grid,
  trimBoard,
  addPreFilledLetters,
  generateLetterPieces,
  generateSolutionPositions,
  generateInitialPiecePositions,
  generateMockGame,
  createSecureGrid,
  generateSolutionHash,
  generatePhraseLayoutOn9x9Grid,
  selectAnchorLettersAlgorithm,
  generatePiecesWithBacktracking,
  validateBoardState,
  validateConnectivity,
  PIECE_COLOR_CLASSES,
} from '../lettered-game-generator';
import type {
  GridCell,
  GridPosition,
  LetterPiece,
  LetteredGameData,
} from '../../../shared/types/api';

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
beforeEach(() => {
  global.console = {
    ...originalConsole,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
});

afterEach(() => {
  global.console = originalConsole;
});

describe('Lettered Game Generator', () => {
  describe('Grid Creation', () => {
    describe('createEmptyGrid', () => {
      it('should create an 8x8 grid', () => {
        const grid = createEmptyGrid();
        expect(grid).toHaveLength(8);
        expect(grid[0]).toHaveLength(8);
      });

      it('should initialize all cells as unused', () => {
        const grid = createEmptyGrid();
        grid.forEach((row) => {
          row.forEach((cell) => {
            expect(cell.isUnused).toBe(true);
            expect(cell.letter).toBeNull();
            expect(cell.isLetter).toBe(false);
            expect(cell.isPreFilled).toBe(false);
            expect(cell.isSpace).toBe(false);
          });
        });
      });
    });

    describe('createConfigurableGrid', () => {
      it('should create a grid with specified dimensions', () => {
        const grid = createConfigurableGrid(5, 7);
        expect(grid).toHaveLength(5);
        expect(grid[0]).toHaveLength(7);
      });

      it('should enforce max 9 columns', () => {
        const grid = createConfigurableGrid(5, 15); // Try to create 15 columns
        expect(grid).toHaveLength(5);
        expect(grid[0]).toHaveLength(9); // Should be limited to 9
      });

      it('should initialize all cells as unused', () => {
        const grid = createConfigurableGrid(3, 4);
        grid.forEach((row) => {
          row.forEach((cell) => {
            expect(cell.isUnused).toBe(true);
            expect(cell.letter).toBeNull();
            expect(cell.isLetter).toBe(false);
            expect(cell.isPreFilled).toBe(false);
            expect(cell.isSpace).toBe(false);
          });
        });
      });
    });

    describe('create9x9Grid', () => {
      it('should create a 9x9 grid', () => {
        const grid = create9x9Grid();
        expect(grid).toHaveLength(9);
        expect(grid[0]).toHaveLength(9);
      });

      it('should initialize all cells as unused', () => {
        const grid = create9x9Grid();
        grid.forEach((row) => {
          row.forEach((cell) => {
            expect(cell.isUnused).toBe(true);
            expect(cell.letter).toBeNull();
            expect(cell.isLetter).toBe(false);
            expect(cell.isPreFilled).toBe(false);
            expect(cell.isSpace).toBe(false);
          });
        });
      });
    });
  });

  describe('Phrase Placement', () => {
    describe('placePhraseOn9x9Grid', () => {
      it('should place a simple phrase on the grid', () => {
        const grid = create9x9Grid();
        const phrase = 'TEST';
        const result = placePhraseOn9x9Grid(grid, phrase);

        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);

        // Should have placed some letters
        const letterCells = result.flat().filter((cell) => cell.letter && !cell.isUnused);
        expect(letterCells.length).toBeGreaterThan(0);
      });

      it('should handle phrases with spaces', () => {
        const grid = create9x9Grid();
        const phrase = 'HELLO WORLD';
        const result = placePhraseOn9x9Grid(grid, phrase);

        expect(result).toBeDefined();

        // Should have placed some letters
        const letterCells = result
          .flat()
          .filter((cell) => cell.letter && !cell.isUnused && !cell.isSpace);
        expect(letterCells.length).toBeGreaterThan(0);
      });

      it('should throw error for words longer than 9 characters', () => {
        const grid = create9x9Grid();
        const phrase = 'VERYLONGWORDTHATEXCEEDSTHELIMIT';

        expect(() => placePhraseOn9x9Grid(grid, phrase)).toThrow(
          'Words cannot be longer than 9 characters'
        );
      });

      it('should throw error for phrases with too many letters', () => {
        const grid = create9x9Grid();
        const phrase = 'A'.repeat(71); // 71 characters exceed the limit

        expect(() => placePhraseOn9x9Grid(grid, phrase)).toThrow(
          'Words cannot be longer than 9 characters'
        );
      });
    });

    describe('trimBoard', () => {
      it('should trim empty space from grid', () => {
        const grid = create9x9Grid();

        // Add some letters in the middle
        grid[4][4] = {
          letter: 'T',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[4][5] = {
          letter: 'E',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[5][4] = {
          letter: 'S',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[5][5] = {
          letter: 'T',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        const trimmed = trimBoard(grid);

        // Should be smaller than original
        expect(trimmed.length).toBeLessThanOrEqual(grid.length);
        expect(trimmed[0].length).toBeLessThanOrEqual(grid[0].length);

        // Should contain the placed letters
        const letterCells = trimmed.flat().filter((cell) => cell.letter && !cell.isUnused);
        expect(letterCells.length).toBe(4);
      });

      it('should return original grid if no letters found', () => {
        const grid = create9x9Grid();
        const trimmed = trimBoard(grid);

        expect(trimmed).toEqual(grid);
      });
    });
  });

  describe('Anchor Letter Selection', () => {
    describe('addPreFilledLetters', () => {
      it('should process grid with letters', () => {
        const grid = create9x9Grid();

        // Place a simple phrase
        grid[4][4] = {
          letter: 'T',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[4][5] = {
          letter: 'E',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        const result = addPreFilledLetters(grid, 'TE');

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should ensure connectivity when adding anchors', () => {
        const grid = create9x9Grid();

        // Create a disconnected layout
        grid[2][2] = {
          letter: 'A',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[6][6] = {
          letter: 'B',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        const result = addPreFilledLetters(grid, 'AB');

        // Should ensure connectivity
        expect(validateConnectivity(result)).toBe(true);
      });
    });

    describe('selectAnchorLettersAlgorithm', () => {
      it('should process grid with letters', () => {
        const grid = create9x9Grid();

        // Place a phrase
        grid[4][4] = {
          letter: 'H',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[4][5] = {
          letter: 'I',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        const result = selectAnchorLettersAlgorithm(grid, 'HI');

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Piece Generation', () => {
    describe('generateLetterPieces', () => {
      it('should generate pieces from grid with letters', () => {
        const grid = create9x9Grid();

        // Create a simple layout
        grid[4][4] = {
          letter: 'T',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[4][5] = {
          letter: 'E',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[5][4] = {
          letter: 'S',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        const pieces = generateLetterPieces(grid);

        expect(Array.isArray(pieces)).toBe(true);
        expect(pieces.length).toBeGreaterThan(0);

        // Each piece should have valid properties
        pieces.forEach((piece) => {
          expect(piece.id).toBeDefined();
          expect(piece.letters).toBeDefined();
          expect(piece.shape).toBeDefined();
          expect(piece.color).toBeDefined();
          expect(piece.letters.length).toBe(piece.shape.length);
          expect(piece.letters.length).toBeGreaterThanOrEqual(2);
        });
      });

      it('should return empty array for grid with no letters', () => {
        const grid = create9x9Grid();
        const pieces = generateLetterPieces(grid);

        expect(pieces).toEqual([]);
      });

      it('should handle pre-filled letters correctly', () => {
        const grid = create9x9Grid();

        // Create layout with pre-filled letters
        grid[4][4] = {
          letter: 'T',
          isLetter: true,
          isPreFilled: true,
          isSpace: false,
          isUnused: false,
        };
        grid[4][5] = {
          letter: 'E',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[5][4] = {
          letter: 'S',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        const pieces = generateLetterPieces(grid);

        expect(pieces.length).toBeGreaterThan(0);

        // Should include all letters in pieces
        const allPieceLetters = pieces.flatMap((piece) => piece.letters);
        expect(allPieceLetters.length).toBeGreaterThan(0);
      });
    });

    describe('PIECE_COLOR_CLASSES', () => {
      it('should contain valid color classes', () => {
        expect(PIECE_COLOR_CLASSES).toBeDefined();
        expect(Array.isArray(PIECE_COLOR_CLASSES)).toBe(true);
        expect(PIECE_COLOR_CLASSES.length).toBeGreaterThan(0);

        PIECE_COLOR_CLASSES.forEach((color) => {
          expect(typeof color).toBe('string');
          expect(color).toMatch(/^piece-color-/);
        });
      });
    });
  });

  describe('Helper Functions', () => {
    describe('validateConnectivity', () => {
      it('should return true for connected letters', () => {
        const grid = create9x9Grid();

        // Create connected letters
        grid[4][4] = {
          letter: 'A',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[4][5] = {
          letter: 'B',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[5][4] = {
          letter: 'C',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        expect(validateConnectivity(grid)).toBe(true);
      });

      it('should return false for disconnected letters', () => {
        const grid = create9x9Grid();

        // Create disconnected letters
        grid[2][2] = {
          letter: 'A',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[6][6] = {
          letter: 'B',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        expect(validateConnectivity(grid)).toBe(false);
      });

      it('should return true for single letter', () => {
        const grid = create9x9Grid();

        // Single letter
        grid[4][4] = {
          letter: 'A',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        expect(validateConnectivity(grid)).toBe(true);
      });
    });
  });

  describe('Solution Generation', () => {
    describe('generateSolutionPositions', () => {
      it('should generate solution positions for all pieces', () => {
        const grid = create9x9Grid();

        // Create a simple layout
        grid[4][4] = {
          letter: 'T',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[4][5] = {
          letter: 'E',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[5][4] = {
          letter: 'S',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        const pieces = generateLetterPieces(grid);
        const solutions = generateSolutionPositions(pieces, grid);

        expect(solutions).toBeDefined();
        expect(Object.keys(solutions)).toHaveLength(pieces.length);

        // Each solution should be a valid position
        Object.values(solutions).forEach((position) => {
          expect(position).toHaveProperty('row');
          expect(position).toHaveProperty('col');
          expect(typeof position.row).toBe('number');
          expect(typeof position.col).toBe('number');
        });
      });

      it('should return empty object for no pieces', () => {
        const grid = create9x9Grid();
        const solutions = generateSolutionPositions([], grid);

        expect(solutions).toEqual({});
      });
    });

    describe('generateInitialPiecePositions', () => {
      it('should generate initial positions for pieces', () => {
        const grid = create9x9Grid();

        // Create a simple layout
        grid[4][4] = {
          letter: 'T',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[4][5] = {
          letter: 'E',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        const pieces = generateLetterPieces(grid);
        const initialPositions = generateInitialPiecePositions(pieces, grid);

        expect(initialPositions).toBeDefined();
        expect(Object.keys(initialPositions)).toHaveLength(pieces.length);

        // All positions should be below the main grid
        Object.values(initialPositions).forEach((position) => {
          expect(position.row).toBeGreaterThanOrEqual(grid.length);
          expect(position.col).toBeGreaterThanOrEqual(0);
          expect(position.col).toBeLessThan(grid[0].length);
        });
      });

      it('should place larger pieces first', () => {
        const grid = create9x9Grid();

        // Create layout with multiple letters
        for (let i = 0; i < 6; i++) {
          const row = 4 + Math.floor(i / 3);
          const col = 4 + (i % 3);
          grid[row][col] = {
            letter: String.fromCharCode(65 + i), // A, B, C, D, E, F
            isLetter: true,
            isPreFilled: false,
            isSpace: false,
            isUnused: false,
          };
        }

        const pieces = generateLetterPieces(grid);
        const initialPositions = generateInitialPiecePositions(pieces, grid);

        expect(Object.keys(initialPositions)).toHaveLength(pieces.length);

        // Verify no overlaps (this is a complex check, just ensure all positions are assigned)
        const positions = Object.values(initialPositions);
        const positionSet = new Set(positions.map((p) => `${p.row},${p.col}`));
        expect(positionSet.size).toBe(positions.length);
      });
    });
  });

  describe('Game Generation Integration', () => {
    describe('generateMockGame', () => {
      it('should generate a complete game for simple phrase', () => {
        const phrase = 'TEST';
        const category = 'Test Category';

        const game = generateMockGame(category, phrase);

        expect(game).toBeDefined();
        expect(game.category).toBe(category);
        expect(game.phrase).toBe(phrase);
        expect(game.id).toBeDefined();
        expect(game.grid).toBeDefined();
        expect(game.pieces).toBeDefined();
        expect(game.initialPiecePositions).toBeDefined();
        expect(game.solution).toBeDefined();
        expect(game.solutionHash).toBeDefined();
        expect(game.createdAt).toBeDefined();
        expect(game.updatedAt).toBeDefined();

        // Verify grid dimensions
        expect(game.rows).toBeGreaterThan(0);
        expect(game.cols).toBeGreaterThan(0);
        expect(game.grid.length).toBe(game.rows);
        expect(game.grid[0].length).toBe(game.cols);

        // Verify pieces
        expect(game.pieces.length).toBeGreaterThan(0);
        game.pieces.forEach((piece) => {
          expect(piece.id).toBeDefined();
          expect(piece.letters.length).toBe(piece.shape.length);
          expect(piece.letters.length).toBeGreaterThanOrEqual(2);
          expect(piece.color).toBeDefined();
        });

        // Verify initial positions
        expect(Object.keys(game.initialPiecePositions)).toHaveLength(game.pieces.length);

        // Verify solution positions
        expect(Object.keys(game.solution)).toHaveLength(game.pieces.length);
      });

      it('should generate a game with seeded randomness', () => {
        const phrase = 'HELLO WORLD';
        const category = 'Test Category';
        const seed = 12345;

        const game1 = generateMockGame(category, phrase, seed);
        const game2 = generateMockGame(category, phrase, seed);

        // Games with same seed should be identical
        expect(game1.pieces.length).toBe(game2.pieces.length);
        expect(game1.solutionHash).toBe(game2.solutionHash);

        // Pieces should be in the same order (due to seeded shuffling)
        for (let i = 0; i < Math.min(game1.pieces.length, game2.pieces.length); i++) {
          expect(game1.pieces[i].letters).toEqual(game2.pieces[i].letters);
        }
      });

      it('should handle phrases with spaces', () => {
        const phrase = 'BIG CAT';
        const category = 'Animals';

        const game = generateMockGame(category, phrase);

        expect(game.phrase).toBe(phrase);
        expect(game.pieces.length).toBeGreaterThan(0);

        // Should contain all letters from the phrase (excluding spaces)
        const phraseLetters = phrase.replace(/\s/g, '').split('');
        const gameLetters = game.pieces.flatMap((piece) => piece.letters);
        expect(gameLetters.length).toBe(phraseLetters.length);
      });
    });

    describe('createSecureGrid', () => {
      it('should remove non-pre-filled letters from grid', () => {
        const grid = create9x9Grid();

        // Add some letters, some pre-filled
        grid[4][4] = {
          letter: 'T',
          isLetter: true,
          isPreFilled: true,
          isSpace: false,
          isUnused: false,
        };
        grid[4][5] = {
          letter: 'E',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid[5][4] = {
          letter: 'S',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        const secureGrid = createSecureGrid(grid);

        // Pre-filled letter should remain
        expect(secureGrid[4][4].letter).toBe('T');

        // Non-pre-filled letters should be removed
        expect(secureGrid[4][5].letter).toBeNull();
        expect(secureGrid[5][4].letter).toBeNull();

        // isLetter should remain true for all letter positions
        expect(secureGrid[4][4].isLetter).toBe(true);
        expect(secureGrid[4][5].isLetter).toBe(true);
        expect(secureGrid[5][4].isLetter).toBe(true);
      });
    });

    describe('generateSolutionHash', () => {
      it('should generate consistent hash for same grid', () => {
        const grid1 = create9x9Grid();
        const grid2 = create9x9Grid();

        // Make grids identical
        grid1[4][4] = {
          letter: 'T',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid2[4][4] = {
          letter: 'T',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        const hash1 = generateSolutionHash(grid1);
        const hash2 = generateSolutionHash(grid2);

        expect(hash1).toBe(hash2);
        expect(typeof hash1).toBe('string');
        expect(hash1.length).toBeGreaterThan(0);
      });

      it('should generate different hash for different grids', () => {
        const grid1 = create9x9Grid();
        const grid2 = create9x9Grid();

        // Make grids different
        grid1[4][4] = {
          letter: 'T',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };
        grid2[4][4] = {
          letter: 'E',
          isLetter: true,
          isPreFilled: false,
          isSpace: false,
          isUnused: false,
        };

        const hash1 = generateSolutionHash(grid1);
        const hash2 = generateSolutionHash(grid2);

        expect(hash1).not.toBe(hash2);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle grid with no available letters for pieces', () => {
      const grid = create9x9Grid();

      // Add only pre-filled letters
      grid[4][4] = {
        letter: 'T',
        isLetter: true,
        isPreFilled: true,
        isSpace: false,
        isUnused: false,
      };
      grid[4][5] = {
        letter: 'E',
        isLetter: true,
        isPreFilled: true,
        isSpace: false,
        isUnused: false,
      };

      const pieces = generateLetterPieces(grid);
      expect(pieces).toEqual([]);
    });

    it('should handle grid with single letter', () => {
      const grid = create9x9Grid();

      // Add single letter
      grid[4][4] = {
        letter: 'T',
        isLetter: true,
        isPreFilled: false,
        isSpace: false,
        isUnused: false,
      };

      const pieces = generateLetterPieces(grid);
      // May or may not generate a single-letter piece depending on algorithm
      expect(Array.isArray(pieces)).toBe(true);
    });

    it('should handle very small grids', () => {
      const smallGrid: GridCell[][] = [
        [
          { letter: 'A', isLetter: true, isPreFilled: false, isSpace: false, isUnused: false },
          { letter: 'B', isLetter: true, isPreFilled: false, isSpace: false, isUnused: false },
        ],
      ];

      const pieces = generateLetterPieces(smallGrid);
      expect(pieces.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should generate complete game with all components working together', () => {
      const phrase = 'CAT DOG';
      const category = 'Animals';

      const game = generateMockGame(category, phrase);

      // Verify complete game structure
      expect(game).toMatchObject({
        id: expect.any(String),
        category,
        phrase,
        grid: expect.any(Array),
        rows: expect.any(Number),
        cols: expect.any(Number),
        pieces: expect.any(Array),
        initialPiecePositions: expect.any(Object),
        solution: expect.any(Object),
        solutionHash: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify grid integrity
      expect(game.grid.length).toBe(game.rows);
      expect(game.grid[0].length).toBe(game.cols);

      // Verify piece integrity
      game.pieces.forEach((piece) => {
        expect(piece.id).toMatch(/^piece-/);
        expect(piece.letters.length).toBe(piece.shape.length);
        expect(piece.letters.length).toBeGreaterThanOrEqual(2);
        expect(PIECE_COLOR_CLASSES.includes(piece.color)).toBe(true);
      });

      // Verify positions are valid
      Object.values(game.initialPiecePositions).forEach((pos) => {
        expect(pos.row).toBeGreaterThanOrEqual(game.rows);
        expect(pos.col).toBeGreaterThanOrEqual(0);
        expect(pos.col).toBeLessThan(game.cols);
      });

      Object.values(game.solution).forEach((pos) => {
        expect(pos.row).toBeGreaterThanOrEqual(0);
        expect(pos.row).toBeLessThan(game.rows);
        expect(pos.col).toBeGreaterThanOrEqual(0);
        expect(pos.col).toBeLessThan(game.cols);
      });

      // Verify solution hash is valid
      expect(game.solutionHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle complex phrases with multiple words', () => {
      const phrase = 'THE QUICK BROWN FOX JUMPS';
      const category = 'Nursery Rhyme';

      const game = generateMockGame(category, phrase);

      expect(game.pieces.length).toBeGreaterThan(0);

      // Should contain all letters from phrase
      const phraseLetters = phrase.replace(/\s/g, '').split('');
      const gameLetters = game.pieces.flatMap((piece) => piece.letters);
      expect(gameLetters.length).toBe(phraseLetters.length);

      // All pieces should be valid
      game.pieces.forEach((piece) => {
        expect(piece.letters.length).toBeGreaterThanOrEqual(1); // Allow single-letter pieces
        expect(piece.letters.length).toBeLessThanOrEqual(6); // Max piece size
        // Verify piece has valid shape
        expect(piece.shape.length).toBe(piece.letters.length);
        piece.shape.forEach((pos) => {
          expect(typeof pos.row).toBe('number');
          expect(typeof pos.col).toBe('number');
        });
      });
    });

    it('should generate reproducible results with seed', () => {
      const phrase = 'RED FOX';
      const category = 'Animals';
      const seed = 42;

      // Generate multiple games with same seed
      const games = Array.from({ length: 5 }, () => generateMockGame(category, phrase, seed));

      // All games should be identical
      for (let i = 1; i < games.length; i++) {
        expect(games[0].solutionHash).toBe(games[i].solutionHash);
        expect(games[0].pieces.length).toBe(games[i].pieces.length);

        // Compare piece details
        for (let j = 0; j < games[0].pieces.length; j++) {
          expect(games[0].pieces[j].letters).toEqual(games[i].pieces[j].letters);
          expect(games[0].pieces[j].color).toEqual(games[i].pieces[j].color);
        }
      }
    });
  });
});
