import React from 'react';
import { Checkbox } from './ui/checkbox';

export interface LeaderboardEntry {
  username: string;
  timeElapsed: number;
  moves: number;
  score?: number;
  rank?: number;
  isAnonymous?: boolean;
  displayName?: string;
}

export interface GameLeaderboardProps {
  entries: LeaderboardEntry[];
  loading?: boolean;
  playerRank?: number;
  totalPlayers?: number;
  userEntry?: LeaderboardEntry;
  currentUsername?: string;
  showTitle?: boolean;
  // Props for anonymous toggle
  gameId?: string;
  isCurrentUserAnonymous?: boolean;
  onToggleAnonymous?: (isAnonymous: boolean) => void;
  isTogglingAnonymous?: boolean;
  showAnonymousToggle?: boolean;
}

// Format milliseconds to MM:SS or HH:MM:SS
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Leaderboard row component
const LeaderboardRow: React.FC<{
  rank: number;
  username: string;
  time: string;
  moves: number;
  isCurrentUser?: boolean;
  variant?: 'gold' | 'white';
}> = ({ rank, username, time, moves, isCurrentUser = false, variant = 'gold' }) => {
  const isWhite = variant === 'white';

  return (
    <div
      className={`flex items-center py-3 px-3 sm:px-4 rounded-lg ${
        isWhite
          ? 'bg-white text-black border border-gray-200'
          : isCurrentUser
            ? 'bg-[#F7C846] text-black'
            : 'bg-[#F7C846]/90 text-black'
      }`}
    >
      <span
        className={`w-8 sm:w-10 text-base sm:text-lg font-black flex-shrink-0 ${isWhite ? 'text-gray-600' : 'text-black/70'}`}
      >
        {rank}.
      </span>
      <div className="flex-1 mr-2 min-w-0 sm:mr-3">
        <span className="block font-bold truncate">{username}</span>
      </div>
      <div className="flex flex-col flex-shrink-0 items-end sm:flex-row sm:gap-1 sm:items-baseline">
        <span className={`text-lg sm:text-xl font-black ${isWhite ? 'text-black' : ''}`}>
          {time}
        </span>
        <span
          className={`text-[10px] sm:text-xs font-bold ${isWhite ? 'text-gray-500' : 'text-black/60'}`}
        >
          ({moves} moves)
        </span>
      </div>
    </div>
  );
};

export const GameLeaderboard: React.FC<GameLeaderboardProps> = ({
  entries,
  loading = false,
  playerRank,
  totalPlayers,
  userEntry,
  currentUsername,
  showTitle = true,
  gameId: _gameId,
  isCurrentUserAnonymous = false,
  onToggleAnonymous,
  isTogglingAnonymous = false,
  showAnonymousToggle = false,
}) => {
  // Determine if user is in the displayed entries (top 5)
  const userInTop5 = playerRank !== undefined && playerRank <= 5;

  // Should we show the user entry at the bottom?
  const showUserAtBottom = !userInTop5 && userEntry && playerRank && playerRank > 5;

  // Helper to check if this entry is the current user
  const isCurrentUser = (entry: LeaderboardEntry, index: number): boolean => {
    if (currentUsername && entry.username === currentUsername) return true;
    if (playerRank && index === playerRank - 1) return true;
    return false;
  };

  const handleAnonymousToggle = (checked: boolean | 'indeterminate') => {
    if (onToggleAnonymous && !isTogglingAnonymous && typeof checked === 'boolean') {
      onToggleAnonymous(checked);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading leaderboard...</div>;
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">Be the first on the leaderboard!</div>
    );
  }

  // Helper to get display username with "(You)" suffix for anonymous current user
  const getDisplayUsername = (entry: LeaderboardEntry, isUserEntry: boolean): string => {
    if (isUserEntry && entry.isAnonymous) {
      return `${entry.username} (You)`;
    }
    return entry.username;
  };

  return (
    <div className="space-y-2">
      {/* Top 5 entries */}
      {entries.slice(0, 5).map((entry, index) => {
        const isUser = isCurrentUser(entry, index);
        return (
          <LeaderboardRow
            key={`${entry.username}-${entry.timeElapsed}-${entry.moves}`}
            rank={index + 1}
            username={getDisplayUsername(entry, isUser)}
            time={formatTime(entry.timeElapsed)}
            moves={entry.moves}
            isCurrentUser={isUser}
          />
        );
      })}

      {/* Separator and user entry if outside top 5 */}
      {showUserAtBottom && (
        <LeaderboardRow
          rank={playerRank}
          username={getDisplayUsername(userEntry, true)}
          time={formatTime(userEntry.timeElapsed)}
          moves={userEntry.moves}
          isCurrentUser={true}
          variant="white"
        />
      )}

      {/* Total players count */}
      {totalPlayers && totalPlayers > 0 && (
        <div className="pt-2 text-sm font-medium text-center text-muted-foreground">
          {totalPlayers} player{totalPlayers === 1 ? '' : 's'} total
        </div>
      )}

      {/* Hide my username toggle */}
      {showAnonymousToggle && onToggleAnonymous && (
        <div className="pt-3 border-t border-border">
          <label className="flex gap-3 items-center cursor-pointer select-none">
            <Checkbox
              id="hide-username"
              checked={isCurrentUserAnonymous}
              onCheckedChange={handleAnonymousToggle}
              disabled={isTogglingAnonymous}
            />
            <span className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {isTogglingAnonymous ? 'Updating...' : 'Hide my username'}
            </span>
          </label>
          {isCurrentUserAnonymous && userEntry?.displayName && (
            <p className="mt-1 ml-8 text-xs text-muted-foreground">
              Shown as: {userEntry.displayName}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
