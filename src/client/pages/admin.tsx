import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { apiFetch } from '../lib/utils';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../../shared/types/api';

interface ClearSessionsResponse {
  status: string;
  message: string;
  data: {
    letteredSessionsDeleted: number;
    topxSessionsDeleted: number;
    leaderboardEntriesDeleted: number;
    topxSubmissionsDeleted: number;
    totalDeleted: number;
  };
}

export const AdminPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearingSessions, setClearingSessions] = useState(false);

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

  const handleClearSessions = async () => {
    if (
      !confirm('Are you sure you want to clear ALL game sessions? This action cannot be undone.')
    ) {
      return;
    }

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
                onClick={handleClearSessions}
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
      </div>
    </div>
  );
};
