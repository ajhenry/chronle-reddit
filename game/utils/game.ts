import { Attempt, Event } from '../../src/utils/schemas'

/**
 * Calculates the delay for an event's animation based on its order
 * @param order - The order of the event
 * @returns The delay in milliseconds
 */
export const getDelay = (order: number): string => {
  return `${order * 250}ms`
}

/**
 * Calculates the percentage of players who took more attempts than the current player
 * @param stats - Object containing attempt counts for each number of attempts
 * @param attemptNumber - The current player's number of attempts
 * @returns The percentage of players who took more attempts
 */
export const calculatePercentageBetterThan = (
  stats: { [key: string]: number },
  attemptNumber: number
): number => {
  // Need to make a copy of the stats object because we're mutating it
  const statsCopy = { ...stats }
  const totalPlayers = Object.values(statsCopy).reduce((sum, count) => sum + count, 0) - 1
  if (totalPlayers <= 0) return 0

  // Remove our own attempt number from the total
  statsCopy[attemptNumber.toString()] = statsCopy[attemptNumber.toString()] - 1

  const playersWithMoreAttempts = Object.entries(statsCopy)
    .filter(([attempt]) => parseInt(attempt) > attemptNumber)
    .reduce((sum, [_, count]) => sum + count, 0)

  return Math.round((playersWithMoreAttempts / totalPlayers) * 100)
}

/**
 * Props for the SortableEvent component
 */
export interface SortableEventProps {
  id: string
  event: Event
  order: number
  attemptNumber: number
  postGame: boolean
  correct: boolean
}

/**
 * Props for the DraggableArea component
 */
export interface DraggableAreaProps {
  timeline: {
    id: string
    description: string
    title: string
    solution: string[]
    events: Event[]
  }
  lastAttempt: Attempt | null
  attemptCount: number
  solved: boolean
  finished: boolean
}

/**
 * Props for the GameStats component
 */
export interface GameStatsProps {
  attemptNumber: number
  postGameStats: {
    totalPlayers: number
    allPlayerStats: { [key: string]: number }
  }
  isWinner: boolean
  correctCount: number
}
