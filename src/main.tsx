import { Devvit, useWebView } from '@devvit/public-api';
import { DEVVIT_SETTINGS_KEYS } from './constants.js';
import { BlocksToWebviewMessage, WebviewToBlockMessage } from '../game/shared.js';
import { Preview } from './components/Preview.js';
import { getPokemonByName } from './core/pokeapi.js';

Devvit.addSettings([
  // Just here as an example
  {
    name: DEVVIT_SETTINGS_KEYS.SECRET_API_KEY,
    label: 'API Key for secret things',
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
            postMessage({
              type: 'INIT_RESPONSE',
              payload: {
                postId: context.postId!,
              },
            });
            break;
          case 'GET_POKEMON_REQUEST':
            context.ui.showToast({ text: `Received message: ${JSON.stringify(data)}` });
            const pokemon = await getPokemonByName(data.payload.name);

            postMessage({
              type: 'GET_POKEMON_RESPONSE',
              payload: {
                name: pokemon.name,
                number: pokemon.id,
                // Note that we don't allow outside images on Reddit if
                // wanted to get the sprite. Please reach out to support
                // if you need this for your app!
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
