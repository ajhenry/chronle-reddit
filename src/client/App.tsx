import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { DevPage } from './pages/dev';
import { LetteredPage } from './pages/lettered';
import { TermsPage } from './pages/terms';
import { PrivacyPage } from './pages/privacy';
import { AdminPage } from './pages/admin';
import { CustomGamePage } from './pages/custom';
import { LeaderboardPage } from './pages/leaderboard';
import { TutorialPage } from './pages/tutorial';
import { ScrollToTop } from './components/ScrollToTop';
import { AdminBanner } from './components/AdminBanner';
import { apiFetch } from './lib/utils';
import type { User } from '../shared/types/api';

export const App = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [showAdminUI, setShowAdminUI] = useState(true);

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
        const response = await apiFetch('/api/status');
        if (response.ok) {
          const data = await response.json();
          console.log('Game status:', data);

          // Show a toast if games were created
          if (data.gamesCreated) {
            console.log('Games were created for today');
          }
        } else {
          console.error('Failed to fetch game status:', response.statusText);
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

  const handleBackFromDev = () => {
    void navigate('/');
  };

  const handleTutorialComplete = () => {
    console.log('[TutorialComplete] Called, navigating to /');
    void navigate('/');
    // Also refetch in background to sync any other changes
    void fetchUserInfo();
  };

  return (
    <>
      {showAdminUI && <AdminBanner user={userInfo} />}
      <ScrollToTop />

      <Routes>
        <Route path="/tutorial" element={<TutorialPage onComplete={handleTutorialComplete} />} />
        <Route path="/custom" element={<CustomGamePage />} />
        <Route
          path="/leaderboard"
          element={<LeaderboardPage onBack={handleBackFromLeaderboard} />}
        />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/dev" element={<DevPage onBack={handleBackFromDev} />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route
          path="*"
          element={
            <LetteredPage
              onBack={handleBackToMenu}
              isAdmin={showAdminUI && (userInfo?.admin ?? false)}
              onToggleAdmin={() => setShowAdminUI(false)}
            />
          }
        />
      </Routes>
    </>
  );
};
