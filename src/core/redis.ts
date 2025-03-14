import { Devvit, TriggerContext } from '@devvit/public-api'
import { Attempt, DayTimeline } from '../utils/schemas.js'

export type RedisService = ReturnType<typeof createRedisService>

export function createRedisService(context: Devvit.Context | TriggerContext) {
  const { redis, realtime } = context
  return {
    // Timeline
    saveTimeline: async (key: string, timeline: DayTimeline) => {
      await redis.set(`timeline_${key}`, JSON.stringify(timeline))
    },
    getTimeline: async (key: string) => {
      const timeline = await redis.get(`timeline_${key}`)
      return timeline ? JSON.parse(timeline) : null
    },
    // Attempt
    saveAttempt: async (timelineId: string, attempt: Attempt) => {
      // const currentAttempt = await redis.get(`attempt_${timelineId}_${attempt.userId}`)
      // const currentAttemptCount = await redis.get(`attempt_count_${timelineId}_${attempt.userId}`)
      // console.log('currentAttempt', currentAttempt)
      // console.log('currentAttemptCount', currentAttemptCount)

      // const previouslySolved = JSON.parse(currentAttempt ?? '{}')?.correct.every((c: boolean) => c)
      // const finished = previouslySolved || Number(currentAttemptCount ?? 0) >= 6

      // // If the game is finished, return the attempt count and attempt
      // if (finished) {
      //   return {
      //     totalCount: Number(currentAttemptCount ?? 0),
      //     attempt,
      //   }
      // }

      // Set the last attempt for the timeline and user
      await redis.set(`attempt_${timelineId}_${attempt.userId}`, JSON.stringify(attempt))

      // Set the attempt count for the timeline and user
      const totalCount = await redis.incrBy(`attempt_count_${timelineId}_${attempt.userId}`, 1)
      console.log('Saved attempt', attempt, timelineId)

      // Update the total attempts for the timeline
      await redis.incrBy(`attempt_count_${timelineId}`, 1)

      const solved = attempt.correct.every((c: boolean) => c)

      // If the game is finished, add the user to the leaderboard
      if (totalCount > 6 || solved) {
        await redis.zAdd(`all_player_stats_${timelineId}`, {
          score: totalCount,
          member: attempt.userId,
        })
      }

      return {
        totalCount,
        attempt,
      }
    },
    getLastAttempt: async (
      timelineId: string,
      userId: string
    ): Promise<{
      attempt: Attempt | null
      attemptCount: number
    }> => {
      const attempt = await redis.get(`attempt_${timelineId}_${userId}`)
      const attemptCount = await redis.get(`attempt_count_${timelineId}_${userId}`)
      return {
        attempt: attempt ? JSON.parse(attempt) : null,
        attemptCount: attemptCount ? Number(attemptCount) : 0,
      }
    },
    clearAttempts: async (timelineId: string, userId: string) => {
      await redis.del(`attempt_${timelineId}_${userId}`)
      await redis.del(`attempt_count_${timelineId}_${userId}`)
      await redis.del(`attempt_count_${timelineId}`)
    },
    getTotalAttempts: async (timelineId: string) => {
      const totalCount = await redis.get(`attempt_count_${timelineId}`)
      return totalCount ? Number(totalCount) : 0
    },
    getAllPlayerStats: async (timelineId: string) => {
      const allPlayerStats = await redis.zRange(`all_player_stats_${timelineId}`, 0, -1)
      console.log('allPlayerStats', allPlayerStats)
      return allPlayerStats.reduce(
        (acc, { score }) => {
          acc[score] = acc[score] ? acc[score] + 1 : 1
          return acc
        },
        {} as Record<string, number>
      )
    },
    getTotalPlayers: async (timelineId: string) => {
      const totalPlayers = await redis.zRange(`all_player_stats_${timelineId}`, 0, -1)
      return totalPlayers.length
    },
  }
}
