import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { AlertDialog } from '../components/ui/alert-dialog';
import { ArrowLeft, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/utils';

interface DeleteAccountResponse {
  status: string;
  message: string;
  deletedKeysCount: number;
  errors?: string[];
}

export const SettingsPage = () => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await apiFetch('/api/account/delete', {
        method: 'POST',
      });

      if (response.ok) {
        const data: DeleteAccountResponse = await response.json();
        toast.success('Your data has been deleted', {
          description: `${data.deletedKeysCount} items removed`,
        });
        // Navigate back to home after deletion
        void navigate('/');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to delete account data');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account data');
    } finally {
      setIsDeleting(false);
      setShowFinalConfirm(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleFirstConfirm = () => {
    setShowDeleteConfirm(false);
    setShowFinalConfirm(true);
  };

  return (
    <div className="p-4 min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex gap-2 items-center w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
        </div>

        {/* Data & Privacy Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Data & Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex gap-3 items-start">
                <AlertTriangle className="flex-shrink-0 mt-0.5 w-5 h-5 text-destructive" />
                <div className="flex-1">
                  <h3 className="font-semibold text-destructive">Delete My Data</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This will permanently delete all your data from this app, including:
                  </p>
                  <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Your user profile</li>
                    <li>All game statistics and streaks</li>
                    <li>Leaderboard entries</li>
                    <li>Game session history</li>
                    <li>User preferences</li>
                  </ul>
                  <p className="mt-3 text-sm text-muted-foreground">
                    This action cannot be undone. You can continue using the app after deletion,
                    but you will start fresh with no history.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="flex gap-2 items-center mt-4"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {isDeleting ? 'Deleting...' : 'Delete My Data'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Lettered is a word puzzle game where you fit letter pieces into a grid to form a phrase.
              Your data is stored securely and is only used to provide game functionality.
            </p>
            <div className="flex gap-4 mt-4">
              <Button variant="link" onClick={() => navigate('/privacy')} className="p-0 h-auto">
                Privacy Policy
              </Button>
              <Button variant="link" onClick={() => navigate('/terms')} className="p-0 h-auto">
                Terms of Service
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* First Confirmation Dialog */}
        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete All Your Data?"
          description="This will permanently remove all your game data, statistics, and leaderboard entries from this app. This action cannot be undone."
          confirmText="Continue"
          cancelText="Cancel"
          onConfirm={handleFirstConfirm}
          variant="destructive"
        />

        {/* Final Confirmation Dialog */}
        <AlertDialog
          open={showFinalConfirm}
          onOpenChange={setShowFinalConfirm}
          title="Are you absolutely sure?"
          description="Your data will be permanently deleted. You will lose all your game history, streaks, and leaderboard rankings. This cannot be reversed."
          confirmText="Yes, Delete Everything"
          cancelText="Cancel"
          onConfirm={handleDeleteAccount}
          variant="destructive"
        />
      </div>
    </div>
  );
};

