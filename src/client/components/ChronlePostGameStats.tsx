import { useMemo } from 'react';

interface ChronlePostGameStatsProps {
  attemptCount: number;
  isSolved: boolean;
  allPlayerStats: Record<string, number>; // attempt count -> number of players
  totalPlayers: number;
  correctCount: number;
}

export function ChronlePostGameStats({
  attemptCount,
  isSolved,
  allPlayerStats,
  totalPlayers,
  correctCount,
}: ChronlePostGameStatsProps) {
  // Calculate distribution for visualization
  const distribution = useMemo(() => {
    const dist: Array<{ attempts: number; count: number; percentage: number }> = [];

    // Attempts 1-6 (solved)
    for (let i = 1; i <= 6; i++) {
      const count = allPlayerStats[String(i)] || 0;
      dist.push({
        attempts: i,
        count,
        percentage: totalPlayers > 0 ? (count / totalPlayers) * 100 : 0,
      });
    }

    // 7+ means failed (ran out of attempts)
    const failedCount = allPlayerStats['7'] || 0;
    if (failedCount > 0) {
      dist.push({
        attempts: 7,
        count: failedCount,
        percentage: totalPlayers > 0 ? (failedCount / totalPlayers) * 100 : 0,
      });
    }

    return dist;
  }, [allPlayerStats, totalPlayers]);

  const maxPercentage = Math.max(...distribution.map((d) => d.percentage), 1);

  // Calculate percentile
  const percentile = useMemo(() => {
    if (totalPlayers === 0) return 0;

    let betterThan = 0;
    for (const [attempts, count] of Object.entries(allPlayerStats)) {
      if (Number(attempts) > attemptCount) {
        betterThan += count;
      }
    }

    return Math.round((betterThan / totalPlayers) * 100);
  }, [allPlayerStats, attemptCount, totalPlayers]);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="text-center">
        {isSolved ? (
          <p className="text-lg text-foreground">
            You solved it in{' '}
            <span className="font-bold text-success">{attemptCount}</span>{' '}
            {attemptCount === 1 ? 'attempt' : 'attempts'}!
          </p>
        ) : (
          <p className="text-lg text-foreground">
            You got <span className="font-bold">{correctCount}/6</span> correct
          </p>
        )}

        {isSolved && percentile > 0 && (
          <p className="text-sm text-muted-foreground">Better than {percentile}% of players</p>
        )}
      </div>

      {/* Distribution chart */}
      <div className="space-y-2">
        <h4 className="text-center text-sm font-medium text-foreground">Attempt Distribution</h4>
        <div className="space-y-1.5">
          {distribution.map(({ attempts, count, percentage }) => (
            <div key={attempts} className="flex items-center gap-2">
              <span className="w-6 text-right text-sm font-medium text-foreground">
                {attempts === 7 ? 'X' : attempts}
              </span>
              <div className="h-6 flex-1 overflow-hidden rounded bg-muted">
                <div
                  className={`h-full transition-all duration-500 ${
                    attempts === attemptCount
                      ? isSolved
                        ? 'bg-success'
                        : 'bg-destructive'
                      : 'bg-primary/60'
                  }`}
                  style={{
                    width: `${(percentage / maxPercentage) * 100}%`,
                    minWidth: count > 0 ? '4px' : '0',
                  }}
                />
              </div>
              <span className="w-8 text-left text-sm text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Total players */}
      <p className="text-center text-sm text-muted-foreground">
        {totalPlayers} {totalPlayers === 1 ? 'person has' : 'people have'} played so far
      </p>
    </div>
  );
}
