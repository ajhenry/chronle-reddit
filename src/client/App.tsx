import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { TopXPage } from './pages/topx';
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
import { apiFetch } from './lib/utils';
import type { User } from '../shared/types/api';

export const App = () => {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [isCheckingContext, setIsCheckingContext] = useState<boolean>(true);
  // userInfo is stored for potential future use and debugging

  // Cookie utilities
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  const setCookie = (name: string, value: string, days: number): void => {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
  };

  // Check if welcome was dismissed on mount and handle custom game context
  useEffect(() => {
    const initializeApp = async () => {
      console.log('App initializing with URL:', window.location.href);
      console.log('Pathname:', window.location.pathname);
      console.log('Search params:', window.location.search);
      console.log('Hash:', window.location.hash);

      // FIRST: Check for custom game context BEFORE doing anything else
      try {
        // ALWAYS check context - don't restrict to homepage only
        console.log('Checking for custom game context...', window.location);
        const response = await apiFetch('/api/context');
        if (response.ok) {
          const data = await response.json();

          const metadata = data.context?.metadata;
          const debug = data.context?.debug;

          // If this is a custom game post, redirect to the custom game IMMEDIATELY
          if (metadata?.customGameId && metadata?.gameType === 'lettered') {
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
  }, [navigate]);

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
    if (gameId === 'topx') {
      void navigate('/topx');
    } else if (gameId === 'lettered') {
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
        <HomeLoadingAnimation />
      </>
    );
  }

  return (
    <>
      <AdminBanner user={userInfo} />
      <ScrollToTop />

      <Routes>
        <Route path="/topx" element={<TopXPage onBack={handleBackToMenu} />} />
        <Route path="/lettered" element={<LetteredPage onBack={handleBackToMenu} />} />
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
        <Route
          path="*"
          element={
            <div className="flex relative flex-col min-h-screen bg-background">
              {/* Main Container */}
              <div className="container px-4 py-6 mx-auto max-w-4xl">
                {/* Content Container with max-width constraint */}
                <div className="flex flex-col flex-1 gap-8 justify-center items-center mx-auto my-6 w-full max-w-md">
                  {/* Bouncing Logo */}
                  <div className="w-full">
                    <BouncingLogo src="/topx-logo.svg" alt="Top X Logo" />
                  </div>

                  {/* Podium Logo */}
                  <div className="w-full text-center">
                    <div className="space-y-4 text-center">
                      <div className="relative animate-bounce-shadow">
                        {/* Season Banner */}
                        <div className="absolute -top-2 -left-2 z-10 px-3 py-1 text-white bg-black border-2 border-black transform -rotate-12">
                          <span className="text-sm font-bold tracking-wide">PRESEASON</span>
                        </div>
                        <div className="py-4 border-4 bg-primary border-border">
                          <h1
                            className="text-6xl font-black tracking-tight text-black"
                            style={{
                              fontFamily: 'Inter, sans-serif',
                              fontWeight: 900,
                              letterSpacing: '-0.05em',
                              lineHeight: '0.8',
                            }}
                          >
                            PODIUM
                          </h1>
                        </div>
                      </div>
                      <div>
                        <Card className="py-3 border-4 bg-card border-border">
                          <p className="text-xl font-bold tracking-wide uppercase text-card-foreground">
                            Daily Puzzle Games
                          </p>
                        </Card>
                      </div>
                    </div>
                  </div>

                  {/* Game Selection */}
                  <div className="grid grid-cols-1 gap-6 w-full">
                    {/* TOP X Game */}
                    <div className="flex flex-col items-center space-y-2 w-full">
                      <button
                        onClick={() => handleGameSelect('topx')}
                        className="relative overflow-hidden border-4 border-border shadow-lg hover:shadow-xl transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] w-full"
                        style={{
                          backgroundImage: 'url(/topx-button-logo.svg)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      >
                        <div className="bg-black/20 py-8 flex items-center justify-center min-h-[100px]">
                          <h2 className="text-4xl font-black tracking-wider text-white drop-shadow-lg">
                            TOP X
                          </h2>
                        </div>
                      </button>
                      <h3 className="mt-2 mb-2 text-xl font-bold text-center text-card-foreground">
                        Guess the top answers to trivia questions
                      </h3>
                    </div>

                    {/* LETTERED Game */}
                    <div className="flex flex-col items-center space-y-2 w-full">
                      <button
                        onClick={() => handleGameSelect('lettered')}
                        className="relative overflow-hidden border-4 border-border shadow-lg hover:shadow-xl transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] w-full"
                        style={{
                          backgroundImage: 'url(/letter-button-logo.svg)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      >
                        <div className="py-8 flex items-center justify-center min-h-[100px]">
                          <h2 className="p-2 -m-2 text-4xl font-black tracking-wider text-white bg-black">
                            LETTERED
                          </h2>
                        </div>
                      </button>
                      <h3 className="mt-2 mb-2 text-xl font-bold text-center text-card-foreground">
                        Complete the phrase in pieces
                      </h3>
                    </div>

                    {/* Custom Game */}
                    <div className="flex flex-col items-center space-y-2 w-full">
                      <button
                        onClick={() => navigate('/custom')}
                        className="relative overflow-hidden border-4 border-border shadow-lg hover:shadow-xl transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] w-full"
                        style={{
                          background:
                            'linear-gradient(-45deg, #8b5cf6, #ec4899, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #6366f1, #a855f7, #d946ef)',
                          backgroundSize: '400% 400%',
                          animation: 'gradientShift 20s ease infinite',
                        }}
                      >
                        <div className="py-8 flex items-center justify-center min-h-[100px]">
                          <h2 className="p-2 -m-2 text-4xl font-black text-white bg-black rounded">
                            CUSTOM
                          </h2>
                        </div>
                      </button>
                      <h3 className="mt-2 mb-2 text-xl font-bold text-center text-card-foreground">
                        Create your own Podium games
                      </h3>
                    </div>

                    {/* Dev Game */}
                    {isDevelopment() && (
                      <div className="flex flex-col items-center space-y-2 w-full">
                        <button
                          onClick={() => handleGameSelect('dev')}
                          className="relative overflow-hidden border-4 border-border shadow-lg hover:shadow-xl transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] w-full"
                        >
                          <div className="py-8 flex items-center justify-center min-h-[100px]">
                            <h2 className="p-2 -m-2 text-4xl font-black tracking-wider text-white bg-black">
                              DEV MODE
                            </h2>
                          </div>
                        </button>
                        <h3 className="mt-2 mb-2 text-xl font-bold text-center text-card-foreground">
                          Complete the phrase in pieces
                        </h3>
                      </div>
                    )}
                  </div>

                  {/* Footer - Inside constrained container */}
                  <footer className="flex flex-wrap gap-2 justify-center mt-8 w-full">
                    {/* Theme Toggle */}
                    <ModeToggle />

                    {/* Leaderboard Button */}
                    <Button variant="outline" onClick={() => navigate('/leaderboard')}>
                      LEADERBOARD
                    </Button>

                    {/* Terms Button */}
                    <Button variant="outline" onClick={() => navigate('/terms')}>
                      TERMS
                    </Button>

                    {/* Privacy Policy Button */}
                    <Button variant="outline" onClick={() => navigate('/privacy')}>
                      PRIVACY
                    </Button>

                    {/* Dev Mode Button - only shows in development */}
                    {isDevelopment() && (
                      <Button variant="outline" onClick={handleDevModeClick}>
                        <Settings className="mr-2 w-4 h-4" />
                        DEV TOOLS
                      </Button>
                    )}
                  </footer>

                  {/* Toast notifications */}
                  <Toaster position="top-center" />
                </div>
              </div>
            </div>
          }
        />
      </Routes>
    </>
  );
};
