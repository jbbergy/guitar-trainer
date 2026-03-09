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
      @toggle="toggleAutoCycle"
      @update-bpm="setBpm"
      @toggle-memory-mode="toggleMemoryMode"
    />
    
    <ChordDisplay 
      :chord="currentChord" 
      :memory-mode="isMemoryMode" 
      :zoom-level="zoomLevel"
    />
    
    <ZoomControls 
      v-model:zoom-level="zoomLevel"
    />
    
    <button 
      class="app__library-button"
      @click="showLibrary = true"
      aria-label="Show chord library"
      title="Show all chords"
    >
      📚 All Chords
    </button>
    
    <div 
      class="app__hint" 
      role="status"
      aria-live="polite" 
      aria-atomic="true"
    >
      Press <kbd aria-label="spacebar">SPACE</kbd> {{ isAutoCycleEnabled ? 'to pause' : 'for next chord' }} • 
      <kbd aria-label="Left arrow or backspace">← / BKSP</kbd> previous • 
      <kbd aria-label="Right arrow">→</kbd> forward • 
      <kbd aria-label="M key">M</kbd> no schéma • 
      <kbd aria-label="L key">L</kbd> for chord library • 
      <kbd aria-label="Ctrl/Cmd plus">Ctrl/⌘ +/-</kbd> zoom • Mouse wheel to zoom
    </div>
    <ChordLibrary v-model="showLibrary" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useChordCycle } from './composables/useChordCycle'
import ChordDisplay from './components/ChordDisplay.vue'
import ChordLibrary from './components/ChordLibrary.vue'
import AutoCycleControls from './components/AutoCycleControls.vue'
import ZoomControls from './components/ZoomControls.vue'

const { 
  currentChord, 
  isAutoCycleEnabled, 
  bpm, 
  toggleAutoCycle, 
  setBpm, 
  isMemoryMode, 
  toggleMemoryMode, 
  canGoBack 
} = useChordCycle()
const showLibrary = ref(false)
const zoomLevel = ref(100)

const handleKeyPress = (event: KeyboardEvent) => {
  // Toggle chord library with 'L' key
  if (event.key === 'l' || event.key === 'L') {
    event.preventDefault()
    showLibrary.value = !showLibrary.value
  }
  
  // Close library with Escape key
  if (event.key === 'Escape' && showLibrary.value) {
    event.preventDefault()
    showLibrary.value = false
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

const handleWheel = (event: WheelEvent) => {
  // Zoom with mouse wheel when Ctrl/Cmd is pressed
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    
    // deltaY is positive when scrolling down (zoom out), negative when scrolling up (zoom in)
    const delta = event.deltaY < 0 ? 10 : -10
    zoomLevel.value = Math.max(50, Math.min(200, zoomLevel.value + delta))
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress)
  window.addEventListener('wheel', handleWheel, { passive: false })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
  window.removeEventListener('wheel', handleWheel)
})
</script>

<style scoped>
.app {
  width: 100%;
  height: 100vh;
  position: relative;
}

.app__hint {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  color: var(--text-secondary);
  font-size: 0.875rem;
  opacity: 0.8;
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

.app__hint kbd {
  background: var(--bg-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--text-secondary);
  font-family: monospace;
  font-size: 0.75rem;
}

/* Hide hint after 5 seconds */
@keyframes fadeOut {
  0% { opacity: 0.8; }
  80% { opacity: 0.8; }
  100% { opacity: 0; }
}

.app__hint {
  animation: fadeOut 8s ease-in-out forwards;
}
</style>

