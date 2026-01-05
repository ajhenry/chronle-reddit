import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { TimelineGame } from '../components/TimelineGame';
import { ChronleLogo } from '../components/ChronleLogo';
import { DebugMenu } from '../components/DebugMenu';
import { apiFetch } from '../lib/utils';
import type { ChronleGameResponse } from '../../shared/types/chronle';

export function ChronlePage() {
  const { gameId: urlGameId } = useParams<{ gameId?: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameData, setGameData] = useState<ChronleGameResponse | null>(null);
  const [contextGameId, setContextGameId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0); // Key to force remount TimelineGame

  // Effective game ID - prefer URL param, fallback to context
  const gameId = urlGameId || contextGameId;

  // Check for post context to get gameId
  useEffect(() => {
    const checkContext = async () => {
      try {
        const response = await apiFetch('/api/context');
        if (response.ok) {
          const data = await response.json();
          const metadata = data.context?.metadata;
          const id = metadata?.gameId || metadata?.customGameId;
          if (id) {
            setContextGameId(id);
          }
        }
      } catch (err) {
        console.error('Error checking context:', err);
      }
    };

    if (!urlGameId) {
      void checkContext();
    }
  }, [urlGameId]);

  // Load game data
  const loadGame = useCallback(async () => {
    if (!gameId) {
      // Try to get daily game if no gameId specified
      try {
        const dailyResponse = await apiFetch('/api/chronle/daily');
        if (dailyResponse.ok) {
          const dailyData = await dailyResponse.json();
          setContextGameId(dailyData.gameId);
          return;
        }
      } catch (err) {
        console.error('Error getting daily game:', err);
      }
      setError('No game ID found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiFetch(`/api/chronle/${gameId}/game`);

      if (!response.ok) {
        setError('Failed to load game');
        return;
      }

      const data: ChronleGameResponse = await response.json();
      setGameData(data);
      setError(null);
    } catch (err) {
      console.error('Error loading game:', err);
      setError('Failed to load game');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <ChronleLogo size="lg" />
        <div className="mt-8 flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-lg text-foreground">Loading puzzle...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !gameData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <ChronleLogo size="lg" />
        <div className="mt-8 text-center">
          <p className="text-lg text-destructive">{error || 'Failed to load game'}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <ChronleLogo size="sm" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/leaderboard')}>
              Leaderboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container py-6">
        {/* Game title */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">{gameData.game.title}</h1>
          {gameData.game.postType === 'custom' && gameData.game.creatorUsername && (
            <p className="text-sm text-muted-foreground">
              Created by u/{gameData.game.creatorUsername}
            </p>
          )}
        </div>

        {/* Timeline Game */}
        <TimelineGame
          key={`${gameId}-${resetKey}`}
          gameData={gameData.game}
          initialOrder={gameData.session?.currentOrder ?? []}
          lastAttempt={gameData.session?.lastAttempt ?? null}
          attemptCount={gameData.session?.attemptCount ?? 0}
          isSolved={gameData.session?.isSolved ?? false}
          isCompleted={gameData.session?.isCompleted ?? false}
          gameId={gameId!}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="container text-center text-sm text-muted-foreground">
          Made with care by u/ajhenrydev
        </div>
      </footer>

      {/* Debug Menu */}
      <DebugMenu gameId={gameId!} onReset={() => {
        setResetKey(k => k + 1);
        void loadGame();
      }} />
    </div>
  );
}
