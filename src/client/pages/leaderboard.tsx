import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import pluralize from 'pluralize';
import { Trophy, Medal, Award, Users, ArrowLeft } from 'lucide-react';
import {
  SeasonLeaderboardEntry,
  UserStats,
  SeasonLeaderboardResponse,
  UserStatsResponse,
} from '../../shared/types/api';
import { apiFetch } from '../lib/utils';

interface LeaderboardPageProps {
  onBack?: () => void;
}

export const LeaderboardPage = ({ onBack }: LeaderboardPageProps) => {
  const navigate = useNavigate();

  // User Stats State
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userStatsLoading, setUserStatsLoading] = useState(true);
  const [userStatsError, setUserStatsError] = useState<string | null>(null);

  // Season Leaderboard State
  const [seasonEntries, setSeasonEntries] = useState<SeasonLeaderboardEntry[]>([]);
  const [seasonLoading, setSeasonLoading] = useState(true);
  const [seasonError, setSeasonError] = useState<string | null>(null);
  const [seasonUserRank, setSeasonUserRank] = useState<number | null>(null);
  const [seasonTotalPlayers, setSeasonTotalPlayers] = useState(0);

  // Fetch user stats
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        setUserStatsLoading(true);
        setUserStatsError(null);

        const response = await apiFetch('/api/stats/user');
        if (!response.ok) {
          throw new Error('Failed to fetch user stats');
        }

        const data: UserStatsResponse = await response.json();
        setUserStats(data.stats);
      } catch (error) {
        console.error('Error fetching user stats:', error);
        setUserStatsError(error instanceof Error ? error.message : 'Failed to load user stats');
      } finally {
        setUserStatsLoading(false);
      }
    };

    fetchUserStats().catch(console.error);
  }, []);

  // Fetch season leaderboard
  useEffect(() => {
    const fetchSeasonLeaderboard = async () => {
      try {
        setSeasonLoading(true);
        setSeasonError(null);

        const response = await apiFetch('/api/leaderboard');
        if (!response.ok) {
          throw new Error('Failed to fetch season leaderboard');
        }

        const data: SeasonLeaderboardResponse = await response.json();
        setSeasonEntries(data.entries);
        setSeasonTotalPlayers(data.totalPlayers);
        setSeasonUserRank(data.userRank || null);
      } catch (error) {
        console.error('Error fetching season leaderboard:', error);
        setSeasonError(
          error instanceof Error ? error.message : 'Failed to load season leaderboard'
        );
      } finally {
        setSeasonLoading(false);
      }
    };

    fetchSeasonLeaderboard().catch(console.error);
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      void (window.history.length > 1 ? navigate(-1) : navigate('/'));
    }
  };

  return (
    <div className="p-4 min-h-screen bg-background sm:p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          {/* Back button on the left */}
          <Button variant="outline" onClick={handleBack} className="flex gap-2 items-center">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          {/* Centered title */}
          <h1 className="flex-1 text-2xl font-bold text-center sm:text-3xl text-foreground">
            Leaderboards
          </h1>

          {/* Spacer for balance */}
          <div className="w-[88px] sm:w-[100px]"></div>
        </div>

        {/* Content */}
        <div className="space-y-8 w-full">
          {/* User Stats - Prominent at top */}
          <UserStatsTab stats={userStats} loading={userStatsLoading} error={userStatsError} />

          {/* Season Leaderboard */}
          <SeasonLeaderboardTab
            entries={seasonEntries}
            userRank={seasonUserRank}
            totalPlayers={seasonTotalPlayers}
            loading={seasonLoading}
            error={seasonError}
          />
        </div>
      </div>
    </div>
  );
};

// User Stats Tab Component
interface UserStatsTabProps {
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
}

const UserStatsTab = ({ stats, loading, error }: UserStatsTabProps) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="w-32 h-6" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2 text-center">
                  <Skeleton className="mx-auto w-16 h-8" />
                  <Skeleton className="mx-auto w-20 h-4" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p>No stats available. Play some games to see your stats!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats - Prominent Display */}
      <div className="space-y-4 text-foreground">
        <h2 className="flex gap-2 items-center text-xl font-bold sm:text-2xl text-foreground">
          Your Stats
        </h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
          <div className="text-center">
            <div className="mb-2 text-3xl font-bold sm:text-4xl lg:text-5xl text-primary">
              {stats.totalPoints.toLocaleString()}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-medium cursor-help sm:text-base text-muted-foreground">
                  Total Points
                </div>
              </TooltipTrigger>
              <TooltipContent>Total points earned across all games and game types</TooltipContent>
            </Tooltip>
          </div>
          <div className="text-center">
            <div className="mb-2 text-3xl font-bold sm:text-4xl lg:text-5xl">
              {stats.totalGamesPlayed}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-medium cursor-help sm:text-base text-muted-foreground">
                  Games Played
                </div>
              </TooltipTrigger>
              <TooltipContent>Total number of games completed across all game types</TooltipContent>
            </Tooltip>
          </div>
          <div className="text-center">
            <div className="mb-2 text-3xl font-bold sm:text-4xl lg:text-5xl">
              {stats.currentDailyStreak}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-medium cursor-help sm:text-base text-muted-foreground">
                  Current Streak
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Number of consecutive days you've played at least one game
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="text-center">
            <div className="mb-2 text-3xl font-bold sm:text-4xl lg:text-5xl">
              {stats.bestDailyStreak}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-medium cursor-help sm:text-base text-muted-foreground">
                  Best Streak
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Your longest streak of consecutive days playing at least one game
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Game-specific Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 sm:gap-6">
        {/* Lettered Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <img src="/lettered-logo.svg" alt="Lettered" className="w-5 h-5" />
              Lettered Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-bold cursor-help">Games Played</span>
                  </TooltipTrigger>
                  <TooltipContent>Total number of Lettered games you've completed</TooltipContent>
                </Tooltip>
                <span className="font-semibold">{stats.totalLetteredGamesPlayed}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-bold cursor-help">Total Points</span>
                  </TooltipTrigger>
                  <TooltipContent>Total points earned from all Lettered games</TooltipContent>
                </Tooltip>
                <span className="font-semibold">{stats.totalLetteredPoints.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-bold cursor-help">Wins</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Number of Lettered games you've won (completed the phrase)
                  </TooltipContent>
                </Tooltip>
                <span className="font-semibold">{stats.totalLetteredWins}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-bold cursor-help">Losses</span>
                  </TooltipTrigger>
                  <TooltipContent>Number of Lettered games you didn't complete</TooltipContent>
                </Tooltip>
                <span className="font-semibold">{stats.totalLetteredLosses}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-bold cursor-help">Win Rate</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Percentage of Lettered games won (Wins ÷ Total Games)
                  </TooltipContent>
                </Tooltip>
                <span className="font-semibold">
                  {stats.totalLetteredWinRate ? `${stats.totalLetteredWinRate.toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-bold cursor-help">Avg Score</span>
                  </TooltipTrigger>
                  <TooltipContent>Average points scored per Lettered game</TooltipContent>
                </Tooltip>
                <span className="font-semibold">
                  {stats.totalLetteredAverageScore
                    ? stats.totalLetteredAverageScore.toFixed(1)
                    : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Season Leaderboard Tab Component
interface SeasonLeaderboardTabProps {
  entries: SeasonLeaderboardEntry[];
  userRank: number | null;
  totalPlayers: number;
  loading: boolean;
  error: string | null;
}

const SeasonLeaderboardTab = ({
  entries,
  userRank,
  totalPlayers,
  loading,
  error,
}: SeasonLeaderboardTabProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Season Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 rounded-lg border sm:p-4"
              >
                <div className="flex flex-1 gap-3 items-center min-w-0 sm:gap-4">
                  <Skeleton className="flex-shrink-0 w-6 h-6 sm:h-8 sm:w-8" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <Skeleton className="w-20 h-4 sm:w-24" />
                    <Skeleton className="w-12 h-3 sm:w-16" />
                  </div>
                </div>
                <Skeleton className="flex-shrink-0 w-16 h-6" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 justify-between items-start sm:flex-row sm:items-center">
        <h2 className="flex gap-2 items-center text-xl font-bold text-foreground">
          Season Leaderboard
        </h2>
        <div className="flex gap-2 items-center text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          {totalPlayers} {pluralize('player', totalPlayers)}
        </div>
      </div>

      <p className="max-w-2xl text-sm text-muted-foreground">
        Compete with players across all Lettered games this season. Rankings are based on total
        points earned, with higher scores placing you higher on the leaderboard. Keep playing daily
        to climb the ranks!
      </p>

      {entries.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No players yet this season.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="py-4 w-20 font-bold text-foreground">Rank</TableHead>
                <TableHead className="py-4 font-bold text-foreground">Player</TableHead>
                <TableHead className="py-4 w-20 font-bold text-center text-foreground">
                  Games
                </TableHead>
                <TableHead className="py-4 w-24 font-bold text-right text-foreground">
                  Points
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow
                  key={entry.userId}
                  className={`transition-colors ${
                    index % 2 === 0
                      ? 'bg-background hover:bg-muted/30'
                      : 'bg-muted/10 hover:bg-muted/40'
                  }`}
                >
                  <TableCell className="py-4 font-medium">
                    <div className="flex gap-2 items-center">
                      {getRankIcon(entry.rank)}
                      {entry.rank <= 3 && (
                        <Badge
                          variant={getRankBadgeVariant(entry.rank)}
                          className="text-xs px-2 py-0.5 font-semibold"
                        >
                          {entry.rank === 1 ? '1st' : entry.rank === 2 ? '2nd' : '3rd'}
                        </Badge>
                      )}
                      {entry.rank > 3 && (
                        <span className="text-sm font-semibold">#{entry.rank}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 max-w-[200px]">
                    <div className="min-w-0">
                      <div className="mb-1 font-semibold truncate text-foreground">
                        {entry.redditHandle}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        avg points: {entry.averageScore?.toFixed(1) || 'N/A'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 font-medium text-center text-foreground">
                    {entry.gamesPlayed}
                  </TableCell>
                  <TableCell className="py-4 text-lg font-bold text-right text-foreground">
                    {entry.totalPoints.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}

              {/* Show user's position if not in top 10 */}
              {userRank && userRank > 10 && (
                <TableRow className="bg-primary/10 border-primary/30 hover:bg-primary/15">
                  <TableCell className="py-4 font-medium">
                    <div className="flex gap-2 items-center">
                      {getRankIcon(userRank)}
                      <Badge variant="outline" className="text-xs px-2 py-0.5 font-semibold">
                        #{userRank}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div>
                      <div className="mb-1 font-semibold text-primary">You</div>
                      <div className="text-sm text-muted-foreground">
                        Keep playing to climb the rankings!
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 font-medium text-center">-</TableCell>
                  <TableCell className="py-4 text-lg font-bold text-right text-primary">
                    Your Position
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
