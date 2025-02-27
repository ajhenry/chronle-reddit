## Devvit Webview React

A template repository for writing webview apps with Devvit.

https://github.com/user-attachments/assets/5bf4d6ec-5ff1-49ce-8c50-f46e7fbac781

### Tech

- [Devvit](https://developers.reddit.com/docs/): Reddit’s Developer Platform that lets you build powerful apps and experiences to enhance the communities you love.
- [Vite](https://vite.dev/): Advanced build tool for the web
- [React](https://react.dev/): UI Library for the web
- [TailwindCSS](https://tailwindcss.com/): Utility first CSS framework
- [Typescript](https://www.typescriptlang.org/): Strongly typed Javascript superset
- [Motion](https://motion.dev/): Animation Library

## Getting started

> Make sure you have Node 22 downloaded on your machine before running!

```sh
git clone ....

cd ...

npm install
```

Before continuing, make a subreddit on Reddit.com. This will be where you do your own development. Go to Reddit.com, scroll the left side bar down to communities, and click "Create a community."

Next, go to the `package.json` and update see the `dev:devvit` command. Update the command to have you subreddit name.

Finally go to `devvit.yaml` and name your app. It has to be 0-16 characters. Once you have, click save, and run `npm run upload` from the root of the repository.

Now all you have to do is run `npm run dev` and navigate to the subreddit.

There is one last gotcha! You need to make a new post before you can see it. You can do so by going to your subreddit, clicking the three dots, and tapping "Make my experience post". After you start developing your all please update the menu item copy (found in `src/main.tsx`).

## Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run upload`: Uploads a new version of your app
- `npm run vite`: Useful to run just the React app on your machine if you need to style things quickly.

## Flow of the app

`main.tsx` is the main entry point of the application, it will have a launch button that actually launches the webview (stuff in `game/`).

In our case we are using webviews so we basically have a totally different application which then outputs to an `index.html` file which is rendered in the webview.

- `Preview.tsx`: It is the loading state till game launches
- `core/` : Contains api functions
- `utils/`: Has functions to call APIs and other utilities
- `constants.ts`: It is the env file for devvit
- `assets/`: Public folder for static assets

### Inside Actual Game

Entry point is `main.tsx`, which renders App like Vite does, INIT_RESPONSE is called from within an useEffect to send a ready message to the Devvit app.

- `HomePage.tsx` shows an example of routing and navigation with the `useSetPage` hook.
- `PokemonPage.tsx` shows an example of how to send network requests over postMessage.
- `/components` for reusable components
