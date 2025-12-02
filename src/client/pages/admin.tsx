import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AlertDialog } from '../components/ui/alert-dialog';
import { apiFetch } from '../lib/utils';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../../shared/types/api';

interface ClearSessionsResponse {
  status: string;
  message: string;
  data: {
    letteredSessionsDeleted: number;
    totalDeleted: number;
  };
}

interface ClearRedisResponse {
  status: string;
  message: string;
  data: {
    totalDeleted: number;
    breakdown: {
      letteredGames: number;
      letteredSessions: number;
      letteredSubmissions: number;
      customGames: number;
      postMappings: number;
      leaderboards: number;
      userStats: number;
      users: number;
      other: number;
    };
  };
}

export const AdminPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearingSessions, setClearingSessions] = useState(false);
  const [clearingRedis, setClearingRedis] = useState(false);
  const [showClearSessionsDialog, setShowClearSessionsDialog] = useState(false);
  const [showClearRedisDialog, setShowClearRedisDialog] = useState(false);
  const [showClearRedisConfirmDialog, setShowClearRedisConfirmDialog] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const response = await apiFetch('/api/admin');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          // Not admin, redirect to home
          void navigate('/');
          return;
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
        void navigate('/');
        return;
      } finally {
        setLoading(false);
      }
    };

    void checkAdminAccess();
  }, [navigate]);

  const handleClearSessionsClick = () => {
    setShowClearSessionsDialog(true);
  };

  const handleClearSessionsConfirm = async () => {
    setClearingSessions(true);
    try {
      const response = await apiFetch('/api/admin/clear/sessions', {
        method: 'POST',
      });

      if (response.ok) {
        const data: ClearSessionsResponse = await response.json();
        toast.success(`Cleared ${data.data.totalDeleted} items from database`);
      } else {
        toast.error('Failed to clear sessions');
      }
    } catch (error) {
      console.error('Error clearing sessions:', error);
      toast.error('Failed to clear sessions');
    } finally {
      setClearingSessions(false);
    }
  };

  const handleClearRedisClick = () => {
    setShowClearRedisDialog(true);
  };

  const handleClearRedisFirstConfirm = () => {
    setShowClearRedisConfirmDialog(true);
  };

  const handleClearRedisFinalConfirm = async () => {
    setClearingRedis(true);
    try {
      const response = await apiFetch('/api/admin/clear/redis', {
        method: 'POST',
      });

      if (response.ok) {
        const data: ClearRedisResponse = await response.json();
        toast.success(
          `Cleared ${data.data.totalDeleted} items from Redis (Games: ${data.data.breakdown.letteredGames}, Sessions: ${data.data.breakdown.letteredSessions}, Leaderboards: ${data.data.breakdown.leaderboards})`
        );
      } else {
        toast.error('Failed to clear Redis data');
      }
    } catch (error) {
      console.error('Error clearing Redis:', error);
      toast.error('Failed to clear Redis data');
    } finally {
      setClearingRedis(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="p-4 min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex gap-4 items-center mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="flex gap-2 items-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </Button>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>

        {/* Admin Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Admin Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>Reddit ID:</strong> {user.redditId}
              </p>
              <p>
                <strong>User ID:</strong> {user.id}
              </p>
              <p>
                <strong>Admin Status:</strong> {user.admin ? 'Yes' : 'No'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 rounded-lg border">
              <div>
                <h3 className="font-semibold">Clear All Game Sessions</h3>
                <p className="text-sm text-muted-foreground">
                  This will delete all game sessions, submissions, and leaderboard entries from the
                  database. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleClearSessionsClick}
                disabled={clearingSessions}
                className="flex gap-2 items-center"
              >
                {clearingSessions ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {clearingSessions ? 'Clearing...' : 'Clear Sessions'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Debug Actions - Nuclear Options */}
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Debug Actions - Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
              <div>
                <h3 className="font-semibold text-red-600">Clear All Redis Data</h3>
                <p className="text-sm text-muted-foreground">
                  Nuclear option: Clears ALL Redis data including games, sessions, leaderboards,
                  and tracking data. Use only for debugging. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleClearRedisClick}
                disabled={clearingRedis}
                className="flex gap-2 items-center bg-red-600 hover:bg-red-700"
              >
                {clearingRedis ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {clearingRedis ? 'Clearing...' : 'Clear All Redis'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Dialogs */}
        <AlertDialog
          open={showClearSessionsDialog}
          onOpenChange={setShowClearSessionsDialog}
          title="Clear All Game Sessions?"
          description="This will delete all game sessions, submissions, and leaderboard entries from the database. This action cannot be undone."
          confirmText="Clear Sessions"
          cancelText="Cancel"
          onConfirm={handleClearSessionsConfirm}
          variant="destructive"
        />

        <AlertDialog
          open={showClearRedisDialog}
          onOpenChange={setShowClearRedisDialog}
          title="Clear ALL Redis Data?"
          description="DANGER: This will clear ALL Redis data including games, sessions, leaderboards, and more. This action cannot be undone. Are you absolutely sure?"
          confirmText="I Understand, Continue"
          cancelText="Cancel"
          onConfirm={handleClearRedisFirstConfirm}
          variant="destructive"
        />

        <AlertDialog
          open={showClearRedisConfirmDialog}
          onOpenChange={setShowClearRedisConfirmDialog}
          title="Final Warning"
          description="FINAL WARNING: This will wipe all game data from Redis. Click Confirm to proceed with deletion."
          confirmText="Confirm Delete"
          cancelText="Cancel"
          onConfirm={handleClearRedisFinalConfirm}
          variant="destructive"
        />
      </div>
    </div>
  );
};
