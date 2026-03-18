<template>
  <div class="fretboard" role="img" :aria-label="ariaLabel">
    <div class="fretboard__grid" :style="{ '--string-count': stringCount, '--fret-count': fretCount }">
      <div
        v-for="(stringNotes, stringIndex) in noteGrid"
        :key="`string-${stringIndex}`"
        class="fretboard__string"
      >
        <div
          v-for="(cell, fretIndex) in stringNotes"
          :key="`cell-${stringIndex}-${fretIndex}`"
          class="fretboard__cell"
          :class="{
            'fretboard__cell--in-scale': cell.isInScale,
            'fretboard__cell--root': cell.isRoot
          }"
          :aria-label="`String ${stringIndex + 1}, fret ${fretIndex}: ${cell.noteName}`"
        >
          <span class="fretboard__note">
            {{ cell.noteName }}
          </span>
          <span class="fretboard__fret" aria-hidden="true">
            {{ fretIndex }}
          </span>
        </div>
      </div>
    </div>

    <div class="fretboard__legend" aria-hidden="true">
      <div class="fretboard__legend-item">
        <span class="fretboard__legend-dot fretboard__legend-dot--root"></span>
        Root
      </div>
      <div class="fretboard__legend-item">
        <span class="fretboard__legend-dot fretboard__legend-dot--scale"></span>
        In scale
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Instrument } from '@/types/chord'
import type { AccidentalPreference, NoteName, PitchClass } from '@/utils/music/pitchClass'
import { pitchClassToNoteName, noteNameToPitchClass, toPitchClass } from '@/utils/music/pitchClass'
import { getTuning } from '@/utils/music/tunings'

type FretboardCell = {
  pitchClass: PitchClass
  noteName: NoteName
  isInScale: boolean
  isRoot: boolean
}

const props = withDefaults(defineProps<{
  instrument: Instrument
  scalePitchClasses: PitchClass[]
  root: NoteName
  preference?: AccidentalPreference
  maxFret?: number
}>(), {
  preference: 'sharps',
  maxFret: 12
})

const fretCount = computed(() => props.maxFret + 1) // includes open string (fret 0)
const tuning = computed(() => getTuning(props.instrument))
const stringCount = computed(() => tuning.value.openStringPitchClasses.length)

const rootPitchClass = computed(() => noteNameToPitchClass(props.root))
const scaleSet = computed(() => new Set<number>(props.scalePitchClasses))

const noteGrid = computed<FretboardCell[][]>(() => {
  // Display from top to bottom: highest string -> lowest string.
  // This makes the bottom-to-top order match common diagrams:
  // - Guitar (bottom->top): E A D G B E
  // - Ukulele (bottom->top): G C E A
  const displayStrings = [...tuning.value.openStringPitchClasses].reverse()

  return displayStrings.map(openPc => {
    const row: FretboardCell[] = []
    for (let fret = 0; fret <= props.maxFret; fret++) {
      const pc = toPitchClass(openPc + fret)
      row.push({
        pitchClass: pc,
        noteName: pitchClassToNoteName(pc, props.preference),
        isInScale: scaleSet.value.has(pc),
        isRoot: pc === rootPitchClass.value
      })
    }
    return row
  })
})

const ariaLabel = computed(() => {
  const instrumentLabel = props.instrument === 'ukulele' ? 'Ukulele' : 'Guitar'
  return `${instrumentLabel} fretboard, frets 0 to ${props.maxFret}. Root ${props.root}. Highlighted notes show the selected scale.`
})
</script>

<style scoped>
.fretboard {
  width: min(1100px, 100%);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.fretboard__grid {
  display: grid;
  gap: 0.4rem;
  padding: 1rem;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 2px solid var(--text-secondary);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
}

.fretboard__string {
  display: grid;
  grid-template-columns: repeat(var(--fret-count), minmax(42px, 1fr));
  gap: 0.35rem;
}

.fretboard__cell {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 46px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.45);
  border: 2px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.35);
  transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
}

.fretboard__cell--in-scale {
  color: var(--text-primary);
  border-color: rgba(212, 165, 116, 0.95);
  background: rgba(212, 165, 116, 0.28);
  box-shadow: 0 0 0 1px rgba(212, 165, 116, 0.25) inset;
}

.fretboard__cell--root {
  color: var(--bg-primary);
  border-color: var(--accent-primary);
  background: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.25) inset;
}

.fretboard__cell:hover {
  transform: translateY(-1px);
  border-color: rgba(212, 165, 116, 0.75);
}

.fretboard__note {
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
}

.fretboard__fret {
  position: absolute;
  top: 6px;
  left: 8px;
  font-size: 0.7rem;
  opacity: 0.65;
  font-family: monospace;
}

.fretboard__legend {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.fretboard__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.fretboard__legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  display: inline-block;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.fretboard__legend-dot--root {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.fretboard__legend-dot--scale {
  background: rgba(212, 165, 116, 0.18);
  border-color: rgba(212, 165, 116, 0.7);
}

@media (max-width: 640px) {
  .fretboard__grid {
    padding: 0.75rem;
  }

  .fretboard__string {
    grid-template-columns: repeat(var(--fret-count), minmax(34px, 1fr));
    gap: 0.25rem;
  }

  .fretboard__cell {
    min-height: 40px;
    border-radius: 8px;
  }

  .fretboard__note {
    font-size: 0.85rem;
  }
}
</style>

