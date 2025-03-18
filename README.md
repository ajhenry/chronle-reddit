# Chronle for Reddit

A Reddit app built with Devvit that provides an interactive timeline visualization experience. This project is based on the [Devvit Webview React Template](https://github.com/devvit-io/devvit-webview-react).

## Demo

![Demo](./resources/demo.mov)

## Tech Stack

- [Devvit](https://developers.reddit.com/docs/): Reddit's Developer Platform that lets you build powerful apps and experiences to enhance the communities you love.
- [Vite](https://vite.dev/): Advanced build tool for the web
- [React](https://react.dev/): UI Library for the web
- [TailwindCSS](https://tailwindcss.com/): Utility first CSS framework

## Getting Started

> Make sure you have Node 22 downloaded on your machine before running!

```sh
git clone https://github.com/ajhenry/chronle-reddit.git
cd chronle-reddit
npm install
```

Before continuing, make sure you have a subreddit on Reddit.com where you'll be developing. Go to Reddit.com, scroll the left side bar down to communities, and click "Create a community."

Next, go to the `package.json` and update the `dev:devvit` command with your subreddit name.

Finally go to `devvit.yaml` and name your app. It has to be 0-16 characters. Once you have, click save, and run `npm run upload` from the root of the repository.

Now all you have to do is run `npm run dev` and navigate to the subreddit.

There is one last gotcha! You need to make a new post before you can see it. You can do so by going to your subreddit, clicking the three dots, and tapping "Add a daily Chronle".

## Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run upload`: Uploads a new version of your app
- `npm run vite`: Useful to run just the React app on your machine if you need to style things quickly.

## Project Structure

The application is built using a webview architecture, where the main Devvit app launches a React application that runs in a webview.

### Main App Structure

- `main.tsx`: The main entry point of the application, containing the launch button for the webview
- `Preview.tsx`: Loading state component until the game launches
- `core/`: Contains API functions and core business logic
- `utils/`: Helper functions for API calls and other utilities
- `constants.ts`: Environment configuration for Devvit
- `assets/`: Static assets and resources
- `services/`: Services for the API/redis

### Webview Application

The webview application is a full-featured React application with the following structure:

- `main.tsx`: Entry point that initializes the webview and sends ready message to Devvit
- `/pages`: Pages for the webview
- `/components`: Reusable UI components
- `/hooks`: Custom React hooks for shared logic
- `/types`: TypeScript type definitions
- `/utils`: Utility functions and helpers
- `/lib`: Third party libraries

## Features

- Consistent styling with TailwindCSS
- Smooth animations with Framer Motion
- Drag and drop functionality with dnd-kit
- Theme support with next-themes
- Toast notifications with Sonner

## Development

The project uses a modern development setup with:

- TypeScript for type safety
- Vite for fast development and building
- TailwindCSS for styling
- Concurrent development servers for both Devvit and the webview app
- Hot module replacement for rapid development

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the BSD-3-Clause License - see the LICENSE file for details.
