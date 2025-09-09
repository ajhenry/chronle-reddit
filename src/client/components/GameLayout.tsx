import { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';

interface GameLayoutProps {
  gameTitle: string;
  score: number;
  attempts?: number;
  maxAttempts?: number;
  children: ReactNode;
  onBack: () => void;
  onLeaderboard?: () => void;
  logoSrc?: string;
  className?: string;
}

const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setPreviousValue(displayValue);
      setDisplayValue(value);
      setIsAnimating(true);

      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 600); // Match the animation duration

      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <span className="inline-block relative number-container">
      <AnimatePresence mode="wait">
        {isAnimating ? (
          <>
            <motion.span
              key={`out-${previousValue}`}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -24, opacity: 0 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.68, -0.55, 0.265, 1.55],
              }}
              className="flex absolute inset-0 justify-center items-center"
            >
              {previousValue}
            </motion.span>
            <motion.span
              key={`in-${displayValue}`}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.6,
                ease: [0.68, -0.55, 0.265, 1.55],
              }}
              className="flex absolute inset-0 justify-center items-center"
            >
              {displayValue}
            </motion.span>
          </>
        ) : (
          <motion.span
            key={`static-${displayValue}`}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            className="flex absolute inset-0 justify-center items-center"
          >
            {displayValue}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

export const GameLayout = ({
  gameTitle,
  score,
  attempts,
  maxAttempts,
  children,
  onBack,
  onLeaderboard,
  logoSrc = '/top-x-logo.png',
  className,
}: GameLayoutProps) => {
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <div className={cn('p-4 min-h-screen bg-background', className)}>
      {/* Top Bar */}
      <div className="mx-auto mb-6 max-w-2xl">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex gap-3 items-center">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <img src={logoSrc} alt="Game Logo" className="object-contain w-12 h-12" />
            </Button>
            <h1 className="hidden text-2xl font-semibold text-foreground md:block">{gameTitle}</h1>
          </div>

          {/* Score */}
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">{score}</div>
            <div className="text-sm font-medium text-foreground">SCORE</div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 items-center">
            {/* Leaderboard Button */}
            <Button variant="outline" size="icon" onClick={onLeaderboard}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 3v18h18" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
              </svg>
            </Button>

            {/* Help Button */}
            <Button variant="outline" size="icon" onClick={() => setShowHelpModal(true)}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17l0 0" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="mx-auto max-w-2xl">{children}</div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black/50">
          <div className="overflow-y-auto w-full max-w-md max-h-full">
            <Card className="p-6 w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-card-foreground">HOW TO PLAY</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHelpModal(false)}
                  className="text-xl font-semibold text-card-foreground"
                >
                  ×
                </Button>
              </div>
              <CardContent>
                <div className="space-y-3 text-sm text-card-foreground">
                  <p>1. Read the prompt carefully</p>
                  <p>2. Type your answer in the input field</p>
                  <p>3. Press Enter to submit your answer</p>
                  <p>4. Get all correct answers to win!</p>
                  {maxAttempts && <p>5. You have {maxAttempts} attempts total</p>}
                </div>
                <Button onClick={() => setShowHelpModal(false)} className="mt-6 w-full">
                  GOT IT
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
