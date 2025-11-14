'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BettingPoll, BettingVote, Player, PlayerBettingStats } from '@/lib/types/database'

interface VoteHistory {
  vote_id: string
  player_id: string
  player_name: string
  poll_id: string
  poll_title: string
  tournament_id: string
  poll_is_active: boolean
  winning_option_id: string | null
  resolved_at: string | null
  voted_option: string
  option_id: string
  bet_amount: number
  winnings: number
  voted_at: string
  result: 'pending' | 'won' | 'lost'
}

interface PollWithVote extends BettingPoll {
  userVote?: BettingVote
  totalVotes?: number
  voteHistory?: VoteHistory
}

export default function VoteLandingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [bettingCode, setBettingCode] = useState('')
  const [validatedPlayer, setValidatedPlayer] = useState<Player | null>(null)
  const [playerStats, setPlayerStats] = useState<PlayerBettingStats | null>(null)
  const [availablePolls, setAvailablePolls] = useState<PollWithVote[]>([])
  const [votedPolls, setVotedPolls] = useState<PollWithVote[]>([])
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-load saved betting code on mount
  useEffect(() => {
    const savedCode = localStorage.getItem('betting_code')
    if (savedCode) {
      setBettingCode(savedCode)
      // Auto-validate if we have a saved code
      handleAutoValidate(savedCode)
    }
  }, [])

  // Subscribe to poll changes for real-time updates
  useEffect(() => {
    if (!validatedPlayer) return

    // Subscribe to betting_polls changes
    const channel = supabase
      .channel(`polls_updates_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'betting_polls',
        },
        (payload) => {
          console.log('Poll update received:', payload)
          // Reload player data without showing loading state
          loadPlayerData(validatedPlayer.id, true)
        }
      )
      .subscribe((status) => {
        console.log('Poll subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [validatedPlayer?.id, supabase])

  const handleAutoValidate = async (code: string) => {
    setValidating(true)
    try {
      const { data: player } = await supabase
        .from('players')
        .select('*')
        .eq('betting_code', code.toLowerCase())
        .single<Player>()

      if (player) {
        setValidatedPlayer(player)
        await loadPlayerData(player.id)
      }
    } catch (err) {
      // Silent fail for auto-validation
      console.log('Auto-validation failed, will require manual login')
    } finally {
      setValidating(false)
    }
  }

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
        .single<Player>()

      if (playerError || !player) {
        throw new Error('Invalid betting code. Please check and try again.')
      }

      setValidatedPlayer(player)

      // Save betting code to localStorage
      localStorage.setItem('betting_code', player.betting_code || bettingCode.trim().toLowerCase())

      await loadPlayerData(player.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
      setValidatedPlayer(null)
    } finally {
      setValidating(false)
    }
  }

  const handleSignOut = () => {
    setValidatedPlayer(null)
    // Don't clear the betting code from localStorage, just reset the UI
  }

  const loadPlayerData = async (playerId: string, skipLoading = false) => {
    if (!skipLoading) {
      setLoading(true)
    }
    try {
      // Get all polls (both active and resolved)
      const { data: allPolls, error: pollsError } = await supabase
        .from('betting_polls')
        .select('*')
        .order('created_at', { ascending: false })

      if (pollsError) throw pollsError

      // Get player's vote history (includes win/loss status and winnings)
      const { data: voteHistory, error: voteHistoryError } = await supabase
        .from('player_vote_history')
        .select('*')
        .eq('player_id', playerId)
        .order('voted_at', { ascending: false })

      if (voteHistoryError) console.error('Vote history error:', voteHistoryError)

      // Get player's betting stats for all tournaments
      const { data: stats, error: statsError } = await supabase
        .from('player_betting_stats')
        .select('*')
        .eq('player_id', playerId)

      if (statsError) console.error('Stats error:', statsError)

      // Use the first stats record (assuming single tournament for now)
      setPlayerStats(stats?.[0] || null)

      // Separate polls into available (active + not voted) and voted
      const votedPollIds = new Set((voteHistory as VoteHistory[] | null)?.map(v => v.poll_id) || [])
      const available: PollWithVote[] = []
      const voted: PollWithVote[] = []

      const typedPolls = allPolls as BettingPoll[] | null
      typedPolls?.forEach(poll => {
        const history = (voteHistory as VoteHistory[] | null)?.find(v => v.poll_id === poll.id)
        const pollWithVote = { ...poll, voteHistory: history }

        if (votedPollIds.has(poll.id)) {
          // All polls where player has voted (active or resolved)
          voted.push(pollWithVote)
        } else if (poll.is_active && !poll.resolved_at) {
          // Only show as available if poll is active and not resolved
          available.push(pollWithVote)
        }
      })

      setAvailablePolls(available)
      setVotedPolls(voted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load polls')
    } finally {
      if (!skipLoading) {
        setLoading(false)
      }
    }
  }

  if (!validatedPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="max-w-md mx-auto py-20">
          <Card className="bg-slate-900/90 border-slate-700 p-8">
            <h1 className="text-4xl font-bold text-white mb-6 text-center">
              Betting Polls
            </h1>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-300">Your Betting Code</Label>
                <Input
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
                <p className="text-xs text-slate-400 text-center">
                  Enter your unique betting code (format: adjective-noun)
                </p>
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
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="animate-pulse text-4xl font-bold text-white mb-4">
            Loading polls...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white">Welcome, {validatedPlayer.name}!</h1>
              <p className="text-slate-400 mt-2">Betting Code: <span className="text-white font-mono">{validatedPlayer.betting_code}</span></p>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="border-slate-600 hover:bg-slate-800"
            >
              Sign Out
            </Button>
          </div>

          {/* Player Stats */}
          {playerStats && (
            <Card className="bg-slate-900/80 border-slate-700 p-6">
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-1">Available Balance</p>
                  <p className="text-3xl font-bold text-yellow-500">{playerStats.available_balance}</p>
                  <p className="text-xs text-slate-500">LPC Bucks</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-1">Total Balance</p>
                  <p className="text-2xl font-bold text-white">{playerStats.current_balance}</p>
                  <p className="text-xs text-slate-500">LPC Bucks</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-1">Active Bets</p>
                  <p className="text-2xl font-bold text-yellow-500">{playerStats.total_active_bets}</p>
                  <p className="text-xs text-slate-500">LPC Bucks</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-1">Total Votes</p>
                  <p className="text-2xl font-bold text-white">{playerStats.total_votes}</p>
                  <p className="text-xs text-slate-500">Polls</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Available Polls */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Available Polls</h2>
          {availablePolls.length === 0 ? (
            <Card className="bg-slate-900/80 border-slate-700 p-8">
              <p className="text-slate-400 text-center">No available polls at the moment.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {availablePolls.map(poll => (
                <Card key={poll.id} className="bg-slate-900/80 border-slate-700 p-6 hover:bg-slate-800/90 transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{poll.title}</h3>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-600 text-white border-green-500">
                          Active
                        </Badge>
                        <span className="text-sm text-slate-400">
                          Poll Code: <code className="text-slate-300">{poll.id}</code>
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push(`/vote/${poll.id}`)}
                      className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
                    >
                      Vote Now
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Voted Polls */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Your Votes</h2>
          {votedPolls.length === 0 ? (
            <Card className="bg-slate-900/80 border-slate-700 p-8">
              <p className="text-slate-400 text-center">You haven't voted in any polls yet.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {votedPolls.map(poll => {
                const history = poll.voteHistory
                const isWon = history?.result === 'won'
                const isLost = history?.result === 'lost'
                const isPending = history?.result === 'pending'

                return (
                  <Card key={poll.id} className={`bg-slate-900/80 border-slate-700 p-6 ${
                    isWon ? 'border-green-500/50' : isLost ? 'border-red-500/50' : ''
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">{poll.title}</h3>
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant="outline" className={poll.is_active ? "bg-green-600 text-white border-green-500" : "bg-slate-600 text-white border-slate-500"}>
                            {poll.is_active ? 'Active' : 'Closed'}
                          </Badge>
                          {isPending && (
                            <Badge variant="outline" className="bg-slate-700 text-white border-slate-600">
                              Pending
                            </Badge>
                          )}
                          {isWon && (
                            <Badge className="bg-green-600 text-white">
                              🏆 Won
                            </Badge>
                          )}
                          {isLost && (
                            <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700">
                              Lost
                            </Badge>
                          )}
                          <span className="text-sm text-slate-400">
                            Poll Code: <code className="text-slate-300">{poll.id}</code>
                          </span>
                        </div>
                        {history && (
                          <div className={`mt-3 p-4 rounded-lg border ${
                            isWon ? 'bg-green-900/20 border-green-700' :
                            isLost ? 'bg-slate-800/50 border-slate-700' :
                            'bg-slate-800 border-slate-700'
                          }`}>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Your Choice</p>
                                <p className="text-sm font-semibold text-white">{history.voted_option}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 mb-1">Your Bet</p>
                                <p className="text-sm font-bold text-yellow-500">{history.bet_amount} LPC $</p>
                              </div>
                              {history.winnings > 0 && (
                                <div className="col-span-2 pt-3 border-t border-green-700/50">
                                  <p className="text-xs text-slate-400 mb-1">Winnings</p>
                                  <p className="text-2xl font-bold text-green-400">+{history.winnings} LPC $</p>
                                  <p className="text-xs text-green-500 mt-1">
                                    Net profit: +{history.winnings - history.bet_amount} LPC $
                                  </p>
                                </div>
                              )}
                              {isLost && (
                                <div className="col-span-2 pt-3 border-t border-slate-700/50">
                                  <p className="text-sm font-semibold text-slate-400">Lost {history.bet_amount} LPC $</p>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-3">
                              Voted on {new Date(history.voted_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
