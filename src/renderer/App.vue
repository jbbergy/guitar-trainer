<template>
  <div 
    id="app" 
    class="app"
    role="application"
    aria-label="Guitar Chord Trainer - Press spacebar to cycle through chords"
  >
    <AutoCycleControls 
      v-if="currentView === 'trainer'"
      :is-enabled="isAutoCycleEnabled"
      :bpm="bpm"
      :is-memory-mode="isMemoryMode"
      :difficulty-level="difficultyLevel"
      :is-listen-mode="isListenModeEnabled"
      :current-view="currentView"
      @toggle="toggleAutoCycle"
      @update-bpm="setBpm"
      @update-difficulty="setDifficultyLevel"
      @toggle-memory-mode="toggleMemoryMode"
      @toggle-listen-mode="handleListenToggle"
      @show-library="showLibrary = true"
      @show-scales="showScaleTrainer = true"
      @switch-view="currentView = $event"
    />

    <ChordDisplay 
      v-if="currentView === 'trainer'"
      :chord="currentChord"
      :instrument="instrument"
      :memory-mode="isMemoryMode" 
      :zoom-level="zoomLevel"
      :show-success="showSuccessFlash"
    />

    <ComposeView
      v-if="currentView === 'compose'"
      :instrument="instrument"
      :current-view="currentView"
      @update-instrument="setInstrument"
      @switch-view="currentView = $event"
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
    <KeyboardHelp
      v-model="showKeyboardHelp"
      :current-view="currentView"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useChordCycle } from './composables/useChordCycle'
import ChordDisplay from './components/ChordDisplay.vue'
import ChordLibrary from './components/ChordLibrary.vue'
import AutoCycleControls from './components/AutoCycleControls.vue'
import BottomBar from './components/BottomBar.vue'
import KeyboardHelp from './components/KeyboardHelp.vue'
import ScaleTrainer from './components/ScaleTrainer.vue'
import ListenSetupModal from './components/ListenSetupModal.vue'
import ComposeView from './components/ComposeView.vue'

const STORAGE_KEY_VIEW_MODE = 'app-view-mode'
type AppView = 'trainer' | 'compose'

const { 
  currentChord, 
  isAutoCycleEnabled, 
  bpm, 
  toggleAutoCycle, 
  setBpm, 
  isMemoryMode, 
  toggleMemoryMode, 
  instrument,
  setInstrument,
  toggleInstrument,
  difficultyLevel,
  setDifficultyLevel,
  cycleDifficultyLevel,
  isListenModeEnabled,
  startListenMode,
  stopListenMode,
  detectedChord,
  listenModeSignalLevel,
  chordMatchSuccess,
  setKeyboardEnabled,
} = useChordCycle()

const getInitialView = (): AppView => {
  try {
    const saved = globalThis.localStorage.getItem(STORAGE_KEY_VIEW_MODE)
    return saved === 'compose' ? 'compose' : 'trainer'
  } catch {
    return 'trainer'
  }
}

const currentView = ref<AppView>(getInitialView())
const showLibrary = ref(false)
const showKeyboardHelp = ref(false)
const showScaleTrainer = ref(false)
const showListenSetup = ref(false)
const zoomLevel = ref(100)

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || target.isContentEditable
}

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
  const hasPrimaryModifier = event.ctrlKey || event.metaKey

  if (hasPrimaryModifier && (event.key === 'c' || event.key === 'C')) {
    // Keep standard copy behavior when editing or selecting text.
    const selectedText = globalThis.getSelection?.()?.toString() ?? ''
    if (!isEditableTarget(event.target) && selectedText.length === 0) {
      event.preventDefault()
      currentView.value = currentView.value === 'trainer' ? 'compose' : 'trainer'
      return
    }
  }

  if (event.key === '?') {
    event.preventDefault()
    showKeyboardHelp.value = !showKeyboardHelp.value
    return
  }

  if (event.key === 'Escape' && showKeyboardHelp.value) {
    event.preventDefault()
    showKeyboardHelp.value = false
    return
  }

  if (currentView.value !== 'trainer') {
    return
  }

  if (!hasPrimaryModifier && isEditableTarget(event.target)) {
    return
  }

  // Toggle chord library with 'L' key
  if (event.key === 'l' || event.key === 'L') {
    event.preventDefault()
    showLibrary.value = !showLibrary.value
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
  if (hasPrimaryModifier && (event.key === '+' || event.key === '=')) {
    event.preventDefault()
    zoomLevel.value = Math.min(200, zoomLevel.value + 10)
  }
  
  // Zoom out with Ctrl/Cmd + Minus
  if (hasPrimaryModifier && event.key === '-') {
    event.preventDefault()
    zoomLevel.value = Math.max(50, zoomLevel.value - 10)
  }
  
  // Reset zoom with Ctrl/Cmd + 0
  if (hasPrimaryModifier && event.key === '0') {
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
  setKeyboardEnabled(currentView.value === 'trainer')
  globalThis.window.addEventListener('keydown', handleKeyPress)
  globalThis.window.addEventListener('wheel', handleWheel, { passive: false })
})

watch(currentView, (view) => {
  setKeyboardEnabled(view === 'trainer')

  try {
    globalThis.localStorage.setItem(STORAGE_KEY_VIEW_MODE, view)
  } catch {
    // Ignore storage failures and keep UI responsive.
  }

  if (view === 'compose') {
    if (isAutoCycleEnabled.value) {
      toggleAutoCycle()
    }

    if (isListenModeEnabled.value) {
      stopListenMode()
    }

    showLibrary.value = false
    showScaleTrainer.value = false
    showListenSetup.value = false
  }
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
</style>

