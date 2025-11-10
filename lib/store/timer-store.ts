import { create } from 'zustand'
import type { BlindStructure } from '@/lib/types'

interface TimerState {
  // Timer state
  isRunning: boolean
  isPaused: boolean
  currentLevel: number
  timeRemaining: number // in seconds

  // Blind structure
  blinds: BlindStructure[]

  // Actions
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  nextLevel: () => void
  prevLevel: () => void
  tick: () => void
  setBlinds: (blinds: BlindStructure[]) => void
  setCurrentLevel: (level: number) => void
}

export const useTimerStore = create<TimerState>((set, get) => ({
  isRunning: false,
  isPaused: false,
  currentLevel: 0,
  timeRemaining: 0,
  blinds: [],

  start: () => {
    const { blinds, currentLevel } = get()
    if (blinds.length === 0) return

    const duration = blinds[currentLevel]?.duration || 900 // default 15 minutes
    set({ isRunning: true, isPaused: false, timeRemaining: duration })
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
    const { isRunning, isPaused, timeRemaining, nextLevel } = get()

    if (!isRunning || isPaused) return

    if (timeRemaining > 0) {
      set({ timeRemaining: timeRemaining - 1 })
    } else {
      // Auto-advance to next level
      nextLevel()
    }
  },

  setBlinds: (blinds: BlindStructure[]) => {
    const duration = blinds[0]?.duration || 900
    set({ blinds, timeRemaining: duration })
  },

  setCurrentLevel: (level: number) => {
    const { blinds } = get()
    if (level >= 0 && level < blinds.length) {
      const duration = blinds[level]?.duration || 900
      set({ currentLevel: level, timeRemaining: duration })
    }
  },
}))
