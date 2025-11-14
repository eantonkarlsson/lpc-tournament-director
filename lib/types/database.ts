export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string
          date: string
          title: string
          location: string | null
          buy_in: number | null
          max_seats: number | null
          created_at: string
          structure: string | null
          skill_level_split: boolean | null
          payment_later: boolean | null
          tiered_buyin: boolean | null
          buyin_a: number | null
          buyin_b: number | null
          buyin_a_label: string | null
          buyin_b_label: string | null
          alias: string | null
        }
        Insert: {
          id?: string
          date: string
          title: string
          location?: string | null
          buy_in?: number | null
          max_seats?: number | null
          created_at?: string
          structure?: string | null
          skill_level_split?: boolean | null
          payment_later?: boolean | null
          tiered_buyin?: boolean | null
          buyin_a?: number | null
          buyin_b?: number | null
          buyin_a_label?: string | null
          buyin_b_label?: string | null
          alias?: string | null
        }
        Update: {
          id?: string
          date?: string
          title?: string
          location?: string | null
          buy_in?: number | null
          max_seats?: number | null
          created_at?: string
          structure?: string | null
          skill_level_split?: boolean | null
          payment_later?: boolean | null
          tiered_buyin?: boolean | null
          buyin_a?: number | null
          buyin_b?: number | null
          buyin_a_label?: string | null
          buyin_b_label?: string | null
          alias?: string | null
        }
      }
      players: {
        Row: {
          id: string
          name: string
          phone_number: string | null
          betting_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone_number?: string | null
          betting_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone_number?: string | null
          betting_code?: string | null
          created_at?: string
        }
      }
      tournament_results: {
        Row: {
          id: number
          created_at: string
          tournament_id: string
          player_id: string
          placement: number
          number_of_rebuys: number
          number_of_addons: number
        }
        Insert: {
          id?: number
          created_at?: string
          tournament_id: string
          player_id: string
          placement: number
          number_of_rebuys?: number
          number_of_addons?: number
        }
        Update: {
          id?: number
          created_at?: string
          tournament_id?: string
          player_id?: string
          placement?: number
          number_of_rebuys?: number
          number_of_addons?: number
        }
      }
      registrations: {
        Row: {
          id: string
          tournament_id: string
          player_id: string | null
          full_name: string
          phone_number: string | null
          has_paid: boolean | null
          is_confirmed: boolean | null
          created_at: string
          number_of_rebuys: number | null
          number_of_addons: number | null
          skill_level: string | null
          sms_sent_at: string | null
          sms_status: string | null
          sms_error: string | null
          sms_message_id: string | null
          voting_preferences: any | null
          pseudonym: string | null
          selected_buyin_tier: string | null
          buy_in_amount: number | null
          placement: number | null
          eliminated_at: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          player_id?: string | null
          full_name: string
          phone_number?: string | null
          has_paid?: boolean | null
          is_confirmed?: boolean | null
          created_at?: string
          number_of_rebuys?: number | null
          number_of_addons?: number | null
          skill_level?: string | null
          sms_sent_at?: string | null
          sms_status?: string | null
          sms_error?: string | null
          sms_message_id?: string | null
          voting_preferences?: any | null
          pseudonym?: string | null
          selected_buyin_tier?: string | null
          buy_in_amount?: number | null
          placement?: number | null
          eliminated_at?: string | null
        }
        Update: {
          id?: string
          tournament_id?: string
          player_id?: string | null
          full_name?: string
          phone_number?: string | null
          has_paid?: boolean | null
          is_confirmed?: boolean | null
          created_at?: string
          number_of_rebuys?: number | null
          number_of_addons?: number | null
          skill_level?: string | null
          sms_sent_at?: string | null
          sms_status?: string | null
          sms_error?: string | null
          sms_message_id?: string | null
          voting_preferences?: any | null
          pseudonym?: string | null
          selected_buyin_tier?: string | null
          buy_in_amount?: number | null
          placement?: number | null
          eliminated_at?: string | null
        }
      }
      blind_structures: {
        Row: {
          id: string
          tournament_id: string
          level: number
          small_blind: number
          big_blind: number
          ante: number
          duration: number
          break_duration: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          level: number
          small_blind: number
          big_blind: number
          ante?: number
          duration: number
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          level?: number
          small_blind?: number
          big_blind?: number
          ante?: number
          duration?: number
          created_at?: string
        }
      }
      payout_structures: {
        Row: {
          id: string
          tournament_id: string
          placement: number
          amount: number
          amount_premium?: number
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          placement: number
          amount: number
          amount_premium?: number
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          placement?: number
          amount?: number
          amount_premium?: number
          created_at?: string
        }
      }
      betting_polls: {
        Row: {
          id: string
          tournament_id: string
          title: string
          is_active: boolean
          created_at: string
          closed_at: string | null
          winning_option_id: string | null
          resolved_at: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          title: string
          is_active?: boolean
          created_at?: string
          closed_at?: string | null
          winning_option_id?: string | null
          resolved_at?: string | null
        }
        Update: {
          id?: string
          tournament_id?: string
          title?: string
          is_active?: boolean
          created_at?: string
          closed_at?: string | null
          winning_option_id?: string | null
          resolved_at?: string | null
        }
      }
      betting_options: {
        Row: {
          id: string
          poll_id: string
          option_text: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          option_text: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          poll_id?: string
          option_text?: string
          display_order?: number
          created_at?: string
        }
      }
      betting_votes: {
        Row: {
          id: string
          poll_id: string
          option_id: string
          player_id: string | null
          bet_amount: number
          winnings: number
          created_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          option_id: string
          player_id?: string | null
          bet_amount?: number
          winnings?: number
          created_at?: string
        }
        Update: {
          id?: string
          poll_id?: string
          option_id?: string
          player_id?: string | null
          bet_amount?: number
          winnings?: number
          created_at?: string
        }
      }
      lpc_bucks_balances: {
        Row: {
          id: string
          player_id: string
          tournament_id: string
          balance: number
          starting_balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          player_id: string
          tournament_id: string
          balance?: number
          starting_balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          tournament_id?: string
          balance?: number
          starting_balance?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      poy_rankings: {
        Row: {
          player_id: string
          player_name: string
          total_points: number
          tournaments_played: number
          total_earnings: number
        }
      }
      betting_vote_counts: {
        Row: {
          option_id: string
          poll_id: string
          option_text: string
          display_order: number
          vote_count: number
          total_bet_amount: number
        }
      }
      player_betting_stats: {
        Row: {
          player_id: string
          player_name: string
          tournament_id: string
          current_balance: number
          starting_balance: number
          total_active_bets: number
          available_balance: number
          total_votes: number
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type Player = Database['public']['Tables']['players']['Row']
export type Registration = Database['public']['Tables']['registrations']['Row']
export type TournamentResult = Database['public']['Tables']['tournament_results']['Row']
export type BlindStructure = Database['public']['Tables']['blind_structures']['Row']
export type PayoutStructure = Database['public']['Tables']['payout_structures']['Row']
export type BettingPoll = Database['public']['Tables']['betting_polls']['Row']
export type BettingOption = Database['public']['Tables']['betting_options']['Row']
export type BettingVote = Database['public']['Tables']['betting_votes']['Row']
export type LPCBucksBalance = Database['public']['Tables']['lpc_bucks_balances']['Row']
export type POYRanking = Database['public']['Views']['poy_rankings']['Row']
export type BettingVoteCount = Database['public']['Views']['betting_vote_counts']['Row']
export type PlayerBettingStats = Database['public']['Views']['player_betting_stats']['Row']

// Insert types
export type TournamentInsert = Database['public']['Tables']['tournaments']['Insert']
export type PlayerInsert = Database['public']['Tables']['players']['Insert']
export type RegistrationInsert = Database['public']['Tables']['registrations']['Insert']
export type BlindStructureInsert = Database['public']['Tables']['blind_structures']['Insert']
export type PayoutStructureInsert = Database['public']['Tables']['payout_structures']['Insert']

// Update types
export type TournamentUpdate = Database['public']['Tables']['tournaments']['Update']
export type PlayerUpdate = Database['public']['Tables']['players']['Update']
export type RegistrationUpdate = Database['public']['Tables']['registrations']['Update']
export type BlindStructureUpdate = Database['public']['Tables']['blind_structures']['Update']
export type PayoutStructureUpdate = Database['public']['Tables']['payout_structures']['Update']
