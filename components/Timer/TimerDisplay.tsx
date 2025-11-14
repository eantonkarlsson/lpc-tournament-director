'use client'

import { useEffect } from 'react'
import { useTimerStore } from '@/lib/store/timer-store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

export function TimerDisplay() {
  const {
    currentLevel,
    timeRemaining,
    blinds,
    isRunning,
    isPaused,
    tick
  } = useTimerStore()

  // Timer effect
  useEffect(() => {
    if (!isRunning || isPaused) return

    const interval = setInterval(() => {
      tick()
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, isPaused, tick])

  const currentBlind = blinds[currentLevel]
  const nextBlind = blinds[currentLevel + 1]

  if (!currentBlind) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p className="text-2xl">No blind structure loaded</p>
      </div>
    )
  }

  // Check if current level is a break
  const isOnBreak = currentBlind.is_break

  // Color coding for time remaining
  const timeColor = timeRemaining <= 60 ? 'text-red-500' : timeRemaining <= 180 ? 'text-yellow-500' : 'text-green-500'

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-8 gap-8">
      {/* Level indicator or BREAK indicator */}
      <div className="text-center">
        {isOnBreak ? (
          <Badge variant="outline" className="text-4xl px-12 py-4 mb-2 bg-blue-600 text-white border-blue-400">
            BREAK
          </Badge>
        ) : (
          <Badge variant="outline" className="text-2xl px-6 py-2 mb-2">
            Level {currentBlind.level}
          </Badge>
        )}
        {isPaused && (
          <Badge variant="destructive" className="text-xl px-4 py-1 ml-4">
            PAUSED
          </Badge>
        )}
      </div>

      {/* Current blinds - Main display (or BREAK message) */}
      {isOnBreak ? (
        <Card className="bg-blue-900 border-blue-600 p-12 text-center min-w-[600px]">
          <div className="space-y-4">
            <div className="text-6xl font-bold text-white">
              ☕ Break Time
            </div>
            {nextBlind && !nextBlind.is_break && (
              <div className="text-2xl text-blue-200">
                Next: {formatChips(nextBlind.small_blind)} / {formatChips(nextBlind.big_blind)}
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="bg-gray-800 border-gray-700 p-12 text-center min-w-[600px]">
          <div className="space-y-4">
            <div className="text-6xl font-bold text-white">
              {formatChips(currentBlind.small_blind)} / {formatChips(currentBlind.big_blind)}
            </div>
            {currentBlind.ante > 0 && (
              <div className="text-3xl text-gray-400">
                Ante: {formatChips(currentBlind.ante)}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Time remaining */}
      <div className={`text-8xl font-mono font-bold ${timeColor}`}>
        {formatTime(timeRemaining)}
      </div>

      {/* Next level preview (only show if not on break and next level exists and is not a break) */}
      {!isOnBreak && nextBlind && !nextBlind.is_break && (
        <Card className="bg-gray-800 border-gray-700 p-6 text-center min-w-[400px]">
          <div className="text-gray-400 text-xl mb-2">Next Level</div>
          <div className="text-3xl font-bold text-white">
            {formatChips(nextBlind.small_blind)} / {formatChips(nextBlind.big_blind)}
            {nextBlind.ante > 0 && (
              <span className="text-2xl text-gray-400 ml-2">
                (Ante: {formatChips(nextBlind.ante)})
              </span>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
