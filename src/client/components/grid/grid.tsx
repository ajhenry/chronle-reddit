import { useGame } from './hooks/useGame';
import PlayingGrid from './components/PlayingGrid';
import { AnimatedEndlessRunner } from './utils/svg';
import { useTheme } from './hooks/useTheme';

function Grid() {
  // Initialize theme
  useTheme();

  const { game, gameState, updateGameState, handleTileClick, loading } = useGame(6);
  console.log(game, gameState);

  if (game === null || gameState === null || loading) {
    return (
      <div className="flex flex-col justify-center items-center p-4 w-screen h-screen bg-gray-300 dark:bg-gray-900">
        {/* Spinner */}
        <AnimatedEndlessRunner className="p-4 w-full max-w-md text-white bg-gray-300 rounded-lg fill-gray-400/50 dark:fill-gray-600 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center px-8 py-4 w-screen h-screen bg-gray-300 dark:bg-gray-900">
      {/* Playing grid */}
      <div className="w-full max-w-[60vh] flex flex-col justify-center">
        <PlayingGrid
          game={game}
          gameState={gameState}
          updateGameState={updateGameState}
          handleTileClick={handleTileClick}
        />
      </div>
    </div>
  );
}

export default Grid;
