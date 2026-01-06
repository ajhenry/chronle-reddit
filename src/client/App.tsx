import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { getWebViewMode, addWebViewModeListener, removeWebViewModeListener } from '@devvit/web/client';
import { ChronlePage } from './pages/chronle';
import { InlineChronlePage } from './pages/inline-chronle';
import { PuzzleCreatorPage } from './pages/puzzle-creator';
import { TermsPage } from './pages/terms';
import { PrivacyPage } from './pages/privacy';
import { LeaderboardPage } from './pages/leaderboard';
import { SettingsPage } from './pages/settings';
import { ScrollToTop } from './components/ScrollToTop';
import { AdminBanner } from './components/AdminBanner';
import { apiFetch } from './lib/utils';
import type { User } from '../shared/types/api';

// Hook to track web view mode
function useWebViewMode(): 'inline' | 'expanded' {
  const [mode, setMode] = useState<'inline' | 'expanded'>(() => {
    try {
      return getWebViewMode();
    } catch {
      return 'expanded'; // Default to expanded if not in Devvit context
    }
  });

  useEffect(() => {
    const handleModeChange = (newMode: 'inline' | 'expanded') => {
      setMode(newMode);
    };

    try {
      addWebViewModeListener(handleModeChange);
      return () => removeWebViewModeListener(handleModeChange);
    } catch {
      // Not in Devvit context
    }
  }, []);

  return mode;
}

export const App = () => {
  const navigate = useNavigate();
  const webViewMode = useWebViewMode();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [showAdminUI, setShowAdminUI] = useState(true);

  // If in inline mode, render the compact inline game directly
  if (webViewMode === 'inline') {
    return <InlineChronlePage />;
  }

  // Toggle admin UI visibility with backtick key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`') {
        setShowAdminUI((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check game status and create games if needed
  useEffect(() => {
    const fetchGameStatus = async () => {
      try {
        console.log('Checking game status...');
        // Try to ensure daily game exists
        const response = await apiFetch('/api/chronle/daily');
        if (response.ok) {
          const data = await response.json();
          console.log('Daily game status:', data);
        } else {
          console.error('Failed to fetch daily game:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching game status:', error);
      }
    };

    void fetchGameStatus();
  }, []);

  // Fetch user info
  const fetchUserInfo = async () => {
    try {
      console.log('Fetching user info...');
      const response = await apiFetch('/api/user');
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.user);
        console.log('User info fetched:', data.user);
      } else {
        console.log('Failed to fetch user info:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  // Fetch user info when app loads
  useEffect(() => {
    void fetchUserInfo();
  }, []);

  const handleBackToMenu = () => {
    void navigate('/');
  };

  const handleBackFromLeaderboard = () => {
    void navigate('/');
  };

  return (
    <>
      {showAdminUI && <AdminBanner user={userInfo} />}
      <ScrollToTop />

      <Routes>
        <Route path="/create" element={<PuzzleCreatorPage />} />
        <Route path="/creator" element={<PuzzleCreatorPage />} />
        <Route
          path="/leaderboard"
          element={<LeaderboardPage onBack={handleBackFromLeaderboard} />}
        />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/game/:gameId" element={<ChronlePage />} />
        <Route path="*" element={<ChronlePage />} />
      </Routes>
    </>
  );
};
