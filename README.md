# Lettered - The Phrase-Fitting Puzzle Game

A daily word puzzle game built on Reddit's developer platform where players arrange letter pieces to complete phrases.

## How It Works

1. **Daily Puzzles**: Each day, a new phrase puzzle is generated for all players
2. **Arrange Letters**: Players drag and drop letter pieces into a grid to spell out the hidden phrase
3. **Race Against Time**: Complete the puzzle as quickly as possible with the fewest moves
4. **Compete**: Track your performance on the leaderboard and build your streak

## Tech Stack

- [Devvit](https://developers.reddit.com/): Reddit's developer platform for building interactive experiences
- [Vite](https://vite.dev/): Build tool for the webview
- [React](https://react.dev/): UI framework
- [Express](https://expressjs.com/): Backend server logic
- [Tailwind](https://tailwindcss.com/): Styling
- [TypeScript](https://www.typescriptlang.org/): Type safety
- [shadcn/ui](https://ui.shadcn.com/): Pre-built components

## Getting Started

> Make sure you have Node 22 installed before running!

1. Run `npm create devvit@latest --template=react`
2. Go through the installation wizard and connect your Reddit account
3. Copy the command on the success page into your terminal

## Redis Setup

This project uses Redis for game state and session management. In production, it uses Devvit's built-in Redis.

### Quick Start with Docker (Recommended)

```bash
# Start Redis in the background
npm run redis:start

# View Redis logs
npm run redis:logs

# Stop Redis
npm run redis:stop
```

This starts a Redis 7 instance on port 6379 with persistent storage.

### Alternative: Install Redis Locally

**macOS:**

```bash
brew install redis
redis-server
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
```

### Custom Redis Configuration

```bash
# Set custom Redis URL
export REDIS_URL=redis://localhost:6379

# Or with authentication
export REDIS_URL=redis://username:password@your-redis-host:6379
```

### Production

In production (when deployed to Reddit), the application automatically uses Devvit's built-in Redis service.

## shadcn/ui Components

Pre-installed components are located in `src/client/components/ui/`:

- **Button** - Customizable button with variants
- **Card** - Card container with header, content, and footer
- **Badge** - Status indicators and labels
- **Input** - Form input field
- **Alert** - Notification messages

### Adding New Components

```bash
npx shadcn@latest add [component-name]
```

## Theme Customization

Theme colors are defined in `src/client/globals.css` using CSS variables. The app supports both light and dark modes.

## Commands

### Development

- `npm run dev`: Starts development server with live reload on Reddit
- `npm run local`: Runs locally with Express server (requires Redis)
- `npm run build`: Builds client and server projects
- `npm run check`: Type checks, lints, and formats code

### Redis Management

- `npm run redis:start`: Starts Redis using Docker Compose
- `npm run redis:stop`: Stops Redis Docker container
- `npm run redis:logs`: View Redis logs

### Deployment

- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit

## Cursor Integration

This template includes a pre-configured Cursor environment. [Download Cursor](https://www.cursor.com/downloads) and enable the `devvit-mcp` when prompted.
