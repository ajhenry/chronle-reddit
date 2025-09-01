import express from 'express';
import { createServer, getServerPort } from '@devvit/web/server';
import { Devvit } from '@devvit/public-api';
import counterRoutes from './handlers/counter';
import userRoutes from './handlers/user';
import postRoutes from './handlers/post';
import gameRoutes from './handlers/game';

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

// Use router middleware with all handler modules
app.use(counterRoutes);
app.use(userRoutes);
app.use(postRoutes);
app.use(gameRoutes);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
