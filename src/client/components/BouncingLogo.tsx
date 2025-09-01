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
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 200 });
  const containerRef = useRef<HTMLDivElement>(null);

  const logoSize = 80;

  // Get container width on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: rect.width,
          height: 200,
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
        if (newX <= 0 || newX >= containerDimensions.width - logoSize) {
          newVelX = -velocity.x;
          newX = newX <= 0 ? 0 : containerDimensions.width - logoSize;
        }

        if (newY <= 0 || newY >= containerDimensions.height - logoSize) {
          newVelY = -velocity.y;
          newY = newY <= 0 ? 0 : containerDimensions.height - logoSize;
        }

        setVelocity({ x: newVelX, y: newVelY });

        return { x: newX, y: newY };
      });
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [velocity, containerDimensions.width, containerDimensions.height, logoSize]);

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
          width: `${logoSize}px`,
          height: `${logoSize}px`,
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
