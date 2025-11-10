'use client'

import { useTimerStore } from '@/lib/store/timer-store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PlayIcon, PauseIcon, SkipForwardIcon, SkipBackIcon, RotateCcwIcon } from 'lucide-react'

export function TimerControls() {
  const {
    isRunning,
    isPaused,
    currentLevel,
    blinds,
    start,
    pause,
    resume,
    reset,
    nextLevel,
    prevLevel
  } = useTimerStore()

  const canGoBack = currentLevel > 0
  const canGoForward = currentLevel < blinds.length - 1

  return (
    <Card className="bg-gray-800 border-gray-700 p-6">
      <div className="flex items-center justify-center gap-4">
        {/* Previous level */}
        <Button
          variant="outline"
          size="lg"
          onClick={prevLevel}
          disabled={!canGoBack}
          className="h-16 w-16"
        >
          <SkipBackIcon className="h-6 w-6" />
        </Button>

        {/* Play/Pause */}
        {!isRunning ? (
          <Button
            size="lg"
            onClick={start}
            className="h-16 w-32 bg-green-600 hover:bg-green-700"
          >
            <PlayIcon className="h-6 w-6 mr-2" />
            Start
          </Button>
        ) : isPaused ? (
          <Button
            size="lg"
            onClick={resume}
            className="h-16 w-32 bg-green-600 hover:bg-green-700"
          >
            <PlayIcon className="h-6 w-6 mr-2" />
            Resume
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={pause}
            className="h-16 w-32 bg-yellow-600 hover:bg-yellow-700"
          >
            <PauseIcon className="h-6 w-6 mr-2" />
            Pause
          </Button>
        )}

        {/* Next level */}
        <Button
          variant="outline"
          size="lg"
          onClick={nextLevel}
          disabled={!canGoForward}
          className="h-16 w-16"
        >
          <SkipForwardIcon className="h-6 w-6" />
        </Button>

        {/* Reset */}
        <Button
          variant="outline"
          size="lg"
          onClick={reset}
          className="h-16 w-16 ml-4"
        >
          <RotateCcwIcon className="h-6 w-6" />
        </Button>
      </div>
    </Card>
  )
}
