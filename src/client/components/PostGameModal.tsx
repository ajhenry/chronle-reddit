import React from 'react';
import { Dialog, DialogContent, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { GameLeaderboard, LeaderboardEntry } from './GameLeaderboard';

export interface PostGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameType: 'lettered';
  isCustomGame?: boolean; // New prop for custom games

  // Loading states
  loading?: boolean;
  error?: string | null;

  // Core stats (only shown when showUserStats is true)
  time: number; // elapsed time in milliseconds
  moves: number;

  // Theme/prompt
  theme: string;

  // Streak data (only shown when showUserStats is true)
  currentStreak?: number;
  bestStreak?: number;

  // Leaderboard data
  leaderboard?: LeaderboardEntry[];
  playerRank?: number;
  totalPlayers?: number;
  userEntry?: LeaderboardEntry; // User's entry if outside top 5
  currentUsername?: string; // Current user's username for highlighting

  // Actions
  onClose: () => void;

  // Optional children for additional content (like answer lists)
  children?: React.ReactNode;

  // Whether the game is complete (affects header text)
  isComplete?: boolean;
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
  isCustomGame: _isCustomGame = false, // Kept for backwards compatibility
  loading = false,
  error = null,
  time,
  moves,
  theme,
  currentStreak,
  bestStreak,
  leaderboard = [],
  playerRank,
  totalPlayers,
  userEntry,
  currentUsername,
  onClose,
  children,
  isComplete = true,
}) => {
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex overflow-y-visible flex-col p-0 w-full h-full border-0 bg-background sm:max-w-xl"
        hideCloseButton
      >
        <DialogClose className="absolute top-4 right-4 z-30 text-foreground rounded-sm transition-colors hover:text-[#F7C846] focus:outline-none focus:ring-2 focus:ring-[#F7C846] focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="sr-only">Close</span>
        </DialogClose>

        {/* Header Banner with Logo */}
        <div className="relative flex-shrink-0 py-8 text-center bg-background">
          <div className="flex gap-1 justify-center mb-3">
            {['P', 'U', 'Z', 'Z', 'L', 'E'].map((letter, index) => (
              <div
                key={index}
                className="flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 bg-[#F7C846] text-black font-black text-xl sm:text-2xl rounded-sm"
              >
                {letter}
              </div>
            ))}
          </div>
          <p className="text-lg font-bold tracking-wider text-foreground">
            {isComplete ? 'Completed!' : 'Stats'}
          </p>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-5 min-h-auto bg-background">
          {/* Error State */}
          {error && (
            <div className="p-4 text-center bg-red-100 rounded-lg border border-red-300 dark:bg-red-900/30 dark:border-red-500/50">
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                Failed to load stats
              </div>
              <div className="mt-1 text-sm text-red-500 dark:text-red-300/70">{error}</div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 text-center rounded-lg border bg-card border-border">
              <div className="mb-1 text-3xl font-black text-[#F7C846]">
                {loading ? <Skeleton className="mx-auto w-16 h-9" /> : formatTime(time)}
              </div>
              <div className="text-xs font-bold tracking-wider text-muted-foreground">
                {loading ? <Skeleton className="mx-auto w-12 h-4" /> : 'TIME'}
              </div>
            </div>
            <div className="p-4 text-center rounded-lg border bg-card border-border">
              <div className="mb-1 text-3xl font-black text-[#F7C846]">
                {loading ? <Skeleton className="mx-auto w-8 h-9" /> : moves}
              </div>
              <div className="text-xs font-bold tracking-wider text-muted-foreground">
                {loading ? <Skeleton className="mx-auto w-12 h-4" /> : 'MOVES'}
              </div>
            </div>
          </div>

          {/* Theme Display */}
          <div className="p-4 text-center bg-[#F7C846] rounded-lg">
            <div className="mb-1 text-xs font-bold tracking-wider text-black/70">
              {loading ? <Skeleton className="mx-auto w-28 h-4 bg-black/20" /> : 'THE PHRASE'}
            </div>
            <div className="text-xl font-black tracking-tight text-black">
              {loading ? <Skeleton className="mx-auto w-48 h-7 bg-black/20" /> : theme}
            </div>
          </div>

          {/* Leaderboard Display */}
          <GameLeaderboard
            entries={leaderboard}
            loading={loading}
            playerRank={playerRank}
            totalPlayers={totalPlayers}
            userEntry={userEntry}
            currentUsername={currentUsername}
          />

          {/* Daily Streak */}
          {(currentStreak !== undefined || loading) && (
            <div className="p-4 text-center bg-[#F7C846] rounded-lg">
              <div className="mb-1 text-xs font-bold tracking-wider text-black/70">
                CURRENT STREAK
              </div>
              <div className="text-xl font-black tracking-tight text-black">
                {loading ? (
                  <Skeleton className="mx-auto w-64 h-7 bg-black/20" />
                ) : (
                  `${currentStreak} day${currentStreak === 1 ? '' : 's'} ${bestStreak !== undefined && bestStreak > (currentStreak ?? 0) ? ` (Best: ${bestStreak} day${bestStreak === 1 ? '' : 's'})` : ''}`
                )}
              </div>
            </div>
          )}

          {/* Additional content (game-specific sections) */}
          {children}

          {/* Close Button */}
          <div className="flex justify-center pt-4">
            <Button onClick={onClose} className="px-10 py-3 text-lg tracking-wide">
              CLOSE
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
