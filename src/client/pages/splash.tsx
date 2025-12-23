import React, { useState, useEffect } from 'react';
import { requestExpandedMode, navigateTo } from '@devvit/web/client';
import { Flame } from 'lucide-react';
import { apiFetch } from '../lib/utils';
import type { SplashStatsResponse, UserStatsResponse } from '../../shared/types/api';

// Format time in MM:SS format
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Default Reddit avatar URL
const DEFAULT_AVATAR_URL = 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png';

// LETTERED logo component with yellow tile styling
function LetteredLogo() {
  const letters = ['L', 'E', 'T', 'T', 'E', 'R', 'E', 'D'];

  return (
    <div className="flex gap-1">
      {letters.map((letter, index) => (
        <div
          key={index}
          className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 bg-[#F7C846] text-black font-black text-lg sm:text-2xl rounded-sm"
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

// Play button component - shown in all states
function PlayButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-6 px-12 py-3 bg-[#F7C846] text-black font-bold text-lg rounded cursor-pointer hover:bg-[#E5B83D] transition-colors"
    >
      Play
    </button>
  );
}

// Loading skeleton for the splash screen - matches exact layout of loaded state
function SplashSkeleton({ onPlay }: { onPlay: (e: React.MouseEvent) => void }) {
  return (
    <div className="flex flex-col gap-8 justify-center items-center px-6 py-8 min-h-screen bg-black">
      {/* Top section - Logo and tagline */}
      <div className="flex flex-col items-center">
        <LetteredLogo />
        <p className="mt-4 text-lg font-semibold text-white sm:text-xl">
          The phrase-fitting puzzle game
        </p>
      </div>

      {/* Middle section - Game info skeleton and real play button */}
      <div className="flex flex-col items-center">
        <div className="text-center animate-pulse">
          <div className="mx-auto mb-2 w-32 h-5 bg-gray-700 rounded" />
          <div className="mx-auto w-48 h-6 bg-gray-700 rounded" />
        </div>
        <PlayButton onClick={onPlay} />
      </div>

      {/* Bottom section - Stats skeleton */}
      <div className="text-center animate-pulse">
        <div className="w-64 h-4 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

export function Splash() {
  const [splashData, setSplashData] = useState<SplashStatsResponse | null>(null);
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

  // Fetch user stats to get daily streak
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await apiFetch('/api/stats/user');
        if (response.ok) {
          const data: UserStatsResponse = await response.json();
          setDailyStreak(data.stats.currentDailyStreak);
        }
      } catch (err) {
        console.error('Error fetching user stats:', err);
        // Don't set error - streak is optional
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

  // Loading state
  if (loading || !splashData) {
    return <SplashSkeleton onPlay={handlePlay} />;
  }

  // Error state - centered layout
  if (error) {
    return (
      <div className="flex flex-col gap-8 justify-center items-center px-6 py-8 min-h-screen bg-black">
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
      </div>
    );
  }

  const isDaily = splashData.postType === 'daily';
  const hasStats = splashData.totalCompletions > 0;

  console.log(splashData);

  return (
    <div className="flex flex-col gap-8 justify-center items-center px-6 py-8 min-h-screen bg-black">
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
            <p className="text-base font-bold text-white sm:text-lg">Daily Game For</p>
            <p className="text-lg font-black text-white sm:text-xl">{splashData.formattedDate}</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg font-black tracking-wide text-white uppercase sm:text-xl">
              {splashData.title || 'CUSTOM PUZZLE'}
            </p>
            {splashData.creatorUsername && (
              <div className="flex gap-2 justify-center items-center mt-2">
                <span className="text-sm text-white sm:text-base">By</span>
                <div className="overflow-hidden w-6 h-6 bg-gray-600 rounded-full">
                  <img
                    src={splashData.creatorIconUrl || DEFAULT_AVATAR_URL}
                    alt={splashData.creatorUsername}
                    className="w-full h-auto origin-top translate-y-[6%]"
                  />
                </div>
                <span className="text-sm text-white sm:text-base">
                  u/{splashData.creatorUsername}
                </span>
              </div>
            )}
          </div>
        )}

        <PlayButton onClick={handlePlay} />

        {/* Subscribe button */}
        <button
          onClick={() => navigateTo('https://www.reddit.com/r/lettered')}
          className="mt-3 px-8 py-2 text-sm font-bold text-[#F7C846] bg-transparent border-2 border-[#F7C846] rounded cursor-pointer hover:bg-[#F7C846] hover:text-black transition-colors"
        >
          Subscribe
        </button>
      </div>

      {/* Bottom section - Stats */}
      <div className="text-center">
        {hasStats ? (
          <p className="text-sm font-semibold text-white sm:text-base">
            Solved {splashData.totalCompletions}{' '}
            {splashData.totalCompletions === 1 ? 'time' : 'times'} with an
            <br className="sm:hidden" /> average of {formatTime(splashData.averageTimeMs)} and{' '}
            {splashData.averageMoves} {splashData.averageMoves === 1 ? 'move' : 'moves'}
          </p>
        ) : (
          <p className="text-sm font-semibold text-white sm:text-base">
            Be the first to solve this puzzle!
          </p>
        )}
      </div>

      {/* Bottom bar with streak and create button */}
      <div className="flex absolute right-4 bottom-4 gap-4 items-center">
        {/* Daily streak display */}
        <div className="flex gap-1 items-center text-xl font-bold text-white">
          <span>{dailyStreak}</span>
          <Flame className="w-6 h-6" />
        </div>

        {/* Create your own button */}
        <button
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'creator')}
          className="px-6 py-2 text-sm font-bold text-[#F7C846] bg-transparent border-2 border-[#F7C846] rounded cursor-pointer hover:bg-[#F7C846] hover:text-black transition-colors"
        >
          Create your own
        </button>
      </div>
    </div>
  );
}
