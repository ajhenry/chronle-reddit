import { useState, useEffect } from 'react';
import { TopPage } from './pages/top';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { BouncingLogo } from './components/BouncingLogo';
import { Leaderboard } from './components/Leaderboard';
import { SeasonInfo } from './components/SeasonInfo';
import { Toaster } from 'sonner';
import { X } from 'lucide-react';

export const App = () => {
  const [currentRoute, setCurrentRoute] = useState<string>(window.location.pathname);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
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
    if (welcomeDismissed === 'true') {
      setShowWelcome(false);
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

  // Handle routing
  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentRoute(window.location.pathname);
    };

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handleRouteChange);

    // Handle initial route
    setCurrentRoute(window.location.pathname);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const handleGameSelect = (gameId: string) => {
    if (gameId === 'topx') {
      window.history.pushState(null, '', '/top');
      setCurrentRoute('/top');
    }
  };

  const handleBackToMenu = () => {
    window.history.pushState(null, '', '/');
    setCurrentRoute('/');
  };

  const handleLeaderboardClick = () => {
    window.history.pushState(null, '', '/leaderboard');
    setCurrentRoute('/leaderboard');
  };

  const handleBackFromLeaderboard = () => {
    window.history.pushState(null, '', '/');
    setCurrentRoute('/');
  };

  // Route handling
  if (currentRoute === '/top') {
    return <TopPage onBack={handleBackToMenu} />;
  }

  if (currentRoute === '/leaderboard') {
    return (
      <div className="min-h-screen bg-background p-4">
        {currentSeasonId && (
          <Leaderboard seasonId={currentSeasonId} onClose={handleBackFromLeaderboard} />
        )}
      </div>
    );
  }

  return (
    <div className="flex relative flex-col min-h-screen bg-background">
      {/* Bouncing Logo */}
      <div className="flex justify-center">
        <BouncingLogo src="/top-x-logo.png" alt="Top X Logo" />
      </div>

      {/* Content Container */}
      <div className="flex flex-col justify-center items-center flex-1 gap-8 my-6 mx-4">
        {/* Season Info */}
        <div className="w-full max-w-md">
          <SeasonInfo onLeaderboardClick={handleLeaderboardClick} />
        </div>
        {/* Snoodle Logo */}
        <div className="text-center w-full -mt-24">
          <div className="text-center space-y-4">
            <div>
              <div className="bg-primary py-4 border-4 border-border animate-bounce-shadow">
                <h1 className="text-6xl font-black text-black tracking-tight leading-none">
                  SNOODLE
                </h1>
              </div>
            </div>
            <div>
              <Card className="py-3 bg-card border-4 border-border">
                <p className="text-xl font-bold text-card-foreground tracking-wide">
                  THE DAILY REDDIT GAMES
                </p>
              </Card>
            </div>
          </div>
        </div>

        {/* User Welcome */}
        {showWelcome && (
          <Card className="w-full max-w-md relative">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-center flex-1">WELCOME!</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissWelcome}
                  className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                  aria-label="Dismiss welcome message"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="font-medium text-card-foreground text-lg">CHOOSE A GAME TO PLAY!</p>
                <p className="text-card-foreground text-sm mt-1">
                  Each game can be played once per day!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game Selection */}
        <div className="grid grid-cols-1 gap-6 w-full max-w-md">
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
                <h2 className="text-4xl font-black text-white tracking-wider drop-shadow-lg">
                  TOP X
                </h2>
              </div>
            </button>
            <h3 className="text-xl font-bold text-card-foreground mb-2 text-center mt-2">
              A game where you guess the top answers to trivia questions
            </h3>
          </div>
        </div>

        <footer className="flex gap-4 mt-8">
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
        </footer>

        {/* Toast notifications */}
        <Toaster position="top-center" />
      </div>
    </div>
  );
};
