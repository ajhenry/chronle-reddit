import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, Trophy, Users, Clock } from 'lucide-react';
import { Season } from '../../shared/types/api';
import { apiFetch } from '../lib/utils';

interface SeasonInfoProps {
  onLeaderboardClick?: () => void;
}

export const SeasonInfo = ({ onLeaderboardClick }: SeasonInfoProps) => {
  const [season, setSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const fetchSeason = async () => {
      try {
        const response = await apiFetch('/api/season/current');
        if (response.ok) {
          const data = await response.json();
          setSeason(data.season);
        }
      } catch (error) {
        console.error('Error fetching season:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeason();
  }, []);

  useEffect(() => {
    if (!season) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const endDate = new Date(season.endDate);
      const timeDiff = endDate.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeRemaining('Season ended');
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        setTimeRemaining(`${days} day${days !== 1 ? 's' : ''} remaining`);
      } else {
        setTimeRemaining(`${hours} hour${hours !== 1 ? 's' : ''} remaining`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [season]);

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-muted h-8 w-8"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!season) {
    return null;
  }

  return (
    <Card className="mb-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-full">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{season.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {season.isActive ? 'Active' : 'Ended'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeRemaining}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(season.startDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
          {onLeaderboardClick && (
            <button
              onClick={onLeaderboardClick}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Users className="h-3 w-3" />
              Leaderboard
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
