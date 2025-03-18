import { Devvit } from '@devvit/public-api'
import { BlocksToWebviewMessage, WebviewToBlockMessage } from '../../game/shared.js'
import { getGameByPost } from '../services/timeline.js'
import { createRedisService } from './redis.js'

interface GameMessageHandlerProps {
  context: Devvit.Context
  postMessage: (message: BlocksToWebviewMessage) => void
}

/**
 * Handles game-related messages from the webview
 * @param {GameMessageHandlerProps} props - Component props
 */
export const gameMessageHandler = async (
  event: WebviewToBlockMessage,
  { context, postMessage }: GameMessageHandlerProps
) => {
  const redisService = createRedisService(context)
  const data = event as unknown as WebviewToBlockMessage

  // debug :)
  // redisService.clearAttempts(context.postId!, context.userId!)

  switch (data.type) {
    case 'INIT': {
      console.log('INIT')
      postMessage({
        type: 'INIT_RESPONSE',
        payload: {
          postId: context.postId!,
        },
      })
      break
    }

    case 'START_GAME': {
      console.log('START_GAME')
      // Fetch the timeline for the post ID
      const game = await getGameByPost(context.postId!, context)

      postMessage({
        type: 'GET_TIMELINE_RESPONSE',
        payload: {
          game,
        },
      })

      const { attempt, attemptCount } = await redisService.getLastAttempt(
        game.day.timeline.id,
        context.userId!
      )
      const solved = attempt?.correct?.every((c) => c)
      const finished = solved || attemptCount > 6

      postMessage({
        type: 'GET_LAST_ATTEMPT_RESPONSE',
        payload: {
          lastAttempt: attempt,
          correct: attempt?.correct ?? [],
          attemptCount,
          solved: solved ?? false,
          finished: finished ?? false,
        },
      })
      break
    }

    case 'SUBMIT_SOLUTION': {
      console.log('SUBMIT_SOLUTION')
      const payload = data?.payload

      // Fetch the timeline for the post ID
      const game = await getGameByPost(context.postId!, context)

      // Calculate solution correct
      const correct = payload.solution.map((eventId, index) => {
        return eventId === game.day.timeline.solution[index]
      })

      const { totalCount, attempt } = await redisService.saveAttempt(game.day.timeline.id, {
        timelineId: game.day.timeline.id,
        attempt: payload.solution,
        userId: context.userId!,
        correct,
      })

      const solved = correct.every((c) => c)
      const finished = solved || totalCount > 6

      postMessage({
        type: 'SUBMIT_SOLUTION_RESPONSE',
        payload: {
          lastAttempt: attempt,
          correct,
          attemptCount: totalCount,
          solved,
          finished,
        },
      })
      break
    }

    case 'POST_GAME': {
      console.log('POST_GAME')

      // Fetch the game for the post ID
      const game = await getGameByPost(context.postId!, context)

      const allPlayerStats = await redisService.getAllPlayerStats(game.day.timeline.id)
      const totalPlayers = await redisService.getTotalPlayers(game.day.timeline.id)

      postMessage({
        type: 'POST_GAME_RESPONSE',
        payload: { allPlayerStats, totalPlayers },
      })
      break
    }

    default:
      console.error('Unknown message type', data satisfies never)
      break
  }
}
