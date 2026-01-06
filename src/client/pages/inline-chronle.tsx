import { useState, useEffect, useCallback } from 'react';
import { Loader2, Menu, X } from 'lucide-react';
import { requestExpandedMode } from '@devvit/web/client';
import { InlineTimelineGame } from '../components/InlineTimelineGame';
import { DebugMenu } from '../components/DebugMenu';
import { apiFetch } from '../lib/utils';
import { useViewport } from '../hooks/useViewport';
import type { ChronleGameResponse } from '../../shared/types/chronle';
import type { User } from '../../shared/types/api';

/**
 * Compact Chronle page for inline mode - uses flex layout, no fixed heights
 */
export function InlineChronlePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameData, setGameData] = useState<ChronleGameResponse | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const { height } = useViewport();

  // Fetch user info for admin check
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await apiFetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          setUserInfo(data.user);
        }
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    };
    void fetchUserInfo();
  }, []);

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
            setGameId(id);
            return;
          }
        }
        // Fallback to daily game
        const dailyResponse = await apiFetch('/api/chronle/daily');
        if (dailyResponse.ok) {
          const dailyData = await dailyResponse.json();
          setGameId(dailyData.gameId);
        } else {
          setError('No game found');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error checking context:', err);
        setError('Failed to load');
        setLoading(false);
      }
    };

    void checkContext();
  }, []);

  // Load game data
  const loadGame = useCallback(async () => {
    if (!gameId) return;

    try {
      setLoading(true);
      const response = await apiFetch(`/api/chronle/${gameId}/game`);

      if (!response.ok) {
        setError('Failed to load');
        return;
      }

      const data: ChronleGameResponse = await response.json();
      setGameData(data);
      setError(null);
    } catch (err) {
      console.error('Error loading game:', err);
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (gameId) {
      void loadGame();
    }
  }, [gameId, loadGame]);

  const handleExpandToGame = (e: React.MouseEvent) => {
    void requestExpandedMode(e.nativeEvent, 'game');
    setMenuOpen(false);
  };

  const handleExpandToCreator = (e: React.MouseEvent) => {
    void requestExpandedMode(e.nativeEvent, 'creator');
    setMenuOpen(false);
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-background"
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="bevan text-3xl font-black text-primary">Chronle</div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !gameData) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-background"
        style={{ height }}
      >
        <div className="bevan text-3xl font-black text-primary">Chronle</div>
        <p className="mt-3 text-sm text-destructive">{error || 'Failed to load'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-background"
      style={{ height, overflow: 'hidden' }}
    >
      {/* Nav bar */}
      <nav className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div className="bevan text-xl font-black text-primary">Chronle</div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {gameData.game.postType === 'daily' ? 'Daily' : 'Custom'}
          </span>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded text-foreground hover:bg-muted"
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute right-2 top-12 z-50 min-w-[140px] rounded border border-border bg-background shadow-lg">
          <button
            onClick={handleExpandToGame}
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            Full Screen
          </button>
          <button
            onClick={handleExpandToCreator}
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            Create Puzzle
          </button>
        </div>
      )}

      {/* Game content - flex grow to fill remaining space */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <InlineTimelineGame
          gameData={gameData.game}
          initialOrder={gameData.session?.currentOrder ?? []}
          lastAttempt={gameData.session?.lastAttempt ?? null}
          attemptCount={gameData.session?.attemptCount ?? 0}
          isSolved={gameData.session?.isSolved ?? false}
          isCompleted={gameData.session?.isCompleted ?? false}
          gameId={gameId!}
          viewportHeight={height}
        />
      </div>

      {/* Debug menu for admins */}
      {userInfo?.admin && gameId && (
        <DebugMenu gameId={gameId} />
      )}
    </div>
  );
}
