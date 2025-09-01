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

/**
 * Creates a Supabase client for the client
 * @param supabaseUrl - The Supabase URL
 * @param supabaseAnonKey - The Supabase anon key
 * @returns The Supabase client
 */
export const supabaseClient = (supabaseUrl: string, supabaseAnonKey: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase server environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
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
