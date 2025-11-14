'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BettingScreen } from '@/components/Betting/BettingScreen'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { Database } from '@/lib/types/database'
import type { BettingPoll, BettingVoteCount, BettingOption } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

interface WinnerResult {
  player_id: string
  player_name: string
  bet_amount: number
  winnings: number
}

function DisplayBettingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pollId = searchParams.get('poll') || ''
  const supabase = createClient()

  const [poll, setPoll] = useState<BettingPoll | null>(null)
  const [voteCounts, setVoteCounts] = useState<BettingVoteCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPollPicker, setShowPollPicker] = useState(false)
  const [availablePolls, setAvailablePolls] = useState<BettingPoll[]>([])
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [options, setOptions] = useState<BettingOption[]>([])
  const [selectedWinningOption, setSelectedWinningOption] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [winners, setWinners] = useState<WinnerResult[]>([])
  const [showWinnersDialog, setShowWinnersDialog] = useState(false)

  // Load poll data
  useEffect(() => {
    const loadPoll = async () => {
      try {
        if (!pollId) {
          throw new Error('No poll ID provided')
        }

        // Fetch poll
        const { data: pollData, error: pollError } = await supabase
          .from('betting_polls')
          .select('*')
          .eq('id', pollId)
          .single()

        if (pollError) throw pollError
        if (!pollData) throw new Error('Poll not found')

        setPoll(pollData as BettingPoll)

        // Fetch vote counts
        const { data: voteCountsData, error: voteCountsError } = await supabase
          .from('betting_vote_counts')
          .select('*')
          .eq('poll_id', pollId)

        if (voteCountsError) throw voteCountsError
        setVoteCounts(voteCountsData || [])

        // Load available polls for the same tournament
        const typedPollData = pollData as BettingPoll
        if (typedPollData.tournament_id) {
          const { data: pollsData } = await supabase
            .from('betting_polls')
            .select('*')
            .eq('tournament_id', typedPollData.tournament_id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

          setAvailablePolls(pollsData || [])
        }

        // Fetch options for this poll
        const { data: optionsData } = await supabase
          .from('betting_options')
          .select('*')
          .eq('poll_id', pollId)
          .order('display_order')

        setOptions(optionsData || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load poll')
      } finally {
        setLoading(false)
      }
    }

    loadPoll()
  }, [pollId, supabase])

  // Handle poll change
  const handlePollChange = (newPollId: string) => {
    router.push(`/display-betting?poll=${newPollId}`)
    setShowPollPicker(false)
  }

  // Handle poll resolution
  const handleResolvePoll = async () => {
    if (!selectedWinningOption || !poll) return

    setResolving(true)
    try {
      const { data, error } = await (supabase as any).rpc('resolve_poll', {
        p_poll_id: poll.id,
        p_winning_option_id: selectedWinningOption,
      })

      if (error) throw error

      // Update local poll state
      setPoll({
        ...poll,
        winning_option_id: selectedWinningOption,
        resolved_at: new Date().toISOString(),
        is_active: false,
      })

      // Store winners and show results
      setWinners(data || [])
      setShowResolveDialog(false)
      setShowWinnersDialog(true)

      // Reload vote counts to show final state
      const { data: voteCountsData } = await supabase
        .from('betting_vote_counts')
        .select('*')
        .eq('poll_id', poll.id)

      if (voteCountsData) {
        setVoteCounts(voteCountsData)
      }
    } catch (err) {
      console.error('Failed to resolve poll:', err)
      alert('Failed to resolve poll: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setResolving(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        setShowPollPicker(true)
      } else if (e.key === 'r' || e.key === 'R') {
        if (poll && poll.is_active && !poll.resolved_at) {
          setShowResolveDialog(true)
        }
      } else if (e.key === 'Escape') {
        setShowPollPicker(false)
        setShowResolveDialog(false)
        setShowWinnersDialog(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [poll])

  // Subscribe to vote count updates
  useEffect(() => {
    if (!pollId) return

    const channel = supabase
      .channel(`poll_display_${pollId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'betting_votes',
          filter: `poll_id=eq.${pollId}`,
        },
        async () => {
          // Reload vote counts
          const { data: voteCountsData } = await supabase
            .from('betting_vote_counts')
            .select('*')
            .eq('poll_id', pollId)

          if (voteCountsData) {
            setVoteCounts(voteCountsData)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pollId, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="text-center">
          <div className="animate-pulse text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Loading betting poll...
          </div>
        </div>
      </div>
    )
  }

  if (error || !poll) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="text-center">
          <div className="text-4xl font-bold text-red-500 mb-4">Error</div>
          <p className="text-xl text-slate-300">{error || 'Poll not found'}</p>
        </div>
      </div>
    )
  }

  // Construct voting URL - use landing page
  const votingUrl = `${window.location.origin}/vote`

  // Debug logging
  console.log('Poll state:', {
    is_active: poll.is_active,
    resolved_at: poll.resolved_at,
    winning_option_id: poll.winning_option_id,
    shouldShowResolve: poll.is_active && !poll.resolved_at,
    shouldShowWinners: !!poll.resolved_at
  })

  return (
    <>
      <BettingScreen
        poll={poll}
        voteCounts={voteCounts}
        votingUrl={votingUrl}
        winningOptionId={poll.winning_option_id}
      />

      {/* Action Buttons - Fixed position in top-right */}
      <div className="fixed top-6 right-6 z-50 flex gap-3">
        <Button
          onClick={() => setShowPollPicker(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 text-lg shadow-lg"
        >
          Change Poll (P)
        </Button>

        {poll.is_active && !poll.resolved_at && (
          <Button
            onClick={() => setShowResolveDialog(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 text-lg shadow-lg"
          >
            Resolve Poll (R)
          </Button>
        )}

        {poll.resolved_at && (
          <Button
            onClick={() => setShowWinnersDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 text-lg shadow-lg"
          >
            Show Winners
          </Button>
        )}
      </div>

      {/* Poll Picker Dialog */}
      <Dialog open={showPollPicker} onOpenChange={setShowPollPicker}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Select Poll</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {availablePolls.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No active polls available</p>
            ) : (
              availablePolls.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePollChange(p.id)}
                  className={`w-full text-left px-6 py-4 rounded-lg border-2 transition-all ${
                    p.id === pollId
                      ? 'border-purple-500 bg-purple-900/50 shadow-lg shadow-purple-500/20'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-semibold text-white">
                      {p.title}
                    </span>
                    {p.id === pollId && (
                      <span className="text-sm text-purple-400 font-medium">Current</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    Code: {p.id}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400 text-center">
              Press <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-600">P</kbd> to open poll picker or{' '}
              <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-600">ESC</kbd> to close
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Poll Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Resolve Poll</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select the winning option to resolve this poll and distribute winnings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {options.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No options available</p>
            ) : (
              options.map((option) => {
                const voteCount = voteCounts.find(vc => vc.option_id === option.id)
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedWinningOption(option.id)}
                    className={`w-full text-left px-6 py-4 rounded-lg border-2 transition-all ${
                      selectedWinningOption === option.id
                        ? 'border-green-500 bg-green-900/50 shadow-lg shadow-green-500/20'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-semibold text-white">
                        {option.option_text}
                      </span>
                      {selectedWinningOption === option.id && (
                        <span className="text-sm text-green-400 font-medium">Selected Winner</span>
                      )}
                    </div>
                    {voteCount && (
                      <div className="text-sm text-slate-400 mt-1">
                        {voteCount.total_bet_amount} LPC from {voteCount.vote_count} {voteCount.vote_count === 1 ? 'vote' : 'votes'}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
            <p className="text-sm text-slate-400">
              Press <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-600">ESC</kbd> to cancel
            </p>
            <Button
              onClick={handleResolvePoll}
              disabled={!selectedWinningOption || resolving}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2"
            >
              {resolving ? 'Resolving...' : 'Confirm & Resolve'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Winners Dialog */}
      <Dialog open={showWinnersDialog} onOpenChange={setShowWinnersDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
              🏆 Poll Winners
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {poll.title}
            </DialogDescription>
          </DialogHeader>

          {winners.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-2xl text-slate-400">No winners - no one bet on the winning option!</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {winners.map((winner, index) => (
                  <div
                    key={winner.player_id}
                    className="bg-gradient-to-r from-slate-800 to-slate-750 border border-slate-700 rounded-lg px-6 py-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-bold text-yellow-500">
                          #{index + 1}
                        </span>
                        <div>
                          <div className="text-xl font-semibold text-white">
                            {winner.player_name}
                          </div>
                          <div className="text-sm text-slate-400">
                            Bet: {winner.bet_amount} LPC
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-400">
                          +{winner.winnings} LPC
                        </div>
                        <div className="text-xs text-slate-400">
                          Total Winnings
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold text-slate-300">Total Distributed:</span>
                  <span className="text-2xl font-bold text-green-400">
                    {winners.reduce((sum, w) => sum + w.winnings, 0)} LPC
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-slate-700 text-center">
            <p className="text-sm text-slate-400">
              Winnings have been added to player balances
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )

}

export default function DisplayBettingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="text-center">
          <div className="animate-pulse text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Loading...
          </div>
        </div>
      </div>
    }>
      <DisplayBettingContent />
    </Suspense>
  )
}
