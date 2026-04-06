<template>
  <div
    class="tin-whistle-diagram"
    :aria-label="`Tin Whistle fingering for ${note.name}`"
    role="img"
  >
    <!-- Header with chord name and octave badge -->
    <div class="tin-whistle__header">
      <span class="tin-whistle__chord-name">{{ note.name }}</span>
      <span v-if="note.octave > 0" class="tin-whistle__octave-badge">
        {{ note.octave === 1 ? 'High' : 'Very High' }}
      </span>
      <span v-else class="tin-whistle__octave-badge tin-whistle__octave-badge--low">Low</span>
    </div>

      <!-- Vertical hole display (6 holes, top to bottom) -->
    <div class="tin-whistle__holes-vertical">
      <div
        v-for="(hole, index) in holes"
        :key="`hole-${index}`"
        class="tin-whistle__hole-wrapper"
      >
        <div
          class="tin-whistle__hole"
          :class="{
            'tin-whistle__hole--covered': hole.isCovered,
            'tin-whistle__hole--half-covered': hole.isHalfCovered
          }"
        />
      </div>
    </div>

    <!-- Legend -->
    <div class="tin-whistle__legend">
      <div class="tin-whistle__legend-item">
        <span class="tin-whistle__legend-hole tin-whistle__legend-hole--covered" />
        Covered
      </div>
      <div class="tin-whistle__legend-item">
        <span class="tin-whistle__legend-hole tin-whistle__legend-hole--half" />
        Half hole
      </div>
      <div class="tin-whistle__legend-item">
        <span class="tin-whistle__legend-hole tin-whistle__legend-hole--open" />
        Open
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TinWhistleNote } from '@/types/chord'

const props = defineProps<{
  note: TinWhistleNote
}>()

// Hole states: 0 = open, 0.5 = half-covered, 1 = fully covered
const holes = computed(() => {
  return props.note.holes.map(val => ({
    isCovered: val === 1,
    isHalfCovered: val === 0.5
  }))
})
</script>

<style scoped>
.tin-whistle-diagram {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 2px solid var(--text-secondary);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tin-whistle__header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.tin-whistle__chord-name {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--text-primary);
  letter-spacing: 0.05em;
}

.tin-whistle__octave-badge {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba(212, 165, 116, 0.18);
  border: 1px solid rgba(212, 165, 116, 0.55);
  color: var(--accent-primary, #d4a574);
}

.tin-whistle__octave-badge--low {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--text-secondary);
}

.tin-whistle__holes-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}

.tin-whistle__hole-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
}

.tin-whistle__hole {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #1c1c1e;
  border: 2px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}

.tin-whistle__hole--covered {
  background: #f0f0f0;
  border-color: rgba(255, 255, 255, 0.4);
}

.tin-whistle__hole--half-covered {
  background: linear-gradient(to right, #f0f0f0 50%, #1c1c1e 50%);
}

.tin-whistle__legend {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.tin-whistle__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.tin-whistle__legend-hole {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-block;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.tin-whistle__legend-hole--covered {
  background: #f0f0f0;
}

.tin-whistle__legend-hole--half {
  background: linear-gradient(to right, #f0f0f0 50%, #1c1c1e 50%);
}

.tin-whistle__legend-hole--open {
  background: #1c1c1e;
  border-color: rgba(255, 255, 255, 0.25);
}

@media (max-width: 640px) {
  .tin-whistle-diagram {
    padding: 1rem;
  }

  .tin-whistle__chord-name {
    font-size: 1.5rem;
  }

  .tin-whistle__hole {
    width: 50px;
    height: 50px;
  }

  .tin-whistle__hole-label {
    font-size: 1rem;
  }
}
</style>
