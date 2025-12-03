import { useState, useEffect } from 'react';
import { requestExpandedMode } from '@devvit/web/client';
import { apiFetch } from '../lib/utils';
import type { SplashStatsResponse } from '../../shared/types/api';

// Format time in MM:SS format
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// LETTERED logo component with yellow tile styling
function LetteredLogo() {
  const letters = ['L', 'E', 'T', 'T', 'E', 'R', 'E', 'D'];

  return (
    <div className="flex gap-1">
      {letters.map((letter, index) => (
        <div
          key={index}
          className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-[#F7C846] text-black font-black text-xl sm:text-2xl rounded-sm"
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

// Loading skeleton for the splash screen - matches exact layout of loaded state
function SplashSkeleton() {
  return (
    <div className="flex flex-col justify-between items-center px-6 py-8 min-h-screen bg-black">
      {/* Top section - Logo and tagline */}
      <div className="flex flex-col items-center">
        <LetteredLogo />
        <p className="mt-4 text-lg font-semibold text-white sm:text-xl">
          The phrase-fitting puzzle game
        </p>
      </div>

      {/* Middle section - Game info and play button skeleton */}
      <div className="flex flex-col items-center">
        <div className="text-center animate-pulse">
          <div className="mx-auto mb-2 w-32 h-5 bg-gray-700 rounded" />
          <div className="mx-auto w-48 h-6 bg-gray-700 rounded" />
        </div>
        {/* Play button skeleton */}
        <div className="px-12 py-3 mt-6 bg-gray-700 rounded animate-pulse">
          <div className="w-12 h-6 opacity-0">Play</div>
        </div>
      </div>

      {/* Bottom section - Stats and create button skeleton */}
      <div className="flex flex-col gap-4 justify-between items-center w-full sm:flex-row">
        <div className="text-left animate-pulse">
          <div className="w-64 h-4 bg-gray-700 rounded" />
        </div>
        <div className="px-6 py-3 bg-gray-700 rounded animate-pulse">
          <div className="w-28 h-5 opacity-0">Create your own</div>
        </div>
      </div>
    </div>
  );
}

export function Splash() {
  const [splashData, setSplashData] = useState<SplashStatsResponse | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            setError('No game found for this post');
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

  // Fetch splash stats once we have gameId
  useEffect(() => {
    if (!gameId) return;

    const fetchSplashData = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/splash/${gameId}`);
        if (response.ok) {
          const data = await response.json();
          setSplashData(data);
        } else {
          setError('Failed to load game data');
        }
      } catch (err) {
        console.error('Error fetching splash data:', err);
        setError('Failed to load game data');
      } finally {
        setLoading(false);
      }
    };

    void fetchSplashData();
  }, [gameId]);

  const handlePlay = (e: React.MouseEvent) => {
    void requestExpandedMode(e.nativeEvent, 'game');
  };

  const handleCreateYourOwn = (e: React.MouseEvent) => {
    void requestExpandedMode(e.nativeEvent, 'game', '/custom');
  };

  // Loading state
  if (loading || !splashData) {
    return <SplashSkeleton />;
  }

  // Error state - matches exact layout of loaded state
  if (error) {
    return (
      <div className="flex flex-col justify-between items-center px-6 py-8 min-h-screen bg-black">
        {/* Top section - Logo and tagline */}
        <div className="flex flex-col items-center">
          <LetteredLogo />
          <p className="mt-4 text-lg font-semibold text-white sm:text-xl">
            The phrase-fitting puzzle game
          </p>
        </div>

        {/* Middle section - Error message and retry button */}
        <div className="flex flex-col items-center">
          <p className="text-center text-red-400">{error}</p>
          <button
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
            className="mt-6 px-12 py-3 bg-[#F7C846] text-black font-bold text-lg rounded cursor-pointer hover:bg-[#E5B83D] transition-colors"
          >
            Try Again
          </button>
        </div>

        {/* Bottom section - Empty placeholder to maintain layout */}
        <div className="flex flex-col gap-4 justify-between items-center w-full sm:flex-row">
          <div className="text-left">
            <p className="text-sm sm:text-base font-semibold text-[#F7C846] opacity-0">
              Placeholder
            </p>
          </div>
          <button
            onClick={handleCreateYourOwn}
            className="px-6 py-3 bg-[#F7C846] text-black font-bold text-sm sm:text-base rounded cursor-pointer hover:bg-[#E5B83D] transition-colors whitespace-nowrap"
          >
            Create your own
          </button>
        </div>
      </div>
    );
  }

  const isDaily = splashData.postType === 'daily';
  const hasStats = splashData.totalCompletions > 0;

  return (
    <div className="flex flex-col justify-between items-center px-6 py-8 min-h-screen bg-black">
      {/* Top section - Logo and tagline */}
      <div className="flex flex-col items-center">
        <LetteredLogo />
        <p className="mt-4 text-lg font-semibold text-white sm:text-xl">
          The phrase-fitting puzzle game
        </p>
      </div>

      {/* Middle section - Game info and play button */}
      <div className="flex flex-col items-center">
        {/* Game-specific info */}
        {isDaily ? (
          <div className="text-center">
            <p className="text-base font-semibold text-white sm:text-lg">Daily Game For</p>
            <p className="text-lg font-bold text-white sm:text-xl">{splashData.formattedDate}</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg font-bold tracking-wide text-white uppercase sm:text-xl">
              {'<'}
              {splashData.title || 'CUSTOM PUZZLE'}
              {'>'}
            </p>
            {splashData.creatorUsername && (
              <div className="flex gap-2 justify-center items-center mt-2">
                <span className="text-sm text-white sm:text-base">By</span>
                {splashData.creatorIconUrl ? (
                  <img
                    src={splashData.creatorIconUrl}
                    alt={splashData.creatorUsername}
                    className="w-6 h-6 bg-gray-600 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-600 rounded-full" />
                )}
                <span className="text-sm text-white sm:text-base">
                  u/{splashData.creatorUsername}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Play button */}
        <button
          onClick={handlePlay}
          className="mt-6 px-12 py-3 bg-[#F7C846] text-black font-bold text-lg rounded cursor-pointer hover:bg-[#E5B83D] transition-colors"
        >
          Play
        </button>
      </div>

      {/* Bottom section - Stats and create button */}
      <div className="flex flex-col gap-4 justify-between items-center w-full sm:flex-row">
        {/* Stats */}
        <div className="text-left">
          {hasStats ? (
            <p className="text-sm sm:text-base font-semibold text-[#F7C846]">
              Solved {splashData.totalCompletions}{' '}
              {splashData.totalCompletions === 1 ? 'time' : 'times'} with an
              <br className="sm:hidden" /> average of {formatTime(splashData.averageTimeMs)} and{' '}
              {splashData.averageMoves} {splashData.averageMoves === 1 ? 'move' : 'moves'}
            </p>
          ) : (
            <p className="text-sm sm:text-base font-semibold text-[#F7C846]">
              Be the first to solve this puzzle!
            </p>
          )}
        </div>

        {/* Create your own button */}
        <button
          onClick={handleCreateYourOwn}
          className="px-6 py-3 bg-[#F7C846] text-black font-bold text-sm sm:text-base rounded cursor-pointer hover:bg-[#E5B83D] transition-colors whitespace-nowrap"
        >
          Create your own
        </button>
      </div>
    </div>
  );
}
