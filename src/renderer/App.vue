<template>
  <div 
    id="app" 
    class="app"
    role="application"
    aria-label="Guitar Chord Trainer - Press spacebar to cycle through chords"
  >
    <AutoCycleControls 
      :is-enabled="isAutoCycleEnabled"
      :bpm="bpm"
      :is-memory-mode="isMemoryMode"
      :difficulty-level="difficultyLevel"
      @toggle="toggleAutoCycle"
      @update-bpm="setBpm"
      @update-difficulty="setDifficultyLevel"
      @toggle-memory-mode="toggleMemoryMode"
    />
    
    <ChordDisplay 
      :chord="currentChord"
      :instrument="instrument"
      :memory-mode="isMemoryMode" 
      :zoom-level="zoomLevel"
    />
    
    <ZoomControls 
      v-model:zoom-level="zoomLevel"
    />

    <button
      class="app__instrument-switch"
      role="switch"
      :aria-checked="isUkulele"
      :aria-label="`Switch instrument. Current: ${instrumentLabel}`"
      :title="`Switch to ${instrument === 'guitar' ? 'ukulele' : 'guitar'}`"
      data-testid="instrument-toggle"
      @click="toggleInstrument"
    >
      <span class="app__instrument-switch-label app__instrument-switch-label--left">Guitar</span>
      <span
        class="app__instrument-switch-track"
        aria-hidden="true"
      >
        <span class="app__instrument-switch-thumb" />
      </span>
      <span class="app__instrument-switch-label app__instrument-switch-label--right">Ukulele</span>
    </button>
    
    <button 
      class="app__library-button"
      aria-label="Show chord library"
      title="Show all chords"
      @click="showLibrary = true"
    >
      📚 All Chords
    </button>

    <button
      class="app__scales-button"
      aria-label="Show scale trainer"
      title="Show scale trainer"
      @click="showScaleTrainer = true"
    >
      🎼 Scales
    </button>

    <button
      class="app__detector-button"
      aria-label="Show chord detector"
      title="Detect chords from microphone"
      @click="showChordDetector = true"
    >
      👂 Ear
    </button>
    
    <button
      class="app__shortcuts-button"
      aria-label="Show keyboard shortcuts"
      title="Show keyboard shortcuts"
      data-testid="shortcuts-button"
      @click="showKeyboardHelp = true"
    >
      ⌨ Shortcuts
    </button>

    <ChordLibrary
      v-model="showLibrary"
      :instrument="instrument"
    />
    <ScaleTrainer v-model="showScaleTrainer" :instrument="instrument" />
    <ChordDetector v-model="showChordDetector" :instrument="instrument" />
    <KeyboardHelp v-model="showKeyboardHelp" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useChordCycle } from './composables/useChordCycle'
import ChordDisplay from './components/ChordDisplay.vue'
import ChordLibrary from './components/ChordLibrary.vue'
import AutoCycleControls from './components/AutoCycleControls.vue'
import KeyboardHelp from './components/KeyboardHelp.vue'
import ZoomControls from './components/ZoomControls.vue'
import ScaleTrainer from './components/ScaleTrainer.vue'
import ChordDetector from './components/ChordDetector.vue'

const { 
  currentChord, 
  isAutoCycleEnabled, 
  bpm, 
  toggleAutoCycle, 
  setBpm, 
  isMemoryMode, 
  toggleMemoryMode, 
  instrument,
  toggleInstrument,
  difficultyLevel,
  setDifficultyLevel,
  cycleDifficultyLevel
} = useChordCycle()
const showLibrary = ref(false)
const showKeyboardHelp = ref(false)
const showScaleTrainer = ref(false)
const showChordDetector = ref(false)
const zoomLevel = ref(100)
const isUkulele = computed(() => instrument.value === 'ukulele')
const instrumentLabel = computed(() => instrument.value === 'ukulele' ? 'Ukulele (GCEA)' : 'Guitar (EADGBE)')

const handleKeyPress = (event: globalThis.KeyboardEvent): void => {
  // Toggle chord library with 'L' key
  if (event.key === 'l' || event.key === 'L') {
    event.preventDefault()
    showLibrary.value = !showLibrary.value
  }

  if (event.key === '?') {
    event.preventDefault()
    showKeyboardHelp.value = !showKeyboardHelp.value
  }

  // Toggle scale trainer with 'S' key
  if (event.key === 's' || event.key === 'S') {
    event.preventDefault()
    showScaleTrainer.value = !showScaleTrainer.value
  }

  // Toggle chord detector with 'R' key
  if (event.key === 'r' || event.key === 'R') {
    event.preventDefault()
    showChordDetector.value = !showChordDetector.value
  }

  // Toggle instrument with 'I' key
  if (event.key === 'i' || event.key === 'I') {
    event.preventDefault()
    toggleInstrument()
  }

  // Cycle difficulty level with 'D' key
  if (event.key === 'd' || event.key === 'D') {
    event.preventDefault()
    cycleDifficultyLevel()
  }
  
  // Close library with Escape key
  if (event.key === 'Escape' && showLibrary.value) {
    event.preventDefault()
    showLibrary.value = false
  }

  if (event.key === 'Escape' && showScaleTrainer.value) {
    event.preventDefault()
    showScaleTrainer.value = false
  }

  if (event.key === 'Escape' && showChordDetector.value) {
    event.preventDefault()
    showChordDetector.value = false
  }

  if (event.key === 'Escape' && showKeyboardHelp.value) {
    event.preventDefault()
    showKeyboardHelp.value = false
  }
  
  // Zoom in with Ctrl/Cmd + Plus or Equal
  if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '=')) {
    event.preventDefault()
    zoomLevel.value = Math.min(200, zoomLevel.value + 10)
  }
  
  // Zoom out with Ctrl/Cmd + Minus
  if ((event.ctrlKey || event.metaKey) && event.key === '-') {
    event.preventDefault()
    zoomLevel.value = Math.max(50, zoomLevel.value - 10)
  }
  
  // Reset zoom with Ctrl/Cmd + 0
  if ((event.ctrlKey || event.metaKey) && event.key === '0') {
    event.preventDefault()
    zoomLevel.value = 100
  }
}

const handleWheel = (event: globalThis.WheelEvent): void => {
  // Zoom with mouse wheel when Ctrl/Cmd is pressed
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    
    // deltaY is positive when scrolling down (zoom out), negative when scrolling up (zoom in)
    const delta = event.deltaY < 0 ? 10 : -10
    zoomLevel.value = Math.max(50, Math.min(200, zoomLevel.value + delta))
  }
}

onMounted(() => {
  globalThis.window.addEventListener('keydown', handleKeyPress)
  globalThis.window.addEventListener('wheel', handleWheel, { passive: false })
})

onUnmounted(() => {
  globalThis.window.removeEventListener('keydown', handleKeyPress)
  globalThis.window.removeEventListener('wheel', handleWheel)
})
</script>

<style scoped>
.app {
  width: 100%;
  height: 100vh;
  position: relative;
}

.app__library-button {
  position: fixed;
  top: 2rem;
  right: 2rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 2px solid var(--text-secondary);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 100;
}

.app__scales-button {
  position: fixed;
  top: 5.35rem;
  right: 2rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 2px solid var(--text-secondary);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 100;
}

.app__scales-button:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.app__scales-button:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.app__scales-button:active {
  transform: translateY(0);
}

.app__detector-button {
  position: fixed;
  top: 8.7rem;
  right: 2rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 2px solid var(--text-secondary);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 100;
}

.app__detector-button:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.app__detector-button:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.app__detector-button:active {
  transform: translateY(0);
}

.app__instrument-switch {
  position: fixed;
  bottom: 5rem;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 2px solid var(--text-secondary);
  padding: 0.55rem 0.75rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 100;
}

.app__instrument-switch:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: translateX(-50%) translateY(-2px);
}

.app__instrument-switch:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.app__instrument-switch[aria-checked="true"] {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(212, 165, 116, 0.25);
}

.app__instrument-switch-label {
  line-height: 1;
  opacity: 0.75;
  transition: opacity 0.2s ease, color 0.2s ease;
}

.app__instrument-switch[aria-checked="false"] .app__instrument-switch-label--left {
  color: var(--text-primary);
  opacity: 1;
}

.app__instrument-switch[aria-checked="true"] .app__instrument-switch-label--right {
  color: var(--text-primary);
  opacity: 1;
}

.app__instrument-switch-track {
  position: relative;
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.app__instrument-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--text-primary);
  transition: transform 0.22s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}

.app__instrument-switch[aria-checked="true"] .app__instrument-switch-thumb {
  transform: translateX(18px);
}

.app__library-button:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.app__library-button:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.app__library-button:active {
  transform: translateY(0);
}

.app__shortcuts-button {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 2px solid var(--text-secondary);
  padding: 0.7rem 1rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 100;
}

.app__shortcuts-button:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: translateY(-2px);
}

.app__shortcuts-button:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .app__library-button {
    top: 5.75rem;
    right: 1rem;
    font-size: 0.875rem;
    padding: 0.6rem 1rem;
  }

  .app__scales-button {
    top: 8.95rem;
    right: 1rem;
    font-size: 0.875rem;
    padding: 0.6rem 1rem;
  }

  .app__detector-button {
    top: 12.15rem;
    right: 1rem;
    font-size: 0.875rem;
    padding: 0.6rem 1rem;
  }

  .app__instrument-switch {
    left: 50%;
    bottom: 4.5rem;
    font-size: 0.75rem;
    padding: 0.45rem 0.6rem;
    gap: 0.4rem;
  }

  .app__instrument-switch-track {
    width: 36px;
    height: 20px;
  }

  .app__instrument-switch-thumb {
    width: 14px;
    height: 14px;
  }

  .app__instrument-switch[aria-checked="true"] .app__instrument-switch-thumb {
    transform: translateX(16px);
  }

  .app__shortcuts-button {
    right: 1rem;
    bottom: 1rem;
    font-size: 0.8rem;
    padding: 0.6rem 0.85rem;
  }
}
</style>

