import { LetteredGameData, GridPosition, LetterPiece, GridCell } from '../../shared/types/api';

export type GameStateUpdateCallback = (updates: Partial<GameState>) => void;

export interface GameState {
  score: number;
  initialScore: number;
  gameComplete: boolean;
  gameWon: boolean;
  boardLayout: GridCell[][]; // Current state of the board
  placedPieces: Map<string, GridPosition>; // piece ID -> position
  lastValidPositions: Map<string, GridPosition>; // For undo functionality
  scoreDecayRate: number; // Points lost per second
  scoreDecayInterval: number; // Milliseconds between decay
  lastScoreUpdate: number; // Timestamp of last score update
  gameStartTime: number;
  gameData: LetteredGameData | null;
  timerDisabled: boolean; // Whether the score decay timer is disabled
}

export class LetteredGameStateManager {
  private state: GameState;
  private scoreDecayTimer: ReturnType<typeof setTimeout> | null = null;
  private updateCallbacks: GameStateUpdateCallback[] = [];

  constructor(gameData: LetteredGameData | null = null) {
    this.state = this.createInitialState(gameData);
    this.startScoreDecay();
    this.notifyUpdates(this.state);
  }

  private createInitialState(gameData: LetteredGameData | null): GameState {
    return {
      score: 5000,
      initialScore: 5000,
      gameComplete: false,
      gameWon: false,
      boardLayout: gameData?.grid || [],
      placedPieces: new Map(),
      lastValidPositions: new Map(),
      scoreDecayRate: 10, // 10 points per second
      scoreDecayInterval: 1000, // Update every second
      lastScoreUpdate: Date.now(),
      gameStartTime: Date.now(),
      gameData,
      timerDisabled: true,
    };
  }

  // Subscribe to state updates
  onUpdate(callback: GameStateUpdateCallback): () => void {
    this.updateCallbacks.push(callback);
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  // Notify all subscribers of state changes
  private notifyUpdates(updates: Partial<GameState>): void {
    this.updateCallbacks.forEach((callback) => callback(updates));
  }

  // Get current state (read-only)
  getState(): Readonly<GameState> {
    return { ...this.state };
  }

  // Initialize game with new data
  initializeGame(gameData: LetteredGameData): void {
    this.stopScoreDecay();
    this.state = this.createInitialState(gameData);
    this.startScoreDecay();
    this.notifyUpdates(this.state);
  }

  // Start score decay timer
  startScoreDecay(): void {
    if (this.scoreDecayTimer) {
      clearInterval(this.scoreDecayTimer);
    }

    // Don't start timer if disabled
    if (this.state.timerDisabled) {
      return;
    }

    this.scoreDecayTimer = setInterval(() => {
      if (!this.state.gameComplete) {
        const now = Date.now();
        const timeDiff = now - this.state.lastScoreUpdate;
        const decayAmount = Math.floor((timeDiff / 1000) * this.state.scoreDecayRate);

        if (decayAmount > 0) {
          this.state.score = Math.max(0, this.state.score - decayAmount);
          this.state.lastScoreUpdate = now;

          this.notifyUpdates({ score: this.state.score });
        }
      }
    }, this.state.scoreDecayInterval);
  }

  // Stop score decay timer
  stopScoreDecay(): void {
    if (this.scoreDecayTimer) {
      clearInterval(this.scoreDecayTimer);
      this.scoreDecayTimer = null;
    }
  }

  // Set score decay rate
  setScoreDecayRate(rate: number): void {
    this.state.scoreDecayRate = rate;
    // Restart decay with new rate
    this.stopScoreDecay();
    this.startScoreDecay();
  }

  // Enable/disable timer
  setTimerEnabled(enabled: boolean): void {
    this.state.timerDisabled = !enabled;
    if (enabled) {
      this.startScoreDecay();
    } else {
      this.stopScoreDecay();
    }
  }

  // Check if timer is enabled
  isTimerEnabled(): boolean {
    return !this.state.timerDisabled;
  }

  // Place a piece on the board
  placePiece(pieceId: string, position: GridPosition): boolean {
    console.log(`🎯 Placing piece ${pieceId} at (${position.row}, ${position.col})`);

    // Prevent piece movement when game is complete
    if (this.state.gameComplete) {
      console.log('🚫 Cannot move pieces - game is complete');
      return false;
    }

    if (!this.state.gameData) {
      console.log('❌ No game data');
      return false;
    }

    const piece = this.state.gameData.pieces.find((p) => p.id === pieceId);
    if (!piece) {
      console.log(`❌ Piece ${pieceId} not found`);
      return false;
    }

    // Check if position is valid
    const validationResult = this.isValidPiecePlacement(piece, position);
    if (!validationResult.valid) {
      console.log(
        `❌ Invalid placement for piece ${pieceId} at (${position.row}, ${position.col}): ${validationResult.reason}`
      );
      return false;
    }

    console.log(
      `✅ Placing ${piece.letters.join('')} (${pieceId}) at (${position.row}, ${position.col})`
    );

    // Save current state for undo if needed
    this.state.lastValidPositions.set(pieceId, position);

    // Update placed pieces
    this.state.placedPieces.set(pieceId, position);

    // Update board layout (this would be used for visual feedback)
    this.updateBoardLayout();

    // Check if game is complete
    this.checkGameCompletion();

    this.notifyUpdates({
      placedPieces: new Map(this.state.placedPieces),
      boardLayout: this.state.boardLayout,
      gameComplete: this.state.gameComplete,
      gameWon: this.state.gameWon,
    });

    return true;
  }

  // Remove a piece from the board
  removePiece(pieceId: string): boolean {
    // Prevent piece movement when game is complete
    if (this.state.gameComplete) {
      console.log('🚫 Cannot remove pieces - game is complete');
      return false;
    }

    if (!this.state.placedPieces.has(pieceId)) {
      return false;
    }

    this.state.placedPieces.delete(pieceId);
    this.updateBoardLayout();

    this.notifyUpdates({
      placedPieces: new Map(this.state.placedPieces),
      boardLayout: this.state.boardLayout,
    });

    return true;
  }

  // Check if a piece placement is valid
  private isValidPiecePlacement(
    piece: LetterPiece,
    position: GridPosition
  ): { valid: boolean; reason: string | null } {
    if (!this.state.gameData) {
      return { valid: false, reason: 'No game data available' };
    }

    // Check if position is within bounds
    if (position.row < 0 || position.row >= 8 || position.col < 0 || position.col >= 8) {
      return { valid: false, reason: 'Position is out of bounds' };
    }

    // Check bounds and validity
    for (const shapePos of piece.shape) {
      const gridRow = position.row + shapePos.row;
      const gridCol = position.col + shapePos.col;

      if (gridRow < 0 || gridRow >= 8 || gridCol < 0 || gridCol >= 8) {
        return { valid: false, reason: 'Piece extends outside the game board' };
      }

      const cell = this.state.gameData.grid[gridRow]?.[gridCol];
      if (!cell || cell.isUnused || cell.isSpace) {
        return { valid: false, reason: 'Piece overlaps with invalid or empty grid cells' };
      }

      // Check if position conflicts with other placed pieces
      for (const [placedPieceId, placedPosition] of this.state.placedPieces.entries()) {
        if (placedPieceId === piece.id) continue; // Skip self

        const placedPiece = this.state.gameData.pieces.find((p) => p.id === placedPieceId);
        if (!placedPiece) continue;

        for (const placedShapePos of placedPiece.shape) {
          const placedGridRow = placedPosition.row + placedShapePos.row;
          const placedGridCol = placedPosition.col + placedShapePos.col;

          if (placedGridRow === gridRow && placedGridCol === gridCol) {
            return { valid: false, reason: 'Piece overlaps with another placed piece' };
          }
        }
      }
    }

    // Check if piece letters match grid letters
    for (let i = 0; i < piece.shape.length; i++) {
      const shapePos = piece.shape[i];
      if (!shapePos) continue;

      const gridRow = position.row + shapePos.row;
      const gridCol = position.col + shapePos.col;
      const cell = this.state.gameData.grid[gridRow]?.[gridCol];

      const pieceLetter = piece.letters[i];
      if (pieceLetter && cell?.letter && pieceLetter !== cell.letter) {
        return {
          valid: false,
          reason: `Letter '${pieceLetter}' does not match grid letter '${cell.letter}'`,
        };
      }
    }
    return { valid: true, reason: null }; // Valid placement
  }

  // Update board layout based on current placed pieces
  private updateBoardLayout(): void {
    if (!this.state.gameData) return;

    // Create a fresh copy of the board
    this.state.boardLayout = this.state.gameData.grid.map((row) =>
      row.map((cell) => ({ ...cell }))
    );

    // Mark cells occupied by placed pieces
    for (const [pieceId, position] of this.state.placedPieces.entries()) {
      const piece = this.state.gameData.pieces.find((p) => p.id === pieceId);
      if (!piece) continue;

      for (const shapePos of piece.shape) {
        const gridRow = position.row + shapePos.row;
        const gridCol = position.col + shapePos.col;

        if (gridRow >= 0 && gridRow < 8 && gridCol >= 0 && gridCol < 8) {
          // Mark as occupied (you might want to add a new property for this)
          // For now, we'll just ensure the cell state is preserved
        }
      }
    }
  }

  // Check if the game is complete
  private checkGameCompletion(): void {
    console.log('🔄 Checking game completion...');

    if (!this.state.gameData || this.state.gameComplete) {
      console.log('⏭️ Skipping - no game data or already complete');
      return;
    }

    // Check if all pieces are placed
    const allPiecesPlaced = this.state.gameData.pieces.every((piece) =>
      this.state.placedPieces.has(piece.id)
    );

    console.log(
      `📦 Pieces placed: ${this.state.placedPieces.size}/${this.state.gameData.pieces.length}`
    );

    if (!allPiecesPlaced) {
      console.log('⏭️ Not all pieces placed yet');
      return;
    }

    console.log('✅ All pieces placed - validating solution...');

    // Validate by comparing board layout to original phrase
    const isSolutionCorrect = this.validateBoardAgainstPhrase();

    if (isSolutionCorrect) {
      console.log('🎊 WIN CONDITION MET!');
      this.state.gameComplete = true;
      this.state.gameWon = true;
      this.stopScoreDecay();

      this.notifyUpdates({
        gameComplete: true,
        gameWon: true,
      });
    } else {
      console.log('❌ Solution validation failed');
    }
  }

  // Validate by comparing board layout to original phrase
  private validateBoardAgainstPhrase(): boolean {
    if (!this.state.gameData) {
      console.log('❌ No game data for validation');
      return false;
    }

    console.log('🔍 Extracting letters from current board...');
    const currentLetters = this.extractLettersFromBoard();

    console.log('📝 Getting expected phrase layout...');
    const expectedLetters = this.getExpectedPhraseLayout();

    console.log('⚖️ Comparing layouts...');
    return this.compareLayouts(currentLetters, expectedLetters);
  }

  // Extract letters from the current board layout
  private extractLettersFromBoard(): string[][] {
    const letters: string[][] = [];

    for (let row = 0; row < 8; row++) {
      const rowLetters: string[] = [];
      for (let col = 0; col < 8; col++) {
        const cell = this.state.boardLayout[row]?.[col];
        if (cell && !cell.isUnused && !cell.isSpace && cell.letter) {
          rowLetters.push(cell.letter);
        } else {
          rowLetters.push(' ');
        }
      }
      letters.push(rowLetters);
    }

    console.log('📋 Current board letters:');
    letters.forEach((row, i) => {
      console.log(`  Row ${i}: ${row.join('').trim() || '(empty)'}`);
    });

    return letters;
  }

  // Get the expected phrase layout as a 2D array
  private getExpectedPhraseLayout(): string[][] {
    if (!this.state.gameData) return [];

    // The expected layout should match how the phrase was originally placed on the grid
    // We'll recreate the same layout algorithm that was used during grid generation
    const expectedGrid = this.recreateOriginalGridLayout();

    console.log('🎯 Expected phrase layout:');
    expectedGrid.forEach((row, i) => {
      console.log(`  Row ${i}: ${row.join('').trim() || '(empty)'}`);
    });

    return expectedGrid;
  }

  // Recreate the original grid layout from the phrase
  private recreateOriginalGridLayout(): string[][] {
    if (!this.state.gameData) return [];

    // Create empty 8x8 grid
    const grid: string[][] = Array(8)
      .fill(null)
      .map(() => Array(8).fill(' '));

    // Use the same algorithm as placePhraseOnGrid
    const words = this.state.gameData.phrase.toUpperCase().split(' ');
    const longestWordLength = Math.max(...words.map((word) => word.length));

    const gridSize = 8;
    const margin = 1;
    const totalCharsWithSpaces = words.join(' ').length;
    const estimatedRows = Math.ceil(totalCharsWithSpaces / longestWordLength);

    const startRow = Math.max(margin, Math.floor((gridSize - estimatedRows) / 2));
    const startCol = margin;

    let currentRow = startRow;
    let currentCol = startCol;
    let currentRowText = '';

    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
      const word = words[wordIndex];
      if (!word) continue;

      const potentialRowText = currentRowText.length === 0 ? word : currentRowText + ' ' + word;

      if (
        currentRowText.length === 0 ||
        (potentialRowText.length <= longestWordLength + 2 &&
          startCol + potentialRowText.length <= gridSize - margin)
      ) {
        // Place word in current row
        if (currentRowText.length > 0) {
          // Add space
          if (
            currentRow >= 0 &&
            currentRow < gridSize &&
            currentCol >= 0 &&
            currentCol < gridSize
          ) {
            grid[currentRow]![currentCol] = ' ';
          }
          currentCol++;
        }

        // Place word letters
        for (let i = 0; i < word.length; i++) {
          if (
            currentRow >= 0 &&
            currentRow < gridSize &&
            currentCol >= 0 &&
            currentCol < gridSize
          ) {
            grid[currentRow]![currentCol] = word[i] || '';
          }
          currentCol++;
        }

        currentRowText = potentialRowText;
      } else {
        // Move to next row
        currentRow++;
        currentCol = startCol;
        currentRowText = '';

        // Retry placing this word in the new row
        wordIndex--;
      }
    }

    return grid;
  }

  // Compare two layouts
  private compareLayouts(current: string[][], expected: string[][]): boolean {
    console.log('🔍 Comparing layouts...');

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const currentCell = current[row]?.[col] || ' ';
        const expectedCell = expected[row]?.[col] || ' ';

        // Skip spaces and empty cells for comparison
        if (expectedCell === ' ') continue;
        if (currentCell !== expectedCell) {
          console.log(
            `❌ Mismatch at (${row}, ${col}): expected '${expectedCell}', got '${currentCell}'`
          );
          return false;
        }
      }
    }

    console.log('✅ Layouts match!');
    return true;
  }

  // Get current score
  getScore(): number {
    return this.state.score;
  }

  // Get placed pieces
  getPlacedPieces(): Map<string, GridPosition> {
    return new Map(this.state.placedPieces);
  }

  // Get board layout
  getBoardLayout(): GridCell[][] {
    return this.state.boardLayout.map((row) => row.map((cell) => ({ ...cell })));
  }

  // Check if game is complete
  isGameComplete(): boolean {
    return this.state.gameComplete;
  }

  // Check if game is won
  isGameWon(): boolean {
    return this.state.gameWon;
  }

  // Clean up resources
  destroy(): void {
    this.stopScoreDecay();
    this.updateCallbacks = [];
  }
}
