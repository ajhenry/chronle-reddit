import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface HomeLoadingAnimationProps {
  className?: string;
}

export const HomeLoadingAnimation: React.FC<HomeLoadingAnimationProps> = ({ className = '' }) => {
  return (
    <div
      className={`flex flex-col justify-center items-center space-y-8 h-screen ${className} bg-background`}
    >
      {/* Lettered Icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
        }}
      >
        <img src="/lettered-logo.svg" alt="Lettered Logo" className="w-16 h-16" />
      </motion.div>

      {/* LETTERED text */}
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
          LETTERED
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
