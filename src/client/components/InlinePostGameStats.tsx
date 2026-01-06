import { useMemo } from 'react';
import { requestExpandedMode } from '@devvit/web/client';
import { ChevronRight } from 'lucide-react';

interface InlinePostGameStatsProps {
  isSolved: boolean;
  attemptCount: number;
  totalPlayers: number;
  allPlayerStats?: Record<string, number>;
}

/**
 * Compact post-game stats for inline mode
 * Shows essential info with option to expand for full stats
 */
export function InlinePostGameStats({
  isSolved,
  attemptCount,
  totalPlayers,
  allPlayerStats,
}: InlinePostGameStatsProps) {
  // Calculate percentile
  const percentile = useMemo(() => {
    if (!allPlayerStats || totalPlayers === 0) return 0;

    let betterThan = 0;
    for (const [attempts, count] of Object.entries(allPlayerStats)) {
      if (Number(attempts) > attemptCount) {
        betterThan += count;
      }
    }

    return Math.round((betterThan / totalPlayers) * 100);
  }, [allPlayerStats, attemptCount, totalPlayers]);

  // Compact bar chart data (only show 1-6 and X)
  const chartData = useMemo(() => {
    if (!allPlayerStats) return null;

    const data: Array<{ label: string; count: number; isUser: boolean }> = [];
    for (let i = 1; i <= 6; i++) {
      data.push({
        label: String(i),
        count: allPlayerStats[String(i)] || 0,
        isUser: isSolved && attemptCount === i,
      });
    }

    const failed = allPlayerStats['7'] || 0;
    if (failed > 0 || !isSolved) {
      data.push({
        label: 'X',
        count: failed,
        isUser: !isSolved,
      });
    }

    return data;
  }, [allPlayerStats, attemptCount, isSolved]);

  const maxCount = chartData ? Math.max(...chartData.map((d) => d.count), 1) : 1;

  const handleViewDetails = (e: React.MouseEvent) => {
    void requestExpandedMode(e.nativeEvent, 'game');
  };

  return (
    <div className="space-y-2">
      {/* Result summary - single line */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">
          {isSolved ? (
            <>
              Solved in <span className="text-success">{attemptCount}</span>
              {percentile > 0 && (
                <span className="text-muted-foreground"> (top {100 - percentile}%)</span>
              )}
            </>
          ) : (
            'Not solved'
          )}
        </span>
        <span className="text-muted-foreground">{totalPlayers} played</span>
      </div>

      {/* Mini bar chart */}
      {chartData && (
        <div className="flex h-8 items-end gap-0.5">
          {chartData.map(({ label, count, isUser }) => (
            <div key={label} className="flex flex-1 flex-col items-center">
              <div
                className={`w-full rounded-t ${
                  isUser ? (isSolved ? 'bg-success' : 'bg-destructive') : 'bg-primary/40'
                }`}
                style={{
                  height: `${Math.max((count / maxCount) * 20, count > 0 ? 2 : 0)}px`,
                }}
              />
              <span className="text-[8px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* View details button */}
      <button
        onClick={handleViewDetails}
        className="flex w-full items-center justify-center gap-1 rounded border border-border bg-background py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-muted"
      >
        View full stats
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

