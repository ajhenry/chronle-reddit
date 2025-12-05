import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { AlertDialog } from '../components/ui/alert-dialog';
import { apiFetch } from '../lib/utils';
import { ArrowLeft, Trash2, Loader2, Search, RefreshCw, UserPen } from 'lucide-react';
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

interface SessionLookupResponse {
  status: string;
  session: {
    id: string;
    userId: string;
    gameId: string;
    startedAt: string;
    completedAt: string | null;
    timeElapsed: number;
    isCompleted: boolean;
    moves: number;
  };
  user: {
    id: string;
    redditId: string;
    handle: string;
    imageUrl: string | null;
  } | null;
  game: {
    phrase: string;
    category: string;
  } | null;
  submission: {
    id: string;
    submittedAt: string;
    placedPiecesCount: number;
  } | null;
}

interface RegenerateGameResponse {
  status: string;
  message: string;
  data: {
    gameId: string;
    phrase: string;
    category: string;
    seed: number;
    piecesCount: number;
  };
}

interface UserSearchResponse {
  status: string;
  user: {
    id: string;
    redditId: string;
    handle: string;
    imageUrl: string | null;
    admin: boolean;
    createdAt: string;
  };
}

interface UpdateUserNameResponse {
  status: string;
  message: string;
  data: {
    userId: string;
    oldName: string;
    newName: string;
    metadataUpdated: number;
  };
}

export const AdminPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearingSessions, setClearingSessions] = useState(false);
  const [clearingRedis, setClearingRedis] = useState(false);
  const [clearingLetteredSessions, setClearingLetteredSessions] = useState(false);
  const [showClearSessionsDialog, setShowClearSessionsDialog] = useState(false);
  const [showClearRedisDialog, setShowClearRedisDialog] = useState(false);
  const [showClearRedisConfirmDialog, setShowClearRedisConfirmDialog] = useState(false);
  const [showClearLetteredSessionsDialog, setShowClearLetteredSessionsDialog] = useState(false);

  // Regenerate game state
  const [regeneratingGame, setRegeneratingGame] = useState(false);
  const [showRegenerateGameDialog, setShowRegenerateGameDialog] = useState(false);

  // Session lookup state
  const [sessionIdInput, setSessionIdInput] = useState('');
  const [sessionLookupLoading, setSessionLookupLoading] = useState(false);
  const [sessionLookupResult, setSessionLookupResult] = useState<SessionLookupResponse | null>(
    null
  );
  const [sessionLookupError, setSessionLookupError] = useState<string | null>(null);

  // User name update state
  const [userSearchHandle, setUserSearchHandle] = useState('');
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchResult, setUserSearchResult] = useState<UserSearchResponse['user'] | null>(null);
  const [userSearchError, setUserSearchError] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [updatingUserName, setUpdatingUserName] = useState(false);

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

  const handleClearLetteredSessionsClick = () => {
    setShowClearLetteredSessionsDialog(true);
  };

  const handleClearLetteredSessionsConfirm = async () => {
    setClearingLetteredSessions(true);
    try {
      const response = await apiFetch('/api/admin/clear/lettered-sessions', {
        method: 'POST',
      });

      if (response.ok) {
        const data: ClearSessionsResponse = await response.json();
        toast.success(`Cleared ${data.data.letteredSessionsDeleted} lettered sessions`);
      } else {
        toast.error('Failed to clear lettered sessions');
      }
    } catch (error) {
      console.error('Error clearing lettered sessions:', error);
      toast.error('Failed to clear lettered sessions');
    } finally {
      setClearingLetteredSessions(false);
    }
  };

  const handleRegenerateGameClick = () => {
    setShowRegenerateGameDialog(true);
  };

  const handleRegenerateGameConfirm = async () => {
    setRegeneratingGame(true);
    try {
      const response = await apiFetch('/api/admin/lettered/regenerate', {
        method: 'POST',
      });

      if (response.ok) {
        const data: RegenerateGameResponse = await response.json();
        toast.success(
          `Game regenerated: "${data.data.phrase}" (${data.data.piecesCount} pieces, seed: ${data.data.seed})`
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to regenerate game');
      }
    } catch (error) {
      console.error('Error regenerating game:', error);
      toast.error('Failed to regenerate game');
    } finally {
      setRegeneratingGame(false);
    }
  };

  const handleUserSearch = async () => {
    if (!userSearchHandle.trim()) {
      toast.error('Please enter a username to search');
      return;
    }

    setUserSearchLoading(true);
    setUserSearchError(null);
    setUserSearchResult(null);
    setNewUserName('');

    try {
      const response = await apiFetch(
        `/api/admin/user/search?handle=${encodeURIComponent(userSearchHandle.trim())}`
      );

      if (response.ok) {
        const data: UserSearchResponse = await response.json();
        setUserSearchResult(data.user);
        setNewUserName(data.user.handle);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setUserSearchError(errorData.message || 'User not found');
      }
    } catch (error) {
      console.error('Error searching for user:', error);
      setUserSearchError('Failed to search for user');
    } finally {
      setUserSearchLoading(false);
    }
  };

  const handleUpdateUserName = async () => {
    if (!userSearchResult || !newUserName.trim()) {
      toast.error('Please enter a new name');
      return;
    }

    if (newUserName.trim() === userSearchResult.handle) {
      toast.error('New name is the same as current name');
      return;
    }

    setUpdatingUserName(true);
    try {
      const response = await apiFetch('/api/admin/user/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userSearchResult.id,
          newName: newUserName.trim(),
        }),
      });

      if (response.ok) {
        const data: UpdateUserNameResponse = await response.json();
        toast.success(
          `Updated name from "${data.data.oldName}" to "${data.data.newName}" (${data.data.metadataUpdated} leaderboard entries updated)`
        );
        // Update the local state to reflect the change
        setUserSearchResult({
          ...userSearchResult,
          handle: data.data.newName,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to update user name');
      }
    } catch (error) {
      console.error('Error updating user name:', error);
      toast.error('Failed to update user name');
    } finally {
      setUpdatingUserName(false);
    }
  };

  const handleSessionLookup = async () => {
    if (!sessionIdInput.trim()) {
      toast.error('Please enter a session ID');
      return;
    }

    setSessionLookupLoading(true);
    setSessionLookupError(null);
    setSessionLookupResult(null);

    try {
      const response = await apiFetch(`/api/admin/session/${sessionIdInput.trim()}`);

      if (response.ok) {
        const data: SessionLookupResponse = await response.json();
        setSessionLookupResult(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setSessionLookupError(errorData.message || 'Session not found');
      }
    } catch (error) {
      console.error('Error looking up session:', error);
      setSessionLookupError('Failed to look up session');
    } finally {
      setSessionLookupLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
        <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="flex gap-2 items-center w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </Button>
          <h1 className="text-2xl font-bold sm:text-3xl">Admin Dashboard</h1>
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

        {/* Session Lookup */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Session Lookup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <Input
                type="text"
                placeholder="Enter Session ID (UUID)"
                value={sessionIdInput}
                onChange={(e) => setSessionIdInput(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleSessionLookup();
                  }
                }}
              />
              <Button
                onClick={() => void handleSessionLookup()}
                disabled={sessionLookupLoading}
                className="flex gap-2 items-center sm:w-auto"
              >
                {sessionLookupLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {sessionLookupLoading ? 'Looking up...' : 'Lookup Session'}
              </Button>
            </div>

            {sessionLookupError && (
              <div className="p-4 rounded-lg border border-destructive bg-destructive/10">
                <p className="text-sm text-destructive">{sessionLookupError}</p>
              </div>
            )}

            {sessionLookupResult && (
              <div className="p-4 space-y-4 rounded-lg border bg-muted/50">
                {/* Session Info */}
                <div>
                  <h4 className="mb-2 font-semibold">Session</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Session ID:</div>
                    <div className="font-mono text-xs break-all">
                      {sessionLookupResult.session.id}
                    </div>
                    <div className="text-muted-foreground">Game ID:</div>
                    <div className="font-mono text-xs break-all">
                      {sessionLookupResult.session.gameId}
                    </div>
                    <div className="text-muted-foreground">Started At:</div>
                    <div>{new Date(sessionLookupResult.session.startedAt).toLocaleString()}</div>
                    <div className="text-muted-foreground">Completed:</div>
                    <div>{sessionLookupResult.session.isCompleted ? 'Yes' : 'No'}</div>
                    {sessionLookupResult.session.completedAt && (
                      <>
                        <div className="text-muted-foreground">Completed At:</div>
                        <div>
                          {new Date(sessionLookupResult.session.completedAt).toLocaleString()}
                        </div>
                      </>
                    )}
                    <div className="text-muted-foreground">Time Elapsed:</div>
                    <div>{formatTime(sessionLookupResult.session.timeElapsed)}</div>
                    <div className="text-muted-foreground">Moves:</div>
                    <div>{sessionLookupResult.session.moves}</div>
                  </div>
                </div>

                {/* User Info */}
                {sessionLookupResult.user && (
                  <div>
                    <h4 className="mb-2 font-semibold">User</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">User ID:</div>
                      <div className="font-mono text-xs break-all">
                        {sessionLookupResult.user.id}
                      </div>
                      <div className="text-muted-foreground">Reddit Handle:</div>
                      <div>u/{sessionLookupResult.user.handle}</div>
                      <div className="text-muted-foreground">Reddit ID:</div>
                      <div className="font-mono text-xs">{sessionLookupResult.user.redditId}</div>
                    </div>
                  </div>
                )}

                {/* Game Info */}
                {sessionLookupResult.game && (
                  <div>
                    <h4 className="mb-2 font-semibold">Game</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">Category:</div>
                      <div>{sessionLookupResult.game.category}</div>
                      <div className="text-muted-foreground">Phrase:</div>
                      <div>{sessionLookupResult.game.phrase}</div>
                    </div>
                  </div>
                )}

                {/* Latest Submission */}
                {sessionLookupResult.submission && (
                  <div>
                    <h4 className="mb-2 font-semibold">Latest Submission</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">Submission ID:</div>
                      <div className="font-mono text-xs break-all">
                        {sessionLookupResult.submission.id}
                      </div>
                      <div className="text-muted-foreground">Submitted At:</div>
                      <div>
                        {new Date(sessionLookupResult.submission.submittedAt).toLocaleString()}
                      </div>
                      <div className="text-muted-foreground">Pieces Placed:</div>
                      <div>{sessionLookupResult.submission.placedPiecesCount}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Name Update */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Update User Display Name</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <Input
                type="text"
                placeholder="Enter username to search"
                value={userSearchHandle}
                onChange={(e) => setUserSearchHandle(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleUserSearch();
                  }
                }}
              />
              <Button
                onClick={() => void handleUserSearch()}
                disabled={userSearchLoading}
                className="flex gap-2 items-center sm:w-auto"
              >
                {userSearchLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {userSearchLoading ? 'Searching...' : 'Find User'}
              </Button>
            </div>

            {userSearchError && (
              <div className="p-4 rounded-lg border border-destructive bg-destructive/10">
                <p className="text-sm text-destructive">{userSearchError}</p>
              </div>
            )}

            {userSearchResult && (
              <div className="p-4 space-y-4 rounded-lg border bg-muted/50">
                <div>
                  <h4 className="mb-2 font-semibold">User Found</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">User ID:</div>
                    <div className="font-mono text-xs break-all">{userSearchResult.id}</div>
                    <div className="text-muted-foreground">Current Handle:</div>
                    <div className="font-semibold">{userSearchResult.handle}</div>
                    <div className="text-muted-foreground">Reddit ID:</div>
                    <div className="font-mono text-xs">{userSearchResult.redditId}</div>
                    <div className="text-muted-foreground">Admin:</div>
                    <div>{userSearchResult.admin ? 'Yes' : 'No'}</div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="mb-2 font-semibold">Change Display Name</h4>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <Input
                      type="text"
                      placeholder="Enter new display name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          void handleUpdateUserName();
                        }
                      }}
                    />
                    <Button
                      onClick={() => void handleUpdateUserName()}
                      disabled={updatingUserName || newUserName.trim() === userSearchResult.handle}
                      className="flex gap-2 items-center sm:w-auto"
                    >
                      {updatingUserName ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPen className="w-4 h-4" />
                      )}
                      {updatingUserName ? 'Updating...' : 'Update Name'}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    This will update the user's display name across all leaderboards.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 p-4 rounded-lg border sm:flex-row sm:justify-between sm:items-center">
              <div className="flex-1">
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
                className="flex gap-2 items-center w-full sm:w-auto shrink-0"
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
        <Card className="mt-8 border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Debug Actions - Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 sm:flex-row sm:justify-between sm:items-center">
              <div className="flex-1">
                <h3 className="font-semibold text-amber-600">Regenerate Today's Game</h3>
                <p className="text-sm text-muted-foreground">
                  Regenerates today's lettered game with a new random seed. Uses the same phrase but
                  creates a new puzzle layout. Existing sessions will become invalid.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleRegenerateGameClick}
                disabled={regeneratingGame}
                className="flex gap-2 items-center w-full border-amber-500 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/40 sm:w-auto shrink-0"
              >
                {regeneratingGame ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {regeneratingGame ? 'Regenerating...' : 'Regenerate Game'}
              </Button>
            </div>

            <div className="flex flex-col gap-4 p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 sm:flex-row sm:justify-between sm:items-center">
              <div className="flex-1">
                <h3 className="font-semibold text-red-600">Clear Lettered Sessions</h3>
                <p className="text-sm text-muted-foreground">
                  Clears all lettered game sessions and submissions from Redis. Games and
                  leaderboards are preserved. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleClearLetteredSessionsClick}
                disabled={clearingLetteredSessions}
                className="flex gap-2 items-center w-full bg-red-600 hover:bg-red-700 sm:w-auto shrink-0"
              >
                {clearingLetteredSessions ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {clearingLetteredSessions ? 'Clearing...' : 'Clear Lettered Sessions'}
              </Button>
            </div>

            <div className="flex flex-col gap-4 p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 sm:flex-row sm:justify-between sm:items-center">
              <div className="flex-1">
                <h3 className="font-semibold text-red-600">Clear All Redis Data</h3>
                <p className="text-sm text-muted-foreground">
                  Nuclear option: Clears ALL Redis data including games, sessions, leaderboards, and
                  tracking data. Use only for debugging. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleClearRedisClick}
                disabled={clearingRedis}
                className="flex gap-2 items-center w-full bg-red-600 hover:bg-red-700 sm:w-auto shrink-0"
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

        <AlertDialog
          open={showClearLetteredSessionsDialog}
          onOpenChange={setShowClearLetteredSessionsDialog}
          title="Clear All Lettered Sessions?"
          description="This will delete all lettered game sessions and submissions from Redis. Games and leaderboards will be preserved. This action cannot be undone."
          confirmText="Clear Lettered Sessions"
          cancelText="Cancel"
          onConfirm={handleClearLetteredSessionsConfirm}
          variant="destructive"
        />

        <AlertDialog
          open={showRegenerateGameDialog}
          onOpenChange={setShowRegenerateGameDialog}
          title="Regenerate Today's Game?"
          description="This will create a new puzzle layout for today's game using a different random seed. The same phrase will be used but the piece shapes and positions will change. Any existing player sessions will become invalid and they'll need to start over."
          confirmText="Regenerate Game"
          cancelText="Cancel"
          onConfirm={handleRegenerateGameConfirm}
          variant="default"
        />
      </div>
    </div>
  );
};
