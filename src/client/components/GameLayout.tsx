import { ReactNode, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface GameLayoutProps {
  gameTitle: string;
  score: number;
  attempts: number;
  maxAttempts: number;
  children: ReactNode;
  onBack: () => void;
  onLeaderboard?: () => void;
}

export const GameLayout = ({
  gameTitle,
  score,
  attempts,
  maxAttempts,
  children,
  onBack,
  onLeaderboard,
}: GameLayoutProps) => {
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <img src="/snoodle-logo.png" alt="Snoodle Logo" className="w-8 h-8 object-contain" />
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">{gameTitle}</h1>
        </div>

        {/* Score */}
        <div className="text-center">
          <div className="text-3xl font-bold text-foreground">{score}</div>
          <div className="text-sm font-medium text-foreground">SCORE</div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Leaderboard Button */}
          <Button variant="outline" size="icon" onClick={onLeaderboard}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-foreground"
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
              className="text-foreground"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17l0 0" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Attempts Counter */}
      <div className="text-center mb-6">
        <Card className="px-4 py-2 inline-block">
          <span className="font-medium text-card-foreground">
            ATTEMPTS: {attempts}/{maxAttempts}
          </span>
        </Card>
      </div>

      {/* Game Content */}
      <div className="max-w-2xl mx-auto">{children}</div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="p-6 max-w-md w-full">
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
              <div className="space-y-3 text-card-foreground text-sm">
                <p>1. Read the prompt carefully</p>
                <p>2. Type your answer in the input field</p>
                <p>3. Press Enter to submit your answer</p>
                <p>4. Get all correct answers to win!</p>
                <p>5. You have {maxAttempts} attempts total</p>
              </div>
              <Button onClick={() => setShowHelpModal(false)} className="w-full mt-6">
                GOT IT
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
