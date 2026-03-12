<template>
  <div 
    class="auto-cycle-controls"
    role="region"
    aria-label="Auto-cycle controls"
  >
    <button 
      class="auto-cycle-controls__toggle"
      @click="$emit('toggle')"
      :aria-pressed="isEnabled"
      :class="{ 'auto-cycle-controls__toggle--active': isEnabled }"
      :title="isEnabled ? 'Stop auto-cycle' : 'Start auto-cycle'"
    >
      <span class="auto-cycle-controls__icon">{{ isEnabled ? '⏸' : '▶' }}</span>
      <span class="auto-cycle-controls__label">
        {{ isEnabled ? 'Stop' : 'Auto' }}
      </span>
    </button>
    
    <div 
      class="auto-cycle-controls__bpm"
      :class="{ 'auto-cycle-controls__bpm--disabled': !isEnabled }"
    >
      <label 
        for="bpm-input"
        class="auto-cycle-controls__bpm-label"
      >
        BPM
      </label>
      <div class="auto-cycle-controls__bpm-control">
        <button 
          class="auto-cycle-controls__bpm-button"
          @click="decrementBpm"
          aria-label="Decrease BPM"
          :disabled="bpm <= 20"
        >
          −
        </button>
        <input 
          id="bpm-input"
          type="number"
          class="auto-cycle-controls__bpm-input"
          :value="bpm"
          @input="handleBpmInput"
          @change="handleBpmChange"
          min="20"
          max="240"
          step="5"
          aria-label="Beats per minute"
        />
        <button 
          class="auto-cycle-controls__bpm-button"
          @click="incrementBpm"
          aria-label="Increase BPM"
          :disabled="bpm >= 240"
        >
          +
        </button>
      </div>
    </div>
    
    <div class="auto-cycle-controls__separator"></div>

    <div class="auto-cycle-controls__difficulty">
      <label
        for="difficulty-select"
        class="auto-cycle-controls__difficulty-label"
      >
        Level
      </label>
      <select
        id="difficulty-select"
        class="auto-cycle-controls__difficulty-select"
        :value="difficultyLevel"
        aria-label="Chord difficulty level"
        data-testid="difficulty-select"
        @change="handleDifficultyChange"
      >
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
    </div>

    <div class="auto-cycle-controls__separator"></div>
    
    <label class="auto-cycle-controls__no-schema">
      <div class="toggle-switch">
        <input 
          type="checkbox" 
          :checked="isMemoryMode"
          @change="$emit('toggleMemoryMode')"
          aria-label="Toggle no schema mode"
        />
        <span class="toggle-slider"></span>
      </div>
      <span class="toggle-label">No Schéma</span>
    </label>
  </div>
</template>

<script setup lang="ts">
import type { DifficultyFilter } from '@/types/chord'

const props = withDefaults(defineProps<{
  isEnabled: boolean
  bpm: number
  isMemoryMode?: boolean
  difficultyLevel?: DifficultyFilter
}>(), {
  isMemoryMode: false,
  difficultyLevel: 'advanced'
})

const emit = defineEmits<{
  toggle: []
  updateBpm: [value: number]
  toggleMemoryMode: []
  updateDifficulty: [value: DifficultyFilter]
}>()

const incrementBpm = () => {
  emit('updateBpm', Math.min(240, props.bpm + 5))
}

const decrementBpm = () => {
  emit('updateBpm', Math.max(20, props.bpm - 5))
}

const handleBpmInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseInt(target.value)
  if (!isNaN(value)) {
    emit('updateBpm', value)
  }
}

const handleBpmChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = parseInt(target.value)
  
  if (isNaN(value)) {
    value = 60
  } else {
    value = Math.max(20, Math.min(240, value))
  }
  
  target.value = value.toString()
  emit('updateBpm', value)
}

const handleDifficultyChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('updateDifficulty', target.value as DifficultyFilter)
}
</script>

<style scoped>
.auto-cycle-controls {
  position: fixed;
  top: 2rem;
  left: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--bg-secondary);
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  border: 2px solid var(--text-secondary);
  z-index: 100;
}

.auto-cycle-controls__toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 2px solid var(--text-secondary);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 90px;
}

.auto-cycle-controls__toggle:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

.auto-cycle-controls__toggle--active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.auto-cycle-controls__icon {
  font-size: 1.2rem;
  line-height: 1;
}

.auto-cycle-controls__label {
  font-size: 0.875rem;
}

.auto-cycle-controls__bpm {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 0.2s ease;
}

.auto-cycle-controls__bpm--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.auto-cycle-controls__bpm-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.auto-cycle-controls__bpm-control {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 0.25rem;
  border: 2px solid var(--text-secondary);
}

.auto-cycle-controls__bpm-button {
  width: 28px;
  height: 28px;
  background: transparent;
  color: var(--text-primary);
  border: none;
  border-radius: 4px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.auto-cycle-controls__bpm-button:hover:not(:disabled) {
  background: var(--accent-primary);
}

.auto-cycle-controls__bpm-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.auto-cycle-controls__bpm-input {
  width: 60px;
  background: transparent;
  color: var(--text-primary);
  border: none;
  padding: 0.25rem;
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  font-family: monospace;
}

.auto-cycle-controls__bpm-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

/* Remove spinner arrows in number input */
.auto-cycle-controls__bpm-input::-webkit-inner-spin-button,
.auto-cycle-controls__bpm-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.auto-cycle-controls__bpm-input[type=number] {
  -moz-appearance: textfield;
}

.auto-cycle-controls__separator {
  width: 2px;
  height: 40px;
  background: var(--text-secondary);
  opacity: 0.3;
}

.auto-cycle-controls__difficulty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.auto-cycle-controls__difficulty-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.auto-cycle-controls__difficulty-select {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 2px solid var(--text-secondary);
  border-radius: 8px;
  padding: 0.35rem 0.55rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.auto-cycle-controls__difficulty-select:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.auto-cycle-controls__no-schema {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.toggle-label {
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.auto-cycle-controls__no-schema:hover .toggle-label {
  color: var(--accent-primary);
}

/* Toggle Switch Styles - Modern iOS-style switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-primary);
  border: 2px solid var(--text-secondary);
  transition: all 0.3s ease;
  border-radius: 28px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: var(--text-secondary);
  transition: all 0.3s ease;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(22px);
  background-color: var(--bg-primary);
}

.toggle-switch input:focus + .toggle-slider {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.toggle-slider:hover {
  border-color: var(--accent-primary);
}

.toggle-switch input:checked + .toggle-slider:hover {
  box-shadow: 0 0 8px rgba(212, 165, 116, 0.4);
}
</style>
