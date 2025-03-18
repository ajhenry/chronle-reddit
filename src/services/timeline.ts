import { Devvit } from '@devvit/public-api'
import { DEVVIT_SETTINGS_KEYS } from '../constants.js'
import { DayTimeline } from '../utils/schemas.js'
import { createRedisService } from '../core/redis.js'
import { getDateFromPostName } from '../utils/date.js'

/**
 * Fetches a timeline from the API
 * @param {string} timelineId - The ID of the timeline to fetch
 * @returns {Promise<DayTimeline>} The timeline data
 * @throws {Error} If the timeline cannot be fetched
 */
export const fetchTimeline = async (timelineId: string): Promise<DayTimeline> => {
  try {
    const response = await fetch(
      `${DEVVIT_SETTINGS_KEYS.API_URL}/api/reddit/timeline?timelineId=${timelineId}`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch timeline: ${response.statusText}`)
    }

    const data = await response.json()
    return data as DayTimeline
  } catch (error) {
    console.error('Error fetching timeline:', error)
    throw new Error('Failed to fetch timeline from API')
  }
}

/**
 * Gets a game by post ID, checking Redis first
 * @param {string} postId - The Reddit post ID
 * @param {Devvit.Context} context - The Devvit context
 * @returns {Promise<DayTimeline>} The timeline data
 */
export const getGameByPost = async (postId: string, context: Devvit.Context) => {
  const redisService = createRedisService(context)
  const post = await context.reddit.getPostById(postId)
  const postName = post.title

  // First check the post id in redis, if it exists, return the timeline
  let timeline = await redisService.getTimeline(postId)
  if (timeline) {
    return timeline
  }

  timeline = await redisService.getTimeline(getDateFromPostName(postName)!)

  // TODO: do something if the timeline is not found

  return timeline as DayTimeline
}

/**
 * Uploads an image to Reddit
 * @param {string} image - The image URL to upload
 * @param {Devvit.Context} context - The Devvit context
 * @returns {Promise<{mediaUrl: string}>} The uploaded image data
 * @throws {Error} If the image upload fails
 */
export const uploadImage = async (image: string, context: Devvit.Context) => {
  try {
    const response = await context.media.upload({
      url: image,
      type: 'image',
    })
    return response
  } catch (error) {
    console.error('Error uploading image:', error)
    throw new Error('Failed to upload image to Reddit')
  }
}
