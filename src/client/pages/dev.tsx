import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Settings } from 'lucide-react';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { LetteredGameData, LetterPiece, GridCell } from '../../shared/types/api';
import { Grid, DraggableItem } from '../components/tile-grid/tile-grid';
import { getResponsiveCellSize, getResponsiveCellSpacing } from '../lib/lettered-utils';
import { useViewport } from '../hooks/useViewport';
import { cn } from '@sglara/cn';
import { apiFetch } from 'src/lib/utils';

interface DevPageProps {
  onBack?: () => void;
}

export const DevPage = ({ onBack }: DevPageProps) => {
  // Lettered game generator state
  const [phrase, setPhrase] = useState('A HOTDOG');
  const [seed, setSeed] = useState('123');
  const [generatedGame, setGeneratedGame] = useState<LetteredGameData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Responsive sizing (matching lettered game)
  const { breakpoint } = useViewport();
  const responsiveCellSize = getResponsiveCellSize(
    breakpoint,
    generatedGame?.rows,
    generatedGame?.cols
  );
  const responsiveCellSpacing = getResponsiveCellSpacing(breakpoint);

  // Game state (matching lettered game) - disabled for dev page
  // const [placedPieces, setPlacedPieces] = useState<Map<string, { row: number; col: number }>>(
  //   new Map()
  // );
  const placedPieces = new Map<string, { row: number; col: number }>(); // Static for dev page

  // Conversion function for Grid component (matching lettered game exactly)
  const convertGridDataToItems = useCallback(
    ({
      grid,
      placedPieces,
      pieces,
      initialPiecePositions,
      getTileClassName,
    }: {
      grid: GridCell[][];
      placedPieces: Map<string, { row: number; col: number }>;
      pieces: LetterPiece[];
      initialPiecePositions: Record<string, { row: number; col: number }>;
      getTileClassName?: (piece: LetterPiece) => string | undefined;
    }): Omit<DraggableItem, 'id'>[] => {
      const items: Omit<DraggableItem, 'id'>[] = [];

      // Convert placed pieces to Grid component format
      for (const [pieceId, position] of placedPieces.entries()) {
        const piece = pieces.find((p) => p.id === pieceId);
        if (!piece) continue;

        // Convert piece shape to Grid component format
        const shapeCells: { x: number; y: number }[] = piece.shape.map((shapePos) => ({
          x: shapePos.col,
          y: shapePos.row,
        }));

        // Calculate bounding box
        const width = Math.max(...shapeCells.map((cell) => cell.x)) + 1;
        const height = Math.max(...shapeCells.map((cell) => cell.y)) + 1;

        const shape = {
          name: piece.id,
          cells: shapeCells,
          width,
          height,
        };

        // Create content from letters
        const content = piece.letters.join('') || piece.id;

        items.push({
          position: { x: position.col, y: position.row },
          shape,
          content,
          disabled: false,
          className: getTileClassName ? getTileClassName(piece) : undefined,
        });
      }

      // Add anchor letters (pre-filled letters) as immovable items
      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row]!.length; col++) {
          const cell = grid[row]![col];
          if (cell?.isPreFilled && cell.letter) {
            // Create a single-cell shape for the anchor letter
            const shapeCells = [{ x: 0, y: 0 }];

            const shape = {
              name: `anchor-${row}-${col}`,
              cells: shapeCells,
              width: 1,
              height: 1,
            };

            // Create a mock piece for the anchor letter
            const anchorPiece: LetterPiece = {
              id: `anchor-${row}-${col}`,
              letters: [cell.letter],
              shape: [{ row: 0, col: 0 }],
              color: '#000000', // Black for anchor letters
            };

            items.push({
              position: { x: col, y: row },
              shape,
              content: cell.letter,
              disabled: true, // Anchor letters are immovable
              className: getTileClassName
                ? cn(getTileClassName(anchorPiece), 'bg-black')
                : 'bg-black text-background border border-muted',
            });
          }
        }
      }

      // Add unplaced letter pieces using server-generated initial positions
      const unplacedPieces = pieces.filter((piece) => !placedPieces.has(piece.id));

      for (const piece of unplacedPieces) {
        // Use server-generated initial position
        const initialPosition = initialPiecePositions[piece.id];

        if (!initialPosition) {
          console.warn(`No initial position found for piece ${piece.id}, skipping`);
          continue;
        }

        // Convert piece shape to Grid component format
        const shapeCells: { x: number; y: number }[] = piece.shape.map((shapePos) => ({
          x: shapePos.col,
          y: shapePos.row,
        }));

        // Calculate bounding box
        const width = Math.max(...shapeCells.map((cell) => cell.x)) + 1;
        const height = Math.max(...shapeCells.map((cell) => cell.y)) + 1;

        const shape = {
          name: piece.id,
          cells: shapeCells,
          width,
          height,
        };

        // Create content from letters
        const content = piece.letters.join('') || piece.id;

        items.push({
          position: { x: initialPosition.col, y: initialPosition.row },
          shape,
          content,
          disabled: false,
          className: getTileClassName ? getTileClassName(piece) : undefined,
        });
      }

      return items;
    },
    []
  );

  // Styling functions (matching lettered game exactly)
  const boardTileClass = (x: number, y: number) => {
    const baseClass = 'bg-card hover:bg-accent transition-colors';
    // Style board tiles based on the lettered grid data
    const cell = generatedGame?.grid[y]?.[x];
    if (!cell) {
      // Check if we're in the extended area (below the main board)
      if (y >= (generatedGame?.grid.length ?? 0)) {
        return 'bg-transparent border-none hover:bg-transparent'; // Make extended area squares invisible
      }
      return 'bg-gray-700'; // Main board
    }

    // Don't style cells that have pre-filled anchor letters (they're rendered as pieces)
    if (cell.isPreFilled) {
      return cn(baseClass, 'bg-gray-200');
    }

    // Make unoccupied spaces gray-700
    if (cell.isUnused || cell.isSpace) {
      return cn(baseClass, 'border-2 border-border bg-gray-700');
    }

    // For cells with letters that will be filled by pieces, use gray-200
    return cn(baseClass, 'bg-gray-200');
  };

  const pieceTileClass = (piece: LetterPiece) => {
    const baseClass =
      'text-primary-foreground transition-all touch-none duration-500 overflow-hidden';
    return cn(baseClass, piece.color);
  };

  const getPieceTileClass = (piece: LetterPiece, additionalClassName?: string) => {
    return cn(pieceTileClass(piece), additionalClassName);
  };

  const pieceTileDraggingClass = (_piece: DraggableItem, valid: boolean) => {
    const baseClass = 'border-2 border-dashed opacity-80 transition-colors';
    if (valid) {
      return cn(baseClass, 'bg-accent/20 border-primary');
    } else {
      return cn(baseClass, 'bg-destructive/20 border-destructive');
    }
  };

  const handleGenerateGame = useCallback(async () => {
    if (!phrase.trim()) {
      toast.error('Please enter a phrase');
      return;
    }

    const seedNum = parseInt(seed);
    if (isNaN(seedNum)) {
      toast.error('Please enter a valid seed number');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiFetch('/api/dev/lettered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phrase: phrase.trim(),
          seed: seedNum,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate game');
      }

      const data = await response.json();
      console.log('Generated game:', data);
      console.log('GameData structure:', {
        id: data.gameData.id,
        category: data.gameData.category,
        phrase: data.gameData.phrase,
        grid: `${data.gameData.grid.length}x${data.gameData.grid[0]?.length}`,
        pieces: data.gameData.pieces.length,
        initialPiecePositions: Object.keys(data.gameData.initialPiecePositions).length,
        solution: Object.keys(data.gameData.solution).length,
        seed: data.gameData.seed,
      });

      // Log each piece details
      console.log(
        'Pieces:',
        data.gameData.pieces.map((piece: LetterPiece) => ({
          id: piece.id,
          letters: piece.letters.join(''),
          shape: piece.shape,
          color: piece.color,
          initialPos: data.gameData.initialPiecePositions[piece.id],
        }))
      );

      // Log grid layout (first few rows)
      console.log('Grid layout (first 3 rows):');
      data.gameData.grid.slice(0, 3).forEach((row: GridCell[], rowIndex: number) => {
        const rowStr = row
          .map((cell: GridCell) =>
            cell.isPreFilled
              ? `[${cell.letter}]`
              : cell.isUnused
                ? '░░░'
                : cell.isSpace
                  ? '   '
                  : cell.letter
                    ? ` ${cell.letter} `
                    : '░░░'
          )
          .join('');
        console.log(`Row ${rowIndex}: ${rowStr}`);
      });

      setGeneratedGame(data.gameData);
      // setPlacedPieces(new Map()); // Disabled for dev page
      toast.success('Game generated successfully!');
    } catch (error) {
      console.error('Error generating game:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate game');
    } finally {
      setIsGenerating(false);
    }
  }, [phrase, seed]);

  // Handle layout changes from the grid (matching lettered game) - disabled for dev page
  const handleGridLayoutChange = useCallback(
    (layout: (string | null)[][]) => {
      if (!generatedGame) return;

      // Convert layout to piece positions
      const newPlacedPieces = new Map<string, { row: number; col: number }>();

      layout.forEach((row, rowIndex) => {
        row.forEach((itemId, colIndex) => {
          if (itemId) {
            const piece = generatedGame.pieces.find((p) => p.id === itemId);
            if (piece) {
              newPlacedPieces.set(itemId, { row: rowIndex, col: colIndex });
            }
          }
        });
      });

      // setPlacedPieces(newPlacedPieces);
    },
    [generatedGame]
  );

  return (
    <div className="p-2 min-h-screen sm:p-4 bg-background">
      <div className="mx-auto space-y-4 max-w-4xl sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex gap-3 items-center">
            <div className="p-2 rounded-full bg-primary/20">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Development Tools</h1>
              <p className="text-sm text-muted-foreground">
                Development utilities and testing tools
              </p>
            </div>
          </div>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back
            </Button>
          )}
        </div>

        {/* Lettered Game Generator */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Lettered Game Generator</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="phrase-input" className="text-sm font-medium">
                    Phrase
                  </label>
                  <Input
                    id="phrase-input"
                    type="text"
                    placeholder="Enter a phrase (e.g., HELLO WORLD)"
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="seed-input" className="text-sm font-medium">
                    Seed
                  </label>
                  <Input
                    id="seed-input"
                    type="number"
                    placeholder="123"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <Button
                onClick={handleGenerateGame}
                disabled={isGenerating}
                className="w-full sm:w-auto"
              >
                {isGenerating ? 'Generating...' : 'Generate Game'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generated Game Display */}
        {generatedGame && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Generated Game</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Phrase: "{generatedGame.phrase}" | Seed: {generatedGame.seed}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-4 space-y-1 text-sm text-muted-foreground">
                  <p>
                    Grid Size: {generatedGame.rows} x {generatedGame.cols}
                  </p>
                  <p>Pieces: {generatedGame.pieces.length}</p>
                  <p>Category: {generatedGame.category}</p>
                </div>
              </CardContent>
            </Card>

            {/* Game Grid with Pieces */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg">Game Board & Pieces</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Drag pieces from below onto the board
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-center">
                  <Grid
                    gridSize={{
                      width: generatedGame.grid[0]!.length || 8,
                      height: generatedGame.grid.length + 20, // Extend grid height to match server's maxRows for letter pieces area
                      spacing: responsiveCellSpacing,
                    }}
                    cellSize={responsiveCellSize}
                    initialItems={convertGridDataToItems({
                      grid: generatedGame.grid,
                      placedPieces:
                        placedPieces.size === 0
                          ? new Map(Object.entries(generatedGame.initialPiecePositions))
                          : placedPieces,
                      pieces: generatedGame.pieces,
                      initialPiecePositions: generatedGame.initialPiecePositions,
                      getTileClassName: (piece) => getPieceTileClass(piece, 'text-2xl font-bold'),
                    })}
                    onLayoutChange={handleGridLayoutChange} // Disabled for dev page to prevent infinite loops
                    defaultBoardTileClassName="bg-card hover:bg-accent transition-colors"
                    defaultItemClassName="bg-primary text-primary-foreground"
                    getBoardTileClassName={boardTileClass}
                    getTileDraggingClassName={pieceTileDraggingClass}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Additional Info */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Development Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• This is the development page for Lettered</p>
              <p>• Add any development tools or debugging utilities here</p>
              <p>• This page should only be accessible during development</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
