<template>
  <div 
    class="chord-card"
    :class="{ 'chord-card--memory-mode': memoryMode }"
    :style="{
      transform: `scale(${zoomScale})`,
      transformOrigin: 'center center'
    }"
  >
    <div class="chord-card__name">
      {{ chord.name }}
    </div>
    <div v-if="!memoryMode" class="chord-card__diagram">
      <ChordDiagram :chord="chord" :instrument="instrument" :size="size" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Chord } from '@/types/chord'
import type { Instrument } from '@/types/chord'
import ChordDiagram from './ChordDiagram.vue'

const props = withDefaults(defineProps<{
  chord: Chord
  instrument?: Instrument
  size?: number
  memoryMode?: boolean
  zoomLevel?: number
}>(), {
  instrument: 'guitar',
  size: 400,
  memoryMode: false,
  zoomLevel: 100
})

const zoomScale = computed(() => props.zoomLevel / 100)
</script>

<style scoped>
.chord-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  width: 100%;
  transition: transform 0.2s ease;
}

.chord-card--memory-mode {
  justify-content: center;
  min-height: 50vh;
}

.chord-card__name {
  font-size: 4rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-align: center;
}

.chord-card--memory-mode .chord-card__name {
  font-size: 8rem;
  font-weight: 800;
  text-shadow: 0 2px 8px rgba(212, 165, 116, 0.3);
}

.chord-card__diagram {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Ensure high contrast for accessibility */
@media (prefers-contrast: high) {
  .chord-card__name {
    font-weight: 800;
    text-shadow: 0 0 1px currentColor;
  }
}
</style>
