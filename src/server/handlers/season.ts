import { Router } from 'express';
import { reddit } from '@devvit/web/server';
import { supabaseServer } from '../../shared/supabase-server';
import type {
  SeasonInsert,
  SeasonUpdate,
  GameSessionInsert,
  GameSessionUpdate,
} from '../../shared/types/supabase';
import type {
  SeasonResponse,
  SeasonsResponse,
  LeaderboardResponse,
  GameSessionResponse,
  UserStatsResponse,
  LeaderboardEntry,
} from '../../shared/types/api';

const router = Router();

// Supabase service key - this should ideally come from environment variables
const supabaseServiceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bndzcXRmdmtnY2lobXdncnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY2NzY0NCwiZXhwIjoyMDcyMjQzNjQ0fQ.Ya8OJnhoeHC4LJK7TFuf94L4Z_3rIhTxZtnt2foAgYA';

const supabase = supabaseServer('https://gwnwsqtfvkgcihmwgrsj.supabase.co', supabaseServiceKey);

// Helper function to get current user ID
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const redditUsername = await reddit.getCurrentUsername();
    if (!redditUsername || redditUsername === 'anonymous') {
      return null;
    }
    return `reddit_${redditUsername}`;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Get current active season
router.get('/api/season/current', async (_req, res): Promise<void> => {
  try {
    const { data: season, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching current season:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch current season',
      });
      return;
    }

    if (!season) {
      // No active season found, create a default one
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 30); // 30-day season

      const newSeasonData: SeasonInsert = {
        name: `Season ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
        game_type: 'topx',
      };

      const { data: newSeason, error: createError } = await supabase
        .from('seasons')
        .insert(newSeasonData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating default season:', createError);
        res.status(500).json({
          status: 'error',
          message: 'Failed to create default season',
        });
        return;
      }

      const response: SeasonResponse = {
        type: 'season',
        season: {
          id: newSeason.id,
          name: newSeason.name,
          startDate: newSeason.start_date,
          endDate: newSeason.end_date,
          isActive: newSeason.is_active,
          gameType: newSeason.game_type,
          createdAt: newSeason.created_at,
        },
      };

      res.json(response);
      return;
    }

    const response: SeasonResponse = {
      type: 'season',
      season: {
        id: season.id,
        name: season.name,
        startDate: season.start_date,
        endDate: season.end_date,
        isActive: season.is_active,
        gameType: season.game_type,
        createdAt: season.created_at,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/season/current:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Get all seasons
router.get('/api/seasons', async (_req, res): Promise<void> => {
  try {
    const { data: seasons, error } = await supabase
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching seasons:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch seasons',
      });
      return;
    }

    const response: SeasonsResponse = {
      type: 'seasons',
      seasons: seasons.map((season) => ({
        id: season.id,
        name: season.name,
        startDate: season.start_date,
        endDate: season.end_date,
        isActive: season.is_active,
        gameType: season.game_type,
        createdAt: season.created_at,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/seasons:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Start a new game session
router.post('/api/game-session/start', async (req, res): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    const { gameId, seasonId } = req.body;

    if (!gameId || !seasonId) {
      res.status(400).json({
        status: 'error',
        message: 'gameId and seasonId are required',
      });
      return;
    }

    // Check if user already has a session for this game today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingSession } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .eq('season_id', seasonId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .single();

    if (existingSession) {
      const response: GameSessionResponse = {
        type: 'game_session',
        session: {
          id: existingSession.id,
          userId: existingSession.user_id,
          gameId: existingSession.game_id,
          seasonId: existingSession.season_id,
          score: existingSession.score,
          completedAt: existingSession.completed_at,
          attempts: existingSession.attempts,
          correctAnswers: existingSession.correct_answers,
          totalAnswers: existingSession.total_answers,
          isCompleted: existingSession.is_completed,
          isWon: existingSession.is_won,
          timeToComplete: existingSession.time_to_complete,
          createdAt: existingSession.created_at,
        },
      };

      res.json(response);
      return;
    }

    // Create new session
    const sessionData: GameSessionInsert = {
      user_id: userId,
      game_id: gameId,
      season_id: seasonId,
      score: 0,
      attempts: 0,
      correct_answers: 0,
      total_answers: 0,
      is_completed: false,
      is_won: false,
    };

    const { data: session, error } = await supabase
      .from('game_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      console.error('Error creating game session:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create game session',
      });
      return;
    }

    const response: GameSessionResponse = {
      type: 'game_session',
      session: {
        id: session.id,
        userId: session.user_id,
        gameId: session.game_id,
        seasonId: session.season_id,
        score: session.score,
        completedAt: session.completed_at,
        attempts: session.attempts,
        correctAnswers: session.correct_answers,
        totalAnswers: session.total_answers,
        isCompleted: session.is_completed,
        isWon: session.is_won,
        timeToComplete: session.time_to_complete,
        createdAt: session.created_at,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/game-session/start:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Update game session
router.put('/api/game-session/:sessionId', async (req, res): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    const { sessionId } = req.params;
    const updateData = req.body;

    // Ensure user can only update their own sessions
    const { data: session, error: fetchError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !session) {
      res.status(404).json({
        status: 'error',
        message: 'Game session not found',
      });
      return;
    }

    const { data: updatedSession, error } = await supabase
      .from('game_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating game session:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update game session',
      });
      return;
    }

    const response: GameSessionResponse = {
      type: 'game_session',
      session: {
        id: updatedSession.id,
        userId: updatedSession.user_id,
        gameId: updatedSession.game_id,
        seasonId: updatedSession.season_id,
        score: updatedSession.score,
        completedAt: updatedSession.completed_at,
        attempts: updatedSession.attempts,
        correctAnswers: updatedSession.correct_answers,
        totalAnswers: updatedSession.total_answers,
        isCompleted: updatedSession.is_completed,
        isWon: updatedSession.is_won,
        timeToComplete: updatedSession.time_to_complete,
        createdAt: updatedSession.created_at,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/game-session/:sessionId:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Get leaderboard for a season
router.get('/api/leaderboard/:seasonId', async (req, res): Promise<void> => {
  try {
    const { seasonId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    // Get leaderboard data with aggregated stats
    const { data: leaderboardData, error } = await supabase.rpc('get_season_leaderboard', {
      season_id: seasonId,
      result_limit: parseInt(limit as string),
      result_offset: parseInt(offset as string),
    });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch leaderboard',
      });
      return;
    }

    // Get total player count for the season
    const { count: totalPlayers } = await supabase
      .from('game_sessions')
      .select('user_id', { count: 'exact', head: true })
      .eq('season_id', seasonId);

    const entries: LeaderboardEntry[] =
      leaderboardData?.map((entry: any, index: number) => ({
        rank: parseInt(offset as string) + index + 1,
        userId: entry.user_id,
        redditHandle: entry.reddit_handle,
        totalScore: entry.total_score || 0,
        gamesPlayed: entry.games_played || 0,
        gamesWon: entry.games_won || 0,
        averageScore: entry.average_score || 0,
        winRate: entry.win_rate || 0,
        bestScore: entry.best_score || 0,
        totalCorrectAnswers: entry.total_correct_answers || 0,
        averageAttempts: entry.average_attempts || 0,
      })) || [];

    const response: LeaderboardResponse = {
      type: 'leaderboard',
      entries,
      seasonId,
      totalPlayers: totalPlayers || 0,
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/leaderboard/:seasonId:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Get user stats for a season
router.get('/api/user-stats/:seasonId', async (req, res): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    const { seasonId } = req.params;

    // Get user's session data for the season
    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('season_id', seasonId);

    if (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch user stats',
      });
      return;
    }

    const totalScore = sessions?.reduce((sum, session) => sum + session.score, 0) || 0;
    const gamesPlayed = sessions?.length || 0;
    const gamesWon = sessions?.filter((session) => session.is_won).length || 0;

    // Calculate current streak (consecutive wins from most recent games)
    const sortedSessions =
      sessions?.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) || [];

    let currentStreak = 0;
    for (const session of sortedSessions) {
      if (session.is_won) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate best streak
    let bestStreak = 0;
    let tempStreak = 0;
    for (const session of sortedSessions.reverse()) {
      if (session.is_won) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Get user's rank in the season
    const { data: rankData } = await supabase.rpc('get_user_rank', {
      user_id: userId,
      season_id: seasonId,
    });

    const rank = rankData?.[0]?.rank || 0;

    // Get total players count
    const { count: totalPlayers } = await supabase
      .from('game_sessions')
      .select('user_id', { count: 'exact', head: true })
      .eq('season_id', seasonId);

    const response: UserStatsResponse = {
      type: 'user_stats',
      userId,
      seasonId,
      totalScore,
      gamesPlayed,
      gamesWon,
      currentStreak,
      bestStreak,
      rank,
      totalPlayers: totalPlayers || 0,
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/user-stats/:seasonId:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

export default router;
