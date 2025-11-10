'use client'

import { useEffect, useState } from 'react'
import { createClient } from './client'
import type {
  POYRanking,
  Registration,
  Tournament,
  BlindStructure,
  PayoutStructure
} from '@/lib/types'

// Hook for POY rankings (calculated from tournament_results view)
export function usePOYRankings() {
  const [rankings, setRankings] = useState<POYRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    async function fetchRankings() {
      try {
        const { data, error } = await supabase
          .from('poy_rankings')
          .select('*')

        if (error) throw error
        setRankings(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()

    // Subscribe to tournament_results changes to trigger refetch
    const channel = supabase
      .channel('tournament-results-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_results' },
        () => {
          fetchRankings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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
  }, [tournamentId])

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
  }, [tournamentId])

  return { tournament, loading, error }
}

// Hook for blind structures
export function useBlindStructure(tournamentId: string) {
  const [blinds, setBlinds] = useState<BlindStructure[]>([])
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
        setBlinds(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchBlinds()
  }, [tournamentId])

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
  }, [tournamentId])

  return { payouts, loading, error }
}
