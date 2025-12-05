import { LetteredGameData, GridPosition, LetterPiece, GridCell } from '../../shared/types/api';

export type GameStateUpdateCallback = (updates: Partial<GameState>) => void;
export type FirstTimeCompletionCallback = () => void;

export interface LayoutUpdateResult {
  hasChanges: boolean;
  placedPieces: Record<string, GridPosition>;
  boardLayout: GridCell[][];
}

export interface GameState {
  gameStartTime: number;
  moves: number;
  gameComplete: boolean;
  boardLayout: GridCell[][];
  placedPieces: Map<string, GridPosition>;
  lastValidPositions: Map<string, GridPosition>;
  gameData: LetteredGameData | null;
  isRestoring: boolean;
}

export class LetteredGameStateManager {
  private state: GameState;
  private updateCallbacks: GameStateUpdateCallback[] = [];
  private firstTimeCompletionCallbacks: FirstTimeCompletionCallback[] = [];

  constructor(gameData: LetteredGameData | null = null, gameStartTime?: number, moves?: number) {
    this.state = this.createInitialState(gameData, gameStartTime, moves);
    this.notifyUpdates(this.state);
  }

  private createInitialState(
    gameData: LetteredGameData | null,
    gameStartTime?: number,
    moves?: number
  ): GameState {
    // Initialize placed pieces with initial tray positions for all pieces
    const placedPieces = new Map<string, GridPosition>();
    if (gameData?.initialPiecePositions) {
      Object.entries(gameData.initialPiecePositions).forEach(([pieceId, position]) => {
        placedPieces.set(pieceId, position);
      });
    }

    const startTime = gameStartTime ?? Date.now();

    return {
      gameStartTime: startTime,
      moves: moves ?? 0,
      gameComplete: false,
      boardLayout: gameData?.grid || [],
      placedPieces,
      lastValidPositions: new Map(placedPieces),
      gameData,
      isRestoring: false,
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

  // Subscribe to first-time completion events (only fires on fresh wins, not restored games)
  onFirstTimeCompletion(callback: FirstTimeCompletionCallback): () => void {
    this.firstTimeCompletionCallbacks.push(callback);
    return () => {
      const index = this.firstTimeCompletionCallbacks.indexOf(callback);
      if (index > -1) {
        this.firstTimeCompletionCallbacks.splice(index, 1);
      }
    };
  }

  // Notify first-time completion subscribers
  private notifyFirstTimeCompletion(): void {
    this.firstTimeCompletionCallbacks.forEach((callback) => callback());
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
  initializeGame(gameData: LetteredGameData, gameStartTime?: number, moves?: number): void {
    this.state = this.createInitialState(gameData, gameStartTime, moves);
    this.notifyUpdates(this.state);
  }

  // Get elapsed time in milliseconds
  getElapsedTime(): number {
    if (this.state.gameComplete) {
      // When game is complete, we should have the exact end time, but for now return current calculation
      return Date.now() - this.state.gameStartTime;
    }
    return Date.now() - this.state.gameStartTime;
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
        moves: this.state.moves,
      });

      // Check game completion for restored games (isFirstTime=false to prevent confetti)
      void this.checkGameCompletion(false);
    } else {
      this.notifyUpdates({ isRestoring });
    }
  }

  setGameComplete(gameComplete: boolean): void {
    this.state.gameComplete = gameComplete;
    this.notifyUpdates({ gameComplete });
  }

  // Check if in restoration mode
  isRestoring(): boolean {
    return this.state.isRestoring;
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
    console.log('validationResult', { validationResult });
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

  // Update game state from a 2D layout array (from Grid component)
  async updateFromLayout(layout: (string | null)[][]): Promise<LayoutUpdateResult> {
    const noChangeResult: LayoutUpdateResult = {
      hasChanges: false,
      placedPieces: this.getPlacedPiecesAsRecord(),
      boardLayout: this.getBoardLayout(),
    };

    // Prevent updates when game is complete or no game data
    if (this.state.gameComplete || !this.state.gameData) {
      return noChangeResult;
    }

    // Parse layout to extract piece anchor positions
    const newPlacedPieces = this.parseLayoutToPositions(layout);

    // Compare with current state to detect changes
    const currentPlacedPieces = this.state.placedPieces;
    let hasAnyPieceMoved = false;

    // Check for moved pieces
    for (const [pieceId, newPosition] of newPlacedPieces) {
      const currentPosition = currentPlacedPieces.get(pieceId);
      if (
        !currentPosition ||
        currentPosition.row !== newPosition.row ||
        currentPosition.col !== newPosition.col
      ) {
        hasAnyPieceMoved = true;
        break;
      }
    }

    // Check for removed pieces
    if (!hasAnyPieceMoved) {
      for (const [pieceId] of currentPlacedPieces) {
        if (!newPlacedPieces.has(pieceId)) {
          hasAnyPieceMoved = true;
          break;
        }
      }
    }

    // Check for added pieces
    if (!hasAnyPieceMoved) {
      for (const [pieceId] of newPlacedPieces) {
        if (!currentPlacedPieces.has(pieceId)) {
          hasAnyPieceMoved = true;
          break;
        }
      }
    }

    // If no changes detected, return early
    if (!hasAnyPieceMoved) {
      return noChangeResult;
    }

    // Batch update all piece positions
    for (const [pieceId, newPosition] of newPlacedPieces) {
      const currentPosition = currentPlacedPieces.get(pieceId);
      if (
        !currentPosition ||
        currentPosition.row !== newPosition.row ||
        currentPosition.col !== newPosition.col
      ) {
        // Update placed pieces directly (skip individual validation since Grid already handles it)
        this.state.lastValidPositions.set(pieceId, newPosition);
        this.state.placedPieces.set(pieceId, newPosition);
      }
    }

    // Update board layout after all pieces are placed
    this.updateBoardLayout();

    // Increment moves counter once for the batch update
    this.state.moves += 1;

    // Check game completion once at the end
    await this.checkGameCompletion();

    // Notify updates
    this.notifyUpdates({
      placedPieces: new Map(this.state.placedPieces),
      boardLayout: this.state.boardLayout,
      gameComplete: this.state.gameComplete,
      moves: this.state.moves,
    });

    return {
      hasChanges: true,
      placedPieces: this.getPlacedPiecesAsRecord(),
      boardLayout: this.getBoardLayout(),
    };
  }

  // Parse a 2D layout array to extract piece anchor positions
  private parseLayoutToPositions(layout: (string | null)[][]): Map<string, GridPosition> {
    const newPlacedPieces = new Map<string, GridPosition>();

    if (!this.state.gameData) {
      return newPlacedPieces;
    }

    const processedPieces = new Set<string>();

    layout.forEach((row, rowIndex) => {
      row.forEach((itemId, colIndex) => {
        if (itemId && !processedPieces.has(itemId)) {
          const piece = this.state.gameData!.pieces.find((p: LetterPiece) => p.id === itemId);
          if (!piece) return;

          processedPieces.add(itemId);

          // Use this occupied position to calculate anchor point
          const occupiedPos = { row: rowIndex, col: colIndex };

          // Find which shape position corresponds to this occupied position
          // We need to find: anchor + shapePos = occupiedPos
          // So: anchor = occupiedPos - shapePos
          let anchorPoint = occupiedPos; // fallback

          for (const shapePos of piece.shape) {
            const testAnchor = {
              row: occupiedPos.row - shapePos.row,
              col: occupiedPos.col - shapePos.col,
            };

            // Verify this anchor point works for the piece
            let allCellsValid = true;
            for (const testShapePos of piece.shape) {
              const expectedRow = testAnchor.row + testShapePos.row;
              const expectedCol = testAnchor.col + testShapePos.col;

              // Check if this expected position is occupied by the same piece
              const layoutRow = layout[expectedRow];
              if (!layoutRow || layoutRow[expectedCol] !== itemId) {
                allCellsValid = false;
                break;
              }
            }

            if (allCellsValid) {
              anchorPoint = testAnchor;
              break;
            }
          }

          newPlacedPieces.set(itemId, anchorPoint);
        }
      });
    });

    return newPlacedPieces;
  }

  // Get placed pieces as a Record (for JSON serialization)
  getPlacedPiecesAsRecord(): Record<string, GridPosition> {
    const record: Record<string, GridPosition> = {};
    for (const [pieceId, position] of this.state.placedPieces.entries()) {
      record[pieceId] = position;
    }
    return record;
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
  // isFirstTime: true for fresh gameplay completions, false for restored game checks
  private async checkGameCompletion(isFirstTime: boolean = true): Promise<void> {
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
      // Fire first-time completion callback only for fresh wins, not restored games
      if (isFirstTime) {
        this.notifyFirstTimeCompletion();
      }
    }
  }

  // Validate by comparing placed pieces with solution positions
  private async validateBoardAgainstPhrase(): Promise<boolean> {
    if (!this.state.gameData || !this.state.gameData.solution) {
      return false;
    }

    const solution = this.state.gameData.solution;
    const mainGridHeight = this.state.gameData.grid.length;
    const mainGridWidth = this.state.gameData.grid[0]?.length || 0;

    // Filter out pieces placed in the tray area (below main grid)
    const mainBoardPieces = Array.from(this.state.placedPieces.entries()).filter(([, position]) => {
      return position.row < mainGridHeight && position.col < mainGridWidth;
    });

    // Check if all pieces are placed on the main board
    const totalPieces = this.state.gameData.pieces.length;
    const placedOnBoardCount = mainBoardPieces.length;

    if (placedOnBoardCount !== totalPieces) {
      return false;
    }

    // Check if each piece is in the correct position
    for (const [pieceId, placedPosition] of mainBoardPieces) {
      const solutionPosition = solution[pieceId];
      if (!solutionPosition) {
        return false;
      }

      if (
        placedPosition.row !== solutionPosition.row ||
        placedPosition.col !== solutionPosition.col
      ) {
        return false;
      }
    }

    return true;
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

  // Get current moves count
  getMoves(): number {
    return this.state.moves;
  }

  // Clean up resources
  destroy(): void {
    this.updateCallbacks = [];
    this.firstTimeCompletionCallbacks = [];
  }
}
