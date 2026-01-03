import express from 'express';
import { Devvit } from '@devvit/public-api';
import { apiLoggingMiddleware } from './lib/logging';
import userRoutes from './handlers/user';
import postRoutes from './handlers/post';
import gameRoutes from './handlers/game';
import letteredRoutes from './handlers/lettered';
import adminRoutes from './handlers/admin';
import leaderboardRoutes from './handlers/leaderboard';
import customRoutes from './handlers/custom';
import contextRoutes from './handlers/context';
import splashRoutes from './handlers/splash';
import triggerRoutes from './handlers/triggers';
import accountRoutes from './handlers/account';

// Environment detection
// LOCAL_MODE=true: Use Express server + stubbed Reddit API for local development
// REDDIT_MODE=true: Use Reddit server + real Reddit API but with development features enabled
const isLocal = process.env.LOCAL_MODE === 'true';
const isRedditDev = process.env.REDDIT_MODE === 'true';

Devvit.addSettings([]);

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

// API logging middleware for all routes
app.use('/api', apiLoggingMiddleware);

// CORS middleware for local development and Reddit development mode
if (isLocal || isRedditDev) {
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
app.use(userRoutes);
app.use(postRoutes);
app.use(gameRoutes);
app.use(letteredRoutes);
app.use(adminRoutes);
app.use(leaderboardRoutes);
app.use(customRoutes);
app.use(contextRoutes);
app.use(splashRoutes);
app.use(triggerRoutes);
app.use(accountRoutes);
// Health check endpoint for development modes
if (isLocal || isRedditDev) {
  app.get('/health', (_req, res) => {
    const mode = isLocal ? 'Local development' : 'Reddit development';
    res.json({
      status: 'ok',
      message: `${mode} server is running`,
      environment: isLocal ? 'local' : 'reddit-dev',
    });
  });
}

app.post('/internal/cron/daily-post', async (_req, res) => {
  try {
    console.log('Daily Lettered post scheduler triggered');

    // Skip post creation in local development mode
    if (isLocal) {
      console.log('Skipping post creation in local development mode');
      return res.status(200).json({
        status: 'skipped',
        message: 'Post creation skipped in local mode',
      });
    }

    // Use createPost which handles game creation and metadata
    const { createPost } = await import('./core/post');
    const { context } = await import('@devvit/web/server');

    const post = await createPost();

    console.log('Daily Lettered post created successfully:', post.id);
    console.log(
      'Post URL:',
      `https://reddit.com/r/${context.subredditName}/comments/${post.id}`
    );

    res.status(200).json({
      status: 'ok',
      postId: post.id,
      postUrl: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in daily Lettered post scheduler:', error);
    console.error('Error details:', (error as Error).stack);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create daily Lettered post',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

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
  // Use Reddit's server for production and Reddit development mode
  void (async () => {
    try {
      const { createServer, getServerPort } = await import('@devvit/web/server');
      const port = getServerPort();
      const server = createServer(app);

      if (isRedditDev) {
        console.log('🚀 Reddit development server running (with development features enabled)');
        console.log(`📊 Health check: http://localhost:${port}/health`);
      }

      server.on('error', (err) => console.error(`server error; ${err.stack}`));
      server.listen(port);
    } catch (error) {
      console.error('Failed to start Reddit server:', error);
      process.exit(1);
    }
  })();
}
