export * from './database'

// Application-specific types

export interface PlayerWithStats extends Player {
  rank?: number
  tournaments_played?: number
  average_finish?: number
}

export interface TournamentWithDetails extends Tournament {
  entries_count?: number
  remaining_players?: number
  current_blind_level?: BlindStructure
}

export interface RegistrationWithPlayer extends Registration {
  player?: Player
}

export interface PayoutWithStatus extends PayoutStructure {
  is_paid?: boolean
  is_next?: boolean
  is_bubble?: boolean
}

// Frontend-only blind structure model with is_break field
// This is transformed from database BlindStructure in the hooks
export interface BlindLevel {
  tournament_id: string
  level: number
  small_blind: number
  big_blind: number
  ante: number
  duration: number
  is_break: boolean
}

// Timer state
export interface TimerState {
  isRunning: boolean
  isPaused: boolean
  currentLevel: number
  timeRemaining: number
  totalLevels: number
  blinds: BlindLevel[]
}

// Import types from database
import type { Player, Tournament, Registration, BlindStructure, PayoutStructure } from './database'
