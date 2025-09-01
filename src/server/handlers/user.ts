import { Router } from 'express';
import { reddit } from '../lib/reddit-provider';
import { supabaseServer } from '../../shared/supabase-server';
import type { UserInsert } from '../../shared/types/supabase';

const router = Router();

// Supabase service key - this should ideally come from environment variables
const supabaseServiceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bndzcXRmdmtnY2lobXdncnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY2NzY0NCwiZXhwIjoyMDcyMjQzNjQ0fQ.Ya8OJnhoeHC4LJK7TFuf94L4Z_3rIhTxZtnt2foAgYA';

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

export default router;
