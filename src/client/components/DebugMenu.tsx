import { useState } from 'react';
import { Bug, RotateCcw, Trash2, ChevronDown, ChevronUp, AlertTriangle, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { apiFetch } from '../lib/utils';

interface DebugMenuProps {
  gameId: string;
  onReset?: () => void;
}

export function DebugMenu({ gameId, onReset }: DebugMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResetSession = async () => {
    setIsResetting(true);
    setMessage(null);
    setShowConfirm(false);

    try {
      const response = await apiFetch(`/api/chronle/${gameId}/debug/reset`, {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Session reset! Reloading...' });
        setTimeout(() => {
          if (onReset) {
            onReset();
          } else {
            window.location.reload();
          }
        }, 1000);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to reset session' });
      }
    } catch (error) {
      console.error('Error resetting session:', error);
      setMessage({ type: 'error', text: 'Failed to reset session' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearAndReload = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const handleUploadImages = async () => {
    setIsUploading(true);
    setMessage(null);

    try {
      const response = await apiFetch('/api/admin/upload-images', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: `Uploaded ${data.uploaded} images, ${data.failed} failed`,
        });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to upload images' });
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      setMessage({ type: 'error', text: 'Failed to upload images' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-card border-border shadow-lg"
      >
        <Bug className="h-4 w-4" />
        <span className="hidden sm:inline">Debug</span>
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </Button>

      {/* Menu Panel */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-64 rounded-lg border border-border bg-card p-4 shadow-xl">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bug className="h-4 w-4" />
            Debug Menu
          </h3>

          <div className="space-y-2">
            {/* Reset Session - Confirmation Flow */}
            {showConfirm ? (
              <div className="rounded border border-destructive bg-destructive/10 p-2">
                <p className="mb-2 flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  Clear all attempts?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleResetSession}
                    disabled={isResetting}
                    className="flex-1"
                  >
                    {isResetting ? 'Resetting...' : 'Yes, Reset'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirm(false)}
                    disabled={isResetting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={isResetting}
                className="w-full justify-start gap-2"
              >
                <RotateCcw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
                {isResetting ? 'Resetting...' : 'Reset Session'}
              </Button>
            )}

            {/* Clear Local Storage Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAndReload}
              className="w-full justify-start gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Local Storage
            </Button>

            {/* Upload Images Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadImages}
              disabled={isUploading}
              className="w-full justify-start gap-2"
            >
              <Upload className={`h-4 w-4 ${isUploading ? 'animate-pulse' : ''}`} />
              {isUploading ? 'Uploading...' : 'Upload Images to Reddit'}
            </Button>
          </div>

          {/* Status Message */}
          {message && (
            <div
              className={`mt-3 rounded p-2 text-xs ${
                message.type === 'success'
                  ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                  : 'bg-destructive/20 text-destructive'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Game ID Info */}
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Game ID:</span>
            </p>
            <p className="mt-1 break-all text-xs font-mono text-muted-foreground">
              {gameId}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

