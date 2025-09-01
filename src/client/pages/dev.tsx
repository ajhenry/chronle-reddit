import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Settings,
  Database,
  RefreshCw,
  Plus,
  Calendar,
  Trophy,
  GamepadIcon,
  ArrowLeft,
} from 'lucide-react';
import { Season, TopXGameData } from '../../shared/types/api';
import { apiFetch } from '../lib/utils';
import { toast } from 'sonner';

interface DevPageProps {
  onBack?: () => void;
}

export const DevPage = ({ onBack }: DevPageProps) => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);

  const [games, setGames] = useState<TopXGameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonDays, setNewSeasonDays] = useState('30');

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch seasons
        const seasonsResponse = await apiFetch('/api/seasons');
        if (seasonsResponse.ok) {
          const seasonsData = await seasonsResponse.json();
          setSeasons(seasonsData.seasons);
        }

        // Fetch current season
        const currentSeasonResponse = await apiFetch('/api/season/current');
        if (currentSeasonResponse.ok) {
          const currentSeasonData = await currentSeasonResponse.json();
          setCurrentSeason(currentSeasonData.season);
        }

        // Fetch games
        const gamesResponse = await apiFetch('/api/topx/games');
        if (gamesResponse.ok) {
          const gamesData = await gamesResponse.json();
          setGames(gamesData.games);
        }

        // Game sessions functionality removed
      } catch (error) {
        console.error('Error fetching dev data:', error);
        toast.error('Failed to load development data');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const handleCreateSeason = async () => {
    if (!newSeasonName.trim()) {
      toast.error('Season name is required');
      return;
    }

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(newSeasonDays));

      const response = await apiFetch('/api/seasons', {
        method: 'POST',
        body: JSON.stringify({
          name: newSeasonName,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_active: false,
          game_type: 'topx',
        }),
      });

      if (response.ok) {
        toast.success('Season created successfully');
        setNewSeasonName('');
        // Refresh seasons list
        const seasonsResponse = await apiFetch('/api/seasons');
        if (seasonsResponse.ok) {
          const seasonsData = await seasonsResponse.json();
          setSeasons(seasonsData.seasons);
        }
      } else {
        toast.error('Failed to create season');
      }
    } catch (error) {
      console.error('Error creating season:', error);
      toast.error('Error creating season');
    }
  };

  const handleActivateSeason = async (seasonId: string) => {
    try {
      const response = await apiFetch(`/api/seasons/${seasonId}/activate`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Season activated successfully');
        // Refresh data
        const [seasonsResponse, currentSeasonResponse] = await Promise.all([
          apiFetch('/api/seasons'),
          apiFetch('/api/season/current'),
        ]);

        if (seasonsResponse.ok) {
          const seasonsData = await seasonsResponse.json();
          setSeasons(seasonsData.seasons);
        }

        if (currentSeasonResponse.ok) {
          const currentSeasonData = await currentSeasonResponse.json();
          setCurrentSeason(currentSeasonData.season);
        }
      } else {
        toast.error('Failed to activate season');
      }
    } catch (error) {
      console.error('Error activating season:', error);
      toast.error('Error activating season');
    }
  };

  const handleRefreshData = async () => {
    try {
      setLoading(true);

      const [seasonsResponse, currentSeasonResponse, gamesResponse] = await Promise.all([
        apiFetch('/api/seasons'),
        apiFetch('/api/season/current'),
        apiFetch('/api/topx/games'),
      ]);

      if (seasonsResponse.ok) {
        const seasonsData = await seasonsResponse.json();
        setSeasons(seasonsData.seasons);
      }

      if (currentSeasonResponse.ok) {
        const currentSeasonData = await currentSeasonResponse.json();
        setCurrentSeason(currentSeasonData.season);
      }

      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json();
        setGames(gamesData.games);
      }

      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Error refreshing data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-full">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Development Tools</h1>
              <p className="text-muted-foreground text-sm">
                Manage seasons, games, and development settings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefreshData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
        </div>

        {/* Current Season Info */}
        {currentSeason && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <CardTitle>Current Season</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="font-semibold">{currentSeason.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Duration</div>
                  <div className="font-semibold">
                    {new Date(currentSeason.startDate).toLocaleDateString()} -{' '}
                    {new Date(currentSeason.endDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant={currentSeason.isActive ? 'default' : 'secondary'}>
                    {currentSeason.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Season Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Season Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create New Season */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Create New Season</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Season name"
                    value={newSeasonName}
                    onChange={(e) => setNewSeasonName(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Days"
                    value={newSeasonDays}
                    onChange={(e) => setNewSeasonDays(e.target.value)}
                    className="w-20"
                  />
                  <Button onClick={handleCreateSeason}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Seasons List */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">All Seasons</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {seasons.map((season) => (
                    <div
                      key={season.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium text-sm">{season.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(season.startDate).toLocaleDateString()} -{' '}
                          {new Date(season.endDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={season.isActive ? 'default' : 'outline'}>
                          {season.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {!season.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleActivateSeason(season.id)}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Game Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GamepadIcon className="h-5 w-5 text-primary" />
                <CardTitle>Game Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold">Available Games</h4>
                <Badge variant="outline">{games.length} games</Badge>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {games.map((game) => (
                  <div key={game.id} className="p-2 border rounded">
                    <div className="font-medium text-sm">{game.prompt}</div>
                    <div className="text-xs text-muted-foreground">
                      {game.category} • {game.number} answers • {game.correctAnswers.length} correct
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Actions</h4>
                <div className="text-xs text-muted-foreground">
                  Game session tracking has been removed.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Database Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>Database Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold text-primary">{seasons.length}</div>
                <div className="text-sm text-muted-foreground">Total Seasons</div>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold text-primary">{games.length}</div>
                <div className="text-sm text-muted-foreground">Available Games</div>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold text-muted-foreground">-</div>
                <div className="text-sm text-muted-foreground">Game Sessions (Removed)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Development Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Use "Create New Season" to add test seasons for development</p>
              <p>• Game session tracking has been removed from the system</p>
              <p>• Only one season can be active at a time</p>
              <p>• Refresh data after making changes to see updates</p>
              <p>• This page is only visible in development mode</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
