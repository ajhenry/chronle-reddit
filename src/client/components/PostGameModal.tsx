import React from 'react';
import { Dialog, DialogContent, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

export interface PostGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameType: 'lettered';
  isCustomGame?: boolean; // New prop for custom games

  // Loading states
  loading?: boolean;
  error?: string | null;

  // Core stats
  time: number; // elapsed time in milliseconds
  moves: number;

  // Theme/prompt
  theme: string;

  // Leaderboard data
  leaderboard?: Array<{
    username: string;
    timeElapsed: number;
    moves: number;
    rank?: number;
  }>;
  playerRank?: number;
  totalPlayers?: number;

  // Actions
  onClose: () => void;

  // Optional children for additional content (like answer lists)
  children?: React.ReactNode;
}

// Format milliseconds to MM:SS or HH:MM:SS
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const PostGameModal: React.FC<PostGameModalProps> = ({
  open,
  onOpenChange,
  gameType,
  isCustomGame = false, // Default to false for regular games
  loading = false,
  error = null,
  time,
  moves,
  theme,
  leaderboard = [],
  playerRank,
  totalPlayers,
  onClose,
  children,
}) => {
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const getHeaderText = () => {
    switch (gameType) {
      case 'lettered':
        return { title: 'PUZZLE', subtitle: 'COMPLETE' };
      default:
        return { title: 'GAME', subtitle: 'COMPLETE' };
    }
  };

  const headerText = getHeaderText();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex overflow-y-visible flex-col p-0 mt-4 mb-4 w-full h-full border-4 border-black bg-card sm:max-w-xl sm:mb-0 max-h-[800px]"
        hideCloseButton
      >
        <DialogClose className="absolute top-4 right-4 z-30 text-white rounded-sm transition-colors hover:text-white/80 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black disabled:pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span className="sr-only">Close</span>
        </DialogClose>

        {/* Header Banner */}
        <div className="relative flex-shrink-0 py-6 text-center text-white bg-black">
          <div className="absolute -top-2 -left-2 z-10 px-3 py-1 text-black border-2 border-black transform -rotate-12 bg-primary">
            <span className="text-sm font-black tracking-wide">COMPLETE</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">{headerText.title}</h1>
          <h2 className="-mt-1 text-2xl font-black tracking-wider text-white">
            {headerText.subtitle}
          </h2>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6 min-h-auto">
          {/* Error State */}
          {error && (
            <div className="py-8 text-center">
              <div className="text-xl font-bold text-destructive">Failed to load stats</div>
              <div className="mt-2 text-sm text-muted-foreground">{error}</div>
            </div>
          )}

          {/* Player Score Display - Different text for custom vs daily games */}
          <div className="relative p-4 text-center text-white bg-black border-4 border-black">
            <div className="mb-1 text-2xl font-black tracking-wide">
              {loading ? (
                <Skeleton className="mx-auto w-32 h-8 bg-gray-600" />
              ) : isCustomGame ? (
                'PLAYER SCORE'
              ) : (
                'VALIDATED'
              )}
            </div>
            <div className="text-sm font-bold tracking-wider">
              {loading ? (
                <Skeleton className="mx-auto w-40 h-4 bg-gray-600" />
              ) : isCustomGame ? (
                'USERNAME RANKED'
              ) : (
                'SERVER CONFIRMED'
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 text-center bg-white border-4 border-black shadow-lg">
              <div className="mb-1 text-3xl font-black text-black">
                {loading ? <Skeleton className="mx-auto w-16 h-9 bg-gray-300" /> : formatTime(time)}
              </div>
              <div className="text-sm font-bold tracking-wide text-black">
                {loading ? <Skeleton className="mx-auto w-12 h-4 bg-gray-300" /> : 'TIME'}
              </div>
            </div>
            <div className="p-4 text-center bg-white border-4 border-black shadow-lg">
              <div className="mb-1 text-3xl font-black text-black">
                {loading ? (
                  <Skeleton className="mx-auto w-8 h-9 bg-gray-300" />
                ) : (
                  moves
                )}
              </div>
              <div className="text-sm font-bold tracking-wide text-black">
                {loading ? (
                  <Skeleton className="mx-auto w-12 h-4 bg-gray-300" />
                ) : (
                  'MOVES'
                )}
              </div>
            </div>
          </div>

          {/* Theme Display */}
          <div className="p-4 text-center border-4 border-black shadow-lg bg-primary">
            <div className="mb-1 text-sm font-black tracking-wide text-black">
              {loading ? <Skeleton className="mx-auto w-28 h-4 bg-gray-600" /> : "TODAY'S THEME"}
            </div>
            <div className="text-xl font-black leading-tight text-black">
              {loading ? <Skeleton className="mx-auto w-48 h-7 bg-gray-600" /> : theme}
            </div>
          </div>

          {/* Leaderboard Display for Custom Games */}
          {isCustomGame && leaderboard && leaderboard.length > 0 && (
            <div className="p-4 bg-white border-4 border-black shadow-lg">
              <div className="mb-3 text-lg font-black text-center text-black">LEADERBOARD</div>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((entry, index) => (
                  <div
                    key={`${entry.username}-${entry.timeElapsed}-${entry.moves}`}
                    className={`flex justify-between items-center p-2 border-2 border-black ${
                      entry.username === 'You' || index === (playerRank ? playerRank - 1 : -1)
                        ? 'bg-yellow-300 font-bold'
                        : 'bg-gray-100'
                    }`}
                  >
                    <div className="flex gap-2 items-center">
                      <span className="font-black text-black">#{index + 1}</span>
                      <span className="font-bold text-black">{entry.username}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="font-black text-black">{formatTime(entry.timeElapsed)}</span>
                      <span className="text-xs font-bold text-black">({entry.moves} moves)</span>
                    </div>
                  </div>
                ))}
              </div>
              {playerRank && totalPlayers && (
                <div className="mt-3 text-sm font-bold text-center text-black">
                  Your Rank: #{playerRank} of {totalPlayers} players
                </div>
              )}
            </div>
          )}

          {/* Additional content (game-specific sections) */}
          {children}

          {/* Close Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={onClose}
              className="bg-foreground text-background border-4 border-foreground font-black text-xl py-4 px-8 shadow-lg hover:shadow-xl transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] tracking-wider"
            >
              CLOSE
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
