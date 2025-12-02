import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { DevPage } from './pages/dev';
import { LetteredPage } from './pages/lettered';
import { TermsPage } from './pages/terms';
import { PrivacyPage } from './pages/privacy';
import { AdminPage } from './pages/admin';
import { CustomGamePage } from './pages/custom';
import { LeaderboardPage } from './pages/leaderboard';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { BouncingLogo } from './components/BouncingLogo';

import { Toaster } from 'sonner';
import { X, Settings } from 'lucide-react';
import { isDevelopment } from './lib/dev-utils';
import { ModeToggle } from './components/mode-toggle';
import { ScrollToTop } from './components/ScrollToTop';
import { AdminBanner } from './components/AdminBanner';
import { HomeLoadingAnimation } from './components/HomeLoadingAnimation';
import { GameResetCountdown } from './components/GameResetCountdown';
import { UserLeaderboardStats } from './components/UserLeaderboardStats';
import { apiFetch } from './lib/utils';
import type { User } from '../shared/types/api';
import { LetteredLoadingAnimation } from './components/LetteredLoadingAnimation';
import { GameLayout } from './components/GameLayout';

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

export const App = () => {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [isCheckingContext, setIsCheckingContext] = useState<boolean>(true);
  const dailyMode = getCookie('dailyMode') === 'true';

  const setCookie = (name: string, value: string, days: number): void => {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
  };

  // Check if welcome was dismissed on mount and handle custom game context
  useEffect(() => {
    const initializeApp = async () => {
      // FIRST: Check for custom game context BEFORE doing anything else
      try {
        // ALWAYS check context - don't restrict to homepage only
        console.log('Checking for custom game context...', window.location);
        const response = await apiFetch('/api/context');
        if (response.ok) {
          const data = await response.json();

          console.log('dailyMode', dailyMode);
          console.log('getCookie', getCookie('dailyMode'));
          const metadata = data.context?.metadata;
          const debug = data.context?.debug;

          // If this is a custom game post, redirect to the custom game IMMEDIATELY
          if (metadata?.customGameId && metadata?.gameType === 'lettered' && !dailyMode) {
            console.log('Redirecting to custom game:', { gameId: metadata.customGameId });
            await navigate(`/lettered/${metadata.customGameId}`);
            setIsCheckingContext(false);
          } else if (debug?.gameId) {
            console.log('Found custom game ID in context:', { gameId: debug.gameId });
            // Navigate directly to the custom game
            await navigate(`/lettered/${debug.gameId}`);
            setIsCheckingContext(false);
          } else {
            console.log('No custom game detected, proceeding with normal flow');
          }
        } else {
          console.log('Context API call failed');
        }
      } catch (error) {
        console.log('No custom game context found or error:', error);
      }

      // SECOND: If no custom game, proceed with normal initialization
      setIsCheckingContext(false);

      // Check welcome state
      const welcomeDismissed = getCookie('podium_welcome_dismissed');
      if (welcomeDismissed !== 'true') {
        setShowWelcome(true);
      }
    };

    void initializeApp();
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

  // Fetch user info when app loads
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        console.log('Fetching user info...');
        const response = await apiFetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          setUserInfo(data.user);
          console.log('User info fetched:', data.user, userInfo);
        } else {
          console.log('Failed to fetch user info:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    void fetchUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    setCookie('podium_welcome_dismissed', 'true', 365); // Expires in 1 year
  };

  const handleGameSelect = (gameId: string) => {
    if (gameId === 'lettered') {
      void navigate('/lettered');
    } else if (gameId === 'dev') {
      void navigate('/dev');
    }
  };

  const handleBackToMenu = () => {
    void navigate('/');
  };

  const handleBackFromLeaderboard = () => {
    void navigate('/');
  };

  const handleDevModeClick = () => {
    void navigate('/dev');
  };

  const handleBackFromDev = () => {
    void navigate('/');
  };

  // Show loading while checking for custom game context
  if (isCheckingContext) {
    return (
      <>
        <AdminBanner user={userInfo} />
        <ScrollToTop />
        <GameLayout
          gameTitle="Lettered"
          score={0}
          onBack={handleBackToMenu}
          logoSrc="/lettered-logo.svg"
        >
          <CardContent className="flex justify-center items-center p-8">
            <LetteredLoadingAnimation />
          </CardContent>
        </GameLayout>
      </>
    );
  }

  return (
    <>
      <AdminBanner user={userInfo} />
      <ScrollToTop />

      <Routes>
        <Route path="/lettered/:gameId" element={<LetteredPage onBack={handleBackToMenu} />} />
        <Route path="/custom" element={<CustomGamePage />} />
        <Route
          path="/leaderboard"
          element={<LeaderboardPage onBack={handleBackFromLeaderboard} />}
        />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/dev" element={<DevPage onBack={handleBackFromDev} />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<LetteredPage onBack={handleBackToMenu} />} />
      </Routes>
    </>
  );
};
