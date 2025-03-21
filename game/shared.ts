import { Attempt, DayTimeline } from '../src/utils/schemas'

export type Page = 'home' | 'game' | 'how-to-play' | 'about'

export type WebviewToBlockMessage =
  | { type: 'INIT' }
  | { type: 'START_GAME' }
  | { type: 'SUBMIT_SOLUTION'; payload: { solution: string[] } }
  | { type: 'POST_GAME' }

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

export type DevvitMessage = {
  type: 'devvit-message'
  data: { message: BlocksToWebviewMessage }
}
