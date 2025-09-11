export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      daily_games: {
        Row: {
          created_at: string;
          day: string;
          id: string;
          lettered_game_id: string | null;
          topx_game_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          day: string;
          id?: string;
          lettered_game_id?: string | null;
          topx_game_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          day?: string;
          id?: string;
          lettered_game_id?: string | null;
          topx_game_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_games_lettered_game_id_fkey';
            columns: ['lettered_game_id'];
            isOneToOne: false;
            referencedRelation: 'lettered_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_games_topx_game_id_fkey';
            columns: ['topx_game_id'];
            isOneToOne: false;
            referencedRelation: 'topx_games';
            referencedColumns: ['id'];
          },
        ];
      };
      lettered_games: {
        Row: {
          category: string;
          cols: number;
          created_at: string;
          grid: Json;
          id: string;
          initial_piece_positions: Json;
          phrase: string;
          pieces: Json;
          rows: number;
          solution: Json;
          solution_hash: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          cols: number;
          created_at?: string;
          grid: Json;
          id?: string;
          initial_piece_positions?: Json;
          phrase: string;
          pieces: Json;
          rows: number;
          solution: Json;
          solution_hash: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          cols?: number;
          created_at?: string;
          grid?: Json;
          id?: string;
          initial_piece_positions?: Json;
          phrase?: string;
          pieces?: Json;
          rows?: number;
          solution?: Json;
          solution_hash?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lettered_sessions: {
        Row: {
          completed_at: string | null;
          created_at: string;
          daily_game_id: string;
          final_score: number;
          id: string;
          initial_score: number;
          is_completed: boolean;
          started_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          daily_game_id: string;
          final_score?: number;
          id?: string;
          initial_score?: number;
          is_completed?: boolean;
          started_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          daily_game_id?: string;
          final_score?: number;
          id?: string;
          initial_score?: number;
          is_completed?: boolean;
          started_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lettered_sessions_daily_game_id_fkey';
            columns: ['daily_game_id'];
            isOneToOne: false;
            referencedRelation: 'daily_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lettered_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      lettered_submissions: {
        Row: {
          board_state: Json;
          created_at: string;
          game_session_id: string;
          id: string;
          score_at_submission: number;
          submitted_at: string;
        };
        Insert: {
          board_state: Json;
          created_at?: string;
          game_session_id: string;
          id?: string;
          score_at_submission: number;
          submitted_at?: string;
        };
        Update: {
          board_state?: Json;
          created_at?: string;
          game_session_id?: string;
          id?: string;
          score_at_submission?: number;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lettered_submissions_game_session_id_fkey';
            columns: ['game_session_id'];
            isOneToOne: false;
            referencedRelation: 'lettered_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      seasons: {
        Row: {
          created_at: string;
          end_date: string;
          id: string;
          is_active: boolean | null;
          name: string;
          start_date: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_date: string;
          id?: string;
          is_active?: boolean | null;
          name: string;
          start_date: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_date?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          start_date?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      topx_games: {
        Row: {
          category: string;
          count: number;
          created_at: string;
          id: string;
          max_attempts: number;
          prompt: string;
          solution: string[];
          solution_hash: Json | null;
          suggestions: string[];
          updated_at: string;
        };
        Insert: {
          category: string;
          count: number;
          created_at?: string;
          id?: string;
          max_attempts?: number;
          prompt: string;
          solution: string[];
          solution_hash?: Json | null;
          suggestions: string[];
          updated_at?: string;
        };
        Update: {
          category?: string;
          count?: number;
          created_at?: string;
          id?: string;
          max_attempts?: number;
          prompt?: string;
          solution?: string[];
          solution_hash?: Json | null;
          suggestions?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      topx_sessions: {
        Row: {
          attempts_left: number;
          completed_at: string | null;
          created_at: string;
          daily_game_id: string;
          final_score: number;
          id: string;
          initial_score: number;
          is_completed: boolean;
          started_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts_left?: number;
          completed_at?: string | null;
          created_at?: string;
          daily_game_id: string;
          final_score?: number;
          id?: string;
          initial_score?: number;
          is_completed?: boolean;
          started_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts_left?: number;
          completed_at?: string | null;
          created_at?: string;
          daily_game_id?: string;
          final_score?: number;
          id?: string;
          initial_score?: number;
          is_completed?: boolean;
          started_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'topx_sessions_daily_game_id_fkey';
            columns: ['daily_game_id'];
            isOneToOne: false;
            referencedRelation: 'daily_games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'topx_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      topx_submissions: {
        Row: {
          answer: string;
          created_at: string;
          game_session_id: string;
          id: string;
          is_correct: boolean;
          position: number | null;
          score_at_submission: number;
          submitted_at: string;
        };
        Insert: {
          answer: string;
          created_at?: string;
          game_session_id: string;
          id?: string;
          is_correct: boolean;
          position?: number | null;
          score_at_submission: number;
          submitted_at?: string;
        };
        Update: {
          answer?: string;
          created_at?: string;
          game_session_id?: string;
          id?: string;
          is_correct?: boolean;
          position?: number | null;
          score_at_submission?: number;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'topx_submissions_game_session_id_fkey';
            columns: ['game_session_id'];
            isOneToOne: false;
            referencedRelation: 'topx_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          admin: boolean;
          created_at: string;
          handle: string;
          id: string;
          image_url: string | null;
          reddit_id: string;
          updated_at: string;
        };
        Insert: {
          admin?: boolean;
          created_at?: string;
          handle: string;
          id?: string;
          image_url?: string | null;
          reddit_id: string;
          updated_at?: string;
        };
        Update: {
          admin?: boolean;
          created_at?: string;
          handle?: string;
          id?: string;
          image_url?: string | null;
          reddit_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_ksuid: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_todays_daily_game: {
        Args: Record<PropertyKey, never>;
        Returns: {
          day: string;
          game_data: Json;
          id: string;
          lettered_game_id: string;
          topx_game_id: string;
        }[];
      };
      get_todays_lettered_daily_game: {
        Args: Record<PropertyKey, never>;
        Returns: {
          day: string;
          game_data: Json;
          id: string;
          lettered_game_id: string;
        }[];
      };
      get_todays_topx_daily_game: {
        Args: Record<PropertyKey, never>;
        Returns: {
          day: string;
          game_data: Json;
          id: string;
          topx_game_id: string;
        }[];
      };
      manage_season_transitions: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
