import express from 'express';
import counterRoutes from './handlers/counter';
import userRoutes from './handlers/user';
import postRoutes from './handlers/post';
import gameRoutes from './handlers/game';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

// CORS middleware for local development
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

// Use router middleware with all handler modules
app.use(counterRoutes);
app.use(userRoutes);
app.use(postRoutes);
app.use(gameRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Local development server is running' });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`🚀 Local development server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

server.on('error', (err) => {
  console.error(`❌ Server error: ${err.stack}`);
  process.exit(1);
});

// Graceful shutdown
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
