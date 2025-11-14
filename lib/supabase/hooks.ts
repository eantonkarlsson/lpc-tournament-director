'use client'

import { useEffect, useState } from 'react'
import { createClient } from './client'
import type {
  POYRanking,
  Registration,
  Tournament,
  BlindStructure,
  BlindLevel,
  PayoutStructure
} from '@/lib/types'

// Hook for POY rankings (aggregated from poy_tournament_points view)
export function usePOYRankings() {
  const [rankings, setRankings] = useState<POYRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    async function fetchRankings() {
      try {
        // Fetch per-tournament points from the view
        const { data, error } = await supabase
          .from('poy_tournament_points')
          .select('*')

        if (error) throw error

        // Aggregate by player
        const playerMap = new Map<string, POYRanking>()

        data?.forEach((entry: any) => {
          const existing = playerMap.get(entry.player_id)

          // Parse points as number to avoid string concatenation
          const points = parseFloat(entry.points) || 0
          const earnings = parseFloat(entry.earnings) || 0

          if (existing) {
            existing.total_points += points
            existing.tournaments_played += 1
            existing.total_earnings += earnings
          } else {
            playerMap.set(entry.player_id, {
              player_id: entry.player_id,
              player_name: entry.player_name,
              total_points: points,
              tournaments_played: 1,
              total_earnings: earnings
            })
          }
        })

        // Convert to array and sort by points
        const aggregated = Array.from(playerMap.values())
          .sort((a, b) => b.total_points - a.total_points)

        setRankings(aggregated)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()

    // Subscribe to both tournament_results AND registrations changes to trigger refetch
    // (registrations affect POY due to rebuy counts and prize pool)
    const channel = supabase
      .channel('poy-rankings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_results' },
        () => {
          console.log('tournament_results changed, refetching POY rankings')
          fetchRankings()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        () => {
          console.log('registrations changed, refetching POY rankings')
          fetchRankings()
        }
      )
      .subscribe((status) => {
        console.log('POY rankings subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return { rankings, loading, error }
}

// Hook for real-time tournament registrations (eliminations)
export function useRegistrations(tournamentId: string) {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false)
      return
    }

    async function fetchRegistrations() {
      try {
        const { data, error } = await supabase
          .from('registrations')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('created_at', { ascending: true })

        if (error) throw error
        setRegistrations(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchRegistrations()

    // Subscribe to changes
    const channel = supabase
      .channel(`registrations-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRegistrations((current) => [...current, payload.new as Registration])
          } else if (payload.eventType === 'UPDATE') {
            setRegistrations((current) =>
              current.map((e) => (e.id === payload.new.id ? payload.new as Registration : e))
            )
          } else if (payload.eventType === 'DELETE') {
            setRegistrations((current) => current.filter((e) => e.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId, supabase])

  return { registrations, loading, error }
}

// Hook for tournament details
export function useTournament(tournamentId: string) {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false)
      return
    }

    async function fetchTournament() {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single()

        if (error) throw error
        setTournament(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchTournament()

    // Subscribe to changes
    const channel = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`
        },
        (payload) => {
          setTournament(payload.new as Tournament)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId, supabase])

  return { tournament, loading, error }
}

// Hook for blind structures (transforms to BlindLevel[] with is_break field)
export function useBlindStructure(tournamentId: string) {
  const [blinds, setBlinds] = useState<BlindLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false)
      return
    }

    async function fetchBlinds() {
      try {
        const { data, error } = await supabase
          .from('blind_structures')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('level', { ascending: true })

        if (error) throw error

        // Transform database BlindStructure to frontend BlindLevel model
        const transformedBlinds: BlindLevel[] = []
        const rawBlinds = (data || []) as BlindStructure[]

        console.log('🎯 Raw blinds from database:', rawBlinds)

        rawBlinds.forEach((blind) => {
          // Add the regular blind level with is_break: false
          transformedBlinds.push({
            tournament_id: blind.tournament_id,
            level: blind.level,
            small_blind: blind.small_blind,
            big_blind: blind.big_blind,
            ante: blind.ante,
            duration: blind.duration,
            is_break: false
          })

          // If this level has a break, add a break level after it
          if (blind.break_duration && blind.break_duration > 0) {
            const breakLevel: BlindLevel = {
              tournament_id: blind.tournament_id,
              level: 0,
              small_blind: 0,
              big_blind: 0,
              ante: 0,
              duration: blind.break_duration,
              is_break: true
            }
            transformedBlinds.push(breakLevel)
            console.log(`🎯 Inserted break after Level ${blind.level}:`, breakLevel)
          }
        })

        console.log('🎯 Final blinds with breaks:', transformedBlinds)
        setBlinds(transformedBlinds)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchBlinds()
  }, [tournamentId, supabase])

  return { blinds, loading, error }
}

// Hook for payout structures
export function usePayoutStructure(tournamentId: string) {
  const [payouts, setPayouts] = useState<PayoutStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false)
      return
    }

    async function fetchPayouts() {
      try {
        const { data, error } = await supabase
          .from('payout_structures')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('placement', { ascending: true })

        if (error) throw error
        setPayouts(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchPayouts()
  }, [tournamentId, supabase])

  return { payouts, loading, error }
}
