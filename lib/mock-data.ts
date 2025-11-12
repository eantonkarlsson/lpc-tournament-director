import type { POYRanking, BlindStructure, PayoutStructure, Registration } from './types'

export const MOCK_POY_RANKINGS: POYRanking[] = [
  { player_id: '1', player_name: 'John Smith', total_points: 150, tournaments_played: 5, total_earnings: 5000 },
  { player_id: '2', player_name: 'Sarah Johnson', total_points: 120, tournaments_played: 4, total_earnings: 3500 },
  { player_id: '3', player_name: 'Mike Williams', total_points: 100, tournaments_played: 4, total_earnings: 2800 },
  { player_id: '4', player_name: 'Emily Brown', total_points: 90, tournaments_played: 3, total_earnings: 2200 },
  { player_id: '5', player_name: 'David Davis', total_points: 80, tournaments_played: 3, total_earnings: 1800 },
  { player_id: '6', player_name: 'Lisa Wilson', total_points: 75, tournaments_played: 3, total_earnings: 1500 },
  { player_id: '7', player_name: 'James Taylor', total_points: 70, tournaments_played: 2, total_earnings: 1200 },
  { player_id: '8', player_name: 'Anna Garcia', total_points: 65, tournaments_played: 2, total_earnings: 1000 },
  { player_id: '9', player_name: 'Chris Martinez', total_points: 60, tournaments_played: 2, total_earnings: 900 },
  { player_id: '10', player_name: 'Jessica Lee', total_points: 55, tournaments_played: 2, total_earnings: 800 },
  { player_id: '11', player_name: 'Tom Anderson', total_points: 50, tournaments_played: 1, total_earnings: 700 },
  { player_id: '12', player_name: 'Rachel White', total_points: 45, tournaments_played: 1, total_earnings: 600 },
]

export const MOCK_BLINDS: BlindStructure[] = [
  { id: '1', tournament_id: 'demo', level: 1, small_blind: 25, big_blind: 50, ante: 0, duration: 900, break_duration: null, created_at: '' },
  { id: '2', tournament_id: 'demo', level: 2, small_blind: 50, big_blind: 100, ante: 0, duration: 900, break_duration: null, created_at: '' },
  { id: '3', tournament_id: 'demo', level: 3, small_blind: 75, big_blind: 150, ante: 25, duration: 900, break_duration: null, created_at: '' },
  { id: '4', tournament_id: 'demo', level: 4, small_blind: 100, big_blind: 200, ante: 25, duration: 900, break_duration: 600, created_at: '' }, // 10 min break
  { id: '5', tournament_id: 'demo', level: 5, small_blind: 150, big_blind: 300, ante: 50, duration: 900, break_duration: null, created_at: '' },
  { id: '6', tournament_id: 'demo', level: 6, small_blind: 200, big_blind: 400, ante: 50, duration: 900, break_duration: null, created_at: '' },
  { id: '7', tournament_id: 'demo', level: 7, small_blind: 300, big_blind: 600, ante: 100, duration: 900, break_duration: null, created_at: '' },
  { id: '8', tournament_id: 'demo', level: 8, small_blind: 400, big_blind: 800, ante: 100, duration: 900, break_duration: 600, created_at: '' }, // 10 min break
  { id: '9', tournament_id: 'demo', level: 9, small_blind: 600, big_blind: 1200, ante: 200, duration: 900, break_duration: null, created_at: '' },
  { id: '10', tournament_id: 'demo', level: 10, small_blind: 800, big_blind: 1600, ante: 200, duration: 900, break_duration: null, created_at: '' },
]

export const MOCK_PAYOUTS: PayoutStructure[] = [
  { id: '1', tournament_id: 'demo', placement: 1, amount: 3000, amount_premium: 4500, created_at: '' },
  { id: '2', tournament_id: 'demo', placement: 2, amount: 1800, amount_premium: 2700, created_at: '' },
  { id: '3', tournament_id: 'demo', placement: 3, amount: 1200, amount_premium: 1800, created_at: '' },
  { id: '4', tournament_id: 'demo', placement: 4, amount: 800, amount_premium: 1200, created_at: '' },
  { id: '5', tournament_id: 'demo', placement: 5, amount: 600, amount_premium: 900, created_at: '' },
  { id: '6', tournament_id: 'demo', placement: 6, amount: 400, amount_premium: 600, created_at: '' },
  { id: '7', tournament_id: 'demo', placement: 7, amount: 300, amount_premium: 450, created_at: '' },
  { id: '8', tournament_id: 'demo', placement: 8, amount: 200, amount_premium: 300, created_at: '' },
]

export const MOCK_REGISTRATIONS: Registration[] = MOCK_POY_RANKINGS.slice(0, 12).map((ranking, index) => ({
  id: `reg-${ranking.player_id}`,
  tournament_id: 'demo',
  player_id: ranking.player_id,
  full_name: ranking.player_name,
  phone_number: null,
  has_paid: true,
  is_confirmed: true,
  created_at: '',
  number_of_rebuys: 0,
  number_of_addons: 0,
  skill_level: null,
  sms_sent_at: null,
  sms_status: null,
  sms_error: null,
  sms_message_id: null,
  voting_preferences: null,
  pseudonym: null,
  selected_buyin_tier: index % 2 === 0 ? 'A' : 'B', // Alternate between A (Standard) and B (Premium)
  buy_in_amount: index % 2 === 0 ? 150 : 200, // Standard: 150, Premium: 200
  placement: index < 4 ? index + 9 : null, // First 4 are eliminated
  eliminated_at: index < 4 ? new Date().toISOString() : null,
}))

// Currently 8 players remaining (12 - 4 eliminated)
export const MOCK_REMAINING_PLAYERS = 8

// POY points structure for tournament (based on placement)
export const MOCK_POY_POINTS_STRUCTURE: Record<number, number> = {
  1: 100,  // 1st place
  2: 75,   // 2nd place
  3: 60,   // 3rd place
  4: 50,
  5: 40,
  6: 30,
  7: 20,
  8: 15,
  9: 10,
  10: 5,
  11: 5,
  12: 5,
}
