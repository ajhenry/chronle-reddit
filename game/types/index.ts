import { Attempt, DayTimeline } from '../../src/utils/schemas'

/**
 * Available pages in the game
 */
export type Page = 'home' | 'game' | 'how-to-play' | 'about'

/**
 * Messages sent from the webview to the Devvit block
 */
export type WebviewToBlockMessage =
  | { type: 'INIT' }
  | { type: 'START_GAME' }
  | { type: 'SUBMIT_SOLUTION'; payload: { solution: string[] } }
  | { type: 'POST_GAME' }

/**
 * Messages sent from the Devvit block to the webview
 */
export type BlocksToWebviewMessage =
  | {
      type: 'INIT_RESPONSE'
      payload: {
        postId: string
      }
    }
  | {
      type: 'GET_TIMELINE_RESPONSE'
      payload: {
        game: DayTimeline
      }
    }
  | {
      type: 'GET_LAST_ATTEMPT_RESPONSE'
      payload: {
        lastAttempt: Attempt | null
        correct: boolean[]
        attemptCount: number
        solved: boolean
        finished: boolean
      }
    }
  | {
      type: 'SUBMIT_SOLUTION_RESPONSE'
      payload: {
        lastAttempt: Attempt
        correct: boolean[]
        attemptCount: number
        solved: boolean
        finished: boolean
      }
    }
  | {
      type: 'GET_TOTAL_ATTEMPTS_RESPONSE'
      payload: {
        totalAttempts: number
      }
    }
  | {
      type: 'POST_GAME_RESPONSE'
      payload: {
        allPlayerStats: {
          [key: string]: number
        }
        totalPlayers: number
      }
    }

/**
 * Message wrapper for Devvit communication
 */
export type DevvitMessage = {
  type: 'devvit-message'
  data: { message: BlocksToWebviewMessage }
}

/**
 * Type guard to check if a message is a Devvit message
 */
export const isDevvitMessage = (message: unknown): message is DevvitMessage => {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === 'devvit-message' &&
    'data' in message &&
    typeof message.data === 'object' &&
    message.data !== null &&
    'message' in message.data
  )
}
