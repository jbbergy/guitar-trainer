/**
 * useChordCycle Composable
 * 
 * Manages chord cycling state and spacebar keyboard events
 * Returns current chord and provides next chord functionality
 * Supports auto-cycle mode with BPM control
 */

import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { getRandomChord } from '@/utils/randomChord'
import type { Chord } from '@/types/chord'
import type { Instrument } from '@/types/chord'

export function useChordCycle() {
  const instrument = ref<Instrument>('guitar')
  const currentChord = ref<Chord>(getRandomChord(undefined, instrument.value))
  const responseStartTime = ref<number>(0)
  const { width, height } = useWindowSize()

  // Chord history for previous chord navigation
  const chordHistory = ref<Chord[]>([])
  const historyIndex = ref<number>(-1)

  // Memory training mode toggle
  const isMemoryMode = ref<boolean>(false)

  // Auto-cycle feature
  const isAutoCycleEnabled = ref<boolean>(false)
  const bpm = ref<number>(60)
  const autoCycleIntervalId = ref<number | null>(null)

  const nextChord = () => {
    const startTime = performance.now()
    const newChord = getRandomChord(currentChord.value, instrument.value)

    // Add current chord to history before changing
    if (historyIndex.value === -1 || historyIndex.value === chordHistory.value.length - 1) {
      chordHistory.value.push(currentChord.value)
      historyIndex.value = chordHistory.value.length
    } else {
      // If we're in the middle of history, truncate future history
      chordHistory.value = chordHistory.value.slice(0, historyIndex.value + 1)
      chordHistory.value.push(currentChord.value)
      historyIndex.value = chordHistory.value.length
    }

    currentChord.value = newChord
    const endTime = performance.now()
    const responseTime = endTime - startTime

    // Log performance for validation
    if (responseTime > 100) {
      console.warn(`Chord change took ${responseTime.toFixed(2)}ms (target: <100ms)`)
    }
  }

  const previousChord = () => {
    if (historyIndex.value > 0) {
      historyIndex.value--
      currentChord.value = chordHistory.value[historyIndex.value]
    }
  }

  const nextHistoryChord = () => {
    if (historyIndex.value < chordHistory.value.length - 1) {
      historyIndex.value++
      currentChord.value = chordHistory.value[historyIndex.value]
    }
  }

  const toggleMemoryMode = () => {
    isMemoryMode.value = !isMemoryMode.value
  }

  const setInstrument = (newInstrument: Instrument) => {
    if (instrument.value === newInstrument) {
      return
    }

    instrument.value = newInstrument
    chordHistory.value = []
    historyIndex.value = -1
    currentChord.value = getRandomChord(undefined, instrument.value)
  }

  const toggleInstrument = () => {
    setInstrument(instrument.value === 'guitar' ? 'ukulele' : 'guitar')
  }

  const startAutoCycle = () => {
    if (autoCycleIntervalId.value !== null) {
      stopAutoCycle()
    }

    // Convert BPM to milliseconds (60 BPM = 1 beat per second = 1000ms)
    const intervalMs = (60 / bpm.value) * 1000

    autoCycleIntervalId.value = window.setInterval(() => {
      nextChord()
    }, intervalMs)

    isAutoCycleEnabled.value = true
  }

  const stopAutoCycle = () => {
    if (autoCycleIntervalId.value !== null) {
      clearInterval(autoCycleIntervalId.value)
      autoCycleIntervalId.value = null
    }
    isAutoCycleEnabled.value = false
  }

  const toggleAutoCycle = () => {
    if (isAutoCycleEnabled.value) {
      stopAutoCycle()
    } else {
      startAutoCycle()
    }
  }

  const setBpm = (newBpm: number) => {
    bpm.value = Math.max(20, Math.min(240, newBpm)) // Clamp between 20 and 240 BPM

    // Restart auto-cycle if it's currently running to apply new BPM
    if (isAutoCycleEnabled.value) {
      startAutoCycle()
    }
  }

  // Watch BPM changes and restart interval if auto-cycle is active
  watch(bpm, () => {
    if (isAutoCycleEnabled.value) {
      startAutoCycle()
    }
  })

  const handleKeyPress = (event: KeyboardEvent) => {
    // Spacebar cycles to next chord (manual mode only)
    if (event.code === 'Space' || event.key === ' ') {
      event.preventDefault() // Prevent page scroll

      // If auto-cycle is enabled, spacebar pauses it
      if (isAutoCycleEnabled.value) {
        stopAutoCycle()
      } else {
        responseStartTime.value = performance.now()
        nextChord()
      }
    }

    // Left arrow or Backspace to go to previous chord
    if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
      event.preventDefault()
      if (!isAutoCycleEnabled.value) {
        previousChord()
      }
    }

    // Right arrow to go forward in history
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      if (!isAutoCycleEnabled.value) {
        nextHistoryChord()
      }
    }

    // 'M' key to toggle memory mode
    if (event.key === 'm' || event.key === 'M') {
      event.preventDefault()
      toggleMemoryMode()
    }
  }

  // Watch for window resize and log for accessibility
  watch([width, height], ([newWidth, newHeight]) => {
    if (newWidth < 800 || newHeight < 600) {
      console.warn(`Window size ${newWidth}x${newHeight} is below minimum (800x600). Some content may be cropped.`)
    }
  })

  // Attach keyboard listener on mount
  onMounted(() => {
    window.addEventListener('keydown', handleKeyPress)

    // Set initial focus to ensure keyboard works immediately
    window.focus()
  })

  // Clean up on unmount
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyPress)
    stopAutoCycle()
  })

  return {
    instrument,
    setInstrument,
    toggleInstrument,
    currentChord,
    nextChord,
    previousChord,
    nextHistoryChord,
    windowSize: { width, height },
    isAutoCycleEnabled,
    bpm,
    toggleAutoCycle,
    setBpm,
    startAutoCycle,
    stopAutoCycle,
    isMemoryMode,
    toggleMemoryMode,
    canGoBack: computed(() => historyIndex.value > 0),
    canGoForward: computed(() => historyIndex.value < chordHistory.value.length - 1)
  }
}
