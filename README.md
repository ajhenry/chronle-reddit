## Podium - Daily Reddit Games

A collection of daily games built on Reddit's developer platform

- [Devvit](https://developers.reddit.com/): A way to build and deploy immersive games on Reddit
- [Vite](https://vite.dev/): For compiling the webView
- [React](https://react.dev/): For UI
- [Express](https://expressjs.com/): For backend logic
- [Tailwind](https://tailwindcss.com/): For styles
- [Typescript](https://www.typescriptlang.org/): For type safety
- [Supabase](https://supabase.com/): For database and authentication
- [shadcn/ui](https://ui.shadcn.com/): For pre-built components

## Getting Started

> Make sure you have Node 22 downloaded on your machine before running!

1. Run `npm create devvit@latest --template=react`
2. Go through the installation wizard. You will need to create a Reddit account and connect it to Reddit developers
3. Copy the command on the success page into your terminal

## Supabase Setup

This project includes Supabase integration for database and authentication. To get started:

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Wait for the project to be set up

### 2. Configure Environment Variables

1. Copy the `.env.example` file to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Get your project credentials from the Supabase dashboard:

   - Go to Settings → API
   - Copy your Project URL and anon/public key

3. Update the `.env` file with your actual values:

   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

   **Note:** The `SUPABASE_SERVICE_ROLE_KEY` is required for server-side operations like syncing Reddit users to your database. You can find this in your Supabase dashboard under Settings → API → service_role secret.

### 3. Set Up Database Schema

Create the following tables in your Supabase database (via SQL Editor):

```sql
-- Create users table for Reddit users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  reddit_handle TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create counters table
CREATE TABLE counters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_counters_post_id ON counters(post_id);
CREATE INDEX idx_counters_user_id ON counters(user_id);
CREATE INDEX idx_users_reddit_handle ON users(reddit_handle);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (id = current_setting('request.jwt.claims', true)::json->>'sub' OR id LIKE 'reddit_%');

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (id = current_setting('request.jwt.claims', true)::json->>'sub' OR id LIKE 'reddit_%');

CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (true);

-- Create policies for counters table
CREATE POLICY "Users can manage their own counters" ON counters
  FOR ALL USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id LIKE 'reddit_%');

CREATE POLICY "Users can read all counters" ON counters
  FOR SELECT USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_counters_updated_at BEFORE UPDATE ON counters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. Enable Authentication Providers (Optional)

If you want to use OAuth providers like Google, GitHub, or Discord:

1. Go to Authentication → Providers in your Supabase dashboard
2. Enable the providers you want to use
3. Configure their settings and obtain API keys from the respective platforms

## Redis Setup

This project uses Redis for caching and session management. In production, it uses Devvit's built-in Redis. For local development, you'll need a Redis instance running and the `ioredis` package will connect to it.

### Quick Start with Docker (Recommended)

The easiest way to run Redis locally is using Docker Compose:

```bash
# Start Redis in the background
npm run redis:start

# View Redis logs
npm run redis:logs

# Stop Redis
npm run redis:stop
```

This will start a Redis 7 instance with:

- Port: `6379`
- Persistent data storage (survives container restarts)
- AOF (Append Only File) persistence enabled
- Health checks for reliability

### Alternative: Install Redis Locally

If you prefer not to use Docker, you can install Redis directly:

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

**Windows:**
Download and install Redis from the [official releases](https://github.com/microsoftarchive/redis/releases) or use WSL2.

### Custom Redis Configuration

By default, the application connects to `redis://localhost:6379`. To use a different Redis instance:

```bash
# Set custom Redis URL
export REDIS_URL=redis://your-redis-host:6379

# Or with authentication
export REDIS_URL=redis://username:password@your-redis-host:6379
```

### Verify Redis Connection

You can verify Redis is running:

```bash
# Using redis-cli (if installed locally)
redis-cli ping
# Should return: PONG

# Using Docker
docker exec lettered-redis redis-cli ping
# Should return: PONG
```

### Production

In production (when deployed to Reddit), the application automatically uses Devvit's built-in Redis service. No configuration needed.

## shadcn/ui Setup

This project includes [shadcn/ui](https://ui.shadcn.com/) for pre-built, customizable components. The setup is already configured and includes:

### Available Components

The following components are already installed and ready to use:

- **Button** - Customizable button component with variants
- **Card** - Card container with header, content, and footer
- **Badge** - Small status indicators and labels
- **Input** - Form input field component
- **Alert** - Notification and status messages

### Adding New Components

To add more shadcn/ui components to your project:

```bash
# Add a specific component
npx shadcn@latest add [component-name]

# Add multiple components at once
npx shadcn@latest add button card badge input

# View available components
npx shadcn@latest list
```

### Using Components

Components are located in `src/client/components/ui/` and can be imported and used like this:

```typescript
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Card Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default">Click me</Button>
      </CardContent>
    </Card>
  );
}
```

### Customization

- **Colors**: Customize via CSS variables in `src/client/globals.css`
- **Variants**: Each component supports multiple variants (default, outline, destructive, etc.)
- **Sizing**: Components support different sizes (sm, default, lg)
- **Styling**: Use Tailwind classes alongside component props for additional styling

## Theme Customization

Your theme is now organized in `src/client/globals.css`. This file contains:

### CSS Variables Structure

```css
:root {
  /* Primary brand colors */
  --primary: 24 95% 53%; /* Reddit orange */
  --primary-foreground: 0 0% 98%;

  /* Background and text */
  --background: 0 0% 100%; /* White background */
  --foreground: 222.2 84% 4.9%; /* Dark text */

  /* Component colors */
  --card: 0 0% 100%;
  --border: 214.3 31.8% 91.4%;
  --muted: 210 40% 96%;

  /* Interactive states */
  --destructive: 0 84.2% 60.2%; /* Error red */
  --accent: 210 40% 96%; /* Highlight color */

  /* Border radius */
  --radius: 0.5rem;
}
```

### Dark Mode

Dark mode variables are automatically applied when the `.dark` class is added to your `<html>` element:

```css
.dark {
  --background: 222.2 84% 4.9%; /* Dark background */
  --foreground: 210 40% 98%; /* Light text */
  --primary: 24 95% 63%; /* Lighter orange */
  /* ... other dark mode variables */
}
```

### Customizing Colors

To change your theme colors, edit the HSL values in `globals.css`:

1. **Change primary color to blue:**

   ```css
   --primary: 221.2 83.2% 53.3%;
   --ring: 221.2 83.2% 53.3%;
   ```

2. **Reddit-style theme (current):**

   ```css
   --primary: 24 95% 53%; /* Orange */
   --ring: 24 95% 53%;
   ```

3. **Professional gray theme:**
   ```css
   --primary: 215 25% 27%; /* Dark gray */
   --ring: 215 25% 27%;
   ```

### Adding Custom Styles

Add custom styles to the `@layer base` section in `globals.css`:

```css
@layer base {
  /* Custom font */
  body {
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* Custom animations */
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
}
```

## Commands

### Development

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run local`: Runs the app in local mode with Express server (requires Redis)
- `npm run build`: Builds your client and server projects
- `npm run check`: Type checks, lints, and prettifies your app

### Redis Management

- `npm run redis:start`: Starts Redis using Docker Compose
- `npm run redis:stop`: Stops Redis Docker container
- `npm run redis:logs`: View Redis logs in real-time

### Deployment

- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit

## Using Supabase Integration

### Authentication

Use the `useAuth` hook for authentication functionality:

```typescript
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { user, loading, signIn, signUp, signOut, signInWithProvider } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (user) {
    return (
      <div>
        <p>Welcome, {user.email}!</p>
        <button onClick={signOut}>Sign Out</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => signIn('email@example.com', 'password')}>
        Sign In
      </button>
      <button onClick={() => signUp('email@example.com', 'password')}>
        Sign Up
      </button>
      <button onClick={() => signInWithProvider('google')}>
        Sign In with Google
      </button>
    </div>
  );
}
```

### Database Operations

Use the `useSupabaseCounter` hook for database operations:

```typescript
import { useSupabaseCounter } from './hooks/useSupabaseCounter';

function CounterComponent({ postId }: { postId: string }) {
  const { count, loading, error, increment, decrement, canDecrement } = useSupabaseCounter(postId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement} disabled={!canDecrement}>-</button>
    </div>
  );
}
```

### Direct Database Access

For more complex queries, use the Supabase client directly:

```typescript
import { supabase } from '../shared/supabase';

// Example: Fetch all counters for a user
const { data, error } = await supabase.from('counters').select('*').eq('user_id', user.id);
```

## Cursor Integration

This template comes with a pre-configured cursor environment. To get started, [download cursor](https://www.cursor.com/downloads) and enable the `devvit-mcp` when prompted.
