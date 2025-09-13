import React from 'react';
import { motion } from 'framer-motion';

interface TopXErrorAnimationProps {
  className?: string;
  errorMessage?: string;
}

export const TopXErrorAnimation: React.FC<TopXErrorAnimationProps> = ({
  className = '',
  errorMessage = "Failed to load today's game",
}) => {
  const squares = [
    { id: 0, label: '1' },
    { id: 1, label: '2' },
    { id: 2, label: '3' },
    { id: 3, label: '4' },
  ];

  return (
    <div className={`flex flex-col justify-center items-center space-y-8 ${className}`}>
      {/* All squares red like game lost state */}
      <div className="grid grid-cols-1 gap-3 w-36 max-w-xs">
        {squares.map((square) => (
          <motion.div
            key={square.id}
            className="flex justify-center items-center w-full h-12 text-xl font-bold text-white rounded-lg shadow-lg"
            initial={{ backgroundColor: '#EF4444', scale: 1 }} // red-500
            animate={{
              backgroundColor: '#EF4444', // red-500
              scale: [1, 1.02, 1], // subtle pulsing
            }}
            transition={{
              scale: {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
          >
            {'X'}
          </motion.div>
        ))}
      </div>
      {/* Error text */}
      <div className="text-xl font-bold text-center text-destructive">{errorMessage}</div>
    </div>
  );
};
