import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { calculateDecayAmount, DEFAULT_INITIAL_SCORE } from '../../shared/score-decay';

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
    color: '#3B82F6', // Blue (T is TLIK group)
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
    color: '#3B82F6', // Blue (L,I are TLIK group, O,N are ONNG group - mixed)
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
    color: '#3B82F6', // Blue (K,I are TLIK group, N,G are ONNG group - mixed)
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
  const [currentScore, setCurrentScore] = useState(DEFAULT_INITIAL_SCORE);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [startTime, setStartTime] = useState(Date.now());

  // Score countdown effect - rapid decay while dialog is open
  useEffect(() => {
    if (!open && animationPhase !== 'idle') return;

    countdownRef.current = setInterval(() => {
      setCurrentScore((prevAmount) => {
        const newScore =
          prevAmount - calculateDecayAmount('lettered', (Date.now() - startTime) / 1000);
        return newScore;
      });
    }, 1000); // Update every 100ms for rapid countdown

    return () => clearInterval(countdownRef.current!);
  }, [animationPhase, open, startTime]);

  // Reset score when animation loops back to idle
  useEffect(() => {
    if (animationPhase === 'idle' && open) {
      setCurrentScore(DEFAULT_INITIAL_SCORE);
      setStartTime(Date.now());
    }
    if (animationPhase === 'complete' && open) {
      clearInterval(countdownRef.current!);
    }
  }, [animationPhase, open]);

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
          <motion.div
            key={cellKey}
            className={`w-5 h-5 rounded-sm flex items-center justify-center text-xs font-bold transition-all duration-50 ${
              isOccupied
                ? 'text-white border-2 border-white/20'
                : isTray
                  ? 'bg-gray-600' // No border for tray cells
                  : isLetterPosition
                    ? 'bg-gray-300 border border-border'
                    : 'bg-gray-700 border border-border'
            }`}
            style={{
              backgroundColor: isOccupied
                ? occupyingPiece?.color
                : isTray
                  ? '#6B7280'
                  : isLetterPosition
                    ? '#D1D5DB'
                    : '#374151',
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: isOccupied ? 1 : 0.7 }}
            transition={{ duration: 0.3 }}
          >
            {isOccupied && occupyingPiece && localShapeIndex !== -1
              ? occupyingPiece.letters[localShapeIndex] || ''
              : ''}
          </motion.div>
        );
      }
    }

    return cells;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 border-4 border-black bg-card sm:max-w-4xl h-[90vh] max-h-[95vh] flex flex-col mt-4 overflow-y-visible"
        hideCloseButton
      >
        <DialogClose className="absolute top-4 right-4 z-30 text-white rounded-sm transition-colors hover:text-white/80 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black disabled:pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span className="sr-only">Close</span>
        </DialogClose>

        {/* Header */}
        <div className="relative flex-shrink-0 py-6 text-center text-white bg-black">
          <div className="absolute -top-2 -left-2 z-10 px-3 py-1 text-black border-2 border-black transform -rotate-12 bg-primary">
            <span className="text-sm font-black tracking-wide text-foreground">HOW TO PLAY</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">LETTERED</h1>
          <h2 className="-mt-1 text-2xl font-black tracking-wider text-white">INSTRUCTIONS</h2>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-8 min-h-auto">
          {/* Animation Section */}
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-center text-foreground">HOW TO PLAY</h3>

            {/* Game Board Animation */}
            <div className="flex justify-center">
              <div className="p-4 rounded-lg border-2 shadow-sm bg-card border-border">
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

            {/* Animation Description */}
            <div className="space-y-2 text-center">
              {/* Dynamic Score Display */}
              <div className="flex flex-col justify-center">
                <div className="text-2xl font-black text-foreground">{currentScore}</div>
                <div className="font-black text-md text-foreground">SCORE</div>
              </div>
            </div>
          </div>

          {/* Game Explanation */}
          <div className="space-y-4">
            <h3 className="text-xl font-black text-foreground">GAME OBJECTIVE</h3>
            <p className="leading-relaxed text-foreground">
              Lettered is a word puzzle game where you must arrange letter pieces to form a complete
              phrase or sentence. Each piece contains multiple letters that must be placed together
              on the grid to spell out words.
            </p>
          </div>

          {/* How to Play */}
          <div className="space-y-4">
            <h3 className="text-xl font-black text-foreground">HOW TO PLAY</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <h4 className="text-foreground">
                  <h5 className="text-lg font-black">Drag pieces from the tray</h5>
                  <p className="text-sm text-muted-foreground">
                    The tray contains all the letter pieces you need to solve the puzzle.
                  </p>
                </h4>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <h4 className="text-foreground">
                  <h5 className="text-lg font-black">Place on the grid</h5>
                  <p className="text-sm text-muted-foreground">
                    Pieces can only be placed where they fit without overlapping existing pieces or
                    going outside the grid boundaries.
                  </p>
                </h4>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <h4 className="text-foreground">
                  <h5 className="text-lg font-black">Form the phrase</h5>
                  <p className="text-sm text-muted-foreground">
                    Arrange all pieces correctly to reveal the hidden phrase. Some letters may
                    already be placed on the board as hints.
                  </p>
                </h4>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  4
                </div>
                <h4 className="text-foreground">
                  <h5 className="text-lg font-black">Finish Fast</h5>
                  <p className="text-sm text-muted-foreground">
                    Score decreases over time, the faster you complete the puzzle the higher your
                    score will be.
                  </p>
                </h4>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-center pt-4 border-t">
            <Button
              onClick={() => onOpenChange(false)}
              className="font-black text-xl py-4 px-8 shadow-lg hover:shadow-xl transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] tracking-wider"
            >
              GOT IT!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
