'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import type { Database } from '@/lib/types/database'
import type { BettingPoll, BettingOption, BettingVoteCount, Player, PlayerBettingStats } from '@/lib/types/database'

export default function VotePage() {
  const params = useParams()
  const router = useRouter()
  const pollId = params.pollId as string
  const supabase = createClient()

  const [poll, setPoll] = useState<BettingPoll | null>(null)
  const [options, setOptions] = useState<BettingOption[]>([])
  const [voteCounts, setVoteCounts] = useState<BettingVoteCount[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState<number>(0)
  const [bettingCode, setBettingCode] = useState('')
  const [validatedPlayer, setValidatedPlayer] = useState<Player | null>(null)
  const [playerBalance, setPlayerBalance] = useState<number>(0)
  const [hasVoted, setHasVoted] = useState(false)
  const [userVotedOptionId, setUserVotedOptionId] = useState<string | null>(null)
  const [userBetAmount, setUserBetAmount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load poll data
  useEffect(() => {
    const loadPoll = async () => {
      try {
        // Fetch poll
        const { data: pollData, error: pollError } = await supabase
          .from('betting_polls')
          .select('*')
          .eq('id', pollId)
          .single()

        if (pollError) throw pollError
        if (!pollData) throw new Error('Poll not found')

        setPoll(pollData)

        // Fetch options
        const { data: optionsData, error: optionsError } = await supabase
          .from('betting_options')
          .select('*')
          .eq('poll_id', pollId)
          .order('display_order', { ascending: true })

        if (optionsError) throw optionsError
        setOptions(optionsData || [])

        // Fetch vote counts
        const { data: voteCountsData, error: voteCountsError } = await supabase
          .from('betting_vote_counts')
          .select('*')
          .eq('poll_id', pollId)

        if (voteCountsError) throw voteCountsError
        setVoteCounts(voteCountsData || [])

        // Check if user has a saved betting code (but don't auto-validate)
        const savedCode = localStorage.getItem('betting_code')
        if (savedCode) {
          setBettingCode(savedCode)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load poll')
      } finally {
        setLoading(false)
      }
    }

    loadPoll()
  }, [pollId, supabase])

  // Subscribe to vote count updates
  useEffect(() => {
    const channel = supabase
      .channel(`poll_${pollId}`)
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

  const handleValidateCode = async () => {
    if (!bettingCode.trim()) {
      setError('Please enter your betting code')
      return
    }

    setValidating(true)
    setError(null)

    try {
      // Find player by betting code
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('betting_code', bettingCode.trim().toLowerCase())
        .single()

      if (playerError || !player) {
        throw new Error('Invalid betting code. Please check and try again.')
      }

      const typedPlayer = player as Player

      // Check if this player has already voted
      const { data: existingVote } = await supabase
        .from('betting_votes')
        .select('option_id, bet_amount')
        .eq('poll_id', pollId)
        .eq('player_id', typedPlayer.id)
        .single()

      if (existingVote) {
        // Player has already voted - show them their vote
        setUserVotedOptionId((existingVote as any).option_id)
        setUserBetAmount((existingVote as any).bet_amount || 0)
        setHasVoted(true)
      }

      setValidatedPlayer(typedPlayer)

      // Save betting code to localStorage for future use
      localStorage.setItem('betting_code', typedPlayer.betting_code || bettingCode.trim().toLowerCase())

      // Get player's balance for this tournament
      console.log('Fetching balance for:', {
        player_id: typedPlayer.id,
        tournament_id: poll!.tournament_id
      })

      // First try the view
      const { data: statsData, error: statsError } = await supabase
        .from('player_betting_stats')
        .select('*')
        .eq('player_id', typedPlayer.id)
        .eq('tournament_id', poll!.tournament_id)
        .single()

      console.log('Stats view result:', { statsData, statsError })

      if (statsData) {
        console.log('Using stats view, available balance:', (statsData as any).available_balance)
        setPlayerBalance((statsData as any).available_balance)
      } else {
        // Try querying the balance table directly
        const { data: balanceData, error: balanceError } = await supabase
          .from('lpc_bucks_balances')
          .select('*')
          .eq('player_id', typedPlayer.id)
          .eq('tournament_id', poll!.tournament_id)
          .single()

        console.log('Direct balance query result:', { balanceData, balanceError })

        if (balanceData) {
          // Calculate available balance by subtracting active bets
          const { data: activeBets } = await supabase
            .from('betting_votes')
            .select('bet_amount')
            .eq('player_id', typedPlayer.id)
            .neq('poll_id', poll!.id)

          const totalActiveBets = activeBets?.reduce((sum, vote) => sum + ((vote as any).bet_amount || 0), 0) || 0
          const availableBalance = (balanceData as any).balance - totalActiveBets

          console.log('Calculated available balance:', {
            balance: (balanceData as any).balance,
            totalActiveBets,
            availableBalance
          })

          setPlayerBalance(availableBalance)
        } else {
          // No balance record - this shouldn't happen if the SQL script ran
          console.error('No balance found for player:', {
            player_id: typedPlayer.id,
            tournament_id: poll!.tournament_id,
            statsError,
            balanceError
          })
          setPlayerBalance(0)
          setError('No LPC Bucks balance found. Please contact an administrator.')
        }
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
      setValidatedPlayer(null)
      setPlayerBalance(0)
    } finally {
      setValidating(false)
    }
  }

  const handleVote = async () => {
    if (!selectedOption || !poll || !validatedPlayer) return

    // Validate bet amount
    if (betAmount < 0) {
      setError('Bet amount cannot be negative')
      return
    }

    if (betAmount > playerBalance) {
      setError(`Insufficient balance. You have ${playerBalance} LPC Bucks available`)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Submit vote with bet amount
      const { error: voteError } = await (supabase
        .from('betting_votes') as any)
        .insert({
          poll_id: pollId,
          option_id: selectedOption,
          player_id: validatedPlayer.id,
          bet_amount: betAmount,
        })

      if (voteError) {
        console.error('Vote submission error:', voteError)
        if (voteError.code === '23505') { // Unique constraint violation
          throw new Error('You have already voted in this poll')
        }
        // Show detailed error message
        throw new Error(voteError.message || 'Failed to submit vote')
      }

      // Update UI to show vote was submitted
      setUserBetAmount(betAmount)
      setUserVotedOptionId(selectedOption)
      setHasVoted(true)

      // Reload vote counts to show updated results
      const { data: updatedVoteCounts } = await supabase
        .from('betting_vote_counts')
        .select('*')
        .eq('poll_id', pollId)

      if (updatedVoteCounts) {
        setVoteCounts(updatedVoteCounts)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="animate-pulse text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Loading poll...
          </div>
        </div>
      </div>
    )
  }

  if (error && !poll) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <Card className="bg-slate-900/90 border-slate-700 p-8 max-w-md">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-slate-300 text-lg">{error}</p>
        </Card>
      </div>
    )
  }

  if (!poll?.is_active) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <Card className="bg-slate-900/90 border-slate-700 p-8 max-w-md">
          <h1 className="text-3xl font-bold text-yellow-500 mb-4">Poll Closed</h1>
          <p className="text-slate-300 text-lg">This poll is no longer accepting votes.</p>
        </Card>
      </div>
    )
  }

  const totalVotes = voteCounts.reduce((sum, vc) => sum + vc.vote_count, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-2xl mx-auto py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            onClick={() => router.push('/vote')}
            variant="outline"
            className="border-slate-600 hover:bg-slate-800"
          >
            ← Back to All Polls
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <Badge variant="outline" className="text-lg px-4 py-2 bg-slate-800 text-white border-slate-600">
            Live Poll
          </Badge>
          <h1 className="text-5xl font-bold text-white mb-4">
            {poll?.title}
          </h1>
          
        </div>

        {hasVoted ? (
          /* Results View */
          <Card className="bg-slate-900/90 border-slate-700 p-8">
            <div className="text-center mb-6">
              <Badge variant="default" className="text-xl px-6 py-3 bg-green-600">
                ✓ Vote Submitted!
              </Badge>
            </div>

            <h2 className="text-2xl font-bold text-white mb-6">Live Results</h2>

            <div className="space-y-6">
              {voteCounts.map((voteCount) => {
                const percentage = totalVotes > 0 ? (voteCount.vote_count / totalVotes) * 100 : 0
                const isSelected = userVotedOptionId === voteCount.option_id

                return (
                  <div key={voteCount.option_id} className={`space-y-2 ${isSelected ? 'ring-2 ring-green-500 rounded-lg p-4' : ''}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className={`text-xl font-semibold ${isSelected ? 'text-green-400' : 'text-white'}`}>
                          {isSelected && '→ '}{voteCount.option_text}
                        </div>
                        {isSelected && userBetAmount > 0 && (
                          <div className="text-sm text-green-300 mt-1">
                            Your bet: {userBetAmount} LPC $
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-slate-800 border-slate-600 text-yellow-500 font-bold">
                          {voteCount.total_bet_amount} LPC $
                        </Badge>
                      </div>
                    </div>

                    <div className="w-full bg-slate-800 rounded-full h-6 overflow-hidden border border-slate-700">
                      <div
                        className={`h-full transition-all duration-500 ease-out ${
                          isSelected ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-slate-600 to-slate-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-300">Total Votes:</span>
                <span className="text-2xl font-bold text-white">{totalVotes}</span>
              </div>
            </div>
          </Card>
        ) : (
          /* Voting View */
          <Card className="bg-slate-900/90 border-slate-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Cast Your Vote</h2>

            {!validatedPlayer ? (
              /* Code Validation Form */
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-300">Your Betting Code</Label>
                  <input
                    type="text"
                    value={bettingCode}
                    onChange={(e) => setBettingCode(e.target.value.toLowerCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && bettingCode.trim()) {
                        handleValidateCode()
                      }
                    }}
                    placeholder="e.g., wild-bear"
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 lowercase text-xl text-center tracking-wider"
                    autoFocus
                  />
                  <p className="text-xs text-slate-400 text-center">Enter your unique betting code (format: adjective-noun)</p>
                </div>

                {error && (
                  <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg">
                    <p className="text-red-300">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleValidateCode}
                  disabled={validating || !bettingCode.trim()}
                  className="w-full h-14 text-lg font-bold bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50 border border-slate-600"
                >
                  {validating ? 'Validating...' : 'Continue'}
                </Button>
              </div>
            ) : (
              /* Vote Selection Form */
              <div className="space-y-6">
                <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg mb-6">
                  <p className="text-white text-center font-semibold">Signed in as {validatedPlayer.name}</p>
                  <p className="text-slate-300 text-center text-sm mt-2">
                    Available Balance: <span className="font-bold text-xl text-yellow-500">{playerBalance}</span> LPC Bucks
                  </p>
                </div>

                {/* Bet Amount Input */}
                <div className="space-y-2">
                  <Label className="text-lg font-semibold text-slate-300">Bet Amount (LPC Bucks)</Label>
                  <input
                    type="number"
                    min="0"
                    max={playerBalance}
                    value={betAmount === 0 ? '' : betAmount}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : Number(e.target.value)
                      setBetAmount(Math.max(0, Math.min(playerBalance, isNaN(value) ? 0 : value)))
                    }}
                    onBlur={(e) => {
                      // Ensure we have a valid number on blur
                      if (e.target.value === '' || betAmount === 0) {
                        setBetAmount(0)
                      }
                    }}
                    placeholder="Enter bet amount"
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 text-xl text-center"
                  />
                  <p className="text-xs text-slate-400 text-center">
                    Maximum: <span className="text-yellow-500 font-semibold">{playerBalance}</span> LPC Bucks
                  </p>
                </div>

                <div className="space-y-4">
                  {options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedOption(option.id)}
                      className={`w-full text-left px-6 py-4 rounded-lg border-2 transition-all ${
                        selectedOption === option.id
                          ? 'border-slate-500 bg-slate-700/50 shadow-lg'
                          : 'border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-750'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedOption === option.id ? 'border-slate-400 bg-slate-600' : 'border-slate-600'
                        }`}>
                          {selectedOption === option.id && (
                            <div className="w-3 h-3 bg-white rounded-full" />
                          )}
                        </div>
                        <span className="text-xl font-semibold text-white">
                          {option.option_text}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg">
                    <p className="text-red-300">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleVote}
                  disabled={!selectedOption || submitting}
                  className="w-full h-14 text-lg font-bold bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50 border border-slate-600"
                >
                  {submitting ? 'Submitting...' : 'Submit Vote'}
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
