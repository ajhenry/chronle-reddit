import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TopXLoadingAnimationProps {
  className?: string;
}

export const TopXLoadingAnimation: React.FC<TopXLoadingAnimationProps> = ({ className = '' }) => {
  const [litSquares, setLitSquares] = useState<Set<number>>(new Set());
  const [cycleCount, setCycleCount] = useState(0);

  // Animation sequence: randomly light up squares
  useEffect(() => {
    const animateSquares = async () => {
      setLitSquares(new Set()); // Start with all gray

      // Light up each square in random order
      const squareIds = [0, 1, 2, 3];
      const shuffledIds = [...squareIds].sort(() => Math.random() - 0.5);

      for (const squareId of shuffledIds) {
        await new Promise((resolve) => setTimeout(resolve, 400)); // Wait 300ms
        setLitSquares((prev) => new Set(prev).add(squareId));
      }

      // Wait a bit with all lit
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Turn all off at once
      setLitSquares(new Set());

      // Wait before starting next cycle
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCycleCount((prev) => prev + 1);
    };

    void animateSquares();
  }, [cycleCount]);

  const squares = [
    { id: 0, label: '1' },
    { id: 1, label: '2' },
    { id: 2, label: '3' },
    { id: 3, label: '4' },
  ];

  return (
    <div
      className={`flex flex-col flex-1 justify-center items-center space-y-8 h-[80vh] ${className}`}
    >
      {/* Animated rectangles grid */}
      <div className="grid grid-cols-1 gap-3 w-36 max-w-xs">
        {squares.map((square) => {
          const isLit = litSquares.has(square.id);
          return (
            <motion.div
              key={square.id}
              className="flex justify-center items-center w-full h-12 text-xl font-bold text-white rounded-lg shadow-lg"
              initial={{ backgroundColor: '#6B7280' }} // gray-500
              animate={{
                backgroundColor: isLit
                  ? '#10B981' // emerald-500 (green)
                  : '#6B7280', // gray-500
                scale: isLit ? 1.05 : 1,
              }}
              transition={{
                duration: 0.3,
                ease: 'easeInOut',
              }}
            >
              {square.label}
            </motion.div>
          );
        })}
      </div>
      {/* Loading text */}
      <div className="text-xl font-bold text-card-foreground">
        Loading today's <span className="text-accent">Top X</span>
      </div>
    </div>
  );
};
