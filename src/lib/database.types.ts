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
          team_ref: string | null;
          badges: string[];
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
          team_ref?: string | null;
          badges?: string[];
          updated_at?: string;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          team_name?: string;
          logo?: string;
          budget?: number;
          team_ref?: string | null;
          badges?: string[];
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
      fanta_admins: {
        Row: {
          email: string;
          display_name: string;
          avatar: string;
          created_at: string;
        };
        Insert: {
          email: string;
          display_name?: string;
          avatar?: string;
        };
        Update: {
          display_name?: string;
          avatar?: string;
        };
        Relationships: [];
      };
      fanta_settings: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          value?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fanta_posts: {
        Row: {
          id: string;
          author_id: string;
          author_name: string;
          author_logo: string;
          body: string;
          image_url: string | null;
          tag: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          author_name?: string;
          author_logo?: string;
          body?: string;
          image_url?: string | null;
          tag?: string | null;
        };
        Update: {
          body?: string;
          image_url?: string | null;
          tag?: string | null;
        };
        Relationships: [];
      };
      fanta_post_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
        };
        Update: {
          post_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      fanta_post_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          author_name: string;
          author_logo: string;
          body: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          author_name: string;
          author_logo?: string;
          body: string;
        };
        Update: {
          body?: string;
        };
        Relationships: [];
      };
      fanta_transfer_listings: {
        Row: {
          id: string;
          user_id: string;
          owner_name: string;
          owner_logo: string;
          player_name: string;
          player_photo: string | null;
          note: string | null;
          status: "available" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          owner_name: string;
          owner_logo?: string;
          player_name: string;
          player_photo?: string | null;
          note?: string | null;
          status?: "available" | "closed";
        };
        Update: {
          player_name?: string;
          player_photo?: string | null;
          note?: string | null;
          status?: "available" | "closed";
        };
        Relationships: [];
      };
      fanta_teams: {
        Row: {
          id: string;
          name: string;
          team_id: string | null;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          team_id?: string | null;
          logo_url?: string | null;
        };
        Update: {
          name?: string;
          team_id?: string | null;
          logo_url?: string | null;
        };
        Relationships: [];
      };
      fanta_roster: {
        Row: {
          id: string;
          team_ref: string;
          player_name: string;
          role: "P" | "D" | "C" | "A" | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          team_ref: string;
          player_name: string;
          role?: "P" | "D" | "C" | "A" | null;
          photo_url?: string | null;
        };
        Update: {
          player_name?: string;
          role?: "P" | "D" | "C" | "A" | null;
          photo_url?: string | null;
        };
        Relationships: [];
      };
      fanta_credits: {
        Row: {
          user_id: string;
          balance: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance?: number;
          updated_at?: string;
        };
        Update: {
          balance?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      fanta_bet_rounds: {
        Row: {
          id: string;
          day: number;
          title: string | null;
          status: "open" | "closed" | "settled";
          created_at: string;
        };
        Insert: {
          day: number;
          title?: string | null;
          status?: "open" | "closed" | "settled";
        };
        Update: {
          day?: number;
          title?: string | null;
          status?: "open" | "closed" | "settled";
        };
        Relationships: [];
      };
      fanta_bet_matches: {
        Row: {
          id: string;
          round_id: string;
          home_team: string | null;
          away_team: string | null;
          home_name: string;
          away_name: string;
          odd_1: number;
          odd_x: number;
          odd_2: number;
          result: "1" | "X" | "2" | null;
          settled_at: string | null;
          created_at: string;
        };
        Insert: {
          round_id: string;
          home_team?: string | null;
          away_team?: string | null;
          home_name: string;
          away_name: string;
          odd_1?: number;
          odd_x?: number;
          odd_2?: number;
          result?: "1" | "X" | "2" | null;
          settled_at?: string | null;
        };
        Update: {
          home_team?: string | null;
          away_team?: string | null;
          home_name?: string;
          away_name?: string;
          odd_1?: number;
          odd_x?: number;
          odd_2?: number;
          result?: "1" | "X" | "2" | null;
          settled_at?: string | null;
        };
        Relationships: [];
      };
      fanta_bets: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          pick: "1" | "X" | "2";
          stake: number;
          odd: number;
          status: "pending" | "won" | "lost";
          payout: number;
          created_at: string;
        };
        Insert: {
          match_id: string;
          user_id: string;
          pick: "1" | "X" | "2";
          stake: number;
          odd: number;
          status?: "pending" | "won" | "lost";
          payout?: number;
        };
        Update: {
          pick?: "1" | "X" | "2";
          stake?: number;
          odd?: number;
          status?: "pending" | "won" | "lost";
          payout?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
