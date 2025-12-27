import React from 'react';

export interface LeaderboardEntry {
  username: string;
  timeElapsed: number;
  moves: number;
  score?: number;
  rank?: number;
}

export interface GameLeaderboardProps {
  entries: LeaderboardEntry[];
  loading?: boolean;
  playerRank?: number;
  totalPlayers?: number;
  userEntry?: LeaderboardEntry;
  currentUsername?: string;
  showTitle?: boolean;
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
}> = ({ rank, username, time, moves, isCurrentUser = false }) => {
  return (
    <div
      className={`flex items-center py-3 px-4 rounded-lg ${
        isCurrentUser ? 'bg-[#F7C846] text-black' : 'bg-[#F7C846]/90 text-black'
      }`}
    >
      <span className="w-10 text-lg font-black text-black/70">{rank}.</span>
      <div className="flex-1 min-w-0">
        <span className="font-bold truncate">{username}</span>
      </div>
      <div className="flex gap-1 items-baseline">
        <span className="text-xl font-black">{time}</span>
        <span className="text-xs font-bold text-black/60">({moves} moves)</span>
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

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading leaderboard...</div>;
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">Be the first on the leaderboard!</div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Top 5 entries */}
      {entries.slice(0, 5).map((entry, index) => (
        <LeaderboardRow
          key={`${entry.username}-${entry.timeElapsed}-${entry.moves}`}
          rank={index + 1}
          username={entry.username}
          time={formatTime(entry.timeElapsed)}
          moves={entry.moves}
          isCurrentUser={isCurrentUser(entry, index)}
        />
      ))}

      {/* Separator and user entry if outside top 5 */}
      {showUserAtBottom && (
        <>
          <div className="flex justify-center items-center py-1 text-muted-foreground">
            <span className="text-lg font-bold tracking-widest">...</span>
          </div>
          <LeaderboardRow
            rank={playerRank}
            username={userEntry.username}
            time={formatTime(userEntry.timeElapsed)}
            moves={userEntry.moves}
            isCurrentUser={true}
          />
        </>
      )}

      {/* Total players count */}
      {totalPlayers && totalPlayers > 0 && (
        <div className="pt-2 text-sm font-medium text-center text-muted-foreground">
          {totalPlayers} player{totalPlayers === 1 ? '' : 's'} total
        </div>
      )}
    </div>
  );
};
