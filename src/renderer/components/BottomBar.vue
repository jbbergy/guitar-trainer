<template>
  <footer
    class="bottombar"
    role="region"
    aria-label="Status bar"
  >
    <!-- Section 1: Zoom -->
    <div class="bottombar__section">
      <span class="bottombar__small-label">Zoom {{ zoomLevel }}%</span>
      <div class="bottombar__zoom-row">
        <button
          class="bottombar__btn"
          aria-label="Zoom out"
          title="Zoom out (Ctrl/Cmd + −)"
          @click="$emit('update:zoomLevel', Math.max(50, zoomLevel - 10))"
        >
          −
        </button>
        <input
          type="range"
          class="bottombar__zoom-slider"
          min="50"
          max="200"
          step="10"
          :value="zoomLevel"
          aria-label="Zoom level"
          @input="handleZoom"
        >
        <button
          class="bottombar__btn"
          aria-label="Zoom in"
          title="Zoom in (Ctrl/Cmd + +)"
          @click="$emit('update:zoomLevel', Math.min(200, zoomLevel + 10))"
        >
          +
        </button>
      </div>
    </div>

    <!-- Section 2: Listen feedback (VU meter + detected chord) -->
    <div class="bottombar__section bottombar__section--center">
      <template v-if="isListenMode">
        <div class="bottombar__vu">
          <div
            class="bottombar__vu-bar"
            :style="{ width: signalLevel + '%' }"
            :class="{
              'bottombar__vu-bar--low': signalLevel < 20,
              'bottombar__vu-bar--mid': signalLevel >= 20 && signalLevel < 60,
              'bottombar__vu-bar--hot': signalLevel >= 60
            }"
          />
        </div>
        <span
          v-if="detectedChord"
          class="bottombar__detected"
          :class="{ 'bottombar__detected--match': isMatch }"
        >
          {{ detectedChord.fullName }}
        </span>
        <span
          v-else
          class="bottombar__listening"
        >🎤 Listening…</span>
      </template>
    </div>

    <!-- Section 3: Instrument switch -->
    <div class="bottombar__section">
      <button
        class="bottombar__switch"
        role="switch"
        :aria-checked="isUkulele"
        :aria-label="`Switch instrument. Current: ${instrumentLabel}`"
        :title="`Switch to ${instrument === 'guitar' ? 'ukulele' : 'guitar'}`"
        data-testid="instrument-toggle"
        @click="$emit('toggleInstrument')"
      >
        <span
          class="bottombar__switch-label"
          :class="{ 'bottombar__switch-label--active': instrument === 'guitar' }"
        >Guitar</span>
        <span
          class="bottombar__switch-track"
          aria-hidden="true"
        >
          <span
            class="bottombar__switch-thumb"
            :class="{ 'bottombar__switch-thumb--right': isUkulele }"
          />
        </span>
        <span
          class="bottombar__switch-label"
          :class="{ 'bottombar__switch-label--active': instrument === 'ukulele' }"
        >Ukulele</span>
      </button>
    </div>

    <!-- Section 4: Shortcuts -->
    <div class="bottombar__section">
      <button
        class="bottombar__btn bottombar__btn--pill"
        aria-label="Show keyboard shortcuts"
        title="Show keyboard shortcuts"
        data-testid="shortcuts-button"
        @click="$emit('showShortcuts')"
      >
        ⌨ Shortcuts
      </button>
    </div>

    <!-- Section 5: Settings -->
    <div class="bottombar__section">
      <SettingsMenu panel-position="above" />
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Instrument } from '@/types/chord'
import type { DetectedChord } from '@/utils/music/chordDetection'
import SettingsMenu from './SettingsMenu.vue'

const props = withDefaults(defineProps<{
  zoomLevel: number
  isListenMode?: boolean
  detectedChord?: DetectedChord | null
  signalLevel?: number
  isMatch?: boolean
  instrument: Instrument
}>(), {
  isListenMode: false,
  detectedChord: null,
  signalLevel: 0,
  isMatch: false,
})

const emit = defineEmits<{
  'update:zoomLevel': [value: number]
  toggleInstrument: []
  showShortcuts: []
}>()

const isUkulele = computed(() => props.instrument === 'ukulele')
const instrumentLabel = computed(() =>
  props.instrument === 'ukulele' ? 'Ukulele (GCEA)' : 'Guitar (EADGBE)'
)

const handleZoom = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:zoomLevel', Number(target.value))
}
</script>

<style scoped>
/* ── Container ── */
.bottombar {
  position: fixed;
  bottom: 12px;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), var(--glass-inset-highlight);
  border-radius: var(--glass-radius);
  padding: 0.45rem 1rem;
  z-index: 100;
  transition: box-shadow 0.3s ease, background 0.3s ease;
}

.bottombar:hover {
  box-shadow: var(--glass-shadow-hover), var(--glass-inset-highlight);
  background: var(--glass-bg-hover);
}

/* ── Sections ── */
.bottombar__section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.75rem;
}

.bottombar__section + .bottombar__section {
  border-left: 1px solid var(--glass-border);
}

.bottombar__section--center {
  flex: 1;
  justify-content: center;
  min-width: 0;
}

.bottombar__small-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  min-width: 52px;
}
.bottombar__section--center {
  flex: 1;
  justify-content: center;
  min-width: 0;
}

/* ── Zoom row ── */
.bottombar__zoom-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.bottombar__zoom-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 80px;
  height: 4px;
  background: var(--text-secondary);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.bottombar__btn {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  width: 22px;
  height: 22px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
  padding: 0;
}

/* ── Generic button ── */

.bottombar__btn {
  /* styles above already define this class */
}

.bottombar__btn--pill {
  width: auto;
  height: auto;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.bottombar__btn:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

/* Duplicate and broken block removed. The correct .bottombar__btn--pill block is above. */
/* ── VU meter ── */
.bottombar__vu {
  width: 80px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  overflow: hidden;
.bottombar__listening {
  font-size: 0.8rem;
  color: var(--text-secondary);
  animation: bar-pulse 1.5s ease-in-out infinite;
}
  border-radius: 999px;
  transition: width 0.08s ease;
}

.bottombar__vu-bar--low { background: #2ecc71; }
.bottombar__vu-bar--mid { background: #f1c40f; }
.bottombar__vu-bar--hot { background: #e74c3c; }

/* ── Detected chord ── */
.bottombar__detected {
  font-size: 1.1rem;
  font-weight: 900;
  color: var(--text-secondary);
  transition: color 0.2s ease;
  white-space: nowrap;
}

.bottombar__detected--match {
  color: #2ecc71;
}

.bottombar__listening {
  font-size: 0.8rem;
  color: var(--text-secondary);
  animation: bar-pulse 1.5s ease-in-out infinite;
}

@keyframes bar-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── Instrument switch ── */
.bottombar__switch {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  color: var(--text-primary);
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 0.75rem;
  font-weight: 600;
}

.bottombar__switch:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.bottombar__switch-label {
  opacity: 0.5;
  transition: opacity 0.2s ease;
  white-space: nowrap;
}

.bottombar__switch-label--active {
  opacity: 1;
}

.bottombar__switch-track {
  position: relative;
  width: 32px;
  height: 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.bottombar__switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-primary);
  transition: transform 0.22s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.bottombar__switch-thumb--right {
  transform: translateX(14px);
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .bottombar {
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.35rem 0.5rem;
  }

  .bottombar__section + .bottombar__section {
    border-left: none;
  }

  .bottombar__zoom-slider {
    width: 50px;
  }
}
</style>
