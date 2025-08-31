// Database table types - customize these based on your Supabase schema
export interface Database {
  public: {
    Tables: {
      // Users table for storing Reddit user information
      users: {
        Row: {
          id: string;
          reddit_handle: string;
          created_at: string;
          updated_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          reddit_handle: string;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string;
        };
        Update: {
          id?: string;
          reddit_handle?: string;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string;
        };
      };
      // Example counter table (matching the existing app functionality)
      counters: {
        Row: {
          id: string;
          post_id: string;
          count: number;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          count?: number;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          count?: number;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Add more table types as you create them in Supabase
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Type helpers for easier usage
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type Counter = Database['public']['Tables']['counters']['Row'];
export type CounterInsert = Database['public']['Tables']['counters']['Insert'];
export type CounterUpdate = Database['public']['Tables']['counters']['Update'];

// Auth-related types
export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  session: import('@supabase/supabase-js').Session | null;
  loading: boolean;
}

// Reddit user types
export interface RedditUser {
  id: string;
  reddit_handle: string;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
}

// API response types for Supabase operations
export interface SupabaseResponse<T> {
  data: T | null;
  error: import('@supabase/supabase-js').PostgrestError | null;
}
