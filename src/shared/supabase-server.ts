import { createClient } from '@supabase/supabase-js';
import { Database } from './types/supabase';

/**
 * Creates a Supabase client for the server
 * @param supabaseUrl - The Supabase URL
 * @param supabaseServiceKey - The Supabase service key
 * @returns The Supabase client
 */
const supabaseServer = (supabaseUrl: string, supabaseServiceKey: string) => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase server environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Supabase service key - this should ideally come from environment variables
const supabaseServiceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabaseUrl = 'http://127.0.0.1:54321';

export const supabase = supabaseServer(supabaseUrl, supabaseServiceKey);
