<template>
  <div
    class="chord-name"
    :aria-label="`Chord: ${chord.name}`"
  >
    <h1 class="chord-name__text">
      {{ chord.name }}
    </h1>
  </div>
</template>

<script setup lang="ts">
import type { Chord } from '@/types/chord'

defineProps<{
  chord: Chord
}>()
</script>

<style scoped>
.chord-name {
  text-align: center;
  padding: 2rem 0;
}

.chord-name__text {
  font-size: 4rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Ensure high contrast for accessibility */
@media (prefers-contrast: high) {
  .chord-name__text {
    font-weight: 800;
    text-shadow: 0 0 1px currentColor;
  }
}

/* Responsive sizing */
@media (max-width: 1000px) {
  .chord-name__text {
    font-size: 3rem;
  }
}

@media (max-width: 800px) {
  .chord-name__text {
    font-size: 2.5rem;
  }
}
</style>
