import { GameStatsProps, calculatePercentageBetterThan } from '../utils/game'
import pluralize from 'pluralize'

/**
 * Displays game statistics and player performance
 */
export const GameStats = ({
  attemptNumber,
  postGameStats,
  isWinner,
  correctCount,
}: GameStatsProps) => {
  if (!isWinner) {
    return <span>You got {correctCount}/6 events in the right order.</span>
  }

  if (postGameStats.totalPlayers <= 1) {
    return <span>You're the first person to play today!</span>
  }

  const percentageBetter = calculatePercentageBetterThan(
    postGameStats.allPlayerStats,
    attemptNumber
  )

  if (postGameStats.totalPlayers >= 2 && percentageBetter > 0) {
    return (
      <span>
        You got this Chronle in {attemptNumber} {pluralize('try', attemptNumber)}. That's better
        than {percentageBetter}% of players.
      </span>
    )
  }

  return (
    <span>
      You got this Chronle in {attemptNumber} {pluralize('try', attemptNumber)}.
    </span>
  )
}
