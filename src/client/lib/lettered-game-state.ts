import { LetteredGameData, GridPosition, LetterPiece, GridCell } from '../../shared/types/api';
import {
  calculateDecayAmount,
  getDecayRate,
  DEFAULT_INITIAL_SCORE,
} from '../../shared/score-decay';

// SHA256 hash function for client-side validation
const sha256 = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export type GameStateUpdateCallback = (updates: Partial<GameState>) => void;
export type ScoreSyncCallback = (serverScore: number) => void;

export interface GameState {
  score: number;
  initialScore: number;
  gameComplete: boolean;
  gameWon: boolean;
  boardLayout: GridCell[][]; // Current state of the board
  placedPieces: Map<string, GridPosition>; // piece ID -> position
  lastValidPositions: Map<string, GridPosition>; // For undo functionality
  scoreDecayInterval: number; // Milliseconds between decay
  lastScoreUpdate: number; // Timestamp of last score update
  gameStartTime: number;
  gameData: LetteredGameData | null;
  timerDisabled: boolean; // Whether the score decay timer is disabled
  isRestoring: boolean; // Whether session restoration is in progress
  moves: number; // Number of moves made
}

export class LetteredGameStateManager {
  private state: GameState;
  private scoreDecayTimer: ReturnType<typeof setTimeout> | null = null;
  private updateCallbacks: GameStateUpdateCallback[] = [];
  private scoreSyncCallback: ScoreSyncCallback | null = null;
  private lastScoreSync: number = 0;
  private readonly SCORE_SYNC_INTERVAL = 30000; // Sync every 30 seconds

  constructor(
    gameData: LetteredGameData | null = null,
    initialScore?: number,
    gameStartTime?: number,
    currentScore?: number,
    moves?: number
  ) {
    this.state = this.createInitialState(
      gameData,
      initialScore,
      gameStartTime,
      currentScore,
      moves
    );
    // Don't start score decay immediately - wait for explicit call
    this.notifyUpdates(this.state);
  }

  private createInitialState(
    gameData: LetteredGameData | null,
    initialScore?: number,
    gameStartTime?: number,
    currentScore?: number,
    moves?: number
  ): GameState {
    // Initialize placed pieces with initial tray positions for all pieces
    const placedPieces = new Map<string, GridPosition>();
    if (gameData?.initialPiecePositions) {
      Object.entries(gameData.initialPiecePositions).forEach(([pieceId, position]) => {
        placedPieces.set(pieceId, position);
      });
    }

    const defaultScore = DEFAULT_INITIAL_SCORE;
    const originalInitialScore = initialScore ?? defaultScore;
    const score = currentScore ?? originalInitialScore; // Use currentScore if provided, otherwise use initialScore
    const startTime = gameStartTime ?? Date.now();

    return {
      score,
      initialScore: originalInitialScore, // Always use the original initial score for decay calculations
      gameComplete: false,
      gameWon: false,
      boardLayout: gameData?.grid || [],
      placedPieces,
      lastValidPositions: new Map(placedPieces), // Also initialize lastValidPositions
      scoreDecayInterval: 1000,
      lastScoreUpdate: startTime,
      gameStartTime: startTime,
      gameData,
      timerDisabled: false,
      isRestoring: false,
      moves: moves ?? 0, // Initialize moves counter from parameter or default to 0
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

  // Set callback for score synchronization with server
  setScoreSyncCallback(callback: ScoreSyncCallback | null): void {
    this.scoreSyncCallback = callback;
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
  initializeGame(
    gameData: LetteredGameData,
    initialScore?: number,
    gameStartTime?: number,
    currentScore?: number,
    moves?: number
  ): void {
    this.stopScoreDecay();
    this.state = this.createInitialState(
      gameData,
      initialScore,
      gameStartTime,
      currentScore,
      moves
    );
    // Don't start score decay immediately - wait for explicit call
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
        const elapsedSeconds = timeDiff / 1000;
        const placedPieces = this.state.placedPieces.size;
        const decayAmount = calculateDecayAmount('lettered', elapsedSeconds, placedPieces);

        if (decayAmount > 0) {
          this.state.score = Math.max(0, this.state.score - decayAmount);
          this.state.lastScoreUpdate = now;

          this.notifyUpdates({ score: this.state.score });
        }

        // Periodically sync score with server
        if (this.scoreSyncCallback && now - this.lastScoreSync > this.SCORE_SYNC_INTERVAL) {
          this.lastScoreSync = now;
          // Trigger score sync callback (will be handled by the component)
          this.scoreSyncCallback(this.state.score);
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

  // Get current decay rate (for debugging/UI purposes)
  getDecayRate(): number {
    const placedPieces = this.state.placedPieces.size;
    return getDecayRate('lettered', placedPieces);
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

  // Set restoration state
  setRestoring(isRestoring: boolean): void {
    this.state.isRestoring = isRestoring;

    // When exiting restoration mode, send a complete state update
    if (!isRestoring) {
      this.notifyUpdates({
        isRestoring,
        placedPieces: new Map(this.state.placedPieces),
        boardLayout: this.state.boardLayout,
        gameComplete: this.state.gameComplete,
        gameWon: this.state.gameWon,
        score: this.state.score,
        moves: this.state.moves,
      });

      // Also check game completion now that restoration is done
      void this.checkGameCompletion();
    } else {
      this.notifyUpdates({ isRestoring });
    }
  }

  // Check if in restoration mode
  isRestoring(): boolean {
    return this.state.isRestoring;
  }

  // Check if timer is enabled
  isTimerEnabled(): boolean {
    return !this.state.timerDisabled;
  }

  // Place a piece on the board
  async placePiece(pieceId: string, position: GridPosition): Promise<boolean> {
    // Prevent piece movement when game is complete
    if (this.state.gameComplete) {
      return false;
    }

    if (!this.state.gameData) {
      return false;
    }

    const piece = this.state.gameData.pieces.find((p) => p.id === pieceId);
    if (!piece) {
      return false;
    }

    // Check if position is valid
    const validationResult = this.isValidPiecePlacement(piece, position);
    if (!validationResult.valid) {
      return false;
    }

    // Save current state for undo if needed
    this.state.lastValidPositions.set(pieceId, position);

    // Update placed pieces
    this.state.placedPieces.set(pieceId, position);

    // Update board layout (this would be used for visual feedback)
    this.updateBoardLayout();

    // Check if game is complete (but skip during restoration to avoid premature notifications)
    if (!this.state.isRestoring) {
      await this.checkGameCompletion();
    }

    // Only notify updates if not in restoration mode (to prevent UI flicker)
    if (!this.state.isRestoring) {
      // Increment moves counter
      this.state.moves += 1;
      this.notifyUpdates({
        placedPieces: new Map(this.state.placedPieces),
        boardLayout: this.state.boardLayout,
        gameComplete: this.state.gameComplete,
        gameWon: this.state.gameWon,
        moves: this.state.moves,
      });
    }

    return true;
  }

  // Remove a piece from the board
  removePiece(pieceId: string): boolean {
    // Prevent piece movement when game is complete
    if (this.state.gameComplete) {
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

    // Allow placements both in main grid and extended tray area
    // Validate conflicts in both areas, but only validate grid validity in main area

    // Check bounds and validity for each cell that would be occupied by the piece
    for (const shapePos of piece.shape) {
      const gridRow = position.row + shapePos.row;
      const gridCol = position.col + shapePos.col;

      // Check if position conflicts with other placed pieces (both in main grid and tray)
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

      // Only validate grid cells that are within the main game area
      // Tray area positions (outside main grid bounds) are always allowed
      if (
        gridRow >= 0 &&
        gridRow < this.state.gameData.rows &&
        gridCol >= 0 &&
        gridCol < this.state.gameData.cols
      ) {
        const cell = this.state.gameData.grid[gridRow]?.[gridCol];

        if (!cell) {
          return { valid: false, reason: 'Piece overlaps with invalid or empty grid cells' };
        }
      }
      // If outside main grid bounds (tray area), allow placement without validation
    }

    // Additional validation for secure grid mode - only check cells within the main game area
    for (let i = 0; i < piece.shape.length; i++) {
      const shapePos = piece.shape[i];
      if (!shapePos) continue;

      const gridRow = position.row + shapePos.row;
      const gridCol = position.col + shapePos.col;

      // Only validate grid cells that are within the main game area
      // Tray area positions (outside main grid bounds) are always allowed
      if (
        gridRow >= 0 &&
        gridRow < this.state.gameData.rows &&
        gridCol >= 0 &&
        gridCol < this.state.gameData.cols
      ) {
        const cell = this.state.gameData.grid[gridRow]?.[gridCol];

        // In secure mode, we allow all within main grid
        if (!cell) {
          return {
            valid: false,
            reason: `Piece cannot be placed here - invalid grid cell at (${gridRow}, ${gridCol})`,
          };
        }
      }
      // If outside main grid bounds (tray area), allow placement without validation
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

        if (
          gridRow >= 0 &&
          gridRow < this.state.gameData.rows &&
          gridCol >= 0 &&
          gridCol < this.state.gameData.cols
        ) {
          // Mark as occupied (you might want to add a new property for this)
          // For now, we'll just ensure the cell state is preserved
        }
      }
    }
  }

  // Check if the game is complete
  private async checkGameCompletion(): Promise<void> {
    if (!this.state.gameData || this.state.gameComplete) {
      return;
    }

    // Check if all pieces are placed
    const allPiecesPlaced = this.state.gameData.pieces.every((piece) =>
      this.state.placedPieces.has(piece.id)
    );

    if (!allPiecesPlaced) {
      return;
    }

    // Validate by comparing board layout to solution hash
    const isSolutionCorrect = await this.validateBoardAgainstPhrase();

    if (isSolutionCorrect) {
      this.state.gameComplete = true;
      this.state.gameWon = true;
      this.stopScoreDecay();

      this.notifyUpdates({
        gameComplete: true,
        gameWon: true,
      });
    }
  }

  // Validate by comparing board layout to solution hash
  private async validateBoardAgainstPhrase(): Promise<boolean> {
    if (!this.state.gameData) {
      return false;
    }

    const currentHash = await this.createSolutionHash();
    const expectedHash = this.state.gameData.solutionHash;
    const isValid = currentHash === expectedHash;

    return isValid;
  }

  // Create SHA256 hash of current solution for validation
  private async createSolutionHash(): Promise<string> {
    if (!this.state.gameData) {
      return '';
    }

    // Reconstruct the complete grid by combining secure grid with placed pieces
    const completeGrid = this.state.gameData.grid.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        // Start with the secure cell data
        const completeCell = {
          letter: cell.letter,
          isLetter: cell.isLetter,
          isPreFilled: cell.isPreFilled,
          isSpace: cell.isSpace,
          isUnused: cell.isUnused,
        };

        // If this cell doesn't have a pre-filled letter, try to find it from placed pieces
        if (!cell.isPreFilled && !cell.letter) {
          // Check if any piece covers this position
          for (const [pieceId, position] of this.state.placedPieces.entries()) {
            const piece = this.state.gameData!.pieces.find((p) => p.id === pieceId);
            if (!piece?.letters?.length) continue;

            // Check if this piece covers the current cell
            const shape = piece.shape;
            if (!shape?.length) continue;

            for (let i = 0; i < shape.length; i++) {
              const shapePos = shape[i];
              if (!shapePos) continue;

              const pieceRow = position.row + shapePos.row;
              const pieceCol = position.col + shapePos.col;

              if (pieceRow === rowIndex && pieceCol === colIndex) {
                completeCell.letter = piece.letters[i] || null;
                break;
              }
            }

            if (completeCell.letter) break; // Found the letter, no need to check more pieces
          }
        }

        return completeCell;
      })
    );

    // Create the same data structure as the server
    const gridJson = JSON.stringify(completeGrid);
    const hash = await sha256(gridJson);

    return hash;
  }

  // Get current score
  getScore(): number {
    return this.state.score;
  }

  // Set current score (for server synchronization) - smoothly adjust to server value
  setScore(serverScore: number): void {
    const currentLocalScore = this.getScore();

    // If the difference is significant (> 50 points), adjust the initial score to calibrate
    // This prevents jarring jumps while keeping the decay rate consistent
    const difference = serverScore - currentLocalScore;
    if (Math.abs(difference) > 50) {
      // Adjust initialScore to account for the difference
      // This calibrates the decay calculation to match the server
      this.state.initialScore += difference;
      console.log(
        `[DEBUG] Calibrated score by ${difference} points (server: ${serverScore}, local: ${currentLocalScore})`
      );
    } else {
      // For small differences, just set the score directly for accuracy
      this.state.score = serverScore;
    }

    this.notifyUpdates({ score: this.state.score });
  }

  // Get placed pieces
  getPlacedPieces(): Map<string, GridPosition> {
    return new Map(this.state.placedPieces);
  }

  // Get board layout
  getBoardLayout(): GridCell[][] {
    return this.state.boardLayout.map((row) => row.map((cell) => ({ ...cell })));
  }

  // Compare two board layouts to check if they are identical
  public compareLayouts(layout1: GridCell[][], layout2: GridCell[][]): boolean {
    if (!layout1 || !layout2 || layout1.length !== layout2.length) return false;

    for (let row = 0; row < layout1.length; row++) {
      const row1 = layout1[row];
      const row2 = layout2[row];

      if (!row1 || !row2 || row1.length !== row2.length) {
        return false;
      }

      for (let col = 0; col < row1.length; col++) {
        const cell1 = row1[col];
        const cell2 = row2[col];

        if (!cell1 || !cell2) return false;

        // Compare relevant properties that affect the layout
        if (
          cell1.isLetter !== cell2.isLetter ||
          cell1.isPreFilled !== cell2.isPreFilled ||
          cell1.isSpace !== cell2.isSpace ||
          cell1.isUnused !== cell2.isUnused ||
          cell1.letter !== cell2.letter
        ) {
          return false;
        }
      }
    }

    return true;
  }

  // Check if game is complete
  isGameComplete(): boolean {
    return this.state.gameComplete;
  }

  // Check if game is won
  isGameWon(): boolean {
    return this.state.gameWon;
  }

  // Get current moves count
  getMoves(): number {
    return this.state.moves;
  }

  // Clean up resources
  destroy(): void {
    this.stopScoreDecay();
    this.updateCallbacks = [];
  }
}
