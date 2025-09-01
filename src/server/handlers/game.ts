import { Router } from 'express';
import {
  TopXGameResponse,
  TopXValidateResponse,
  TopXGamesResponse,
  TopXGameData,
} from '../../shared/types/api';

const router = Router();

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

router.get('/api/topx/games/random', async (_req, res): Promise<void> => {
  console.log('/api/topx/games/random');
  try {
    const randomGame = TOP_X_GAMES[Math.floor(Math.random() * TOP_X_GAMES.length)];
    console.log('Fetched random game:', { randomGame });

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

export default router;
