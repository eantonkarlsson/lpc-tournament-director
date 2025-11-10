'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTimerStore } from '@/lib/store/timer-store'
import { useBlindStructure } from '@/lib/supabase/hooks'
import { TimerDisplay } from '@/components/Timer/TimerDisplay'
import { TimerControls } from '@/components/Timer/TimerControls'
import { Button } from '@/components/ui/button'
import { MaximizeIcon, MinimizeIcon } from 'lucide-react'

export const dynamic = 'force-dynamic'

function TimerContent() {
  const searchParams = useSearchParams()
  const tournamentId = searchParams.get('tournament') || ''

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)

  const { blinds, loading, error } = useBlindStructure(tournamentId)
  const setBlinds = useTimerStore((state) => state.setBlinds)

  // Load blinds into the store
  useEffect(() => {
    if (blinds.length > 0) {
      setBlinds(blinds)
    }
  }, [blinds, setBlinds])

  // Fullscreen functionality
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      setIsFullscreen(true)
      // Hide controls in fullscreen
      setShowControls(false)
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
        setIsFullscreen(false)
        setShowControls(true)
      }
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      setShowControls(!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      } else if (e.key === 'c' || e.key === 'C') {
        setShowControls((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p className="text-2xl">Loading tournament...</p>
      </div>
    )
  }

  if (error || !tournamentId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white gap-4">
        <p className="text-2xl text-red-500">
          {error ? 'Error loading tournament' : 'No tournament specified'}
        </p>
        <p className="text-gray-400">
          Please provide a tournament ID in the URL: ?tournament=YOUR_ID
        </p>
      </div>
    )
  }

  return (
    <div className="relative h-screen bg-gray-900">
      <TimerDisplay />

      {/* Controls overlay */}
      {showControls && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <TimerControls />
        </div>
      )}

      {/* Fullscreen toggle button */}
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

      {/* Instructions (only shown when not in fullscreen) */}
      {!isFullscreen && (
        <div className="absolute bottom-4 left-4 text-gray-400 text-sm">
          <p>Press F for fullscreen • C to toggle controls</p>
        </div>
      )}
    </div>
  )
}

export default function TimerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p className="text-2xl">Loading timer...</p>
      </div>
    }>
      <TimerContent />
    </Suspense>
  )
}
