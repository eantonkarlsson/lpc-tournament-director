'use client'

import { useEffect, useState } from 'react'
import { useTimerStore } from '@/lib/store/timer-store'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QRCodeSVG } from 'qrcode.react'
import type { BettingPoll, BettingVoteCount, PlayerBettingStats } from '@/lib/types/database'

interface BettingScreenProps {
  poll: BettingPoll
  voteCounts: BettingVoteCount[]
  votingUrl: string // Now will be the landing page URL
  winningOptionId?: string | null
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function BettingScreen({ poll, voteCounts, votingUrl, winningOptionId }: BettingScreenProps) {
  const { timeRemaining, isPaused, currentLevel, blinds } = useTimerStore()
  const isResolved = !!poll.resolved_at
  const supabase = createClient()
  const [leaderboard, setLeaderboard] = useState<PlayerBettingStats[]>([])
  const [totalCirculation, setTotalCirculation] = useState(0)

  // Check if current level is a break
  const currentBlind = blinds[currentLevel]
  const isBreak = currentBlind?.is_break || false

  // Calculate actual playing level number (excluding breaks)
  const playingLevelNumber = blinds.slice(0, currentLevel + 1).filter(b => !b.is_break).length

  // Load leaderboard
  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!poll.tournament_id) return

      // Get top 8 for display
      const { data } = await supabase
        .from('player_betting_stats')
        .select('*')
        .eq('tournament_id', poll.tournament_id)
        .order('current_balance', { ascending: false })
        .limit(8)

      setLeaderboard(data || [])

      // Get total circulation from all players
      const { data: allPlayers } = await supabase
        .from('player_betting_stats')
        .select('current_balance')
        .eq('tournament_id', poll.tournament_id)

      const total = allPlayers?.reduce((sum, p) => sum + p.current_balance, 0) || 0
      setTotalCirculation(total)
    }

    loadLeaderboard()

    // Subscribe to balance updates
    const channel = supabase
      .channel(`leaderboard_${poll.tournament_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lpc_bucks_balances',
          filter: `tournament_id=eq.${poll.tournament_id}`,
        },
        () => {
          loadLeaderboard()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [poll.tournament_id, supabase])

  // Timer is managed by the timer store, no need to tick here

  // Calculate total votes and total bets
  const totalVotes = voteCounts.reduce((sum, vc) => sum + vc.vote_count, 0)
  const totalBets = voteCounts.reduce((sum, vc) => sum + vc.total_bet_amount, 0)
  const maxBets = Math.max(...voteCounts.map(vc => vc.total_bet_amount), 1)

  // Color coding for time remaining
  const timeColor = timeRemaining <= 60 ? 'text-red-500' : timeRemaining <= 180 ? 'text-yellow-500' : 'text-green-500'

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-8 gap-6">
      {/* Header - Level/Break indicator and Timer - Centered */}
      <div className="text-center space-y-4">
        {isResolved ? (
          <Badge variant="outline" className="text-4xl font-bold px-12 py-4 bg-green-600 text-white border-green-400 shadow-lg">
            POLL RESOLVED
          </Badge>
        ) : (
          <>
            {isBreak ? (
              <Badge variant="outline" className="text-4xl font-bold px-12 py-4 bg-blue-600 text-white border-blue-400 shadow-lg">
                BREAK
              </Badge>
            ) : (
              <Badge variant="outline" className="text-4xl font-bold px-12 py-4 bg-slate-700 text-white border-slate-500 shadow-lg">
                LEVEL {playingLevelNumber}
              </Badge>
            )}
            {isPaused && (
              <Badge variant="destructive" className="text-xl font-bold px-5 py-2 ml-4 animate-pulse shadow-lg">
                PAUSED
              </Badge>
            )}
          </>
        )}

        {/* Timer */}
        <div className={`text-8xl font-mono font-extrabold tracking-wider drop-shadow-2xl ${timeColor}`}>
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Main Grid: 3 columns - Left (Question + QR), Center (Options), Right (Leaderboard + Prizes) */}
      <div className="grid grid-cols-[1fr_2fr_1fr] gap-6 flex-1 overflow-hidden">
        {/* Left Column - Question (top) + QR Code (bottom) */}
        <div className="flex flex-col gap-6">
          {/* Poll Title - Top Left */}
          <Card className="bg-gradient-to-br from-red-800 to-red-600 backdrop-blur-sm border-red-400 border-4 shadow-2xl shadow-red-500/50 p-8 text-center">
            <div className="mb-2">
              <Badge className="bg-red-500 text-white text-lg px-4 py-1 font-bold">
                POLL QUESTION
              </Badge>
            </div>
            <h2 className="text-4xl font-extrabold text-white drop-shadow-2xl leading-tight">
              {poll.title}
            </h2>
          </Card>

          {/* QR Code - Bottom Left */}
          <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700/50 shadow-2xl p-8 flex-1 flex flex-col justify-center">
            <div className="space-y-4 text-center">
              <h3 className="text-6xl font-bold text-white">
                Vote Now!
              </h3>

              {/* QR Code */}
              <div className="bg-white p-6 rounded-xl inline-block">
                <QRCodeSVG
                  value={votingUrl}
                  size={200}
                  level="H"
                />
              </div>

              {/* URL */}
              <div className="space-y-2">
                <p className="text-l font-semibold text-slate-300">
                  Scan QR code or visit:
                </p>
                <div className="bg-slate-800 px-4 py-3 rounded-lg border border-slate-700">
                  <code className="text-l font-mono text-cyan-400 break-all">
                    {votingUrl}
                  </code>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Center Column - Vote Options with Progress Bars */}
        <div className="flex flex-col">
          <Card className="bg-slate-900/80 border-slate-700/50 border p-10 flex-1 flex flex-col">
            <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 flex-1">
              {voteCounts.map((voteCount) => {
                const betPercentage = totalBets > 0 ? (voteCount.total_bet_amount / totalBets) * 100 : 0
                const isWinner = isResolved && winningOptionId === voteCount.option_id
                const hasVotes = voteCount.total_bet_amount > 0

                return (
                  <div key={voteCount.option_id} className="space-y-2">
                    {/* Option name and LPC amount */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <h3 className={`text-5xl font-extrabold truncate ${
                          isWinner ? 'text-green-300' : 'text-white'
                        }`}>
                          {voteCount.option_text}
                        </h3>
                        {isWinner && (
                          <Badge className="bg-green-500 text-white text-sm px-2 py-1 font-bold animate-pulse shrink-0">
                            🏆 WINNER
                          </Badge>
                        )}
                      </div>
                      <div className={`text-3xl font-black shrink-0 ${
                        isWinner ? 'text-green-400' : 'text-yellow-600'
                      }`}>
                        {voteCount.total_bet_amount} LPC
                      </div>
                    </div>

                    {/* Slim progress bar */}
                    <div className={`w-full h-4 rounded-full overflow-hidden ${
                      isWinner
                        ? 'bg-green-900/30 border-2 border-green-500/50'
                        : 'bg-slate-800/50 border-2 border-yellow-500/30'
                    }`}>
                      {hasVotes && (
                        <div
                          className={`h-full transition-all duration-500 ${
                            isWinner
                              ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                              : 'bg-gradient-to-r from-yellow-500 to-yellow-800'
                          }`}
                          style={{ width: `${betPercentage}%` }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Totals */}
            <div className="mt-6 pt-6 border-t-4 border-slate-500/50 space-y-4 bg-slate-800/30 -mx-10 -mb-10 px-10 pb-8 rounded-b-xl">
              <div className="flex justify-between items-center">
                <span className="text-3xl font-bold text-slate-200">Total Bets:</span>
                <span className="text-3xl font-extrabold text-yellow-600">{totalBets} LPC</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-3xl font-bold text-slate-300">Total Votes:</span>
                <span className="text-3xl font-extrabold text-white">{totalVotes}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Leaderboard (top) + Prizes (bottom) */}
        <div className="flex flex-col gap-6">
          {/* LPC Bucks Leaderboard - Top Right */}
          <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700/50 shadow-2xl p-6 flex-1 flex flex-col overflow-hidden">
            <h3 className="text-2xl font-bold text-white mb-4 text-center bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
              💰 LPC Bucks Leaderboard
            </h3>

            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
              {leaderboard.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No players yet</p>
              ) : (
                leaderboard
                  .filter(player => player.current_balance !== player.starting_balance || player.total_active_bets > 0)
                  .slice(0, 8)
                  .map((player, index) => (
                  <div
                    key={player.player_id}
                    className="flex items-center justify-between p-2 rounded-lg border transition-all bg-slate-800/50 border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg font-bold ${
                          index === 0
                            ? 'text-yellow-400'
                            : index === 1
                            ? 'text-slate-300'
                            : index === 2
                            ? 'text-orange-400'
                            : 'text-slate-500'
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {player.player_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {player.total_active_bets} LPC in bets
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        index === 0 ? 'text-yellow-600' : 'text-yellow-600'
                      }`}>
                        {player.current_balance}
                      </div>
                      <div className="text-xs text-slate-400">LPC</div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </Card>

          {/* Prizes - Bottom Right */}
          <Card className="bg-gradient-to-br from-yellow-500/40 to-yellow-700/40 backdrop-blur-sm border-yellow-600/50 shadow-2xl p-6">
            <h4 className="text-xl font-bold text-center mb-3 bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
              🏆 Leaderboard Prizes
            </h4>
            <div className="space-y-2 text-l">
              <div className="flex justify-between items-center py-2 border-b border-yellow-700/30">
                <span className="text-yellow-200 font-semibold">#1-2</span>
                <span className="text-white font-bold">1 Free buy-in 2026</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-yellow-700/30">
                <span className="text-blue-300 font-semibold">#3-4</span>
                <span className="text-white">1 Relocation token 2026</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-yellow-700/30">
                <span className="text-green-300 font-semibold">#5-6</span>
                <span className="text-white">2 Show-em tokens 2026</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-cyan-300 font-semibold">#7-8</span>
                <span className="text-white">Reserve favourite chair 2026</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
