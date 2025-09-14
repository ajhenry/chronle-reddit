import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/utils';
import type { UserLeaderboardPositionResponse } from '../../shared/types/api';

interface UserLeaderboardStatsProps {
  className?: string;
}

export const UserLeaderboardStats = ({ className = '' }: UserLeaderboardStatsProps) => {
  const [userStats, setUserStats] = useState<UserLeaderboardPositionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiFetch('/api/leaderboard/user');
        if (response.ok) {
          const data: UserLeaderboardPositionResponse = await response.json();
          setUserStats(data);
        } else if (response.status === 401) {
          // User not authenticated - this is okay, just don't show stats
          setUserStats(null);
        } else {
          throw new Error(`Failed to fetch user stats: ${response.statusText}`);
        }
      } catch (err) {
        console.error('Error fetching user leaderboard stats:', err);
        setError('Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchUserStats();
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center space-x-3 p-4 ${className}`}>
        <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
          <div className="h-3 bg-muted rounded animate-pulse w-16"></div>
        </div>
      </div>
    );
  }

  if (error || !userStats) {
    return null; // Don't show anything if there's an error or no user stats
  }

  const formatPoints = (points: number): string => {
    if (points >= 1000000) {
      return `${(points / 1000000).toFixed(1)}M`;
    } else if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}K`;
    }
    return points.toString();
  };

  const formatRank = (rank: number | null): string => {
    if (rank === null) return 'Unranked';
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
  };

  return (
    <div
      className={`flex items-center space-x-3 p-4 bg-card/50 border border-border rounded-lg ${className}`}
    >
      {/* User Avatar */}
      <div className="flex-shrink-0">
        {userStats.imageUrl ? (
          <img
            src={userStats.imageUrl}
            alt={`${userStats.username}'s avatar`}
            className="w-10 h-10 rounded-full border-2 border-border"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted border-2 border-border flex items-center justify-center">
            <span className="text-sm font-bold text-muted-foreground">
              {userStats.username.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline space-x-2">
          <h3 className="text-sm font-bold text-card-foreground truncate">{userStats.username}</h3>
          <span className="text-xs text-muted-foreground">{formatRank(userStats.rank)}</span>
        </div>
        <div className="flex items-center space-x-1 mt-1">
          <span className="text-lg font-bold text-primary">
            {formatPoints(userStats.totalPoints)}
          </span>
          <span className="text-xs text-muted-foreground">pts</span>
        </div>
      </div>
    </div>
  );
};
