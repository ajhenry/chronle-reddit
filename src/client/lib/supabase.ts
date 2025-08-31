import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = 'https://gwnwsqtfvkgcihmwgrsj.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bndzcXRmdmtnY2lobXdncnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2Njc2NDQsImV4cCI6MjA3MjI0MzY0NH0.Mp5mtECe6R-XqZNQFE9uC1JpkQFjcOk2RWuMvooyMpw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Export types for better TypeScript support
export type { User, Session, AuthError } from '@supabase/supabase-js';
