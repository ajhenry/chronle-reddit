// Database table types - customize these based on your Supabase schema
export interface Database {
  public: {
    Tables: {
      // Users table for storing Reddit user information
      users: {
        Row: {
          id: string;
          reddit_id: string;
          image_url: string | null;
          handle: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reddit_id: string;
          image_url?: string | null;
          handle: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reddit_id?: string;
          image_url?: string | null;
          handle?: string;
          created_at?: string;
          updated_at?: string;
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

      // TopX games table for storing game data
      topx_games: {
        Row: {
          id: string;
          prompt: string;
          suggestions: string[];
          category: string;
          count: number;
          solution: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prompt: string;
          suggestions: string[];
          category: string;
          count: number;
          solution: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          prompt?: string;
          suggestions?: string[];
          category?: string;
          count?: number;
          solution?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };

      // Daily games table for managing daily TopX games
      daily_games: {
        Row: {
          id: string;
          day: string; // Date as ISO string
          topx_game_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          day: string;
          topx_game_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          day?: string;
          topx_game_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Game sessions table for tracking user progress and scoring
      game_sessions: {
        Row: {
          id: string;
          user_id: string;
          daily_game_id: string;
          started_at: string;
          completed_at: string | null;
          initial_score: number;
          final_score: number;
          attempts: any[]; // JSONB array of attempts
          correct_answers: any[]; // JSONB array of correct answers
          is_completed: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          daily_game_id: string;
          started_at?: string;
          completed_at?: string | null;
          initial_score?: number;
          final_score?: number;
          attempts?: any[];
          correct_answers?: any[];
          is_completed?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          daily_game_id?: string;
          started_at?: string;
          completed_at?: string | null;
          initial_score?: number;
          final_score?: number;
          attempts?: any[];
          correct_answers?: any[];
          is_completed?: boolean;
        };
      };

      // TopX submissions table for tracking individual answer submissions
      topx_submissions: {
        Row: {
          id: string;
          game_session_id: string;
          answer: string;
          is_correct: boolean;
          position: number | null;
          submitted_at: string;
          score_at_submission: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_session_id: string;
          answer: string;
          is_correct: boolean;
          position?: number | null;
          submitted_at?: string;
          score_at_submission: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_session_id?: string;
          answer?: string;
          is_correct?: boolean;
          position?: number | null;
          submitted_at?: string;
          score_at_submission?: number;
          created_at?: string;
        };
      };

      // Leaderboard table for tracking user points after game completion
      leaderboard: {
        Row: {
          id: string;
          user_id: string;
          daily_game_id: string;
          game_session_id: string;
          points_earned: number;
          completed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          daily_game_id: string;
          game_session_id: string;
          points_earned: number;
          completed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          daily_game_id?: string;
          game_session_id?: string;
          points_earned?: number;
          completed_at?: string;
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

export type TopXGame = Database['public']['Tables']['topx_games']['Row'];
export type TopXGameInsert = Database['public']['Tables']['topx_games']['Insert'];
export type TopXGameUpdate = Database['public']['Tables']['topx_games']['Update'];

export type DailyGame = Database['public']['Tables']['daily_games']['Row'];
export type DailyGameInsert = Database['public']['Tables']['daily_games']['Insert'];
export type DailyGameUpdate = Database['public']['Tables']['daily_games']['Update'];

export type GameSession = Database['public']['Tables']['game_sessions']['Row'];
export type GameSessionInsert = Database['public']['Tables']['game_sessions']['Insert'];
export type GameSessionUpdate = Database['public']['Tables']['game_sessions']['Update'];

export type TopXSubmission = Database['public']['Tables']['topx_submissions']['Row'];
export type TopXSubmissionInsert = Database['public']['Tables']['topx_submissions']['Insert'];
export type TopXSubmissionUpdate = Database['public']['Tables']['topx_submissions']['Update'];

export type Leaderboard = Database['public']['Tables']['leaderboard']['Row'];
export type LeaderboardInsert = Database['public']['Tables']['leaderboard']['Insert'];
export type LeaderboardUpdate = Database['public']['Tables']['leaderboard']['Update'];

// Auth-related types
export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  session: import('@supabase/supabase-js').Session | null;
  loading: boolean;
}

// Reddit user types
export interface RedditUser {
  id: string;
  reddit_id: string;
  image_url: string | null;
  handle: string;
  created_at: string;
  updated_at: string;
}

// API response types for Supabase operations
export interface SupabaseResponse<T> {
  data: T | null;
  error: import('@supabase/supabase-js').PostgrestError | null;
}
