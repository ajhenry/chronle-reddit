import { Devvit, useState, useWebView } from '@devvit/public-api'
import { DEVVIT_SETTINGS_KEYS } from './constants.js'
import { BlocksToWebviewMessage, WebviewToBlockMessage } from '../game/shared.js'
import { Preview } from './components/Preview.js'
import { createRedisService } from './core/redis.js'
import { ChronleLogo } from './components/logo.js'
import { gameMessageHandler } from './core/game-message-handler.js'
import { fetchTimeline, getGameByPost, uploadImage } from './services/timeline.js'
import { formatDay, getDateFromPostName, getServerDay } from './utils/date.js'

Devvit.addSettings([
  {
    name: DEVVIT_SETTINGS_KEYS.API_URL,
    label: 'Database URL',
    type: 'string',
    isSecret: true,
    scope: 'app',
  },
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

    const timeline = await fetchTimeline(post.id)
    const key = getDateFromPostName(post.title)!
    // Save the images to reddit
    const images = timeline.day.timeline.events.map((event) => event.event.imageUrl)
    const imageAssets = await Promise.all(images.map((image) => uploadImage(image, context)))
    console.log(imageAssets)
    timeline.day.timeline.events.forEach((event, index) => {
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
    const redisService = createRedisService(context)
    const { reddit, ui } = context
    const subreddit = await reddit.getCurrentSubreddit()

    const user = await reddit.getCurrentUser()

    const title = user ? `Chronle — u/${user.username}` : `Chronle`

    const post = await reddit.submitPost({
      title,
      subredditName: subreddit.name,
      preview: <Preview />,
    })

    const timeline = await fetchTimeline(post.id)
    const key = post.id
    // Save the images to reddit
    const images = timeline.day.timeline.events.map((event) => event.event.imageUrl)
    const imageAssets = await Promise.all(images.map((image) => uploadImage(image, context)))
    timeline.day.timeline.events.forEach((event, index) => {
      event.event.imageUrl = imageAssets[index].mediaUrl
    })

    await redisService.saveTimeline(key, timeline)

    ui.showToast({ text: 'Created Chronle!' })
    ui.navigateTo(post.url)
  },
})

// Add a post type definition
Devvit.addCustomPostType({
  name: 'Daily Chronle',
  height: 'tall',
  render: (context) => {
    const redisService = createRedisService(context)

    const { mount } = useWebView<WebviewToBlockMessage, BlocksToWebviewMessage>({
      onMessage: async (event, { postMessage }) => {
        await gameMessageHandler(event, { context, postMessage })
      },
    })

    const [totalPlayers] = useState(async () => {
      // Fetch the game for the post ID
      const game = await getGameByPost(context.postId!, context)

      return await redisService.getTotalPlayers(game.day.timeline.id)
    })

    const clearAttempts = async () => {
      // Fetch the game for the post ID
      const game = await getGameByPost(context.postId!, context)
      redisService.clearAttempts(game.day.timeline.id, context.userId!)
    }

    const [formattedDay] = useState(async () => {
      const post = await context.reddit.getPostById(context.postId!)
      const date = getDateFromPostName(post.title)
      if (date && date !== '') {
        return formatDay(date)
      }
      return ''
    })

    return (
      <vstack
        height="100%"
        width="100%"
        alignment="center middle"
        darkBackgroundColor="#1A1918"
        backgroundColor="#FFF1E6"
        gap="large"
      >
        <ChronleLogo size={2.5} />
        <vstack gap="large" alignment="center middle">
          <vstack alignment="center middle" width="100%">
            <text size="large" weight="bold" darkColor="rgb(230, 230, 230)" lightColor="#1B1917">
              {formattedDay}
            </text>
            <text size="small" darkColor="rgb(230, 230, 230)" lightColor="#1B1917">
              {totalPlayers === 0
                ? 'No one has completed the game yet'
                : `${totalPlayers} ${totalPlayers === 1 ? 'person has' : 'people have'} completed the game`}
            </text>
          </vstack>
          <button
            onPress={() => {
              mount()
            }}
            appearance="primary"
          >
            Play Game
          </button>
        </vstack>
        <text size="small" darkColor="rgb(230, 230, 230)" lightColor="#1B1917">
          Made with ❤️ by u/ajhenrydev
        </text>
      </vstack>
    )
  },
})

export default Devvit
