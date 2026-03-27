<template>
  <nav
    class="toolbar"
    role="region"
    aria-label="Toolbar"
  >
    <!-- Section 1: Auto-cycle -->
    <div class="toolbar__section">
      <button 
        class="toolbar__button"
        @click="$emit('toggle')"
        :aria-pressed="isEnabled"
        :class="{ 'toolbar__button--active': isEnabled }"
        :title="isEnabled ? 'Stop auto-cycle' : 'Start auto-cycle'"
      >
        <span class="toolbar__icon">{{ isEnabled ? '⏸' : '▶' }}</span>
        <span class="toolbar__label">{{ isEnabled ? 'Stop' : 'Auto' }}</span>
      </button>
      <div 
        class="toolbar__bpm"
        :class="{ 'toolbar__bpm--disabled': !isEnabled }"
      >
        <label for="bpm-input" class="toolbar__bpm-label">BPM</label>
        <div class="toolbar__bpm-control">
          <button 
            class="toolbar__bpm-btn"
            @click="decrementBpm"
            aria-label="Decrease BPM"
            :disabled="bpm <= 20"
          >−</button>
          <input 
            id="bpm-input"
            type="number"
            class="toolbar__bpm-input"
            :value="bpm"
            @input="handleBpmInput"
            @change="handleBpmChange"
            min="20" max="240" step="5"
            aria-label="Beats per minute"
          />
          <button 
            class="toolbar__bpm-btn"
            @click="incrementBpm"
            aria-label="Increase BPM"
            :disabled="bpm >= 240"
          >+</button>
        </div>
      </div>
    </div>

    <!-- Section 2: Listen mode -->
    <div class="toolbar__section">
      <button
        class="toolbar__button toolbar__button--listen"
        :class="{ 'toolbar__button--listen-active': isListenMode }"
        :aria-pressed="isListenMode"
        :title="isListenMode ? 'Stop listen mode' : 'Start listen mode'"
        @click="$emit('toggleListenMode')"
      >
        <span class="toolbar__icon">{{ isListenMode ? '👂' : '🎧' }}</span>
        <span class="toolbar__label">{{ isListenMode ? 'Listening' : 'Listen' }}</span>
      </button>
    </div>

    <!-- Section 3: Level + Schema -->
    <div class="toolbar__section">
      <div class="toolbar__difficulty">
        <label for="difficulty-select" class="toolbar__small-label">Level</label>
        <select
          id="difficulty-select"
          class="toolbar__select"
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
      <label class="toolbar__toggle-row">
        <div class="toggle-switch">
          <input 
            type="checkbox" 
            :checked="isMemoryMode"
            @change="$emit('toggleMemoryMode')"
            aria-label="Toggle no schema mode"
          />
          <span class="toggle-slider"></span>
        </div>
        <span class="toolbar__toggle-text">No Schéma</span>
      </label>
    </div>

    <!-- Section 4: Library + Scales -->
    <div class="toolbar__section">
      <button
        class="toolbar__button"
        aria-label="Show chord library"
        title="Show all chords"
        @click="$emit('showLibrary')"
      >
        <span class="toolbar__icon">📚</span>
        <span class="toolbar__label">All Chords</span>
      </button>
      <button
        class="toolbar__button"
        aria-label="Show scale trainer"
        title="Show scale trainer"
        @click="$emit('showScales')"
      >
        <span class="toolbar__icon">🎼</span>
        <span class="toolbar__label">Scales</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { DifficultyFilter } from '@/types/chord'

const props = withDefaults(defineProps<{
  isEnabled: boolean
  bpm: number
  isMemoryMode?: boolean
  difficultyLevel?: DifficultyFilter
  isListenMode?: boolean
}>(), {
  isMemoryMode: false,
  difficultyLevel: 'advanced',
  isListenMode: false
})

const emit = defineEmits<{
  toggle: []
  updateBpm: [value: number]
  toggleMemoryMode: []
  updateDifficulty: [value: DifficultyFilter]
  toggleListenMode: []
  showLibrary: []
  showScales: []
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
/* ── Toolbar container ── */
.toolbar {
  position: fixed;
  top: 12px;
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
  padding: 0.5rem 1rem;
  z-index: 100;
  transition: box-shadow 0.3s ease, background 0.3s ease;
}

.toolbar:hover {
  box-shadow: var(--glass-shadow-hover), var(--glass-inset-highlight);
  background: var(--glass-bg-hover);
}

/* ── Section groups ── */
.toolbar__section {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0 1rem;
}

.toolbar__section + .toolbar__section {
  border-left: 1px solid var(--glass-border);
}

/* ── Generic button ── */
.toolbar__button {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  padding: 0.4rem 0.75rem;
  border-radius: var(--glass-radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.toolbar__button:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.toolbar__button--active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* ── Listen button variant ── */
.toolbar__button--listen-active {
  background: #2ecc71;
  border-color: #27ae60;
  color: #fff;
  box-shadow: 0 0 12px rgba(46, 204, 113, 0.5);
  animation: listen-pulse 1.5s ease-in-out infinite;
}

@keyframes listen-pulse {
  0%, 100% { box-shadow: 0 0 12px rgba(46, 204, 113, 0.5); }
  50% { box-shadow: 0 0 20px rgba(46, 204, 113, 0.8); }
}

/* ── Icon + label ── */
.toolbar__icon {
  font-size: 1rem;
  line-height: 1;
}

.toolbar__label {
  font-size: 0.8rem;
}

/* ── BPM control ── */
.toolbar__bpm {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: opacity 0.2s ease;
}

.toolbar__bpm--disabled {
  opacity: 0.4;
  pointer-events: none;
}

.toolbar__bpm-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
}

.toolbar__bpm-control {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--glass-radius-sm);
  padding: 0.15rem;
  border: 1px solid var(--glass-border);
}

.toolbar__bpm-btn {
  width: 24px;
  height: 24px;
  background: transparent;
  color: var(--text-primary);
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.toolbar__bpm-btn:hover:not(:disabled) {
  background: var(--accent-primary);
}

.toolbar__bpm-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.toolbar__bpm-input {
  width: 48px;
  background: transparent;
  color: var(--text-primary);
  border: none;
  padding: 0.15rem;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: monospace;
}

.toolbar__bpm-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.toolbar__bpm-input::-webkit-inner-spin-button,
.toolbar__bpm-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.toolbar__bpm-input[type=number] {
  -moz-appearance: textfield;
}

/* ── Difficulty select ── */
.toolbar__difficulty {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.toolbar__small-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
}

.toolbar__select {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-sm);
  padding: 0.3rem 0.45rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.toolbar__select:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ── Toggle (No Schéma) ── */
.toolbar__toggle-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.toolbar__toggle-text {
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.toolbar__toggle-row:hover .toolbar__toggle-text {
  color: var(--accent-primary);
}

/* Toggle Switch – compact */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--glass-border);
  transition: all 0.3s ease;
  border-radius: 22px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 2px;
  background-color: var(--text-secondary);
  transition: all 0.3s ease;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(18px);
  background-color: var(--bg-primary);
}

.toggle-switch input:focus + .toggle-slider {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.toggle-slider:hover {
  border-color: var(--accent-primary);
}

/* ── Responsive ── */
@media (max-width: 820px) {
  .toolbar {
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .toolbar__section {
    padding: 0.25rem 0.5rem;
  }

  .toolbar__section + .toolbar__section {
    border-left: none;
  }

  .toolbar__label {
    display: none;
  }
}
</style>
