import { useState, useEffect } from 'react';
import { getGameThemes } from './lib/theme-utils';
import { TopPage } from './pages/top';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';

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

  const games = getGameThemes();

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
        <h1 className="text-4xl font-bold text-foreground mb-2">SNOODLE</h1>
        <Card className="px-4 py-2 inline-block">
          <p className="text-lg font-medium text-card-foreground">DAILY REDDIT GAMES</p>
        </Card>
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
        {games.map((game) => (
          <Card key={game.id} className="transition-all duration-200 hover:shadow-md">
            <CardContent className="flex flex-col items-center space-y-4 p-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-card-foreground mb-2">{game.name}</h3>
                <div className="bg-muted px-3 py-1 rounded">
                  <p className="text-card-foreground text-sm">{game.description}</p>
                </div>
              </div>
              <Button
                className="w-full"
                variant={!game.available ? 'secondary' : 'default'}
                onClick={() => handleGameSelect(game.id)}
                disabled={!game.available}
              >
                {game.available ? 'PLAY NOW!' : 'COMING SOON'}
              </Button>
            </CardContent>
          </Card>
        ))}
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
    </div>
  );
};
