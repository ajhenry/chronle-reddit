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
      // Seasons table for managing game seasons
      seasons: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_active: boolean;
          game_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date: string;
          end_date: string;
          is_active?: boolean;
          game_type: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          is_active?: boolean;
          game_type?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Game sessions table for tracking individual game plays
      game_sessions: {
        Row: {
          id: string;
          user_id: string;
          game_id: string;
          season_id: string;
          score: number;
          completed_at: string | null;
          attempts: number;
          correct_answers: number;
          total_answers: number;
          is_completed: boolean;
          is_won: boolean;
          time_to_complete: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_id: string;
          season_id: string;
          score?: number;
          completed_at?: string | null;
          attempts?: number;
          correct_answers?: number;
          total_answers?: number;
          is_completed?: boolean;
          is_won?: boolean;
          time_to_complete?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          game_id?: string;
          season_id?: string;
          score?: number;
          completed_at?: string | null;
          attempts?: number;
          correct_answers?: number;
          total_answers?: number;
          is_completed?: boolean;
          is_won?: boolean;
          time_to_complete?: number | null;
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

export type Season = Database['public']['Tables']['seasons']['Row'];
export type SeasonInsert = Database['public']['Tables']['seasons']['Insert'];
export type SeasonUpdate = Database['public']['Tables']['seasons']['Update'];

export type GameSession = Database['public']['Tables']['game_sessions']['Row'];
export type GameSessionInsert = Database['public']['Tables']['game_sessions']['Insert'];
export type GameSessionUpdate = Database['public']['Tables']['game_sessions']['Update'];

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
