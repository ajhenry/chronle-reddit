import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';

interface LetteredLoadingAnimationProps {
  className?: string;
}

interface MockPiece {
  id: string;
  letters: string;
  shape: { row: number; col: number }[];
  color: string;
  position: { row: number; col: number } | null;
}

export const LetteredLoadingAnimation: React.FC<LetteredLoadingAnimationProps> = ({
  className = '',
}) => {
  const [phase, setPhase] = useState<'placing' | 'removing'>('placing');
  const [placedPieces, setPlacedPieces] = useState<MockPiece[]>([]);
  const [cycleCount, setCycleCount] = useState(0);
  // get the gameid param from the url
  const { gameId } = useParams<{ gameId?: string }>();
  console.log('gameId', gameId);

  // Mock pieces for the animation - spelling "LETTERED" in diagonal pattern
  const mockPieces: MockPiece[] = [
    {
      id: 'piece1',
      letters: 'LET',
      shape: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
      color: '#3B82F6', // blue
      position: null,
    },
    {
      id: 'piece2',
      letters: 'TER',
      shape: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
      color: '#10B981', // green
      position: null,
    },
    {
      id: 'piece3',
      letters: 'ED',
      shape: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
      color: '#F59E0B', // yellow
      position: null,
    },
  ];

  // Grid size for the animation
  const gridWidth = 6;
  const gridHeight = 5;

  // Positions where pieces will be placed - diagonal LETTERED pattern
  const placementPositions = [
    { row: 1, col: 1 }, // LET (row 1, cols 1-3)
    { row: 2, col: 2 }, // TER (row 2, cols 2-4)
    { row: 3, col: 2 }, // ED (row 3, cols 2-3)
  ];

  useEffect(() => {
    const placePieces = async () => {
      setPhase('placing');
      setPlacedPieces([]);

      // Place pieces one by one
      for (let i = 0; i < mockPieces.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const piece = { ...mockPieces[i]!, position: placementPositions[i]! };
        setPlacedPieces((prev) => [...prev, piece]);
      }

      // Wait a bit, then start removing
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setPhase('removing');

      // Remove pieces in reverse order
      for (let i = mockPieces.length - 1; i >= 0; i--) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setPlacedPieces((prev) => prev.slice(0, i));
      }

      // Wait a bit, then repeat the cycle
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCycleCount((prev) => prev + 1);
    };

    void placePieces();
  }, [cycleCount]);

  // Render the grid
  const renderGrid = () => {
    const cells = [];

    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        // Check if this cell is occupied by any piece
        let occupyingPiece = null;
        let localShapeIndex = -1;

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

        const cellKey = `${row}-${col}`;
        const isOccupied = occupyingPiece !== null;

        cells.push(
          <motion.div
            key={cellKey}
            className={`w-8 h-8 border border-border rounded-sm flex items-center justify-center text-xs font-bold transition-colors ${
              isOccupied ? 'text-white' : 'bg-gray-200'
            }`}
            style={{
              backgroundColor: isOccupied ? occupyingPiece?.color : '#E5E7EB',
            }}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: isOccupied ? 1 : 0.8 }}
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
    <div className={`flex flex-col justify-center items-center space-y-6 h-[80vh] ${className}`}>
      {/* Animated grid */}
      <div className="p-4 rounded-lg shadow-sm bg-card">
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

      {/* Loading text */}
      <div className="text-xl font-bold text-card-foreground">
        Loading <span className="text-primary">Lettered</span>
      </div>
    </div>
  );
};
