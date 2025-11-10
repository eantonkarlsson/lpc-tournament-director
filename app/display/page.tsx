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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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
  const [pointSurgeEnabled, setPointSurgeEnabled] = useState(false)

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
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p className="text-2xl">Loading tournament...</p>
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
    registrations.filter((r) => !r.eliminated_at).map((r) => r.full_name.trim())
  )

  // Calculate POY points for a given placement in this tournament
  // Formula: 10 * sqrt(players/rank) * (1 + log(prizeMoney/players + 0.25))^2 / (1 + log(buyIn + rebuys*buyIn + addons*buyIn + 0.25))
  const calculatePOYPointsForPlacement = (placement: number) => {
    if (useMockData) {
      const basePoints = MOCK_POY_POINTS_STRUCTURE[placement] || 0
      return pointSurgeEnabled ? basePoints * 2 : basePoints
    }

    const totalPlayers = registrations.filter(r => r.is_confirmed).length
    if (totalPlayers === 0 || placement <= 0 || placement > totalPlayers) return 0

    // Calculate total prize pool including rebuys/addons
    const totalPrizePool = registrations
      .filter(r => r.is_confirmed)
      .reduce((sum, r) => {
        const buyIn = r.buy_in_amount || 0
        const rebuys = r.number_of_rebuys || 0
        const addons = r.number_of_addons || 0
        return sum + buyIn + (rebuys * buyIn) + (addons * buyIn)
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

    // Apply 2x surge if enabled
    const points = pointSurgeEnabled ? basePoints * 2 : basePoints

    // Ensure we return a valid number
    return isNaN(points) || !isFinite(points) ? 0 : Math.round(points * 100) / 100
  }

  const maxTournamentPoints = calculatePOYPointsForPlacement(1)

  // Calculate minimum points for each top 3 player (if they finish last)
  const totalPlayers = useMockData ? 24 : registrations.filter(r => r.is_confirmed).length
  const minTournamentPoints = calculatePOYPointsForPlacement(totalPlayers)

  const top3WithMinPoints = top3Rankings.map(ranking => {
    const isActive = activePlayerNames.has(ranking.player_name.trim())
    const minPoints = isActive
      ? (ranking.total_points || 0) + minTournamentPoints
      : ranking.total_points || 0
    return {
      ...ranking,
      minPoints: Math.round(minPoints * 100) / 100
    }
  })

  // Show top 10 rankings + any active players not in top 10
  const top10Rankings = validRankings.slice(0, 10)

  // Add active players who aren't in top 10
  const activePlayersNotInTop10 = validRankings
    .slice(10)
    .filter(ranking => activePlayerNames.has(ranking.player_name.trim()))

  // Also add players who are in this tournament but not in POY rankings yet
  const playersNotInRankings = registrations
    .filter(r => !r.eliminated_at && !validRankings.find(rank => rank.player_name.trim() === r.full_name.trim()))
    .map(r => ({
      player_id: r.player_id || r.id, // Use registration id as fallback
      player_name: r.full_name,
      total_points: 0,
      tournaments_played: 0,
      total_earnings: 0
    }))

  const allRankingsToShow = [...top10Rankings, ...activePlayersNotInTop10, ...playersNotInRankings]

  // Sort by total_points descending, treating null/undefined as 0
  const sortedRankings = allRankingsToShow.sort((a, b) => {
    const aPoints = a.total_points ?? 0
    const bPoints = b.total_points ?? 0
    return bPoints - aPoints
  })


  // Calculate payout info
  const remainingPlayers = useMockData ? MOCK_REMAINING_PLAYERS : registrations.filter((r) => !r.eliminated_at).length
  const nextPayoutPosition = remainingPlayers
  const sortedPayouts = [...payouts].sort((a, b) => a.placement - b.placement).slice(0, 8)

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      {/* Main Grid Layout */}
      <div className="h-full grid grid-cols-3 gap-4 p-4">

        {/* Left Column - POY Rankings */}
        <div className="flex flex-col gap-4">
          <Card className="bg-gray-800 border-gray-700 p-4 flex flex-col h-full">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <TrophyIcon className="h-6 w-6 text-yellow-500" />
                  Player of the Year
                </h2>
                <div className="flex items-center gap-2">
                  <Switch
                    id="point-surge"
                    checked={pointSurgeEnabled}
                    onCheckedChange={setPointSurgeEnabled}
                  />
                  <Label htmlFor="point-surge" className="text-sm cursor-pointer">
                    2x Point Surge {pointSurgeEnabled && <Badge variant="destructive" className="ml-1 text-xs">ON</Badge>}
                  </Label>
                </div>
              </div>
              {top3WithMinPoints.length >= 3 && (
                <div className="text-xs text-gray-400 flex gap-4">
                  <span>🥇 Min: {top3WithMinPoints[0].minPoints} pts</span>
                  <span>🥈 Min: {top3WithMinPoints[1].minPoints} pts</span>
                  <span>🥉 Min: {top3WithMinPoints[2].minPoints} pts</span>
                </div>
              )}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-800 z-10">
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-400 w-12">Rank</TableHead>
                      <TableHead className="text-gray-400">Player</TableHead>
                      <TableHead className="text-gray-400 text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {sortedRankings.map((ranking, index) => {
                    // Find rank in the valid global rankings
                    const globalRank = validRankings.findIndex(r => r.player_id === ranking.player_id)
                    const hasRank = globalRank >= 0
                    const rank = hasRank ? globalRank + 1 : null
                    const isTopThree = hasRank && rank !== null && rank <= 3
                    const isActive = activePlayerNames.has(ranking.player_name.trim())

                    // Player's maximum potential: current points + winning the tournament
                    const playerMaxPotential = (ranking.total_points || 0) + maxTournamentPoints

                    // 3rd place player's minimum: their current points + minimum points from finishing last
                    const thirdPlaceMinPoints = top3WithMinPoints[2]?.minPoints || 0

                    // Can reach top 3 if their max beats the current 3rd place minimum
                    const canReachTop3 = playerMaxPotential > thirdPlaceMinPoints

                    return (
                      <TableRow
                        key={ranking.player_id}
                        className={`border-gray-700 ${isTopThree ? 'bg-gray-800/50' : ''} ${isActive ? 'border-l-4 border-l-green-500' : ''}`}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1">
                            {rank === 1 && <TrophyIcon className="h-4 w-4 text-yellow-500" />}
                            {rank === 2 && <TrophyIcon className="h-4 w-4 text-gray-400" />}
                            {rank === 3 && <TrophyIcon className="h-4 w-4 text-orange-600" />}
                            <span className={isTopThree ? 'font-bold' : ''}>{rank ?? '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={isTopThree ? 'font-bold' : ''}>
                              {ranking.player_name}
                            </span>
                            {isActive && (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                                Alive
                              </Badge>
                            )}
                            {isActive && canReachTop3 && (
                              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">
                                Top 3 Candidate
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right ${isTopThree ? 'font-bold' : ''}`}>
                          <div>
                            <div>{ranking.total_points || 0}</div>
                            {isActive && !isTopThree && playerMaxPotential > 0 && (
                              <div className="text-xs text-blue-400">
                                {playerMaxPotential} max
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

        {/* Center Column - Timer */}
        <div className="flex flex-col items-center justify-center gap-6">
          {/* Level indicator */}
          <div className="text-center">
            {currentBlind && (
              <Badge variant="outline" className="text-xl px-4 py-2">
                Level {currentBlind.level}
              </Badge>
            )}
            {isPaused && (
              <Badge variant="destructive" className="text-lg px-3 py-1 ml-3">
                PAUSED
              </Badge>
            )}
          </div>

          {/* Current blinds */}
          {currentBlind ? (
            <Card className="bg-gray-800 border-gray-700 p-8 text-center min-w-[400px]">
              <div className="space-y-3">
                <div className="text-5xl font-bold text-white">
                  {formatChips(currentBlind.small_blind)} / {formatChips(currentBlind.big_blind)}
                </div>
                {currentBlind.ante > 0 && (
                  <div className="text-2xl text-gray-400">
                    Ante: {formatChips(currentBlind.ante)}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="bg-gray-800 border-gray-700 p-8 text-center min-w-[400px]">
              <p className="text-gray-400">No blind structure loaded</p>
            </Card>
          )}

          {/* Time remaining */}
          <div className={`text-7xl font-mono font-bold ${timeColor}`}>
            {formatTime(timeRemaining)}
          </div>

          {/* Timer Controls */}
          {showControls && (
            <Card className="bg-gray-800 border-gray-700 p-6 min-w-[500px]">
              <div className="space-y-4">
                {/* Time Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Time Remaining</span>
                    <span>{formatTime(sliderValue[0])}</span>
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
                <div className="flex items-center justify-center gap-3">
                  {/* Previous Level */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevLevel}
                    disabled={currentLevel === 0}
                    className="h-10 w-10"
                  >
                    <SkipBackIcon className="h-4 w-4" />
                  </Button>

                  {/* Play/Pause */}
                  {!isRunning ? (
                    <Button
                      size="default"
                      onClick={start}
                      className="h-10 px-6 bg-green-600 hover:bg-green-700"
                    >
                      <PlayIcon className="h-5 w-5 mr-2" />
                      Start
                    </Button>
                  ) : isPaused ? (
                    <Button
                      size="default"
                      onClick={resume}
                      className="h-10 px-6 bg-green-600 hover:bg-green-700"
                    >
                      <PlayIcon className="h-5 w-5 mr-2" />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      size="default"
                      onClick={pause}
                      className="h-10 px-6 bg-yellow-600 hover:bg-yellow-700"
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
                    className="h-10 w-10"
                  >
                    <SkipForwardIcon className="h-4 w-4" />
                  </Button>

                  {/* Reset */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reset}
                    className="h-10 w-10 ml-2"
                  >
                    <RotateCcwIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Next level */}
          {nextBlind && (
            <Card className="bg-gray-800 border-gray-700 p-4 text-center min-w-[350px]">
              <div className="text-gray-400 text-lg mb-1">Next Level</div>
              <div className="text-2xl font-bold text-white">
                {formatChips(nextBlind.small_blind)} / {formatChips(nextBlind.big_blind)}
                {nextBlind.ante > 0 && (
                  <span className="text-lg text-gray-400 ml-2">
                    (Ante: {formatChips(nextBlind.ante)})
                  </span>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Payouts */}
        <div className="flex flex-col gap-4">
          <Card className="bg-gray-800 border-gray-700 p-4 flex-1 overflow-hidden flex flex-col">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <DollarSignIcon className="h-6 w-6 text-green-500" />
              Prize Pool
            </h2>

            {/* Summary */}
            <div className="mb-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Remaining Players:</span>
                <span className="font-bold text-xl">{remainingPlayers}</span>
              </div>
              <div className="border-t border-gray-700 pt-3">
                <div className="text-gray-400 text-sm mb-2">Next Payout:</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-300">If Standard:</span>
                    <span className="font-bold text-green-500">
                      {sortedPayouts.find((p) => p.placement === nextPayoutPosition)
                        ? formatCurrency(sortedPayouts.find((p) => p.placement === nextPayoutPosition)!.amount)
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-300">If Premium:</span>
                    <span className="font-bold text-green-500">
                      {sortedPayouts.find((p) => p.placement === nextPayoutPosition)?.amount_premium
                        ? formatCurrency(sortedPayouts.find((p) => p.placement === nextPayoutPosition)!.amount_premium!)
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400 w-20">Place</TableHead>
                    <TableHead className="text-gray-400 text-right">Standard</TableHead>
                    <TableHead className="text-gray-400 text-right">Premium</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPayouts.map((payout) => {
                    const isPaid = payout.placement > remainingPlayers
                    const isNext = payout.placement === nextPayoutPosition

                    return (
                      <TableRow
                        key={payout.id}
                        className={`border-gray-700 ${
                          isNext ? 'bg-green-900/30' : ''
                        }`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={isNext ? 'font-bold' : ''}>
                              {payout.placement === 1 ? '1st' :
                               payout.placement === 2 ? '2nd' :
                               payout.placement === 3 ? '3rd' :
                               `${payout.placement}th`}
                            </span>
                            {isNext && (
                              <Badge variant="default" className="bg-green-600 text-xs">
                                Next
                              </Badge>
                            )}
                            {isPaid && (
                              <Badge variant="default" className="bg-gray-600 text-xs">
                                Paid
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right ${isNext ? 'font-bold text-green-500' : ''}`}>
                          {formatCurrency(payout.amount)}
                        </TableCell>
                        <TableCell className={`text-right ${isNext ? 'font-bold text-green-500' : ''}`}>
                          {payout.amount_premium ? formatCurrency(payout.amount_premium) : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>

      {/* Fullscreen toggle */}
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="bg-gray-800/80 border-gray-700"
        >
          {isFullscreen ? (
            <MinimizeIcon className="h-4 w-4" />
          ) : (
            <MaximizeIcon className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Keyboard hints */}
      {!isFullscreen && (
        <div className="absolute bottom-4 left-4 text-gray-400 text-sm space-y-1">
          <p>F - Fullscreen • C - Toggle controls • Space - Play/Pause</p>
        </div>
      )}
    </div>
  )
}

export default function DisplayPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p className="text-2xl">Loading tournament display...</p>
      </div>
    }>
      <DisplayContent />
    </Suspense>
  )
}
