import { useState, useEffect } from 'react';
import { TopPage } from './pages/top';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Toaster } from 'sonner';

export const App = () => {
  const [currentRoute, setCurrentRoute] = useState<string>(window.location.pathname);

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

  // Route handling
  if (currentRoute === '/top') {
    return <TopPage onBack={handleBackToMenu} />;
  }

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-8 p-6 bg-background">
      {/* Snoodle Logo */}
      <div className="text-center">
        <Card className="p-6 mb-6 inline-block">
          <img
            className="object-contain w-24 h-24 mx-auto mb-4"
            src="/snoodle-logo.png"
            alt="Snoodle Logo"
          />
        </Card>
        <div className="text-center space-y-4">
          <div>
            <div className="bg-primary px-8 py-4 border-4 border-border animate-bounce-shadow">
              <h1 className="text-6xl font-black text-black tracking-tight leading-none">
                SNOODLE
              </h1>
            </div>
          </div>
          <div>
            <Card className="px-6 py-3 bg-card border-4 border-border shadow-lg">
              <p className="text-xl font-bold text-card-foreground tracking-wide">
                DAILY REDDIT CHALLENGES
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* User Welcome */}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">WELCOME!</CardTitle>
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

      {/* Game Selection */}
      <div className="grid grid-cols-1 gap-6 w-full max-w-md">
        {/* TOP X Game */}
        <div className="flex flex-col items-center space-y-2 w-full">
          <h3 className="text-xl font-bold text-card-foreground mb-2 text-center">
            A game where you guess the top answers to trivia questions
          </h3>
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
            <div className="bg-black/20 p-8 flex items-center justify-center min-h-[100px]">
              <h2 className="text-4xl font-black text-white tracking-wider drop-shadow-lg">
                TOP X
              </h2>
            </div>
          </button>
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
  );
};
