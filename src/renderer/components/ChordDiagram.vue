<template>
  <svg
    class="chord-diagram"
    :viewBox="`0 0 ${width} ${height}`"
    :aria-label="`${instrumentLabel} chord diagram for ${chord.name}`"
    role="img"
    :style="{
      '--marker-font-size': `${1.25 * scale}rem`,
      '--indicator-font-size': `${1 * scale}rem`,
      '--number-font-size': `${0.75 * scale}rem`,
      '--stroke-width': `${2 * scale}`,
      '--nut-stroke-width': `${6 * scale}`,
      '--max-width': `${size}px`,
      '--max-height': `${size * 0.875}px`
    }"
  >
    <!-- Open/Muted string markers (X/O) -->
    <g class="string-markers">
      <text
        v-for="(fret, stringIndex) in chord.frets"
        :key="`marker-${stringIndex}`"
        :x="stringSpacing + stringIndex * stringSpacing"
        :y="topMargin - 10 * scale"
        class="string-marker"
        text-anchor="middle"
      >
        {{ fret === 'X' ? 'X' : fret === 0 ? 'O' : '' }}
      </text>
    </g>

    <!-- Fret position indicator (e.g., "3fr" for barre chords) -->
    <text
      v-if="chord.baseFret > 1"
      :x="stringSpacing - 40 * scale"
      :y="topMargin + fretHeight / 2"
      class="fret-indicator"
      text-anchor="end"
    >
      {{ chord.baseFret }}fr
    </text>

    <!-- Strings (vertical lines) -->
    <g class="strings">
      <line
        v-for="stringIndex in stringCount"
        :key="`string-${stringIndex}`"
        :x1="stringSpacing + (stringIndex - 1) * stringSpacing"
        :y1="topMargin"
        :x2="stringSpacing + (stringIndex - 1) * stringSpacing"
        :y2="topMargin + numFrets * fretHeight"
        class="string"
      />
    </g>

    <!-- Frets (horizontal lines) -->
    <g class="frets">
      <line
        v-for="fretIndex in numFrets + 1"
        :key="`fret-${fretIndex}`"
        :x1="stringSpacing"
        :y1="topMargin + (fretIndex - 1) * fretHeight"
        :x2="stringSpacing + (stringCount - 1) * stringSpacing"
        :y2="topMargin + (fretIndex - 1) * fretHeight"
        :class="{ 'fret': true, 'fret--nut': fretIndex === 1 && chord.baseFret === 1 }"
      />
    </g>

    <!-- Finger positions (numbered dots) -->
    <g class="finger-positions">
      <g
        v-for="(fret, stringIndex) in chord.frets"
        :key="`finger-${stringIndex}`"
      >
        <template v-if="typeof fret === 'number' && fret > 0">
          <circle
            :cx="stringSpacing + stringIndex * stringSpacing"
            :cy="topMargin + (fret - chord.baseFret - 0.5) * fretHeight"
            :r="dotRadius"
            class="finger-dot"
          />
          <text
            :x="stringSpacing + stringIndex * stringSpacing"
            :y="topMargin + (fret - chord.baseFret - 0.5) * fretHeight"
            class="finger-number"
            dominant-baseline="middle"
            text-anchor="middle"
          >
            {{ chord.fingers[stringIndex] || '' }}
          </text>
        </template>
      </g>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Chord } from '@/types/chord'
import type { Instrument } from '@/types/chord'

const props = withDefaults(defineProps<{
  chord: Chord
  instrument?: Instrument
  size?: number
}>(), {
  instrument: 'guitar',
  size: 400
})

// Layout constants for clean, readable diagram
const scale = computed(() => props.size / 400)
const stringSpacing = computed(() => 40 * scale.value)
const fretHeight = computed(() => 50 * scale.value)
const topMargin = computed(() => 40 * scale.value)
const dotRadius = computed(() => 15 * scale.value)
const numFrets = 5
const stringCount = computed(() => props.chord.frets.length)
const instrumentLabel = computed(() => props.instrument === 'ukulele' ? 'Ukulele' : 'Guitar')

const width = computed(() => stringSpacing.value * (stringCount.value + 1))
const height = computed(() => topMargin.value + numFrets * fretHeight.value + 20 * scale.value)
</script>

<style scoped>
.chord-diagram {
  max-width: var(--max-width, 400px);
  max-height: var(--max-height, 350px);
  width: 100%;
  height: auto;
  margin: 0 auto;
  display: block;
}

/* Strings */
.string {
  stroke: var(--text-secondary);
  stroke-width: var(--stroke-width, 2);
  stroke-linecap: round;
}

/* Frets */
.fret {
  stroke: var(--text-secondary);
  stroke-width: var(--stroke-width, 2);
  stroke-linecap: round;
}

.fret--nut {
  stroke-width: var(--nut-stroke-width, 6);
  stroke: var(--text-primary);
}

/* String markers (X/O) */
.string-marker {
  fill: var(--text-primary);
  font-size: var(--marker-font-size, 1.25rem);
  font-weight: 700;
}

/* Fret position indicator */
.fret-indicator {
  fill: var(--text-secondary);
  font-size: var(--indicator-font-size, 1rem);
  font-weight: 500;
}

/* Finger dots */
.finger-dot {
  fill: var(--accent-primary);
  stroke: var(--text-primary);
  stroke-width: var(--stroke-width, 2);
}

.finger-number {
  fill: var(--bg-primary);
  font-size: var(--number-font-size, 0.75rem);
  font-weight: 600;
  pointer-events: none;
  dominant-baseline: middle;
  alignment-baseline: middle;
  text-anchor: middle;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .string,
  .fret {
    stroke-width: calc(var(--stroke-width, 2) * 1.5);
  }
  
  .finger-dot {
    stroke-width: calc(var(--stroke-width, 2) * 1.5);
  }
  
  .string-marker,
  .fret-indicator,
  .finger-number {
    font-weight: 800;
  }
}
</style>
