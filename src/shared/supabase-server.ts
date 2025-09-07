import { createClient } from '@supabase/supabase-js';
import { Database } from './types/supabase';
import { isDevelopment } from './utils';

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
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bndzcXRmdmtnY2lobXdncnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY2NzY0NCwiZXhwIjoyMDcyMjQzNjQ0fQ.Ya8OJnhoeHC4LJK7TFuf94L4Z_3rIhTxZtnt2foAgYA';
const supabaseUrl = isDevelopment()
  ? 'http://127.0.0.1:54321'
  : 'https://gwnwsqtfvkgcihmwgrsj.supabase.co';

export const supabase = supabaseServer(supabaseUrl, supabaseServiceKey);
