import React, { useState, useEffect, useCallback } from 'react';
import { requestExpandedMode, navigateTo } from '@devvit/web/client';
import { Flame, Trash2, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/utils';
import type { SplashStatsResponse, UserStatsResponse } from '../../shared/types/api';
import { Dialog, DialogContent, DialogClose } from '../components/ui/dialog';
import { GameLeaderboard, LeaderboardEntry } from '../components/GameLeaderboard';
import { toast } from 'sonner';

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  totalPlayers: number;
  userRank?: number;
  userEntry?: LeaderboardEntry;
}

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

  // Leaderboard modal state
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Anonymous username state
  const [isCurrentUserAnonymous, setIsCurrentUserAnonymous] = useState(false);
  const [isTogglingAnonymous, setIsTogglingAnonymous] = useState(false);
  const [hasUserCompleted, setHasUserCompleted] = useState(false);

  // Delete puzzle state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    if (!gameId) return;

    setLeaderboardLoading(true);
    try {
      const response = await apiFetch(`/api/lettered/${gameId}/leaderboard`);
      if (response.ok) {
        const data: LeaderboardResponse = await response.json();
        setLeaderboardData(data);

        // Check if user has completed the game (has a rank means they completed)
        if (data.userRank !== undefined) {
          setHasUserCompleted(true);

          // Update anonymous state from user entry (outside top 5) or from entries (in top 5)
          if (data.userEntry?.isAnonymous !== undefined) {
            setIsCurrentUserAnonymous(data.userEntry.isAnonymous);
          } else if (data.userRank <= 5 && data.entries[data.userRank - 1]) {
            // User is in top 5, check their entry in the entries array
            const userEntryInTop5 = data.entries[data.userRank - 1];
            if (userEntryInTop5?.isAnonymous !== undefined) {
              setIsCurrentUserAnonymous(userEntryInTop5.isAnonymous);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [gameId]);

  // Handler to toggle anonymous username on leaderboard
  const handleToggleAnonymous = useCallback(
    async (isAnonymous: boolean) => {
      if (!gameId) return;

      setIsTogglingAnonymous(true);
      try {
        const response = await apiFetch(`/api/lettered/${gameId}/leaderboard/anonymize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isAnonymous }),
        });

        if (response.ok) {
          const data = await response.json();
          setIsCurrentUserAnonymous(data.isAnonymous);

          // Refresh leaderboard to show updated username
          void fetchLeaderboard();

          toast.success(isAnonymous ? 'Username hidden' : 'Username visible');
        } else {
          toast.error('Failed to update username visibility');
        }
      } catch (error) {
        console.error('Error toggling anonymous:', error);
        toast.error('Failed to update username visibility');
      } finally {
        setIsTogglingAnonymous(false);
      }
    },
    [gameId, fetchLeaderboard]
  );

  // Open leaderboard modal
  const handleOpenLeaderboard = () => {
    setShowLeaderboard(true);
    void fetchLeaderboard();
  };

  const handlePlay = (e: React.MouseEvent) => {
    void requestExpandedMode(e.nativeEvent, 'game');
  };

  // Handle delete puzzle
  const handleDeletePuzzle = async () => {
    if (!gameId) return;

    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/splash/${gameId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Puzzle deleted');
        // Navigate away or show a deleted state
        setError('This puzzle has been deleted');
        setSplashData(null);
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.message || 'Failed to delete puzzle');
      }
    } catch (err) {
      console.error('Error deleting puzzle:', err);
      toast.error('Failed to delete puzzle');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
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
    <div className="flex relative flex-col gap-8 justify-center items-center px-6 py-8 min-h-screen bg-black">
      {/* Delete button for puzzle creators (top right) */}
      {splashData.isCreator && !isDaily && (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
          className="flex absolute top-4 right-4 gap-1 items-center px-3 py-2 text-sm font-semibold text-red-400 rounded border border-red-800 transition-colors bg-red-900/30 hover:bg-red-900/50 disabled:opacity-50"
          title="Delete Puzzle"
        >
          {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Delete Puzzle</span>
        </button>
      )}

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

        {/* Secondary buttons row */}
        <div className="flex gap-3 mt-3">
          {/* Leaderboard button */}
          <button
            onClick={handleOpenLeaderboard}
            className="flex gap-2 items-center px-6 py-2 text-sm font-bold text-[#F7C846] bg-transparent border-2 border-[#F7C846] rounded cursor-pointer hover:bg-[#F7C846] hover:text-black transition-colors"
          >
            Leaderboard
          </button>

          {/* Subscribe button */}
          <button
            onClick={() => navigateTo('https://www.reddit.com/r/lettered')}
            className="px-6 py-2 text-sm font-bold text-[#F7C846] bg-transparent border-2 border-[#F7C846] rounded cursor-pointer hover:bg-[#F7C846] hover:text-black transition-colors"
          >
            Subscribe
          </button>
        </div>
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

      {/* Leaderboard Modal */}
      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
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

          {/* Header */}
          <div className="relative flex-shrink-0 py-8 text-center bg-background">
            <div className="flex gap-1 justify-center mb-3">
              {['L', 'E', 'A', 'D', 'E', 'R', 'S'].map((letter, index) => (
                <div
                  key={index}
                  className="flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 bg-[#F7C846] text-black font-black text-xl sm:text-2xl rounded-sm"
                >
                  {letter}
                </div>
              ))}
            </div>
            <p className="text-lg font-bold tracking-wider text-foreground">Top Solvers</p>
          </div>

          <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-5 min-h-auto bg-background">
            <GameLeaderboard
              entries={leaderboardData?.entries || []}
              loading={leaderboardLoading}
              playerRank={leaderboardData?.userRank}
              totalPlayers={leaderboardData?.totalPlayers}
              userEntry={leaderboardData?.userEntry}
              gameId={gameId ?? undefined}
              isCurrentUserAnonymous={isCurrentUserAnonymous}
              onToggleAnonymous={handleToggleAnonymous}
              isTogglingAnonymous={isTogglingAnonymous}
              showAnonymousToggle={hasUserCompleted}
            />

            {/* Close Button */}
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setShowLeaderboard(false)}
                className="px-10 py-3 text-lg font-bold tracking-wide text-black bg-[#F7C846] rounded cursor-pointer hover:bg-[#E5B83D] transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent
          className="flex overflow-y-visible flex-col p-0 w-full h-full border-0 bg-background sm:max-w-md"
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

          {/* Header */}
          <div className="relative flex-shrink-0 py-8 text-center bg-background">
            <div className="flex gap-1 justify-center mb-3">
              {['L', 'E', 'T', 'T', 'E', 'R', 'E', 'D'].map((letter, index) => (
                <div
                  key={index}
                  className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#F7C846] text-black font-black text-lg sm:text-xl rounded-sm"
                >
                  {letter}
                </div>
              ))}
            </div>
            <p className="text-lg font-bold tracking-wider text-foreground">Delete Puzzle</p>
          </div>

          <div className="px-6 pb-6 space-y-4 bg-background">
            <p className="text-center text-muted-foreground">
              This will permanently delete your puzzle and the Reddit post. All leaderboard data
              will also be removed. This action cannot be undone.
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2 text-sm font-bold tracking-wide text-[#F7C846] rounded border-2 border-[#F7C846] transition-colors cursor-pointer hover:bg-[#F7C846] hover:text-black"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePuzzle}
                disabled={isDeleting}
                className="flex gap-2 justify-center items-center px-6 py-2 text-sm font-bold tracking-wide text-white bg-red-600 rounded transition-colors cursor-pointer hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
