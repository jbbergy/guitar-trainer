<template>
  <div class="tin-whistle-scale">
    <!-- Header -->
    <div class="tin-whistle-scale__header">
      <h3 class="tin-whistle-scale__title">
        {{ root }} {{ scaleLabel }} Scale
      </h3>
      <p class="tin-whistle-scale__subtitle">
        Tin Whistle (D)
      </p>
    </div>

    <!-- Linear scale display -->
    <div class="tin-whistle-scale__notes">
      <div
        v-for="(note, index) in scaleNotes"
        :key="`note-${index}`"
        class="tin-whistle-scale__note"
        :class="{
          'tin-whistle-scale__note--root': note.isRoot,
          'tin-whistle-scale__note--in-scale': note.isInScale
        }"
      >
        <span class="tin-whistle-scale__note-name">{{ note.name }}</span>
        <span v-if="note.finger" class="tin-whistle-scale__finger">{{ note.finger }}</span>
      </div>
    </div>

    <!-- Hole visualization -->
    <div class="tin-whistle-scale__holes">
      <div
        v-for="(hole, index) in holes"
        :key="`hole-${index}`"
        class="tin-whistle-scale__hole"
        :class="{
          'tin-whistle-scale__hole--covered': hole.isCovered,
          'tin-whistle-scale__hole--active': hole.isActive
        }"
      >
        <span v-if="hole.isActive" class="tin-whistle-scale__hole-note">{{ scaleNotes[index].name }}</span>
      </div>
    </div>

    <!-- Legend -->
    <div class="tin-whistle-scale__legend">
      <div class="tin-whistle-scale__legend-item">
        <span class="tin-whistle-scale__legend-dot tin-whistle-scale__legend-dot--root" />
        Root
      </div>
      <div class="tin-whistle-scale__legend-item">
        <span class="tin-whistle-scale__legend-dot tin-whistle-scale__legend-dot--scale" />
        In scale
      </div>
      <div class="tin-whistle-scale__legend-item">
        <span class="tin-whistle-scale__legend-dot tin-whistle-scale__legend-dot--covered" />
        Covered
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AccidentalPreference, NoteName, PitchClass } from '@/utils/music/pitchClass'
import { pitchClassToNoteName } from '@/utils/music/pitchClass'

const props = withDefaults(defineProps<{
  root: NoteName
  scalePitchClasses: PitchClass[]
  preference?: AccidentalPreference
}>(), {
  preference: 'sharps'
})

const scaleLabel = computed(() => {
  // Try to match based on scale pattern
  if (props.scalePitchClasses.length === 7) {
    const pattern = props.scalePitchClasses.map(pc => pc).join(',')
    if (pattern.includes('0,2,4,5,7,9,11')) return 'Major'
    if (pattern.includes('0,2,3,5,7,8,10')) return 'Natural Minor'
  }
  
  return 'Scale'
})

// Tin Whistle scale notes (simplified for D whistle)
const scaleNotes = computed(() => {
  const basePitchClasses: PitchClass[] = [2, 4, 6, 7, 9, 11, 1, 2] // D, E, F#, G, A, B, C#, D
  const rootPitch = props.scalePitchClasses[0]
  
  return basePitchClasses.map((basePc, index) => {
    const pitchClass = (rootPitch + (basePc - 2) + 12) % 12 as PitchClass
    const isInScale = props.scalePitchClasses.includes(pitchClass)
    const isRoot = pitchClass === rootPitch
    
    return {
      name: pitchClassToNoteName(pitchClass, props.preference),
      isInScale,
      isRoot,
      finger: isInScale ? (index + 1) : null
    }
  })
})

// Hole visualization
const holes = computed(() => {
  return scaleNotes.value.map(note => ({
    isCovered: note.finger !== null,
    isActive: note.isInScale
  }))
})
</script>

<style scoped>
.tin-whistle-scale {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 2px solid var(--text-secondary);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.tin-whistle-scale__header {
  text-align: center;
  margin-bottom: 0.5rem;
}

.tin-whistle-scale__title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
  font-weight: 700;
}

.tin-whistle-scale__subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.tin-whistle-scale__notes {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tin-whistle-scale__note {
  flex: 1;
  min-width: 80px;
  padding: 0.75rem 0.5rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.45);
  border: 2px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.1rem;
  position: relative;
  transition: all 0.12s ease;
}

.tin-whistle-scale__note--in-scale {
  color: var(--text-primary);
  border-color: rgba(212, 165, 116, 0.95);
  background: rgba(212, 165, 116, 0.28);
}

.tin-whistle-scale__note--root {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--bg-primary);
}

.tin-whistle-scale__note-name {
  margin-bottom: 0.25rem;
}

.tin-whistle-scale__finger {
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-size: 0.7rem;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tin-whistle-scale__holes {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0 2rem;
}

.tin-whistle-scale__hole {
  flex: 1;
  max-width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
  border: 3px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.tin-whistle-scale__hole--covered {
  background: linear-gradient(135deg, #a0a0a0 0%, #888888 100%);
  border-color: #666;
}

.tin-whistle-scale__hole--active {
  box-shadow: 0 0 0 4px rgba(212, 165, 116, 0.6);
}

.tin-whistle-scale__hole-note {
  font-size: 0.9rem;
  font-weight: 900;
  color: #333;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

.tin-whistle-scale__legend {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.tin-whistle-scale__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.tin-whistle-scale__legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.tin-whistle-scale__legend-dot--root {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.tin-whistle-scale__legend-dot--scale {
  background: rgba(212, 165, 116, 0.18);
  border-color: rgba(212, 165, 116, 0.7);
}

.tin-whistle-scale__legend-dot--covered {
  background: rgba(100, 100, 100, 0.5);
  border-color: rgba(100, 100, 100, 0.7);
}

@media (max-width: 640px) {
  .tin-whistle-scale {
    padding: 1rem;
  }

  .tin-whistle-scale__hole {
    height: 50px;
    max-width: 50px;
  }

  .tin-whistle-scale__note {
    min-width: 60px;
    font-size: 1rem;
  }
}
</style>
