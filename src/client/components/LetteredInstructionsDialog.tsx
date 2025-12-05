import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogClose } from './ui/dialog';
import { Button } from './ui/button';

interface LetteredInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MockPiece {
  id: string;
  letters: string;
  shape: { row: number; col: number }[];
  color: string;
  position: { row: number; col: number } | null;
}

// Tray pieces that will move to form THE LION KING
const trayPieces: MockPiece[] = [
  // Connected groups in tray (bottom area)
  {
    id: 'he',
    letters: 'HE',
    shape: [
      { row: 0, col: 0 }, // H
      { row: 0, col: 1 }, // E
    ],
    color: '#EF4444', // Red (H, E)
    position: { row: 6, col: 0 }, // Starting in tray at row 6
  },
  {
    id: 'ion',
    letters: 'ION',
    shape: [
      { row: 0, col: 0 }, // I
      { row: 0, col: 1 }, // O
      { row: 0, col: 2 }, // N
    ],
    color: '#10B981', // Green (ONNG group)
    position: { row: 6, col: 4 }, // Starting in tray at row 6
  },
  {
    id: 't',
    letters: 'T',
    shape: [
      { row: 0, col: 0 }, // T
    ],
    color: '#3B82F6', // Blue (TLIK group)
    position: { row: 7, col: 2 }, // Starting in tray at row 7
  },
  {
    id: 'ng',
    letters: 'NG',
    shape: [
      { row: 0, col: 0 }, // N
      { row: 0, col: 1 }, // G
    ],
    color: '#10B981', // Green (ONNG group)
    position: { row: 7, col: 4 }, // Starting in tray at row 7
  },
  {
    id: 'l',
    letters: 'L',
    shape: [
      { row: 0, col: 0 }, // L
    ],
    color: '#3B82F6', // Blue (TLIK group)
    position: { row: 8, col: 2 }, // Starting in tray at row 8
  },
  {
    id: 'ki',
    letters: 'KI',
    shape: [
      { row: 0, col: 0 }, // K
      { row: 0, col: 1 }, // I
    ],
    color: '#3B82F6', // Blue (TLIK group)
    position: { row: 9, col: 1 }, // Starting in tray at row 9
  },
];

// Final positions for THE LION KING
const finalPieces: MockPiece[] = [
  {
    id: 'the',
    letters: 'THE',
    shape: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ],
    color: '#F7C846', // Gold (completed)
    position: { row: 1, col: 2 }, // Final position
  },
  {
    id: 'lion',
    letters: 'LION',
    shape: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ],
    color: '#F7C846', // Gold (completed)
    position: { row: 2, col: 2 }, // Final position
  },
  {
    id: 'king',
    letters: 'KING',
    shape: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ],
    color: '#F7C846', // Gold (completed)
    position: { row: 3, col: 1 }, // Final position
  },
];

const gridWidth = 7;
const gridHeight = 10; // Larger grid for the custom layout

// Define which cells should be lighter (indicating where THE LION KING letters should go)
const letterPositions = new Set([
  '1-2',
  '1-3',
  '1-4', // THE positions
  '2-2',
  '2-3',
  '2-4',
  '2-5', // LION positions
  '3-1',
  '3-2',
  '3-3',
  '3-4', // KING positions
]);

export const LetteredInstructionsDialog: React.FC<LetteredInstructionsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [animationPhase, setAnimationPhase] = useState<
    'idle' | 'placing' | 'transforming' | 'complete'
  >('idle');
  const [placedPieces, setPlacedPieces] = useState<MockPiece[]>([]);
  const [transformStep, setTransformStep] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [startTime, setStartTime] = useState(Date.now());

  // Timer effect - count up elapsed time while playing
  useEffect(() => {
    if (!open) return;

    if (animationPhase === 'transforming') {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [animationPhase, open, startTime]);

  // Reset time and moves when animation loops back to idle
  useEffect(() => {
    if (animationPhase === 'idle' && open) {
      setElapsedTime(0);
      setMoveCount(0);
      setStartTime(Date.now());
    }
    if (animationPhase === 'complete' && open) {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [animationPhase, open]);

  // Update move count based on transform step
  useEffect(() => {
    if (animationPhase === 'transforming') {
      setMoveCount(transformStep - 1);
    } else if (animationPhase === 'complete') {
      setMoveCount(3); // Final move count
    }
  }, [transformStep, animationPhase]);

  // Animation logic - pieces start in tray, then transform to final positions
  useEffect(() => {
    if (open && animationPhase === 'idle') {
      // Start with all tray pieces already placed
      setPlacedPieces(trayPieces);
      setTransformStep(0);
      setAnimationPhase('transforming');
    } else if (animationPhase === 'transforming') {
      // Transform pieces by moving same-color pieces together
      setTransformStep(transformStep + 1);

      if (transformStep >= 3) {
        // All transformations complete, show final result
        setTimeout(() => {
          setPlacedPieces(finalPieces);
          setAnimationPhase('complete');
        }, 500);
      } else {
        const timer = setTimeout(() => {
          // Move pieces of the same color together
          setPlacedPieces((prev) => {
            console.log('transformStep', transformStep);
            console.log('prev', prev);
            return prev.map((piece) => {
              if (transformStep === 0) {
                // First: Move blue pieces (T, L, KI) together to fill TLIK letters
                if (piece.id === 't') {
                  return {
                    ...piece,
                    position: { row: 1, col: 2 }, // Move to THE position (T)
                  };
                } else if (piece.id === 'l') {
                  return {
                    ...piece,
                    position: { row: 2, col: 2 }, // Move to LION position (L)
                  };
                } else if (piece.id === 'ki') {
                  return {
                    ...piece,
                    position: { row: 3, col: 1 }, // Move to KING position (K,I)
                  };
                }
              } else if (transformStep === 1) {
                // Second: Move red pieces (HE) to fill H,E in THE
                if (piece.id === 'he') {
                  return {
                    ...piece,
                    position: { row: 1, col: 3 }, // H at col 3, E at col 4 in THE
                  };
                }
              } else if (transformStep === 2) {
                // Third: Move green pieces (ON, NG) together
                if (piece.id === 'ion') {
                  return {
                    ...piece,
                    position: { row: 2, col: 3 }, // Move to LION position
                  };
                } else if (piece.id === 'ng') {
                  return {
                    ...piece,
                    position: { row: 3, col: 3 }, // Move to KING position
                  };
                }
              }
              return piece;
            });
          });
        }, 1000);

        return () => clearTimeout(timer);
      }
    } else if (animationPhase === 'complete') {
      // Loop the animation after 4 seconds - restart with pieces in tray
      const loopTimer = setTimeout(() => {
        setAnimationPhase('idle');
        setPlacedPieces(trayPieces);
        setTransformStep(0);
      }, 4000);

      return () => clearTimeout(loopTimer);
    }
  }, [open, animationPhase, placedPieces]);

  const renderGrid = () => {
    const cells = [];

    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        let occupyingPiece = null;
        let localShapeIndex = -1;

        // Check placed pieces
        for (const piece of placedPieces) {
          if (!piece.position) continue;

          const relativeRow = row - piece.position.row;
          const relativeCol = col - piece.position.col;

          const shapeIndex = piece.shape.findIndex(
            (shapePos) => shapePos.row === relativeRow && shapePos.col === relativeCol
          );

          if (shapeIndex !== -1) {
            occupyingPiece = piece;
            localShapeIndex = shapeIndex;
            break;
          }
        }

        // No tray pieces - all pieces are placed immediately

        const cellKey = `${row}-${col}`;
        const isOccupied = occupyingPiece !== null;
        const isTray = row >= 5; // Tray area is rows 5-9
        const isLetterPosition = letterPositions.has(cellKey) && !isOccupied && !isTray;

        cells.push(
          <div
            key={cellKey}
            className={`w-5 h-5 rounded-sm flex items-center justify-center text-xs font-bold ${
              isOccupied
                ? 'text-black border-2 border-black/20 dark:border-white/20'
                : isTray
                  ? 'bg-muted' // No border for tray cells
                  : isLetterPosition
                    ? 'bg-gray-200 border dark:bg-gray-300 border-border'
                    : 'border bg-muted-foreground/30 dark:bg-gray-700 border-border'
            }`}
            style={{
              backgroundColor: isOccupied ? occupyingPiece?.color : undefined,
              opacity: isOccupied ? 1 : 0.7,
            }}
          >
            {isOccupied && occupyingPiece && localShapeIndex !== -1
              ? occupyingPiece.letters[localShapeIndex] || ''
              : ''}
          </div>
        );
      }
    }

    return cells;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex overflow-y-visible flex-col p-0 h-full border-0 bg-background sm:max-w-4xl"
        hideCloseButton
      >
        <DialogClose className="absolute top-4 right-4 z-30 text-foreground rounded-sm transition-colors hover:text-[#F7C846] focus:outline-none focus:ring-2 focus:ring-[#F7C846] focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="sr-only">Close</span>
        </DialogClose>

        {/* Header with Logo */}
        <div className="relative flex-shrink-0 py-8 text-center bg-background">
          <div className="flex gap-1 justify-center mb-2">
            {['L', 'E', 'T', 'T', 'E', 'R', 'E', 'D'].map((letter, index) => (
              <div
                key={index}
                className="flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11 bg-[#F7C846] text-black font-black text-lg sm:text-2xl rounded-sm"
              >
                {letter}
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold tracking-wide text-muted-foreground sm:text-base">
            HOW TO PLAY
          </p>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-6 bg-background min-h-auto">
          {/* Game Board Animation */}
          <div className="flex justify-center">
            <div className="p-4 rounded-lg border bg-card border-border">
              <div className="flex justify-center">
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
                    gridTemplateRows: `repeat(${gridHeight}, 1fr)`,
                  }}
                >
                  {renderGrid()}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Moves and Time Display */}
          <div className="flex gap-8 justify-center">
            <div className="flex flex-col items-center">
              <div className="text-3xl font-black text-[#F7C846]">{moveCount}</div>
              <div className="text-xs font-bold tracking-wider text-muted-foreground">MOVES</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-black text-[#F7C846]">0:0{elapsedTime}</div>
              <div className="text-xs font-bold tracking-wider text-muted-foreground">TIME</div>
            </div>
          </div>

          {/* Game Explanation */}
          <div className="p-4 space-y-3 rounded-lg border bg-card border-border">
            <p className="text-sm leading-relaxed text-foreground">
              Arrange letter pieces to form a complete phrase. Each piece contains multiple letters
              that must be placed together on the grid. The timer starts when you open the game.
            </p>
          </div>

          {/* How to Play Steps */}
          <div className="space-y-3">
            <div className="flex items-start p-3 space-x-3 rounded-lg border bg-card border-border">
              <div className="w-7 h-7 bg-[#F7C846] text-black flex items-center justify-center text-sm font-black flex-shrink-0 rounded-sm">
                1
              </div>
              <div>
                <h5 className="font-bold text-foreground">Drag pieces from the tray</h5>
                <p className="text-sm text-muted-foreground">
                  The tray contains all the letter pieces you need.
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 space-x-3 rounded-lg border bg-card border-border">
              <div className="w-7 h-7 bg-[#F7C846] text-black flex items-center justify-center text-sm font-black flex-shrink-0 rounded-sm">
                2
              </div>
              <div>
                <h5 className="font-bold text-foreground">Place on the grid</h5>
                <p className="text-sm text-muted-foreground">
                  Pieces can only be placed where they fit without overlapping.
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 space-x-3 rounded-lg border bg-card border-border">
              <div className="w-7 h-7 bg-[#F7C846] text-black flex items-center justify-center text-sm font-black flex-shrink-0 rounded-sm">
                3
              </div>
              <div>
                <h5 className="font-bold text-foreground">Form the phrase</h5>
                <p className="text-sm text-muted-foreground">
                  Arrange all pieces correctly to reveal the hidden phrase.
                </p>
              </div>
            </div>
            <div className="flex items-start p-3 space-x-3 rounded-lg border bg-card border-border">
              <div className="w-7 h-7 bg-[#F7C846] text-black flex items-center justify-center text-sm font-black flex-shrink-0 rounded-sm">
                4
              </div>
              <div>
                <h5 className="font-bold text-foreground">Finish fast</h5>
                <p className="text-sm text-muted-foreground">
                  Minimize moves and solve quickly for the best score!
                </p>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              className="px-10 py-3 text-lg tracking-wide"
            >
              GOT IT!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
