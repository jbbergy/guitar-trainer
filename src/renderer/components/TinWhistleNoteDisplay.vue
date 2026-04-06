<template>
  <div class="tin-whistle-note" :class="{
    'tin-whistle-note--memory-mode': memoryMode,
    'tin-whistle-note--success': showSuccess
  }" :style="{
      transform: `scale(${zoomScale})`,
      transformOrigin: 'center center'
    }">
    <!-- Note name display -->
    <div class="tin-whistle-note__name">
      {{ note.name }}
      <sup v-if="note.octave === 1" class="tin-whistle-note__octave">2</sup>
      <sup v-else-if="note.octave === 2" class="tin-whistle-note__octave">3</sup>
    </div>

    <!-- Difficulty indicator -->
    <span class="tin-whistle-note__difficulty" :class="difficultyClass">
      {{ difficultyLabel }}
    </span>

    <!-- Note diagram (shows fingering) -->
    <div v-if="!memoryMode" class="tin-whistle-note__diagram">
      <TinWhistleDiagram :note="note" />
    </div>

    <!-- Memory mode hint -->
    <div v-if="memoryMode" class="tin-whistle-note__memory-hint">
      Play the note from memory
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TinWhistleNote } from '@/types/chord'
import TinWhistleDiagram from './TinWhistleDiagram.vue'

const props = withDefaults(defineProps<{
  note: TinWhistleNote
  memoryMode?: boolean
  zoomLevel?: number
  showSuccess?: boolean
}>(), {
  memoryMode: false,
  zoomLevel: 100,
  showSuccess: false
})

const zoomScale = computed(() => props.zoomLevel / 100)

const difficultyLabel = computed(() => {
  if (props.note.difficulty === 'beginner') return 'Beginner'
  if (props.note.difficulty === 'intermediate') return 'Intermediate'
  return 'Advanced'
})

const difficultyClass = computed(() => `tin-whistle-note__difficulty--${props.note.difficulty}`)
</script>

<style scoped>
.tin-whistle-note {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  width: 100%;
  transition: transform 0.2s ease;
}

.tin-whistle-note--memory-mode {
  justify-content: center;
  min-height: 50vh;
}

.tin-whistle-note--success {
  animation: success-pulse 0.5s ease;
}

@keyframes success-pulse {

  0%,
  100% {
    transform: scale(1) rotate(0deg);
  }

  50% {
    transform: scale(1.05) rotate(1deg);
  }
}

.tin-whistle-note__name {
  font-size: 4rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-align: center;
}

.tin-whistle-note__difficulty {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--text-primary);
}

.tin-whistle-note__difficulty--beginner {
  border-color: var(--text-secondary);
}

.tin-whistle-note__difficulty--intermediate {
  border-color: var(--accent-primary);
}

.tin-whistle-note__difficulty--advanced {
  border-color: var(--accent-primary);
  background: rgba(212, 165, 116, 0.12);
}

.tin-whistle-note--memory-mode .tin-whistle-note__name {
  font-size: 8rem;
  font-weight: 800;
  text-shadow: 0 2px 8px rgba(212, 165, 116, 0.3);
}

.tin-whistle-note__diagram {
  width: 100%;
  display: flex;
  justify-content: center;
}

.tin-whistle-note__octave {
  font-size: 2rem;
  font-weight: 400;
  opacity: 0.6;
  vertical-align: super;
}

.tin-whistle-note--memory-mode .tin-whistle-note__octave {
  font-size: 3.5rem;
}

.tin-whistle-note__memory-hint {
  font-size: 1.2rem;
  color: var(--text-secondary);
  font-style: italic;
  margin-top: 2rem;
}

/* Ensure high contrast for accessibility */
@media (prefers-contrast: high) {
  .tin-whistle-note__name {
    font-weight: 800;
    text-shadow: 0 0 1px currentColor;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tin-whistle-note--success {
    animation: none;
  }
}
</style>
