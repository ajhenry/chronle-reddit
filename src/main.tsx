import { Devvit, useWebView } from '@devvit/public-api';
import { DEVVIT_SETTINGS_KEYS } from './constants.js';
import { BlocksToWebviewMessage, WebviewToBlockMessage } from '../game/shared.js';
import { Preview } from './components/Preview.js';
import { mockTimeline } from './mock/data.js';

Devvit.addSettings([
  {
    name: DEVVIT_SETTINGS_KEYS.DATABASE_URL,
    label: 'Database URL',
    type: 'string',
    isSecret: true,
    scope: 'app',
  },
]);

Devvit.configure({
  redditAPI: true,
  http: true,
  redis: true,
  realtime: true,
});

Devvit.addMenuItem({
  // Please update as you work on your idea!
  label: 'Make my experience post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      // Title of the post. You'll want to update!
      title: 'My first experience post',
      subredditName: subreddit.name,
      preview: <Preview />,
    });
    ui.showToast({ text: 'Created post!' });
    ui.navigateTo(post.url);
  },
});

const getServerDay = () => {
  const utc = new Date().toISOString().split('T')[0];
  return utc;
};

const getTimeline = async (day: string) => {
  console.log('URL', `${DEVVIT_SETTINGS_KEYS.API_URL}/api/reddit/timeline?day=${day}`);

  const response = await fetch(`${DEVVIT_SETTINGS_KEYS.API_URL}/api/reddit/timeline?day=${day}`);
  const data = await response.json();
  return data;
};

// Add a post type definition
Devvit.addCustomPostType({
  name: 'Experience Post',
  height: 'tall',
  render: (context) => {
    const { mount } = useWebView<WebviewToBlockMessage, BlocksToWebviewMessage>({
      onMessage: async (event, { postMessage }) => {
        console.log('Received message', event);
        const data = event as unknown as WebviewToBlockMessage;

        switch (data.type) {
          case 'INIT':
            console.log('INIT');
            postMessage({
              type: 'INIT_RESPONSE',
              payload: {
                postId: context.postId!,
              },
            });
            break;
          case 'START_GAME':
            console.log('START_GAME');

            // Fetch the timeline for the post
            const day = getServerDay();

            // Fetch the timeline for the post ID
            const timeline = mockTimeline;

            postMessage({
              type: 'GET_TIMELINE_RESPONSE',
              payload: {
                timeline,
              },
            });
            break;

          default:
            console.error('Unknown message type', data satisfies never);
            break;
        }
      },
    });

    return (
      <vstack height="100%" width="100%" alignment="center middle">
        <button
          onPress={() => {
            mount();
          }}
        >
          Launch
        </button>
      </vstack>
    );
  },
});

export default Devvit;
