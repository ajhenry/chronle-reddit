import { useRedditUser } from './hooks/useRedditUser';
import { useState } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';

type GameType = 'top3' | 'game2' | 'game3' | null;

export const App = () => {
  const { user: redditUser, loading: userLoading, error: userError } = useRedditUser();
  const [selectedGame, setSelectedGame] = useState<GameType>(null);

  const games = [
    {
      id: 'top3' as const,
      name: 'TOP 3',
      description: 'Guess the top 3 answers to trivia questions',
      color: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700',
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-700',
      shadowColor: 'shadow-blue-700',
      textColor: 'text-blue-700',
      available: true,
    },
    {
      id: 'game2' as const,
      name: 'GAME 2',
      description: 'Epic new game mode coming soon!',
      color: 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700',
      bgColor: 'bg-purple-500',
      borderColor: 'border-purple-700',
      shadowColor: 'shadow-purple-700',
      textColor: 'text-purple-700',
      available: false,
    },
    {
      id: 'game3' as const,
      name: 'GAME 3',
      description: 'Another awesome game mode coming soon!',
      color: 'bg-green-500 hover:bg-green-600 active:bg-green-700',
      bgColor: 'bg-green-500',
      borderColor: 'border-green-700',
      shadowColor: 'shadow-green-700',
      textColor: 'text-green-700',
      available: false,
    },
  ];

  const handleGameSelect = (gameId: GameType) => {
    if (gameId === 'top3') {
      setSelectedGame(gameId);
    }
  };

  const handleBackToMenu = () => {
    setSelectedGame(null);
  };

  // If a game is selected, render the game component
  if (selectedGame === 'top3') {
    return <Top3Game onBack={handleBackToMenu} />;
  }

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-8 p-6 bg-yellow-300">
      {/* Snoodle Logo */}
      <div className="text-center">
        <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-6 mb-6 transform rotate-1">
          <img
            className="object-contain w-24 h-24 mx-auto mb-4 filter contrast-125"
            src="/snoo.png"
            alt="Snoo"
          />
        </div>
        <h1 className="text-6xl font-black text-black mb-2 transform -rotate-1 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)]">
          SNOODLE
        </h1>
        <p className="text-xl font-bold text-black bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] px-4 py-2 inline-block transform rotate-1">
          DAILY REDDIT GAMES
        </p>
      </div>

      {/* User Welcome */}
      <div className="w-full max-w-md bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1">
        <div className="text-center">
          <h2 className="text-2xl font-black text-black mb-2">
            {redditUser ? `HEY u/${redditUser.reddit_handle.toUpperCase()} 👋` : 'WELCOME!'}
          </h2>
          {redditUser && (
            <div className="bg-green-400 border-2 border-black px-3 py-1 inline-block font-bold text-black mb-2">
              ONLINE
            </div>
          )}
          <p className="font-bold text-black text-lg">CHOOSE A GAME TO PLAY!</p>
          <p className="font-semibold text-black text-sm mt-1">
            Each game can be played once per day!
          </p>
        </div>

        {userError && (
          <div className="mt-4 bg-red-400 border-4 border-red-800 p-4 font-bold text-red-800">
            ⚠️ {userError}
          </div>
        )}

        {!redditUser && !userLoading && (
          <div className="mt-4 bg-orange-400 border-4 border-orange-700 p-4 font-bold text-orange-800">
            🚨 Please log in to Reddit to play games!
          </div>
        )}

        {redditUser && (
          <div className="text-center text-sm font-semibold text-black mt-4 bg-gray-200 border-2 border-black p-2">
            Last seen: {new Date(redditUser.last_seen_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Game Selection */}
      <div className="grid grid-cols-1 gap-6 w-full max-w-md">
        {games.map((game, index) => (
          <div
            key={game.id}
            className={`${game.bgColor} border-4 ${game.borderColor} shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-6 transform ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'} transition-all hover:scale-105 hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]`}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="text-center">
                <h3 className="text-3xl font-black text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-2">
                  {game.name}
                </h3>
                <p className="text-white font-bold text-sm bg-black bg-opacity-20 border-2 border-white px-3 py-1 rounded">
                  {game.description}
                </p>
              </div>
              <button
                className={`w-full py-4 px-6 font-black text-xl text-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform transition-all ${
                  game.available && redditUser && !userLoading
                    ? `${game.color} hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px]`
                    : 'bg-gray-400 cursor-not-allowed opacity-60'
                }`}
                onClick={() => handleGameSelect(game.id)}
                disabled={userLoading || !redditUser || !game.available}
              >
                {game.available ? '🎮 PLAY NOW!' : '🔒 COMING SOON'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <footer className="flex gap-4 mt-8">
        {[
          {
            href: 'https://developers.reddit.com/docs',
            text: 'DOCS',
            color: 'bg-pink-400 border-pink-700',
          },
          {
            href: 'https://www.reddit.com/r/Devvit',
            text: 'r/DEVVIT',
            color: 'bg-cyan-400 border-cyan-700',
          },
          {
            href: 'https://discord.com/invite/R7yu2wh9Qz',
            text: 'DISCORD',
            color: 'bg-purple-400 border-purple-700',
          },
        ].map((link, index) => (
          <a
            key={link.text}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${link.color} border-4 px-4 py-2 font-black text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform transition-all hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'}`}
          >
            {link.text}
          </a>
        ))}
      </footer>
    </div>
  );
};

// Top 3 Game Component (placeholder for now)
const Top3Game = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-8 p-6 bg-blue-300">
      <div className="text-center">
        <h1 className="text-6xl font-black text-black mb-4 transform -rotate-1 drop-shadow-[6px_6px_0px_rgba(0,0,0,1)]">
          TOP 3
        </h1>
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform rotate-1">
          <p className="text-black font-bold text-xl">Game implementation coming soon...</p>
        </div>
      </div>

      <button
        onClick={onBack}
        className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] px-6 py-3 font-black text-black transform transition-all hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px]"
      >
        ← BACK TO MENU
      </button>
    </div>
  );
};
