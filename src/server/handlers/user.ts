import { Router } from 'express';
import { reddit } from '../lib/reddit-provider';

import type { UserInsert } from '../../shared/types/supabase';
import { supabase } from '../../shared/supabase-server';

const router = Router();

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
      reddit_id: redditUsername,
      handle: redditUsername,
    };

    const { data, error } = await supabase
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

export default router;
