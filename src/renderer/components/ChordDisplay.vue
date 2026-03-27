<template>
  <div 
    class="chord-display" 
    :class="{ 'chord-display--success': showSuccess }"
    tabindex="0"
    role="region"
    :aria-label="`Currently displaying chord: ${chord.name}`"
  >
    <transition name="fade" mode="out-in">
      <div :key="chord.name" class="chord-content">
        <ChordCard :chord="chord" :instrument="instrument" :memory-mode="memoryMode" :zoom-level="zoomLevel" />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import type { Chord } from '@/types/chord'
import type { Instrument } from '@/types/chord'
import ChordCard from './ChordCard.vue'

withDefaults(defineProps<{
  chord: Chord
  instrument?: Instrument
  memoryMode?: boolean
  zoomLevel?: number
  showSuccess?: boolean
}>(), {
  instrument: 'guitar',
  memoryMode: false,
  zoomLevel: 100,
  showSuccess: false
})
</script>

<style scoped>
.chord-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 3.5rem 2rem 4rem;
  gap: 1rem;
  outline: none;
  transition: background-color 0.3s ease;
}

.chord-display--success {
  background-color: rgba(46, 204, 113, 0.15);
}

.chord-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.chord-display:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 4px;
}

/* Smooth fade transition for chord changes */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease-in-out, transform 0.15s ease-in-out;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.1s ease;
  }
  
  .fade-enter-from,
  .fade-leave-to {
    transform: none;
  }
}

@media (max-height: 600px) {
  .chord-display {
    padding: 3rem 1rem 3.5rem;
    gap: 0.5rem;
  }
}
</style>
