import { ReactNode, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';

interface GameLayoutProps {
  gameTitle: string;
  score: number;
  moves?: number;
  children: ReactNode;
  onBack: () => void;
  onLeaderboard?: () => void;
  onHelp?: () => void;
  logoSrc?: string;
  className?: string;
}

export const GameLayout = ({
  gameTitle,
  score,
  moves,
  children,
  onBack,
  onLeaderboard,
  onHelp,
  logoSrc = '/lettered-logo.svg',
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

          {/* Score and Moves */}
          <div className="flex items-center gap-6">
            {/* Score */}
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{score}</div>
              <div className="text-sm font-medium text-foreground">SCORE</div>
            </div>

            {/* Moves */}
            {moves !== undefined && (
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">{moves}</div>
                <div className="text-sm font-medium text-foreground">MOVES</div>
              </div>
            )}
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
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (onHelp) {
                  onHelp();
                } else {
                  setShowHelpModal(true);
                }
              }}
            >
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
