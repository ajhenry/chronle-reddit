import express from 'express';
import {
  InitResponse,
  IncrementResponse,
  DecrementResponse,
  TopXGameResponse,
  TopXValidateResponse,
  TopXGamesResponse,
  TopXGameData,
} from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { supabaseServer } from '../shared/supabase-server';
import type { UserInsert } from '../shared/types/supabase';
import { Devvit } from '@devvit/public-api';

Devvit.addSettings([
  {
    name: 'supabase-service-key',
    label: 'Supabase Service Key',
    type: 'string',
    isSecret: true,
    scope: 'app',
  },
]);

const supabaseServiceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bndzcXRmdmtnY2lobXdncnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY2NzY0NCwiZXhwIjoyMDcyMjQzNjQ0fQ.Ya8OJnhoeHC4LJK7TFuf94L4Z_3rIhTxZtnt2foAgYA';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

// Top X Games Data
const TOP_X_GAMES: TopXGameData[] = [
  {
    id: 'game_001',
    prompt: 'Name the top 3 states that eat the most peanut butter',
    correctAnswers: ['Georgia', 'Alabama', 'North Carolina'],
    searchSuggestions: [
      'Georgia',
      'Alabama',
      'North Carolina',
      'Texas',
      'California',
      'Florida',
      'New York',
      'Pennsylvania',
      'Illinois',
      'Ohio',
      'Virginia',
      'Tennessee',
      'Louisiana',
      'Mississippi',
      'Arkansas',
    ],
    category: 'states',
    number: 3,
    createdAt: '2024-08-31T00:00:00Z',
  },
  {
    id: 'game_002',
    prompt: 'Name the top 5 programming languages by popularity',
    correctAnswers: ['JavaScript', 'Python', 'Java', 'C++', 'C#'],
    searchSuggestions: [
      'JavaScript',
      'Python',
      'Java',
      'C++',
      'C#',
      'PHP',
      'Ruby',
      'Swift',
      'Go',
      'Rust',
      'TypeScript',
      'Kotlin',
      'Scala',
      'R',
      'Dart',
    ],
    category: 'programming languages',
    number: 5,
    createdAt: '2024-08-31T00:00:00Z',
  },
  {
    id: 'game_003',
    prompt: 'Name the top 4 social media platforms by users',
    correctAnswers: ['Facebook', 'YouTube', 'WhatsApp', 'Instagram'],
    searchSuggestions: [
      'Facebook',
      'YouTube',
      'WhatsApp',
      'Instagram',
      'TikTok',
      'WeChat',
      'Snapchat',
      'Twitter',
      'LinkedIn',
      'Pinterest',
      'Reddit',
      'Telegram',
    ],
    category: 'social media platforms',
    number: 4,
    createdAt: '2024-08-31T00:00:00Z',
  },
];

const router = express.Router();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

// User sync endpoint - creates/updates user in Supabase
router.post('/api/sync-user', async (_req, res): Promise<void> => {
  try {
    // Get Reddit username from Devvit context
    const redditUsername = await reddit.getCurrentUsername();

    if (!redditUsername || redditUsername === 'anonymous') {
      res.status(400).json({
        status: 'error',
        message: 'User not authenticated with Reddit',
      });
      return;
    }

    // Generate a unique ID based on Reddit username
    const userId = `reddit_${redditUsername}`;

    // Try to upsert the user in Supabase
    const userData: UserInsert = {
      id: userId,
      reddit_handle: redditUsername,
      last_seen_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseServer(
      'https://gwnwsqtfvkgcihmwgrsj.supabase.co',
      supabaseServiceKey
    )
      .from('users')
      .upsert(userData, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error syncing user to Supabase:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to sync user data',
      });
      return;
    }

    res.json({
      status: 'success',
      user: data,
    });
  } catch (error) {
    console.error('User sync error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during user sync',
    });
  }
});

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Game API endpoints
router.get('/api/game/top/search', async (req, res): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Query parameter is required',
      });
      return;
    }

    // Placeholder data - replace with actual search logic
    const allSuggestions = [
      'Georgia',
      'Alabama',
      'North Carolina',
      'Texas',
      'California',
      'Florida',
      'New York',
      'Pennsylvania',
      'Illinois',
      'Ohio',
      'Virginia',
      'Tennessee',
      'Louisiana',
      'Mississippi',
      'Arkansas',
      'South Carolina',
      'Kentucky',
      'Indiana',
      'Michigan',
      'Wisconsin',
      'Minnesota',
      'Iowa',
      'Missouri',
      'Kansas',
      'Nebraska',
    ];

    const filteredSuggestions = allSuggestions
      .filter((suggestion) => suggestion.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10); // Limit to 10 suggestions

    res.json({
      status: 'success',
      suggestions: filteredSuggestions,
    });
  } catch (error) {
    console.error(`Error searching suggestions: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search suggestions',
    });
  }
});

router.get('/api/game/top/daily', async (_req, res): Promise<void> => {
  try {
    // Placeholder for daily question - this would typically come from a database
    const dailyQuestions = [
      {
        id: 1,
        prompt: 'Name the top 3 states that eat the most peanut butter',
        correctAnswers: ['Georgia', 'Alabama', 'North Carolina'],
        date: new Date().toISOString().split('T')[0],
      },
      {
        id: 2,
        prompt: 'Name the top 3 most visited national parks in the US',
        correctAnswers: ['Great Smoky Mountains', 'Yellowstone', 'Zion'],
        date: new Date().toISOString().split('T')[0],
      },
    ];

    // For now, just return the first question
    const todaysQuestion = dailyQuestions[0];

    res.json({
      status: 'success',
      question: todaysQuestion,
    });
  } catch (error) {
    console.error(`Error getting daily question: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get daily question',
    });
  }
});

// Top X Game API endpoints
router.get('/api/topx/games', async (_req, res): Promise<void> => {
  try {
    res.json({
      type: 'topx_games',
      games: TOP_X_GAMES,
    });
  } catch (error) {
    console.error('Error fetching Top X games:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Top X games',
    });
  }
});

router.get('/api/topx/game/:gameId', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;

    const game = TOP_X_GAMES.find((g) => g.id === gameId);
    if (!game) {
      res.status(404).json({
        status: 'error',
        message: 'Game not found',
      });
      return;
    }

    res.json({
      type: 'topx_game',
      game,
    });
  } catch (error) {
    console.error(`Error fetching Top X game ${req.params.gameId}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Top X game',
    });
  }
});

router.post('/api/topx/game/:gameId/validate', async (req, res): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { answer, guessedAnswers = [], maxAttempts = 5 } = req.body;

    if (!answer || typeof answer !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Answer is required',
      });
      return;
    }

    const game = TOP_X_GAMES.find((g) => g.id === gameId);
    if (!game) {
      res.status(404).json({
        status: 'error',
        message: 'Game not found',
      });
      return;
    }

    const isCorrect = game.correctAnswers.includes(answer);
    const attemptsUsed = guessedAnswers.length + 1;
    const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed);

    let position: number | undefined;
    if (isCorrect) {
      position = game.correctAnswers.indexOf(answer) + 1;
    }

    res.json({
      type: 'topx_validate',
      answer,
      isCorrect,
      position,
      attemptsRemaining,
    });
  } catch (error) {
    console.error(`Error validating answer for game ${req.params.gameId}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to validate answer',
    });
  }
});

router.get('/api/topx/game/random', async (_req, res): Promise<void> => {
  try {
    const randomGame = TOP_X_GAMES[Math.floor(Math.random() * TOP_X_GAMES.length)];

    res.json({
      type: 'topx_game',
      game: randomGame,
    });
  } catch (error) {
    console.error('Error fetching random Top X game:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch random Top X game',
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
