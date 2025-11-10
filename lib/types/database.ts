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
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone_number?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone_number?: string | null
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
export type POYRanking = Database['public']['Views']['poy_rankings']['Row']

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
