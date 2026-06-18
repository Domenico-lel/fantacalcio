export interface Database {
  public: {
    Tables: {
      fanta_profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name: string;
          last_name: string;
          team_name: string;
          logo: string;
          budget: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          first_name: string;
          last_name: string;
          team_name: string;
          logo?: string;
          budget?: number;
          updated_at?: string;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          team_name?: string;
          logo?: string;
          budget?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      fanta_squads: {
        Row: {
          id: string;
          user_id: string;
          formation: string;
          starters: number[];
          captain_id: number | null;
          vice_captain_id: number | null;
          roster_ids: number[];
          updated_at: string;
        };
        Insert: {
          user_id: string;
          formation?: string;
          starters?: number[];
          captain_id?: number | null;
          vice_captain_id?: number | null;
          roster_ids?: number[];
          updated_at?: string;
        };
        Update: {
          formation?: string;
          starters?: number[];
          captain_id?: number | null;
          vice_captain_id?: number | null;
          roster_ids?: number[];
          updated_at?: string;
        };
        Relationships: [];
      };
      fanta_trophies: {
        Row: {
          id: string;
          user_id: string | null;
          display_name: string;
          year: number;
          season: string;
          position: number;
          team_name: string;
          points: number | null;
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          display_name: string;
          year: number;
          season: string;
          position: number;
          team_name: string;
          points?: number | null;
        };
        Update: {
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
