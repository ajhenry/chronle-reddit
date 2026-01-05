import { useState, useEffect } from 'react';
import { requestExpandedMode } from '@devvit/web/client';
import { Flame, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/utils';
import type { ChronleSplashStatsResponse } from '../../shared/types/chronle';

// Chronle logo component with warm styling
function ChronleLogoDisplay() {
  return (
    <div className="bevan text-5xl font-black tracking-tight text-primary sm:text-6xl">
      Chronle
    </div>
  );
}

// Play button component
function PlayButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-6 cursor-pointer rounded bg-primary px-12 py-3 text-lg font-bold text-primary-foreground transition-opacity hover:opacity-90"
    >
      Play
    </button>
  );
}

// Loading skeleton
function SplashSkeleton({ onPlay }: { onPlay: (e: React.MouseEvent) => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-8">
      <div className="flex flex-col items-center">
        <ChronleLogoDisplay />
        <p className="mt-4 text-lg font-semibold text-foreground sm:text-xl">
          Order events through time
        </p>
      </div>

      <div className="flex flex-col items-center">
        <div className="animate-pulse text-center">
          <div className="mx-auto mb-2 h-5 w-32 rounded bg-muted" />
          <div className="mx-auto h-6 w-48 rounded bg-muted" />
        </div>
        <PlayButton onClick={onPlay} />
      </div>

      <div className="animate-pulse text-center">
        <div className="h-4 w-64 rounded bg-muted" />
      </div>
    </div>
  );
}

export function ChronleSplash() {
  const [splashData, setSplashData] = useState<ChronleSplashStatsResponse | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyStreak, setDailyStreak] = useState<number>(0);

  // Fetch context to get gameId
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const response = await apiFetch('/api/context');
        if (response.ok) {
          const data = await response.json();
          const metadata = data.context?.metadata;
          const id = metadata?.gameId || metadata?.customGameId;
          if (id) {
            setGameId(id);
          } else {
            // Try to get daily game
            const dailyResponse = await apiFetch('/api/chronle/daily');
            if (dailyResponse.ok) {
              const dailyData = await dailyResponse.json();
              setGameId(dailyData.gameId);
            } else {
              setError('No game found');
            }
          }
        } else {
          setError('Failed to load game context');
        }
      } catch (err) {
        console.error('Error fetching context:', err);
        setError('Failed to load game context');
      }
    };

    void fetchContext();
  }, []);

  // Fetch user stats for streak
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await apiFetch('/api/stats/user');
        if (response.ok) {
          const data = await response.json();
          setDailyStreak(data.stats?.currentDailyStreak || 0);
        }
      } catch (err) {
        console.error('Error fetching user stats:', err);
      }
    };

    void fetchUserStats();
  }, []);

  // Fetch splash stats once we have gameId
  useEffect(() => {
    if (!gameId) return;

    const fetchSplashData = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/chronle/${gameId}/splash`);
        if (response.ok) {
          const data = await response.json();
          setSplashData(data);
        } else {
          // If splash endpoint doesn't exist yet, create minimal data
          setSplashData({
            gameId,
            postType: 'daily',
            totalCompletions: 0,
            totalSolved: 0,
            averageAttempts: 0,
          });
        }
      } catch (err) {
        console.error('Error fetching splash data:', err);
        // Use minimal data on error
        setSplashData({
          gameId,
          postType: 'daily',
          totalCompletions: 0,
          totalSolved: 0,
          averageAttempts: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchSplashData();
  }, [gameId]);

  const handlePlay = (e: React.MouseEvent) => {
    void requestExpandedMode(e.nativeEvent, 'game');
  };

  // Loading state
  if (loading || !splashData) {
    return <SplashSkeleton onPlay={handlePlay} />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-8">
        <div className="flex flex-col items-center">
          <ChronleLogoDisplay />
          <p className="mt-4 text-lg font-semibold text-foreground sm:text-xl">
            Order events through time
          </p>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-center text-destructive">{error}</p>
          <button
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
            className="mt-6 cursor-pointer rounded bg-primary px-12 py-3 text-lg font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const isDaily = splashData.postType === 'daily';
  const hasStats = splashData.totalCompletions > 0;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-8">
      {/* Top section - Logo and tagline */}
      <div className="flex flex-col items-center">
        <ChronleLogoDisplay />
        <p className="mt-4 text-lg font-semibold text-foreground sm:text-xl">
          Order events through time
        </p>
      </div>

      {/* Middle section - Game info and play button */}
      <div className="flex flex-col items-center">
        {isDaily ? (
          <div className="text-center">
            <p className="text-base font-bold text-foreground sm:text-lg">Daily Puzzle</p>
            <p className="text-lg font-black text-foreground sm:text-xl">
              {splashData.formattedDate ||
                new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg font-black uppercase tracking-wide text-foreground sm:text-xl">
              {splashData.title || 'Custom Puzzle'}
            </p>
            {splashData.creatorUsername && (
              <p className="mt-2 text-sm text-muted-foreground">
                Created by u/{splashData.creatorUsername}
              </p>
            )}
          </div>
        )}

        <PlayButton onClick={handlePlay} />

        {/* Secondary buttons */}
        <div className="mt-3 flex gap-3">
          <button
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'creator')}
            className="cursor-pointer rounded border-2 border-primary bg-transparent px-6 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Create Your Own
          </button>
        </div>
      </div>

      {/* Bottom section - Stats */}
      <div className="text-center">
        {hasStats ? (
          <p className="text-sm font-semibold text-foreground sm:text-base">
            {splashData.totalSolved} of {splashData.totalCompletions} players solved it
            {splashData.averageAttempts > 0 && (
              <> with an average of {splashData.averageAttempts.toFixed(1)} attempts</>
            )}
          </p>
        ) : (
          <p className="text-sm font-semibold text-foreground sm:text-base">
            Be the first to solve this puzzle!
          </p>
        )}
      </div>

      {/* Bottom bar with streak */}
      {dailyStreak > 0 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-1 text-xl font-bold text-foreground">
          <span>{dailyStreak}</span>
          <Flame className="h-6 w-6 text-orange-500" />
        </div>
      )}
    </div>
  );
}
