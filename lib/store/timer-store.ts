import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BlindLevel } from '@/lib/types'

interface TimerState {
  // Timer state
  isRunning: boolean
  isPaused: boolean
  currentLevel: number
  timeRemaining: number // in seconds (updates every second, but not persisted)
  savedMinute: number // last saved minute mark (only persisted at minute boundaries)
  lastTickTimestamp: number | null // timestamp of last save for resume calculation

  // Blind structure (BlindLevel[] with is_break field)
  blinds: BlindLevel[]

  // Actions
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  nextLevel: () => void
  prevLevel: () => void
  tick: () => void
  setBlinds: (blinds: BlindLevel[]) => void
  setCurrentLevel: (level: number) => void
  hydrate: () => void // recalculate time after page load
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
  isRunning: false,
  isPaused: false,
  currentLevel: 0,
  timeRemaining: 0,
  savedMinute: 0,
  lastTickTimestamp: null,
  blinds: [],

  start: () => {
    const { blinds, currentLevel } = get()
    if (blinds.length === 0) return

    const duration = blinds[currentLevel]?.duration || 900 // default 15 minutes
    const savedMinute = Math.ceil(duration / 60) * 60 // Round up to next minute

    set({
      isRunning: true,
      isPaused: false,
      timeRemaining: duration,
      savedMinute: savedMinute,
      lastTickTimestamp: Date.now()
    })
  },

  pause: () => {
    set({ isPaused: true })
  },

  resume: () => {
    set({ isPaused: false })
  },

  reset: () => {
    const { blinds } = get()
    const duration = blinds[0]?.duration || 900
    set({
      isRunning: false,
      isPaused: false,
      currentLevel: 0,
      timeRemaining: duration
    })
  },

  nextLevel: () => {
    const { blinds, currentLevel } = get()
    if (currentLevel < blinds.length - 1) {
      const newLevel = currentLevel + 1
      const duration = blinds[newLevel]?.duration || 900
      set({
        currentLevel: newLevel,
        timeRemaining: duration,
        isPaused: false
      })
    }
  },

  prevLevel: () => {
    const { blinds, currentLevel } = get()
    if (currentLevel > 0) {
      const newLevel = currentLevel - 1
      const duration = blinds[newLevel]?.duration || 900
      set({
        currentLevel: newLevel,
        timeRemaining: duration,
        isPaused: false
      })
    }
  },

  tick: () => {
    const { isRunning, isPaused, timeRemaining, savedMinute, nextLevel } = get()

    if (!isRunning || isPaused) return

    if (timeRemaining > 0) {
      const newTimeRemaining = timeRemaining - 1
      const newMinute = Math.ceil(newTimeRemaining / 60) * 60

      // Only persist when the minute changes to reduce localStorage writes
      if (newMinute !== savedMinute) {
        set({
          timeRemaining: newTimeRemaining,
          savedMinute: newMinute,
          lastTickTimestamp: Date.now()
        })
      } else {
        // Lightweight update without persistence - just update timeRemaining
        set({ timeRemaining: newTimeRemaining }, false)
      }
    } else {
      // Auto-advance to next level
      nextLevel()
    }
  },

  setBlinds: (blinds: BlindStructure[]) => {
    const { timeRemaining, isRunning, isPaused, savedMinute } = get()
    const duration = blinds[0]?.duration || 900

    // Only reset timeRemaining if timer has never been started (fresh page load with no saved state)
    // Check if there's a savedMinute - if yes, the timer has been hydrated from storage
    if (!isRunning && !isPaused && savedMinute === 0) {
      set({ blinds, timeRemaining: duration })
    } else {
      // Timer has been hydrated or is running/paused - just update blinds without touching timeRemaining
      set({ blinds })
    }
  },

  setCurrentLevel: (level: number) => {
    const { blinds } = get()
    if (level >= 0 && level < blinds.length) {
      const duration = blinds[level]?.duration || 900
      set({ currentLevel: level, timeRemaining: duration })
    }
  },

  hydrate: () => {
    // This is now handled in onRehydrateStorage
  },
}),
    {
      name: 'tournament-timer-storage',
      // Only persist specific fields (don't persist timeRemaining, only savedMinute)
      partialize: (state) => ({
        isRunning: state.isRunning,
        isPaused: state.isPaused,
        currentLevel: state.currentLevel,
        savedMinute: state.savedMinute,
        lastTickTimestamp: state.lastTickTimestamp,
        blinds: state.blinds,
      }),
      onRehydrateStorage: (state) => {
        return (hydratedState, error) => {
          if (!error && hydratedState) {
            // After rehydration, restore timeRemaining from savedMinute
            if (hydratedState.isRunning && !hydratedState.isPaused && hydratedState.savedMinute) {
              hydratedState.timeRemaining = hydratedState.savedMinute
            }
          }
        }
      },
    }
  )
)
