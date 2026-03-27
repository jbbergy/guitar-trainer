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
      :is-listen-mode="isListenModeEnabled"
      @toggle="toggleAutoCycle"
      @update-bpm="setBpm"
      @update-difficulty="setDifficultyLevel"
      @toggle-memory-mode="toggleMemoryMode"
      @toggle-listen-mode="handleListenToggle"
      @show-library="showLibrary = true"
      @show-scales="showScaleTrainer = true"
    />
    
    <ChordDisplay 
      :chord="currentChord"
      :instrument="instrument"
      :memory-mode="isMemoryMode" 
      :zoom-level="zoomLevel"
      :show-success="showSuccessFlash"
    />
    
    <BottomBar
      v-model:zoom-level="zoomLevel"
      :is-listen-mode="isListenModeEnabled"
      :detected-chord="detectedChord"
      :signal-level="listenModeSignalLevel"
      :is-match="isDetectedChordMatch"
      :instrument="instrument"
      @toggle-instrument="toggleInstrument"
      @show-shortcuts="showKeyboardHelp = true"
    />

    <ChordLibrary
      v-model="showLibrary"
      :instrument="instrument"
    />
    <ScaleTrainer
      v-model="showScaleTrainer"
      :instrument="instrument"
    />
    <ListenSetupModal
      v-model="showListenSetup"
      :instrument="instrument"
      @validate="handleListenValidate"
    />
    <KeyboardHelp v-model="showKeyboardHelp" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useChordCycle } from './composables/useChordCycle'
import ChordDisplay from './components/ChordDisplay.vue'
import ChordLibrary from './components/ChordLibrary.vue'
import AutoCycleControls from './components/AutoCycleControls.vue'
import BottomBar from './components/BottomBar.vue'
import KeyboardHelp from './components/KeyboardHelp.vue'
import ScaleTrainer from './components/ScaleTrainer.vue'
import ListenSetupModal from './components/ListenSetupModal.vue'

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
  cycleDifficultyLevel,
  isListenModeEnabled,
  startListenMode,
  stopListenMode,
  detectedChord,
  listenModeSignalLevel,
  chordMatchSuccess
} = useChordCycle()
const showLibrary = ref(false)
const showKeyboardHelp = ref(false)
const showScaleTrainer = ref(false)
const showListenSetup = ref(false)
const zoomLevel = ref(100)

const isDetectedChordMatch = computed(() => {
  if (!detectedChord.value) return false
  return detectedChord.value.fullName === currentChord.value.name
})

const handleListenToggle = () => {
  if (isListenModeEnabled.value) {
    stopListenMode()
  } else {
    showListenSetup.value = true
  }
}

const handleListenValidate = (deviceId: string) => {
  startListenMode(deviceId)
}

// Success flash is driven by chordMatchSuccess from the composable
const showSuccessFlash = chordMatchSuccess

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

  if (event.key === 'Escape' && showListenSetup.value) {
    event.preventDefault()
    showListenSetup.value = false
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

@media (max-width: 640px) {
}
</style>

