import { Devvit, useState, useWebView } from '@devvit/public-api'
import { DEVVIT_SETTINGS_KEYS } from './constants.js'
import { BlocksToWebviewMessage, Timeline, WebviewToBlockMessage } from '../game/shared.js'
import { Preview } from './components/Preview.js'
import { mockTimeline } from './mock/data.js'
import { createRedisService } from './core/redis.js'

Devvit.addSettings([
  // {
  //   name: DEVVIT_SETTINGS_KEYS.DATABASE_URL,
  //   label: 'Database URL',
  //   type: 'string',
  //   isSecret: true,
  //   scope: 'app',
  // },
])

Devvit.configure({
  redditAPI: true,
  http: true,
  redis: true,
  realtime: true,
  media: true,
})

Devvit.addMenuItem({
  label: 'Add new daily Chronle',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const redisService = createRedisService(context)
    const { reddit, ui } = context
    const subreddit = await reddit.getCurrentSubreddit()
    const post = await reddit.submitPost({
      title: `Chronle — ${formatDay(getServerDay())}`,
      subredditName: subreddit.name,
      preview: <Preview />,
    })

    // const timeline = await getTimeline(getServerDay())
    const timeline = mockTimeline
    const key = getDateFromPostName(post.title)
    // Save the images to reddit
    const images = timeline.timeline.events.map((event) => event.event.imageUrl)
    const imageAssets = await Promise.all(images.map((image) => uploadImage(image, context)))
    timeline.timeline.events.forEach((event, index) => {
      event.event.imageUrl = imageAssets[index].mediaUrl
    })

    await redisService.saveTimeline(key, timeline)

    ui.showToast({ text: 'Created daily Chronle!' })
    ui.navigateTo(post.url)
  },
})

Devvit.addMenuItem({
  label: 'Add new random Chronle',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context
    const subreddit = await reddit.getCurrentSubreddit()

    const post = await reddit.submitPost({
      title: `Chronle — `,
      subredditName: subreddit.name,
      preview: <Preview />,
    })
    ui.showToast({ text: 'Created Chronle!' })
    ui.navigateTo(post.url)
  },
})

const uploadImage = async (image: string, context: Devvit.Context) => {
  const response = await context.media.upload({
    url: image,
    type: 'image',
  })
  return response
}

const getServerDay = () => {
  const utc = new Date().toISOString().split('T')[0]
  return utc
}

const formatDay = (day: string) => {
  const date = new Date(day)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const getDateFromPostName = (postName: string) => {
  console.log('postName', postName)
  const date = postName.split('—')[1]
  // Convert to UTC
  const utc = new Date(date).toISOString().split('T')[0]
  console.log('utc', utc)
  return utc
}

const fetchTimeline = async (day: string) => {
  console.log('URL', `${DEVVIT_SETTINGS_KEYS.API_URL}/api/reddit/timeline?day=${day}`)

  const response = await fetch(`${DEVVIT_SETTINGS_KEYS.API_URL}/api/reddit/timeline?day=${day}`)
  const data = await response.json()
  return data
}

const getTimeline = async (postId: string, context: Devvit.Context) => {
  const redisService = createRedisService(context)
  const post = await context.reddit.getPostById(postId)
  const postName = post.title
  const timeline = await redisService.getTimeline(getDateFromPostName(postName))

  // TODO: do something if the timeline is not found

  return timeline as Timeline
}

// Add a post type definition
Devvit.addCustomPostType({
  name: 'Daily Chronle',
  height: 'tall',
  render: (context) => {
    const redisService = createRedisService(context)

    const { mount } = useWebView<WebviewToBlockMessage, BlocksToWebviewMessage>({
      onMessage: async (event, { postMessage }) => {
        console.log('Received message', event)
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
            const timeline = await getTimeline(context.postId!, context)

            postMessage({
              type: 'GET_TIMELINE_RESPONSE',
              payload: {
                timeline,
              },
            })

            const { attempt, attemptCount } = await redisService.getLastAttempt(
              timeline.timeline.id,
              context.userId!
            )
            const solved = attempt?.correct?.every((c) => c)
            const finished = solved || attemptCount >= 6

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
            const timeline = await getTimeline(context.postId!, context)

            // Calculate solution correct
            const correct = payload.solution.map((eventId, index) => {
              return eventId === timeline.timeline.solution[index]
            })

            const { totalCount, attempt } = await redisService.saveAttempt(timeline.timeline.id, {
              timelineId: timeline.timeline.id,
              attempt: payload.solution,
              userId: context.userId!,
              correct,
            })

            const solved = correct.every((c) => c)
            const finished = solved || totalCount >= 6

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

            // Fetch the timeline for the post ID
            const timeline = await getTimeline(context.postId!, context)

            const allPlayerStats = await redisService.getAllPlayerStats(timeline.timeline.id)
            const totalPlayers = await redisService.getTotalPlayers(timeline.timeline.id)

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
      },
    })

    const [totalPlayers] = useState(async () => {
      // Fetch the timeline for the post ID
      const timeline = await getTimeline(context.postId!, context)

      return await redisService.getTotalPlayers(timeline.timeline.id)
    })

    const clearAttempts = async () => {
      // Fetch the timeline for the post ID
      const timeline = await getTimeline(context.postId!, context)
      redisService.clearAttempts(timeline.timeline.id, context.userId!)
    }

    const [formattedDay] = useState(async () => {
      const post = await context.reddit.getPostById(context.postId!)
      return formatDay(getDateFromPostName(post.title))
    })

    return (
      <vstack height="100%" width="100%" alignment="center middle">
        <image url="chronle-logo.png" imageWidth={200} imageHeight={100} />
        <text size="medium" weight="bold">
          {formattedDay}
        </text>
        <button
          onPress={() => {
            mount()
          }}
        >
          Launch Game
        </button>
        <button onPress={clearAttempts}>Clear Attempts</button>
        <text size="small">
          {`${totalPlayers}  ${totalPlayers === 1 ? 'person has' : 'people have'} played today`}
        </text>
      </vstack>
    )
  },
})

export default Devvit
