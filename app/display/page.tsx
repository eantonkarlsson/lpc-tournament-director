'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTimerStore } from '@/lib/store/timer-store'
import { useBlindStructure, usePOYRankings, useRegistrations, usePayoutStructure } from '@/lib/supabase/hooks'
import { MOCK_POY_RANKINGS, MOCK_BLINDS, MOCK_PAYOUTS, MOCK_REGISTRATIONS, MOCK_REMAINING_PLAYERS, MOCK_POY_POINTS_STRUCTURE } from '@/lib/mock-data'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TrophyIcon, DollarSignIcon, MaximizeIcon, MinimizeIcon, PlayIcon, PauseIcon, SkipForwardIcon, SkipBackIcon, RotateCcwIcon } from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatChips(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`
  }
  return amount.toString()
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function DisplayContent() {
  const searchParams = useSearchParams()
  const tournamentId = searchParams.get('tournament') || ''
  const useMockData = tournamentId === 'demo' || !tournamentId

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)

  // Timer state
  const {
    currentLevel,
    timeRemaining,
    blinds,
    isRunning,
    isPaused,
    tick,
    setBlinds,
    start,
    pause,
    resume,
    reset,
    nextLevel,
    prevLevel,
    setCurrentLevel,
  } = useTimerStore()

  // Local state for time slider
  const [sliderValue, setSliderValue] = useState<number[]>([0])
  const [hasHydrated, setHasHydrated] = useState(false)

  // Timer state is now restored automatically via onRehydrateStorage in the store

  // Data hooks - only use when not in demo mode
  const { blinds: blindsData, loading: blindsLoading } = useBlindStructure(useMockData ? '' : tournamentId)
  const { rankings: rankingsData, loading: rankingsLoading } = usePOYRankings()
  const { registrations: registrationsData, loading: registrationsLoading } = useRegistrations(useMockData ? '' : tournamentId)
  const { payouts: payoutsData, loading: payoutsLoading } = usePayoutStructure(useMockData ? '' : tournamentId)

  // Use mock data in demo mode, otherwise use real data
  const rankings = useMockData ? MOCK_POY_RANKINGS : rankingsData
  const registrations = useMockData ? MOCK_REGISTRATIONS : registrationsData
  const payouts = useMockData ? MOCK_PAYOUTS : payoutsData
  const loading = useMockData ? false : (blindsLoading || rankingsLoading || registrationsLoading || payoutsLoading)

  // Load blinds into store
  useEffect(() => {
    const dataToLoad = useMockData ? MOCK_BLINDS : blindsData
    if (dataToLoad.length > 0) {
      setBlinds(dataToLoad)
    }
  }, [blindsData, setBlinds, useMockData])

  // Timer tick
  useEffect(() => {
    if (!isRunning || isPaused) return
    const interval = setInterval(() => {
      tick()
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, isPaused, tick])

  // Fullscreen handling
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Sync slider with time remaining
  useEffect(() => {
    const currentBlindDuration = blinds[currentLevel]?.duration || 900
    setSliderValue([timeRemaining])
  }, [timeRemaining, currentLevel, blinds])

  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    setSliderValue(value)
  }

  const handleSliderCommit = (value: number[]) => {
    // Update timer store with new time
    useTimerStore.setState({ timeRemaining: value[0] })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      } else if (e.key === 'c' || e.key === 'C') {
        setShowControls((prev) => !prev)
      } else if (e.key === ' ' && !isFullscreen) {
        e.preventDefault()
        if (isRunning && !isPaused) {
          pause()
        } else if (isRunning && isPaused) {
          resume()
        } else {
          start()
        }
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [isRunning, isPaused, isFullscreen])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="text-center">
          <div className="animate-pulse text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Loading tournament...
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  const currentBlind = blinds[currentLevel]
  const nextBlind = blinds[currentLevel + 1]
  const timeColor = timeRemaining <= 60 ? 'text-red-500' : timeRemaining <= 180 ? 'text-yellow-500' : 'text-green-500'

  // Calculate POY rankings with logic for showing relevant players
  // Filter out players with 0 or null points (incomplete data)
  const validRankings = rankings.filter(r => r.total_points && r.total_points > 0)
  const top3Rankings = validRankings.slice(0, 3)
  const thirdPlacePoints = top3Rankings[2]?.total_points || 0

  // Get active players in this tournament (not eliminated)
  // Trim names to handle trailing/leading whitespace
  const activePlayerNames = new Set(
    registrations.filter((r) => !r.eliminated_at).map((r) => r.full_name.trim().toLowerCase())
  )

  // Calculate POY points for a given placement in this tournament
  // Formula: 10 * sqrt(players/rank) * (1 + log(prizeMoney/players + 0.25))^2 / (1 + log(buyIn + rebuys*buyIn + 0.25))
  // Note: Addons are excluded from POY calculation to match sthlm-poker
  const calculatePOYPointsForPlacement = (placement: number) => {
    if (useMockData) {
      const basePoints = MOCK_POY_POINTS_STRUCTURE[placement] || 0
      return basePoints
    }

    const totalPlayers = registrations.filter(r => r.is_confirmed).length
    if (totalPlayers === 0 || placement <= 0 || placement > totalPlayers) return 0

    // Calculate total prize pool including rebuys (excludes addons to match backend)
    const totalPrizePool = registrations
      .filter(r => r.is_confirmed)
      .reduce((sum, r) => {
        const buyIn = r.buy_in_amount || 0
        const rebuys = r.number_of_rebuys || 0
        return sum + buyIn + (rebuys * buyIn)
      }, 0)

    // If no prize pool data, can't calculate
    if (totalPrizePool === 0) return 0

    // Average buy-in amount
    const avgBuyIn = registrations
      .filter(r => r.is_confirmed && r.buy_in_amount)
      .reduce((sum, r) => sum + (r.buy_in_amount || 0), 0) / totalPlayers || 150

    const sqrtPart = Math.sqrt(totalPlayers / placement)
    const logPrize = Math.log(totalPrizePool / totalPlayers + 0.25)
    const logBuyIn = Math.log(avgBuyIn + 0.25)
    const basePoints = 10 * sqrtPart * Math.pow(1 + logPrize, 2) / (1 + logBuyIn)

    const points = basePoints

    // Ensure we return a valid number
    return isNaN(points) || !isFinite(points) ? 0 : Math.round(points * 100) / 100
  }

  const maxTournamentPoints = calculatePOYPointsForPlacement(1)

  // Calculate remaining players (not yet eliminated)
  const remainingPlayers = useMockData ? MOCK_REMAINING_PLAYERS : registrations.filter((r) => !r.eliminated_at).length

  // Calculate remaining premium players (tier B, not yet eliminated)
  const remainingPremiumPlayers = useMockData ? Math.floor(MOCK_REMAINING_PLAYERS / 2) : registrations.filter((r) => !r.eliminated_at && r.selected_buyin_tier === 'B').length

  // Calculate minimum points for each top 3 player (if they finish last among remaining players)
  const minTournamentPoints = calculatePOYPointsForPlacement(remainingPlayers)

  const top3WithMinPoints = top3Rankings.map(ranking => {
    const isActive = activePlayerNames.has(ranking.player_name.trim().toLowerCase())
    const minPoints = isActive
      ? (ranking.total_points || 0) + minTournamentPoints
      : ranking.total_points || 0
    return {
      ...ranking,
      minPoints: Math.round(minPoints * 100) / 100
    }
  })

  // Show top 15 rankings + any active players not in top 15
  const top15Rankings = validRankings.slice(0, 15)

  // Add active players who aren't in top 15
  const activePlayersNotInTop15 = validRankings
    .slice(15)
    .filter(ranking => activePlayerNames.has(ranking.player_name.trim().toLowerCase()))

  // Also add players who are in this tournament but not in POY rankings yet
  const playersNotInRankings = registrations
    .filter(r => !r.eliminated_at && !validRankings.find(rank => rank.player_name.trim().toLowerCase() === r.full_name.trim().toLowerCase()))
    .map(r => ({
      player_id: r.player_id || r.id, // Use registration id as fallback
      player_name: r.full_name,
      total_points: 0,
      tournaments_played: 0,
      total_earnings: 0
    }))

  const allRankingsToShow = [...top15Rankings, ...activePlayersNotInTop15, ...playersNotInRankings]

  // Sort by total_points descending, treating null/undefined as 0
  const sortedRankings = allRankingsToShow.sort((a, b) => {
    const aPoints = a.total_points ?? 0
    const bPoints = b.total_points ?? 0
    return bPoints - aPoints
  })

  const finalRankings = sortedRankings.slice(0, 15) // Limit to top 15 total

  // Calculate separate prize pools for standard and premium
  // Standard players (150): contribute 150 to standard pool
  // Premium players (300): contribute 150 to standard pool + 150 to premium pool
  const { standardPool, premiumPool } = useMockData
    ? { standardPool: 10000, premiumPool: 5000 }
    : registrations
        .filter(r => r.is_confirmed)
        .reduce((pools, r) => {
          const buyIn = r.buy_in_amount || 0
          const rebuys = r.number_of_rebuys || 0
          const totalContribution = buyIn + (rebuys * buyIn)
          const tier = r.selected_buyin_tier || 'A'
          const playerName = r.full_name || 'Unknown'

          if (tier === 'B') {
            // Premium player: split contribution 50/50 between standard and premium pools
            const halfContribution = totalContribution / 2
            pools.standardPool += halfContribution
            pools.premiumPool += halfContribution
            console.log(`${playerName} (Premium): total=${totalContribution}, standard=${halfContribution}, premium=${halfContribution}`)
          } else {
            // Standard player: all contribution goes to standard pool
            pools.standardPool += totalContribution
            console.log(`${playerName} (Standard): total=${totalContribution}, standard=${totalContribution}, premium=0`)
          }

          return pools
        }, { standardPool: 0, premiumPool: 0 })

  console.log(`Standard Pool: ${standardPool}, Premium Pool: ${premiumPool} (from ${registrations.filter(r => r.is_confirmed).length} confirmed players)`)

  // Calculate payout amounts from percentages
  // Standard payout: uses standard pool only
  // Premium payout: uses premium pool only (returns null if no premium percentage)
  const calculatePayoutAmount = (percentage: number | null, percentagePremium: number | null = null, isPremiumCalculation: boolean = false) => {
    // If this is a premium calculation
    if (isPremiumCalculation) {
      // Only return a value if premium percentage exists
      if (percentagePremium !== null && percentagePremium !== undefined) {
        return premiumPool > 0 ? (premiumPool * percentagePremium) / 100 : null
      }
      // No premium percentage = no premium payout
      return null
    }

    // Standard calculation: use standard pool
    if (percentage === null) return null
    return standardPool > 0 ? (standardPool * percentage) / 100 : null
  }

  // Calculate payout info (remainingPlayers already calculated above)
  const nextStandardPayoutPosition = remainingPlayers
  const nextPremiumPayoutPosition = remainingPremiumPlayers
  const sortedPayouts = [...payouts].sort((a, b) => a.placement - b.placement).slice(0, 8)

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Main Grid Layout */}
      <div className="h-full grid grid-cols-3 gap-6 p-6">

        {/* Left Column - POY Rankings */}
        <div className="flex flex-col gap-4">
          <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700/50 shadow-2xl p-6 flex flex-col h-full overflow-visible">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                  <TrophyIcon className="h-7 w-7 text-yellow-500 drop-shadow-lg" />
                  Player of the Year
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50"></div>
                  <span>Top 3 Candidate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" transform="rotate(45 10 10)" />
                  </svg>
                  <span>PoY score if tournament winner</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" transform="rotate(-45 10 10)" />
                  </svg>
                  <span>PoY score if next eliminated</span>
                </div>
              </div>
            </div>
            <div className="overflow-visible">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                    <TableRow className="border-slate-700/50">
                      <TableHead className="text-slate-400 font-semibold text-base w-12">Rank</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-base">Player</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-base text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {finalRankings.map((ranking, index) => {
                    // Find rank in the valid global rankings
                    const globalRank = validRankings.findIndex(r => r.player_id === ranking.player_id)
                    const hasRank = globalRank >= 0
                    const rank = hasRank ? globalRank + 1 : null
                    const isTopThree = hasRank && rank !== null && rank <= 3
                    const isActive = activePlayerNames.has(ranking.player_name.trim().toLowerCase())

                    // Player's maximum potential: current points + winning the tournament
                    const playerMaxPotential = (ranking.total_points || 0) + maxTournamentPoints

                    // 3rd place player's minimum: their current points + minimum points from finishing last
                    const thirdPlaceMinPoints = top3WithMinPoints[2]?.minPoints || 0

                    // Can reach top 3 if their max beats or ties the current 3rd place minimum
                    const canReachTop3 = playerMaxPotential >= thirdPlaceMinPoints

                    return (
                      <TableRow
                        key={ranking.player_id}
                        className={`border-slate-700/50 transition-colors hover:bg-slate-800/30 ${
                          isActive ? 'border-l-4 border-l-emerald-500 shadow-lg shadow-emerald-500/10' : 'border-l-4 border-l-red-500/50'
                        }`}
                      >
                        <TableCell className="font-medium text-base">
                          <div className="flex items-center gap-2">
                            {rank === 1 && <TrophyIcon className="h-5 w-5 text-yellow-400 drop-shadow-lg" />}
                            {rank === 2 && <TrophyIcon className="h-5 w-5 text-slate-300 drop-shadow-lg" />}
                            {rank === 3 && <TrophyIcon className="h-5 w-5 text-orange-500 drop-shadow-lg" />}
                            <span className="text-white">{rank ?? '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-slate-200 text-base ${isTopThree ? 'font-bold' : ''}`}>
                              {ranking.player_name}
                            </span>
                            {isActive && canReachTop3 && (
                              <span className="w-2 h-2 bg-yellow-400 rounded-full inline-block"></span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-base">
                          <div>
                            <div className="text-white">{Math.round(ranking.total_points || 0)}</div>
                            {isActive && isTopThree && (
                              <div className="text-xs font-semibold space-y-0.5">
                                <div className="text-emerald-400">
                                  ↗ {Math.round(playerMaxPotential)} max
                                </div>
                                <div className="text-orange-400">
                                  ↘ {Math.round((ranking.total_points || 0) + minTournamentPoints)} min
                                </div>
                              </div>
                            )}
                            {isActive && !isTopThree && playerMaxPotential > 0 && (
                              <div className={`text-sm font-semibold ${canReachTop3 ? 'text-yellow-400' : 'text-cyan-400'}`}>
                                {canReachTop3 && '↗ '}{Math.round(playerMaxPotential)} max
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Center Column - Logo & Timer */}
        <div className="flex flex-col items-center gap-8">
          {/* LPC Logo */}
          <div className="text-9xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 drop-shadow-2xl">
            LPC
          </div>

          {/* Level indicator */}
          <div className="text-center flex items-center gap-4">
            {currentBlind && (
              <Badge variant="outline" className="text-2xl font-bold px-6 py-3 bg-slate-800/50 border-slate-600 text-slate-200 shadow-lg">
                Level {currentBlind.level}
              </Badge>
            )}
            {isPaused && (
              <Badge variant="destructive" className="text-xl font-bold px-5 py-2 animate-pulse shadow-lg">
                PAUSED
              </Badge>
            )}
          </div>

          {/* Current blinds */}
          {currentBlind ? (
            <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-slate-600/50 shadow-2xl p-10 text-center min-w-[500px]">
              <div className="space-y-4">
                <div className="text-7xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-2xl">
                  {formatChips(currentBlind.small_blind)} / {formatChips(currentBlind.big_blind)}
                </div>
                {currentBlind.ante > 0 && (
                  <div className="text-3xl font-semibold text-slate-300">
                    Ante: {formatChips(currentBlind.ante)}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="bg-slate-800/90 border-slate-600/50 p-10 text-center min-w-[500px]">
              <p className="text-slate-400 text-xl">No blind structure loaded</p>
            </Card>
          )}

          {/* Time remaining */}
          <div className={`text-8xl font-mono font-extrabold tracking-wider drop-shadow-2xl ${timeColor}`}>
            {formatTime(timeRemaining)}
          </div>

          {/* Timer Controls */}
          {showControls && (
            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700/50 shadow-2xl p-6 min-w-[550px]">
              <div className="space-y-5">
                {/* Time Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between text-base font-semibold text-slate-300">
                    <span>Time Remaining</span>
                    <span className="text-cyan-400">{formatTime(sliderValue[0])}</span>
                  </div>
                  <Slider
                    value={sliderValue}
                    onValueChange={handleSliderChange}
                    onValueCommit={handleSliderCommit}
                    max={blinds[currentLevel]?.duration || 900}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-4">
                  {/* Previous Level */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevLevel}
                    disabled={currentLevel === 0}
                    className="h-12 w-12 border-slate-600 hover:bg-slate-700 hover:border-slate-500"
                  >
                    <SkipBackIcon className="h-5 w-5" />
                  </Button>

                  {/* Play/Pause */}
                  {!isRunning ? (
                    <Button
                      size="default"
                      onClick={start}
                      className="h-12 px-8 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-lg"
                    >
                      <PlayIcon className="h-5 w-5 mr-2" />
                      Start
                    </Button>
                  ) : isPaused ? (
                    <Button
                      size="default"
                      onClick={resume}
                      className="h-12 px-8 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-lg"
                    >
                      <PlayIcon className="h-5 w-5 mr-2" />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      size="default"
                      onClick={pause}
                      className="h-12 px-8 text-base font-semibold bg-amber-600 hover:bg-amber-700 shadow-lg"
                    >
                      <PauseIcon className="h-5 w-5 mr-2" />
                      Pause
                    </Button>
                  )}

                  {/* Next Level */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextLevel}
                    disabled={currentLevel >= blinds.length - 1}
                    className="h-12 w-12 border-slate-600 hover:bg-slate-700 hover:border-slate-500"
                  >
                    <SkipForwardIcon className="h-5 w-5" />
                  </Button>

                  {/* Reset */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reset}
                    className="h-12 w-12 ml-2 border-slate-600 hover:bg-slate-700 hover:border-slate-500"
                  >
                    <RotateCcwIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Next level */}
          {nextBlind && (
            <Card className="bg-slate-900/70 backdrop-blur-sm border-slate-700/50 shadow-xl p-5 text-center min-w-[400px]">
              <div className="text-slate-400 font-semibold text-lg mb-2">Next Level</div>
              <div className="text-3xl font-bold text-white">
                {formatChips(nextBlind.small_blind)} / {formatChips(nextBlind.big_blind)}
                {nextBlind.ante > 0 && (
                  <span className="text-xl text-slate-400 ml-2">
                    (Ante: {formatChips(nextBlind.ante)})
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* Next Break */}
          {(() => {
            // Find the next level with a break
            const nextBreakIndex = blinds.findIndex((blind, index) =>
              index >= currentLevel && blind.break_duration && blind.break_duration > 0
            )

            if (nextBreakIndex === -1) return null // No upcoming breaks

            const nextBreakLevel = nextBreakIndex + 1 // Level is 1-indexed
            const breakDuration = blinds[nextBreakIndex].break_duration || 0

            // Calculate time until break: remaining time on current level + duration of all levels until break
            const currentLevelTimeRemaining = timeRemaining
            const additionalLevelsTime = blinds
              .slice(currentLevel + 1, nextBreakIndex + 1)
              .reduce((sum, blind) => sum + blind.duration, 0)

            const totalTimeToBreak = currentLevelTimeRemaining + additionalLevelsTime
            const minutesToBreak = Math.floor(totalTimeToBreak / 60)
            const secondsToBreak = totalTimeToBreak % 60

            const breakMinutes = Math.floor(breakDuration / 60)

            const hoursToBreak = Math.floor(minutesToBreak / 60)
            const remainingMinutesToBreak = minutesToBreak % 60

            return (
              <Card className="bg-slate-900/70 backdrop-blur-sm border-slate-700/50 shadow-xl p-5 text-center min-w-[400px]">
                <div className="text-slate-400 font-semibold text-lg mb-2">Next Break</div>
                <div className="text-3xl font-bold text-white">
                  {hoursToBreak}:{remainingMinutesToBreak.toString().padStart(2, '0')}:{secondsToBreak.toString().padStart(2, '0')}
                </div>
                <div className="text-xl text-slate-400 mt-2">
                  ({breakMinutes} min break)
                </div>
              </Card>
            )
          })()}
        </div>

        {/* Right Column - Payouts */}
        <div className="flex flex-col gap-4">
          <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-700/50 shadow-2xl p-6 flex-1 overflow-hidden flex flex-col">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              <DollarSignIcon className="h-7 w-7 text-emerald-500 drop-shadow-lg" />
              Prize Pool
            </h2>

            {/* Summary */}
            <div className="mb-6 space-y-4">
              <div className="flex justify-between items-center bg-slate-800/50 px-4 py-3 rounded-lg border border-slate-700/50">
                <span className="text-base font-semibold text-slate-300">Remaining Players:</span>
                <span className="font-bold text-3xl text-white">{remainingPlayers}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/50 px-4 py-3 rounded-lg border border-slate-700/50">
                <span className="text-base font-semibold text-slate-300">Remaining Premium Players:</span>
                <span className="font-bold text-3xl text-white">{remainingPremiumPlayers}</span>
              </div>
              <div className="border-t border-slate-700/50 pt-4">
                <div className="text-slate-400 font-semibold text-base mb-3">Next Payout:</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-slate-800/30 px-4 py-2 rounded-lg">
                    <span className="text-sm font-medium text-slate-300">If Standard:</span>
                    <span className="font-bold text-lg text-emerald-400">
                      {(() => {
                        const payout = sortedPayouts.find((p) => p.placement === nextStandardPayoutPosition)
                        const amount = payout ? calculatePayoutAmount(payout.percentage, null, false) : null
                        return amount ? formatCurrency(amount) : '-'
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/30 px-4 py-2 rounded-lg">
                    <span className="text-sm font-medium text-slate-300">If Premium:</span>
                    <span className="font-bold text-lg text-emerald-400">
                      {(() => {
                        const standardPayout = sortedPayouts.find((p) => p.placement === nextStandardPayoutPosition)
                        const premiumPayout = sortedPayouts.find((p) => p.placement === nextPremiumPayoutPosition)

                        if (!standardPayout && !premiumPayout) return '-'

                        // Premium players get: standard pool percentage (based on total remaining) + premium pool percentage (based on premium remaining)
                        const standardAmount = standardPayout && standardPayout.percentage && standardPool > 0 ? (standardPool * standardPayout.percentage) / 100 : 0
                        const premiumAmount = premiumPayout && premiumPayout.percentage_premium && premiumPool > 0 ? (premiumPool * premiumPayout.percentage_premium) / 100 : 0
                        const totalAmount = standardAmount + premiumAmount

                        return totalAmount > 0 ? formatCurrency(totalAmount) : '-'
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                  <TableRow className="border-slate-700/50">
                    <TableHead className="text-slate-400 font-semibold text-base w-20">Place</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-base text-right">Standard</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-base text-right">Premium</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Show all payout positions
                    const allPayouts = sortedPayouts

                    // Find the max placement in payouts (last place that gets paid)
                    const maxPayoutPlacement = Math.max(...allPayouts.map(p => p.placement))

                    return (
                      <>
                        {/* Show all actual payout positions */}
                        {allPayouts.map((payout) => {
                          const isPaid = payout.placement > remainingPlayers
                          const isNextStandard = payout.placement === nextStandardPayoutPosition
                          const isNextPremium = payout.placement === nextPremiumPayoutPosition

                          return (
                            <TableRow
                              key={payout.id}
                              className={`border-slate-700/50 transition-colors hover:bg-slate-800/30 ${
                                (isNextStandard || isNextPremium) ? 'bg-emerald-900/30 shadow-lg shadow-emerald-500/10' : ''
                              }`}
                            >
                              <TableCell className="text-base">
                                <div className="flex items-center gap-2">
                                  <span className={`${(isNextStandard || isNextPremium) ? 'font-bold text-lg text-white' : 'text-slate-300'}`}>
                                    {payout.placement === 1 ? '🥇 1st' :
                                     payout.placement === 2 ? '🥈 2nd' :
                                     payout.placement === 3 ? '🥉 3rd' :
                                     `${payout.placement}th`}
                                  </span>
                                  {isPaid && (
                                    <Badge variant="default" className="bg-slate-600 text-xs font-semibold">
                                      Paid
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className={`text-right text-base ${isNextStandard ? 'font-bold text-lg text-emerald-400' : 'text-slate-200'}`}>
                                <div className="flex items-center justify-end gap-2">
                                  {isNextStandard && (
                                    <Badge variant="default" className="bg-emerald-600 text-xs font-semibold shadow-lg">
                                      Next
                                    </Badge>
                                  )}
                                  <span>
                                    {(() => {
                                      const amount = calculatePayoutAmount(payout.percentage, null, false)
                                      return amount ? formatCurrency(amount) : '-'
                                    })()}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className={`text-right text-base ${isNextPremium ? 'font-bold text-lg text-emerald-400' : 'text-slate-200'}`}>
                                <div className="flex items-center justify-end gap-2">
                                  {isNextPremium && (
                                    <Badge variant="default" className="bg-emerald-600 text-xs font-semibold shadow-lg">
                                      Next
                                    </Badge>
                                  )}
                                  <span>
                                    {(() => {
                                      const amount = calculatePayoutAmount(payout.percentage, payout.percentage_premium, true)
                                      return amount ? formatCurrency(amount) : '-'
                                    })()}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}

                        {/* Show one position after payouts (with 0 payout) */}
                        <TableRow className={`border-slate-700/50 ${
                          nextStandardPayoutPosition === maxPayoutPlacement + 1 || nextPremiumPayoutPosition === maxPayoutPlacement + 1
                            ? 'bg-emerald-900/30 shadow-lg shadow-emerald-500/10'
                            : ''
                        }`}>
                          <TableCell className="text-base">
                            <span className={`${
                              nextStandardPayoutPosition === maxPayoutPlacement + 1 || nextPremiumPayoutPosition === maxPayoutPlacement + 1
                                ? 'font-bold text-lg text-white'
                                : 'text-slate-300'
                            }`}>{maxPayoutPlacement + 1}th</span>
                          </TableCell>
                          <TableCell className={`text-right text-base ${
                            nextStandardPayoutPosition === maxPayoutPlacement + 1
                              ? 'font-bold text-lg text-emerald-400'
                              : 'text-slate-400'
                          }`}>
                            {nextStandardPayoutPosition === maxPayoutPlacement + 1 ? (
                              <div className="flex items-center justify-end gap-2">
                                <Badge variant="default" className="bg-emerald-600 text-xs font-semibold shadow-lg">
                                  Next
                                </Badge>
                                <span>{'-'}</span>
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className={`text-right text-base ${
                            nextPremiumPayoutPosition === maxPayoutPlacement + 1
                              ? 'font-bold text-lg text-emerald-400'
                              : 'text-slate-400'
                          }`}>
                            {nextPremiumPayoutPosition === maxPayoutPlacement + 1 ? (
                              <div className="flex items-center justify-end gap-2">
                                <Badge variant="default" className="bg-emerald-600 text-xs font-semibold shadow-lg">
                                  Next
                                </Badge>
                                <span>{'-'}</span>
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Separator before premium position (if distance > 1 from position 9) */}
                        {nextPremiumPayoutPosition !== nextStandardPayoutPosition &&
                         nextPremiumPayoutPosition > maxPayoutPlacement + 1 &&
                         nextPremiumPayoutPosition > maxPayoutPlacement + 2 && (
                          <TableRow className="border-slate-700/50">
                            <TableCell colSpan={3} className="text-center text-slate-500 text-lg py-2">
                              ...
                            </TableCell>
                          </TableRow>
                        )}

                        {/* Show premium position (if different from standard and > maxPayoutPlacement + 1) */}
                        {nextPremiumPayoutPosition !== nextStandardPayoutPosition && nextPremiumPayoutPosition > maxPayoutPlacement + 1 && (
                          <TableRow className="border-slate-700/50 bg-emerald-900/30 shadow-lg shadow-emerald-500/10">
                            <TableCell className="text-base">
                              <span className="font-bold text-lg text-white">{nextPremiumPayoutPosition}th</span>
                            </TableCell>
                            <TableCell className="text-right text-base text-slate-400">
                              {'-'}
                            </TableCell>
                            <TableCell className="text-right text-base font-bold text-lg text-emerald-400">
                              <div className="flex items-center justify-end gap-2">
                                <Badge variant="default" className="bg-emerald-600 text-xs font-semibold shadow-lg">
                                  Next
                                </Badge>
                                <span>{'-'}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}

                        {/* Separator before standard position (if distance > 1 from premium position) */}
                        {nextStandardPayoutPosition > maxPayoutPlacement + 1 &&
                         nextStandardPayoutPosition !== nextPremiumPayoutPosition &&
                         nextStandardPayoutPosition > nextPremiumPayoutPosition + 1 && (
                          <TableRow className="border-slate-700/50">
                            <TableCell colSpan={3} className="text-center text-slate-500 text-lg py-2">
                              ...
                            </TableCell>
                          </TableRow>
                        )}

                        {/* Show standard position (if > maxPayoutPlacement + 1) */}
                        {nextStandardPayoutPosition > maxPayoutPlacement + 1 && (
                          <TableRow className="border-slate-700/50 bg-emerald-900/30 shadow-lg shadow-emerald-500/10">
                            <TableCell className="text-base">
                              <span className="font-bold text-lg text-white">{nextStandardPayoutPosition}th</span>
                            </TableCell>
                            <TableCell className="text-right text-base font-bold text-lg text-emerald-400">
                              <div className="flex items-center justify-end gap-2">
                                <Badge variant="default" className="bg-emerald-600 text-xs font-semibold shadow-lg">
                                  Next
                                </Badge>
                                <span>{'-'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-base text-slate-400">
                              {'-'}
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )
                  })()}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>

      {/* Fullscreen toggle */}
      <div className="absolute top-6 right-6">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="bg-slate-900/80 backdrop-blur-sm border-slate-600 hover:bg-slate-800 hover:border-slate-500 shadow-xl"
        >
          {isFullscreen ? (
            <MinimizeIcon className="h-5 w-5" />
          ) : (
            <MaximizeIcon className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Keyboard hints */}
      {!isFullscreen && (
        <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 px-4 py-3 rounded-lg shadow-xl">
          <p className="text-slate-300 text-sm font-medium">
            <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-600 font-mono text-xs">F</kbd> Fullscreen •
            <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-600 font-mono text-xs ml-2">C</kbd> Toggle controls •
            <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-600 font-mono text-xs ml-2">Space</kbd> Play/Pause
          </p>
        </div>
      )}
    </div>
  )
}

export default function DisplayPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="text-center">
          <div className="animate-pulse text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Loading tournament display...
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    }>
      <DisplayContent />
    </Suspense>
  )
}
