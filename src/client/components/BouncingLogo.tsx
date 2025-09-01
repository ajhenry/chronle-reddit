import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface BouncingLogoProps {
  src: string;
  alt: string;
  className?: string;
}

export const BouncingLogo: React.FC<BouncingLogoProps> = ({ src, alt, className = '' }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ x: 1, y: 1 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const logoWidth = 60; // Reduced from 80
  const logoHeight = logoWidth * 0.75; // 75% of width

  // Get container width on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Make container height proportional to width (e.g., 25% of width, with minimum height)
        const dynamicHeight = Math.max(rect.width * 0.25, 100);
        setContainerDimensions({
          width: rect.width,
          height: dynamicHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => {
        let newX = prev.x + velocity.x;
        let newY = prev.y + velocity.y;
        let newVelX = velocity.x;
        let newVelY = velocity.y;

        // Bounce off walls
        if (newX <= 0 || newX >= containerDimensions.width - logoWidth) {
          newVelX = -velocity.x;
          newX = newX <= 0 ? 0 : containerDimensions.width - logoWidth;
        }

        if (newY <= 0 || newY >= containerDimensions.height - logoHeight) {
          newVelY = -velocity.y;
          newY = newY <= 0 ? 0 : containerDimensions.height - logoHeight;
        }

        setVelocity({ x: newVelX, y: newVelY });

        return { x: newX, y: newY };
      });
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [velocity, containerDimensions.width, containerDimensions.height, logoWidth, logoHeight]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden w-full"
      style={{
        height: `${containerDimensions.height}px`,
      }}
    >
      <motion.div
        className={`absolute ${className}`}
        animate={{
          x: position.x,
          y: position.y,
        }}
        transition={{
          duration: 0,
          ease: 'linear',
        }}
        style={{
          width: `${logoWidth}px`,
          height: `${logoHeight}px`,
        }}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
          style={{
            filter: 'drop-shadow(2px 2px 0px rgba(0, 0, 0, 0.8))',
          }}
        />
      </motion.div>
    </div>
  );
};
