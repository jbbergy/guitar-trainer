<template>
  <div
    class="zoom-controls"
    role="group"
    aria-label="Zoom controls"
  >
    <label
      for="zoom-slider"
      class="zoom-controls__label"
    >
      Zoom: {{ zoomPercentage }}%
    </label>
    <input
      id="zoom-slider"
      type="range"
      min="50"
      max="200"
      step="10"
      class="zoom-controls__slider"
      aria-label="Zoom level"
      aria-valuemin="50"
      aria-valuemax="200"
      :value="zoomLevel"
      :aria-valuenow="zoomLevel"
      :aria-valuetext="`${zoomPercentage} percent zoom`"
      @input="handleZoomChange"
    >
    <div class="zoom-controls__buttons">
      <button
        type="button"
        class="zoom-controls__button"
        aria-label="Zoom out"
        title="Zoom out (Ctrl/Cmd + -)"
        @click="decreaseZoom"
      >
        −
      </button>
      <button
        type="button"
        class="zoom-controls__button zoom-controls__button--reset"
        aria-label="Reset zoom to 100%"
        title="Reset zoom (Ctrl/Cmd + 0)"
        @click="resetZoom"
      >
        100%
      </button>
      <button
        type="button"
        class="zoom-controls__button"
        aria-label="Zoom in"
        title="Zoom in (Ctrl/Cmd + +)"
        @click="increaseZoom"
      >
        +
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  zoomLevel: number
}>()

const emit = defineEmits<{
  'update:zoomLevel': [value: number]
}>()

const zoomPercentage = computed(() => props.zoomLevel)

const handleZoomChange = (event: Event): void => {
  const target = event.target as unknown as { value: string }
  emit('update:zoomLevel', Number(target.value))
}

const increaseZoom = (): void => {
  const newZoom = Math.min(200, props.zoomLevel + 10)
  emit('update:zoomLevel', newZoom)
}

const decreaseZoom = (): void => {
  const newZoom = Math.max(50, props.zoomLevel - 10)
  emit('update:zoomLevel', newZoom)
}

const resetZoom = (): void => {
  emit('update:zoomLevel', 100)
}
</script>

<style scoped>
.zoom-controls {
  position: fixed;
  bottom: 2rem;
  left: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(26, 26, 26, 0.95);
  border: 2px solid var(--accent-primary);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  z-index: 1000;
  min-width: 180px;
}

.zoom-controls__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin: 0;
}

.zoom-controls__slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: var(--text-secondary);
  border-radius: 3px;
  outline: none;
  opacity: 0.9;
  transition: opacity 0.2s;
  cursor: pointer;
}

.zoom-controls__slider:hover {
  opacity: 1;
}

.zoom-controls__slider:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Slider thumb - WebKit */
.zoom-controls__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--accent-primary);
  border: 2px solid var(--text-primary);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.zoom-controls__slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

/* Slider thumb - Firefox */
.zoom-controls__slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: var(--accent-primary);
  border: 2px solid var(--text-primary);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.zoom-controls__slider::-moz-range-thumb:hover {
  transform: scale(1.2);
}

.zoom-controls__buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.zoom-controls__button {
  padding: 0.5rem;
  min-width: 2.5rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--accent-primary);
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.zoom-controls__button:hover {
  background: var(--accent-primary);
  color: var(--bg-primary);
  transform: translateY(-2px);
}

.zoom-controls__button:active {
  transform: translateY(0);
}

.zoom-controls__button:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.zoom-controls__button--reset {
  font-size: 0.75rem;
  min-width: 3rem;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .zoom-controls {
    background: var(--bg-primary);
    border-width: 3px;
  }
  
  .zoom-controls__button {
    border-width: 2px;
    font-weight: 700;
  }
}

/* Responsive adjustments */
@media (max-width: 800px) {
  .zoom-controls {
    bottom: 1rem;
    left: 1rem;
    padding: 0.75rem;
    min-width: 160px;
  }
  
  .zoom-controls__label {
    font-size: 0.75rem;
  }
  
  .zoom-controls__button {
    padding: 0.4rem;
    min-width: 2rem;
    font-size: 0.875rem;
  }
}

/* Ensure controls don't overlap with other UI elements */
@media (max-height: 600px) {
  .zoom-controls {
    bottom: 0.5rem;
    left: 0.5rem;
    padding: 0.5rem;
    gap: 0.5rem;
    min-width: 140px;
  }
}
</style>
