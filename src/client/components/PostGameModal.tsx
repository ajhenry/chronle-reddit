import { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContentSlim,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import type { ChronlePostGameResponse } from '../../shared/types/chronle';
import type { UserStats } from '../../shared/types/api';
import { apiFetch } from '../lib/utils';

interface PostGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSolved: boolean;
  attemptCount: number;
  correctCount: number;
  postGameStats: ChronlePostGameResponse | null;
  gameTitle: string;
}

export function PostGameModal({
  open,
  onOpenChange,
  isSolved,
  attemptCount,
  correctCount,
  postGameStats,
  gameTitle,
}: PostGameModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const totalPages = 2;

  // Handle swipe gestures for page navigation (passive, no preventDefault)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const deltaX = touchStart.current.x - touchEnd.x;
    const deltaY = touchStart.current.y - touchEnd.y;

    // Only trigger page change for horizontal swipes (horizontal > vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0 && currentPage < totalPages - 1) {
        // Swipe left -> next page
        setCurrentPage((p) => p + 1);
      } else if (deltaX < 0 && currentPage > 0) {
        // Swipe right -> previous page
        setCurrentPage((p) => p - 1);
      }
    }

    touchStart.current = null;
  };

  // Fetch user stats when modal opens
  useEffect(() => {
    if (open) {
      const fetchStats = async () => {
        try {
          const response = await apiFetch('/api/stats/user');
          if (response.ok) {
            const data = await response.json();
            setUserStats(data.stats);
          }
        } catch (error) {
          console.error('Error fetching user stats:', error);
        }
      };
      void fetchStats();
    }
  }, [open]);

  // Reset page when modal opens
  useEffect(() => {
    if (open) {
      setCurrentPage(0);
    }
  }, [open]);

  // Calculate distribution for visualization
  const distribution = useMemo(() => {
    if (!postGameStats?.allPlayerStats) return [];

    const dist: Array<{ attempts: number; count: number; percentage: number }> = [];
    const totalPlayers = postGameStats.totalPlayers || 1;

    // Attempts 1-6 (solved)
    for (let i = 1; i <= 6; i++) {
      const count = postGameStats.allPlayerStats[String(i)] || 0;
      dist.push({
        attempts: i,
        count,
        percentage: (count / totalPlayers) * 100,
      });
    }

    // 7+ means failed (ran out of attempts)
    const failedCount = postGameStats.allPlayerStats['7'] || 0;
    if (failedCount > 0) {
      dist.push({
        attempts: 7,
        count: failedCount,
        percentage: (failedCount / totalPlayers) * 100,
      });
    }

    return dist;
  }, [postGameStats]);

  const maxPercentage = Math.max(...distribution.map((d) => d.percentage), 1);

  // Calculate percentile
  const percentile = useMemo(() => {
    if (!postGameStats?.allPlayerStats || postGameStats.totalPlayers === 0) return 0;

    let betterThan = 0;
    for (const [attempts, count] of Object.entries(postGameStats.allPlayerStats)) {
      if (Number(attempts) > attemptCount) {
        betterThan += count;
      }
    }

    return Math.round((betterThan / postGameStats.totalPlayers) * 100);
  }, [postGameStats, attemptCount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContentSlim className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 flex h-full max-h-none w-full max-w-none flex-col rounded-none border-0 p-0">
        {/* Scrollable content with swipe support */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mx-auto max-w-md px-4 py-6">
            {/* Header */}
            <DialogHeader className="mb-4">
              <DialogTitle className="text-center text-2xl">
                {isSolved ? 'Congratulations!' : 'Better luck next time'}
              </DialogTitle>
              <DialogDescription className="text-center">{gameTitle}</DialogDescription>
            </DialogHeader>

            {currentPage === 0 ? (
              /* Page 1: Game Score and Distribution */
              <>
                {/* Main result */}
                <div className="mb-4 text-center">
                  {isSolved ? (
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        Solved in{' '}
                        <span className="text-success">{attemptCount}</span>{' '}
                        {attemptCount === 1 ? 'attempt' : 'attempts'}!
                      </p>
                      {percentile > 0 && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Better than {percentile}% of players
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        You got <span className="text-primary">{correctCount}/6</span> correct
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        The correct order is now shown
                      </p>
                    </div>
                  )}
                </div>

                {/* Distribution chart */}
                {distribution.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-center text-sm font-medium text-foreground">
                      Attempt Distribution
                    </h4>
                    <div className="space-y-1.5">
                      {distribution.map(({ attempts, count, percentage }) => (
                        <div key={attempts} className="flex items-center gap-2">
                          <span className="w-6 text-right text-sm font-medium text-foreground">
                            {attempts === 7 ? 'X' : attempts}
                          </span>
                          <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                            <div
                              className={`flex h-full items-center transition-all duration-500 ${
                                attempts === attemptCount
                                  ? isSolved
                                    ? 'bg-success'
                                    : 'bg-destructive'
                                  : 'bg-primary/60'
                              }`}
                              style={{
                                width: `${(percentage / maxPercentage) * 100}%`,
                                minWidth: count > 0 ? '6px' : '0',
                              }}
                            />
                          </div>
                          <span className="w-8 text-left text-sm text-muted-foreground">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-center text-xs text-muted-foreground">
                      {postGameStats?.totalPlayers ?? 0}{' '}
                      {(postGameStats?.totalPlayers ?? 0) === 1 ? 'player' : 'players'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Page 2: Personal Stats */
              <div className="space-y-4">
                <h4 className="text-center text-lg font-semibold text-foreground">Your Stats</h4>

                {userStats ? (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Current Streak */}
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {userStats.currentDailyStreak}
                      </p>
                      <p className="text-xs text-muted-foreground">Current Streak</p>
                    </div>

                    {/* Best Streak */}
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {userStats.bestDailyStreak}
                      </p>
                      <p className="text-xs text-muted-foreground">Best Streak</p>
                    </div>

                    {/* Games Played */}
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {userStats.totalGamesPlayed}
                      </p>
                      <p className="text-xs text-muted-foreground">Games Played</p>
                    </div>

                    {/* Total Points */}
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{userStats.totalPoints}</p>
                      <p className="text-xs text-muted-foreground">Total Points</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">Loading stats...</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer with navigation */}
        <div className="shrink-0 border-t bg-background px-4 py-3">
          <div className="mx-auto flex max-w-md items-center justify-between">
            {/* Page indicator dots */}
            <div className="flex gap-1.5">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === currentPage ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            {/* Navigation and close buttons grouped together */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContentSlim>
    </Dialog>
  );
}
