import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface HomeLoadingAnimationProps {
  className?: string;
}

export const HomeLoadingAnimation: React.FC<HomeLoadingAnimationProps> = ({ className = '' }) => {
  const [activeIcon, setActiveIcon] = useState<'topx' | 'lettered'>('topx');

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIcon((prev) => (prev === 'topx' ? 'lettered' : 'topx'));
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`flex flex-col justify-center items-center space-y-8 h-screen ${className} bg-background`}
    >
      {/* Icons container */}
      <div className="relative" style={{ width: '150px', height: '80px' }}>
        {/* Top X Icon */}
        <motion.div
          className="absolute"
          initial={{ x: -100, opacity: 0 }}
          animate={
            activeIcon === 'topx'
              ? {
                  x: [0, 200],
                  opacity: [1, 1, 1, 1],
                }
              : { x: -100, opacity: 0 }
          }
          transition={{
            duration: 0.8,
            ease: 'easeInOut',
            times: [0, 0.4, 0.4, 1],
          }}
          style={{ top: '0px', left: '0px' }}
        >
          <img src="/topx-logo.svg" alt="Top X Logo" className="w-16 h-16" />
        </motion.div>

        {/* Lettered Icon */}
        <motion.div
          className="absolute"
          initial={{ x: -100, opacity: 0 }}
          animate={
            activeIcon === 'lettered'
              ? {
                  x: [0, 200],
                  opacity: [1, 1, 1, 1],
                }
              : { x: -100, opacity: 0 }
          }
          transition={{
            duration: 0.8,
            ease: 'easeInOut',
            times: [0, 0.4, 0.4, 1],
          }}
          style={{ top: '0px', left: '0px' }}
        >
          <img src="/lettered-logo.svg" alt="Lettered Logo" className="w-16 h-16" />
        </motion.div>
      </div>

      {/* PODIUM text */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0 }}
      >
        <h1
          className="text-6xl font-black tracking-tight text-card-foreground"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            lineHeight: '0.8',
          }}
        >
          PODIUM
        </h1>
      </motion.div>

      {/* Loading text */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <p className="text-xl font-bold uppercase text-card-foreground">is loading</p>
      </motion.div>
    </div>
  );
};
