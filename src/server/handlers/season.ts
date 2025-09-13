import { Router } from 'express';
import { reddit } from '../lib/reddit-provider';
import { supabase } from '../../shared/supabase-server';
import type { SeasonInsert } from '../../shared/types/supabase';
import { getCurrentUTCISOString } from '../lib/time';
import type {
  SeasonResponse,
  SeasonsResponse,
  LeaderboardResponse,
  UserStatsResponse,
  LeaderboardEntry,
} from '../../shared/types/api';

const router = Router();

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

    if (error && !error.message.includes('PGRST116')) {
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
        start_date: now.toISOString(), // Keep as local time for season naming
        end_date: endDate.toISOString(), // Keep as local time for season naming
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

// Get leaderboard for a season
router.get('/api/leaderboard/:seasonId', async (req, res): Promise<void> => {
  try {
    const { seasonId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    // Get leaderboard data with unique best score per user
    const { data: leaderboardData, error } = await supabase
      .from('lettered_sessions')
      .select(`
        user_id,
        users!inner(reddit_handle),
        final_score,
        completed_at
      `)
      .eq('season_id', seasonId)
      .not('final_score', 'is', null)
      .order('final_score', { ascending: false })
      .limit(parseInt(limit as string))
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch leaderboard',
      });
      return;
    }

    // Group by user and keep only their best score
    const userBestScores = new Map();
    leaderboardData?.forEach((entry: any) => {
      const userId = entry.user_id;
      const currentBest = userBestScores.get(userId);
      
      if (!currentBest || entry.final_score > currentBest.final_score) {
        userBestScores.set(userId, {
          userId: userId,
          redditHandle: entry.users.reddit_handle,
          bestScore: entry.final_score,
          completedAt: entry.completed_at
        });
      }
    });

    // Convert to array and sort by best score
    const uniqueEntries = Array.from(userBestScores.values())
      .sort((a, b) => b.bestScore - a.bestScore);

    const totalPlayers = uniqueEntries.length;

    const entries: LeaderboardEntry[] = uniqueEntries.map((entry: any, index: number) => ({
      rank: parseInt(offset as string) + index + 1,
      userId: entry.userId,
      redditHandle: entry.redditHandle,
      totalPoints: entry.bestScore,
      gamesPlayed: 1, // Since we're showing best score only
      latestGame: entry.completedAt,
      averageScore: entry.bestScore,
    })) || [];

    const response: LeaderboardResponse = {
      type: 'leaderboard',
      entries,
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

    // Since game_sessions table is removed, return default values
    const totalScore = 0;
    const gamesPlayed = 0;
    const gamesWon = 0;
    const currentStreak = 0;
    const bestStreak = 0;
    const rank = 0;
    const totalPlayers = 0;

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

// Create a new season (dev tool)
router.post('/api/seasons', async (req, res): Promise<void> => {
  try {
    const { name, start_date, end_date, is_active, game_type } = req.body;

    if (!name || !start_date || !end_date) {
      res.status(400).json({
        status: 'error',
        message: 'name, start_date, and end_date are required',
      });
      return;
    }

    const seasonData = {
      name,
      start_date,
      end_date,
      is_active: is_active || false,
      game_type: game_type || 'topx',
    };

    const { data: season, error } = await supabase
      .from('seasons')
      .insert(seasonData)
      .select()
      .single();

    if (error) {
      console.error('Error creating season:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create season',
      });
      return;
    }

    res.json({
      status: 'success',
      season: {
        id: season.id,
        name: season.name,
        startDate: season.start_date,
        endDate: season.end_date,
        isActive: season.is_active,
        gameType: season.game_type,
        createdAt: season.created_at,
      },
    });
  } catch (error) {
    console.error('Error in /api/seasons POST:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Activate a season (dev tool)
router.post('/api/seasons/:seasonId/activate', async (req, res): Promise<void> => {
  try {
    const { seasonId } = req.params;

    // First deactivate all seasons
    await supabase
      .from('seasons')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    // Then activate the specified season
    const { data: season, error } = await supabase
      .from('seasons')
      .update({ is_active: true })
      .eq('id', seasonId)
      .select()
      .single();

    if (error) {
      console.error('Error activating season:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to activate season',
      });
      return;
    }

    res.json({
      status: 'success',
      season: {
        id: season.id,
        name: season.name,
        startDate: season.start_date,
        endDate: season.end_date,
        isActive: season.is_active,
        gameType: season.game_type,
        createdAt: season.created_at,
      },
    });
  } catch (error) {
    console.error('Error in /api/seasons/:seasonId/activate:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

export default router;
