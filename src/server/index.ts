import express from 'express';
import { Devvit } from '@devvit/public-api';
import counterRoutes from './handlers/counter';
import userRoutes from './handlers/user';
import postRoutes from './handlers/post';
import gameRoutes from './handlers/game';
import letteredRoutes from './handlers/lettered';
import seasonRoutes from './handlers/season';
import adminRoutes from './handlers/admin';
import leaderboardRoutes from './handlers/leaderboard';

// Environment detection - use LOCAL_MODE flag for local development
// Set LOCAL_MODE=true to use regular Express server instead of Reddit's server
const isLocal = process.env.LOCAL_MODE === 'true';

Devvit.addSettings([
  {
    name: 'supabase-service-key',
    label: 'Supabase Service Key',
    type: 'string',
    isSecret: true,
    scope: 'app',
  },
]);

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

// CORS middleware for local development
if (isLocal) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
}

// Use router middleware with all handler modules
app.use(counterRoutes);
app.use(userRoutes);
app.use(postRoutes);
app.use(gameRoutes);
app.use(letteredRoutes);
app.use(seasonRoutes);
app.use(adminRoutes);
app.use(leaderboardRoutes);

// Health check endpoint for local development
if (isLocal) {
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Local development server is running' });
  });
}

if (isLocal) {
  // Use regular Express server for local development
  const PORT = process.env.PORT || 3001;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Local development server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });

  server.on('error', (err) => {
    console.error(`❌ Server error: ${err.stack}`);
    process.exit(1);
  });

  // Graceful shutdown for local development
  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down local development server...');
    server.close(() => {
      console.log('✅ Local development server closed.');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('🛑 Shutting down local development server...');
    server.close(() => {
      console.log('✅ Local development server closed.');
      process.exit(0);
    });
  });
} else {
  // Use Reddit's server for production
  void (async () => {
    try {
      const { createServer, getServerPort } = await import('@devvit/web/server');
      const port = getServerPort();
      const server = createServer(app);
      server.on('error', (err) => console.error(`server error; ${err.stack}`));
      server.listen(port);
    } catch (error) {
      console.error('Failed to start Reddit server:', error);
      process.exit(1);
    }
  })();
}
