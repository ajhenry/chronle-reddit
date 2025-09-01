import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Trophy, Medal, Award, Users, Calendar, TrendingUp } from 'lucide-react';
import { LeaderboardEntry, Season, UserStatsResponse } from '../../shared/types/api';
import { apiFetch } from '../lib/utils';

interface LeaderboardProps {
  seasonId: string;
  currentUserId?: string;
  onClose?: () => void;
}

export const Leaderboard = ({ seasonId, currentUserId, onClose }: LeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [season, setSeason] = useState<Season | null>(null);
  const [userStats, setUserStats] = useState<UserStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch leaderboard data
        const leaderboardResponse = await apiFetch(`/api/leaderboard/${seasonId}`);
        if (!leaderboardResponse.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        const leaderboardData = await leaderboardResponse.json();
        setEntries(leaderboardData.entries);
        setTotalPlayers(leaderboardData.totalPlayers);

        // Fetch season data
        const seasonResponse = await apiFetch('/api/season/current');
        if (seasonResponse.ok) {
          const seasonData = await seasonResponse.json();
          setSeason(seasonData.season);
        }

        // Fetch user stats if user is provided
        if (currentUserId) {
          const userStatsResponse = await apiFetch(`/api/user-stats/${seasonId}`);
          if (userStatsResponse.ok) {
            const userData = await userStatsResponse.json();
            setUserStats(userData);
          }
        }
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [seasonId, currentUserId]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1:
        return 'default' as const;
      case 2:
        return 'secondary' as const;
      case 3:
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Loading Leaderboard...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TrendingUp className="h-5 w-5" />
            Error Loading Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Season Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-2xl">
                  {season?.name || 'Current Season'} Leaderboard
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {totalPlayers} players
                  </div>
                  {season && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(season.startDate).toLocaleDateString()} -
                      {new Date(season.endDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* User Stats (if available) */}
      {userStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Season Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{userStats.rank}</div>
                <div className="text-sm text-muted-foreground">Rank</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{userStats.totalScore}</div>
                <div className="text-sm text-muted-foreground">Total Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {userStats.gamesWon}/{userStats.gamesPlayed}
                </div>
                <div className="text-sm text-muted-foreground">Games Won</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{userStats.currentStreak}</div>
                <div className="text-sm text-muted-foreground">Current Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Top Players</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No players yet this season. Be the first to play!
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    entry.userId === currentUserId
                      ? 'bg-primary/10 border-primary/20'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{entry.redditHandle}</span>
                        {entry.rank <= 3 && (
                          <Badge variant={getRankBadgeVariant(entry.rank)}>
                            {entry.rank === 1
                              ? 'Champion'
                              : entry.rank === 2
                                ? 'Runner-up'
                                : 'Third Place'}
                          </Badge>
                        )}
                        {entry.userId === currentUserId && <Badge variant="outline">You</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.gamesPlayed} games • {entry.winRate.toFixed(1)}% win rate
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{entry.totalScore}</div>
                    <div className="text-sm text-muted-foreground">
                      avg: {entry.averageScore.toFixed(0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Show more button if there are more players */}
      {entries.length > 0 && entries.length < totalPlayers && (
        <div className="text-center">
          <Button variant="outline">Load More Players</Button>
        </div>
      )}
    </div>
  );
};
