import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { TopPage } from './pages/top';
import { DevPage } from './pages/dev';
import { LetteredPage } from './pages/lettered';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { BouncingLogo } from './components/BouncingLogo';
import { Leaderboard } from './components/Leaderboard';

import { Toaster } from 'sonner';
import { X, Settings } from 'lucide-react';
import { isDevelopment } from './lib/dev-utils';

export const App = () => {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [currentSeasonId, setCurrentSeasonId] = useState<string | null>(null);

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

  // Check if welcome was dismissed on mount
  useEffect(() => {
    const welcomeDismissed = getCookie('snoodle_welcome_dismissed');
    if (welcomeDismissed !== 'true') {
      setShowWelcome(true);
    }
  }, []);

  // Fetch current season ID
  useEffect(() => {
    const fetchCurrentSeason = async () => {
      try {
        const response = await fetch('/api/season/current');
        if (response.ok) {
          const data = await response.json();
          setCurrentSeasonId(data.season.id);
        }
      } catch (error) {
        console.error('Error fetching current season:', error);
      }
    };

    void fetchCurrentSeason();
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    setCookie('snoodle_welcome_dismissed', 'true', 365); // Expires in 1 year
  };

  const handleGameSelect = (gameId: string) => {
    if (gameId === 'topx') {
      navigate('/top');
    } else if (gameId === 'lettered') {
      navigate('/lettered');
    }
  };

  const handleBackToMenu = () => {
    navigate('/');
  };

  const handleBackFromLeaderboard = () => {
    navigate('/');
  };

  const handleDevModeClick = () => {
    navigate('/dev');
  };

  const handleBackFromDev = () => {
    navigate('/');
  };

  return (
    <Routes>
      <Route path="/top" element={<TopPage onBack={handleBackToMenu} />} />
      <Route path="/lettered" element={<LetteredPage onBack={handleBackToMenu} />} />
      <Route
        path="/leaderboard"
        element={
          <div className="p-4 min-h-screen bg-background">
            {currentSeasonId && (
              <Leaderboard seasonId={currentSeasonId} onClose={handleBackFromLeaderboard} />
            )}
          </div>
        }
      />
      <Route path="/dev" element={<DevPage onBack={handleBackFromDev} />} />
      <Route
        path="/"
        element={
          <div className="flex relative flex-col min-h-screen bg-background">
            {/* Main Container */}
            <div className="container px-4 py-6 mx-auto max-w-4xl">
              {/* Content Container with max-width constraint */}
              <div className="flex flex-col flex-1 gap-8 justify-center items-center mx-auto my-6 w-full max-w-md">
                {/* Bouncing Logo */}
                <div className="w-full">
                  <BouncingLogo src="/top-x-logo.png" alt="Top X Logo" />
                </div>

                {/* Snoodle Logo */}
                <div className="w-full text-center">
                  <div className="space-y-4 text-center">
                    <div className="relative animate-bounce-shadow">
                      {/* Season Banner */}
                      <div className="absolute -top-2 -left-2 z-10 px-3 py-1 text-white bg-black border-2 border-black transform -rotate-12">
                        <span className="text-sm font-bold tracking-wide">PRESEASON</span>
                      </div>
                      <div className="py-4 border-4 bg-primary border-border">
                        <h1 className="text-6xl font-black tracking-tight leading-none text-black">
                          SNOODLE
                        </h1>
                      </div>
                    </div>
                    <div>
                      <Card className="py-3 border-4 bg-card border-border">
                        <p className="text-xl font-bold tracking-wide text-card-foreground">
                          THE DAILY REDDIT GAMES
                        </p>
                      </Card>
                    </div>
                  </div>
                </div>

                {/* User Welcome */}
                {showWelcome && (
                  <Card className="relative w-full max-w-md">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex-1 text-center">WELCOME!</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={dismissWelcome}
                          className="p-0 w-8 h-8 rounded-full hover:bg-gray-100"
                          aria-label="Dismiss welcome message"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <p className="text-lg font-medium text-card-foreground">
                          CHOOSE A GAME TO PLAY!
                        </p>
                        <p className="mt-1 text-sm text-card-foreground">
                          Each game can be played once per day!
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Game Selection */}
                <div className="grid grid-cols-1 gap-6 w-full">
                  {/* TOP X Game */}
                  <div className="flex flex-col items-center space-y-2 w-full">
                    <button
                      onClick={() => handleGameSelect('topx')}
                      className="relative overflow-hidden border-4 border-border shadow-lg hover:shadow-xl transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] w-full"
                      style={{
                        backgroundImage: 'url(/top-x-button.png)',
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
                        backgroundImage: 'url(/lettered-button.png)',
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
                </div>

                {/* Footer - Inside constrained container */}
                <footer className="flex flex-wrap gap-2 justify-center mt-8 w-full">
                  {[
                    {
                      href: 'https://developers.reddit.com/docs',
                      text: 'DOCS',
                      variant: 'default' as const,
                    },
                    {
                      href: 'https://www.reddit.com/r/Devvit',
                      text: 'r/DEVVIT',
                      variant: 'secondary' as const,
                    },
                    {
                      href: 'https://discord.com/invite/R7yu2wh9Qz',
                      text: 'DISCORD',
                      variant: 'outline' as const,
                    },
                  ].map((link) => (
                    <Button key={link.text} variant="default" asChild>
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        {link.text}
                      </a>
                    </Button>
                  ))}

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
  );
};
