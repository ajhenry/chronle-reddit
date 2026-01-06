import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import type { ChronlePostGameResponse } from '../../shared/types/chronle';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-full max-h-none w-full max-w-none overflow-y-auto rounded-none border-0 sm:rounded-none">
        <div className="mx-auto max-w-md px-4 py-6">
          {/* Header */}
          <DialogHeader className="mb-6">
            <DialogTitle className="text-center text-2xl">
              {isSolved ? 'Congratulations!' : 'Better luck next time'}
            </DialogTitle>
            <DialogDescription className="text-center">{gameTitle}</DialogDescription>
          </DialogHeader>

          {/* Main result */}
          <div className="mb-6 text-center">
            {isSolved ? (
              <div>
                <p className="text-3xl font-bold text-foreground">
                  Solved in{' '}
                  <span className="text-success">{attemptCount}</span>{' '}
                  {attemptCount === 1 ? 'attempt' : 'attempts'}!
                </p>
                {percentile > 0 && (
                  <p className="mt-2 text-lg text-muted-foreground">
                    Better than {percentile}% of players
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-3xl font-bold text-foreground">
                  You got <span className="text-primary">{correctCount}/6</span> correct
                </p>
                <p className="mt-2 text-lg text-muted-foreground">
                  The correct order is now shown in the puzzle
                </p>
              </div>
            )}
          </div>

          {/* Distribution chart */}
          {distribution.length > 0 && (
            <div className="mb-6 space-y-4">
              <h4 className="text-center text-base font-medium text-foreground">
                Attempt Distribution
              </h4>
              <div className="space-y-3">
                {distribution.map(({ attempts, count, percentage }) => (
                  <div key={attempts} className="flex items-center gap-3">
                    <span className="w-8 text-right text-base font-medium text-foreground">
                      {attempts === 7 ? 'X' : attempts}
                    </span>
                    <div className="h-8 flex-1 overflow-hidden rounded bg-muted">
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
                          minWidth: count > 0 ? '8px' : '0',
                        }}
                      />
                    </div>
                    <span className="w-12 text-left text-base text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-base text-muted-foreground">
                {postGameStats?.totalPlayers ?? 0}{' '}
                {(postGameStats?.totalPlayers ?? 0) === 1 ? 'person has' : 'people have'} played
              </p>
            </div>
          )}

          {/* Close button at bottom of content */}
          <div className="pt-4">
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

