import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for the server
 * @param supabaseUrl - The Supabase URL
 * @param supabaseServiceKey - The Supabase service key
 * @returns The Supabase client
 */
export const supabaseServer = (supabaseUrl: string, supabaseServiceKey: string) => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase server environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
