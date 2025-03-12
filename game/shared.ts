import { Prisma } from '@prisma/client'

export interface Attempt {
  timelineId: string
  attempt: string[]
  userId: string
  correct: boolean[]
}

export type Timeline = Prisma.DayGetPayload<{
  include: {
    timeline: {
      include: {
        events: {
          include: {
            event: true
          }
        }
      }
    }
  }
}>

export type Page = 'home' | 'game' | 'how-to-play'

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
        timeline: Prisma.DayGetPayload<{
          include: {
            timeline: {
              include: {
                events: {
                  include: {
                    event: true
                  }
                }
              }
            }
          }
        }> | null
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
