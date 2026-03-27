<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="chord-detector-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chord-detector-title"
        @click.self="close"
      >
        <div class="chord-detector">
          <div class="chord-detector__header">
            <div class="chord-detector__header-left">
              <h2
                id="chord-detector-title"
                class="chord-detector__title"
              >
                Chord Detector
              </h2>
              <p class="chord-detector__subtitle">
                {{ instrumentTitle }} — Play a chord and see it detected in real-time
              </p>
            </div>

            <button
              class="chord-detector__close"
              aria-label="Close chord detector"
              title="Close (Esc)"
              @click="close"
            >
              ✕
            </button>
          </div>

          <div
            class="chord-detector__controls"
            role="region"
            aria-label="Audio settings"
          >
            <div class="chord-detector__control">
              <label
                for="audio-device"
                class="chord-detector__label"
              >Audio Input</label>
              <select
                id="audio-device"
                v-model="selectedDeviceId"
                class="chord-detector__select"
                :disabled="isListening"
                aria-label="Select audio input device"
              >
                <option
                  v-for="device in availableDevices"
                  :key="device.deviceId"
                  :value="device.deviceId"
                >
                  {{ device.label }}
                </option>
              </select>
            </div>

            <div class="chord-detector__control chord-detector__control--action">
              <button
                class="chord-detector__listen-btn"
                :class="{ 'chord-detector__listen-btn--active': isListening }"
                :aria-label="isListening ? 'Stop listening' : 'Start listening'"
                @click="toggleListening"
              >
                <span
                  class="chord-detector__listen-icon"
                  :class="{ 'chord-detector__listen-icon--pulse': isListening }"
                >
                  {{ isListening ? '⏹' : '🎤' }}
                </span>
                {{ isListening ? 'Stop' : 'Start Listening' }}
              </button>
            </div>
          </div>

          <div class="chord-detector__content">
            <div
              v-if="error"
              class="chord-detector__error"
              role="alert"
            >
              {{ error }}
            </div>

            <div
              v-if="!isListening && !error"
              class="chord-detector__placeholder"
            >
              <span class="chord-detector__placeholder-icon">🎸</span>
              <p>Select your audio input and press <strong>Start Listening</strong> to begin chord detection.</p>
              <p class="chord-detector__placeholder-hint">
                Works with your Mac's built-in microphone or an external audio interface (e.g. Focusrite Scarlett 2i2).
              </p>
            </div>

            <div
              v-if="isListening"
              class="chord-detector__result"
            >
              <div class="chord-detector__visualizer">
                <div
                  v-for="(note, i) in detectedNotes"
                  :key="i"
                  class="chord-detector__note-chip"
                >
                  {{ note }}
                </div>
                <span
                  v-if="detectedNotes.length === 0"
                  class="chord-detector__listening-text"
                >
                  Listening…
                </span>
              </div>

              <div class="chord-detector__detected-chord">
                <div
                  v-if="detectedChord"
                  class="chord-detector__chord-name"
                >
                  {{ detectedChord.fullName }}
                </div>
                <div
                  v-else
                  class="chord-detector__chord-name chord-detector__chord-name--empty"
                >
                  —
                </div>
                <div
                  v-if="detectedChord"
                  class="chord-detector__confidence"
                >
                  Confidence: {{ detectedChord.confidence }}%
                </div>
              </div>

              <div
                class="chord-detector__level-meter"
                aria-hidden="true"
              >
                <div
                  class="chord-detector__level-bar"
                  :style="{ width: signalLevel + '%' }"
                />
              </div>
            </div>
          </div>

          <p class="chord-detector__footer">
            Tip: press <kbd>R</kbd> to open/close, <kbd>Esc</kbd> to close.
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, toRef } from 'vue'
import type { Instrument } from '@/types/chord'
import { useAudioChordDetection } from '../composables/useAudioChordDetection'

const props = defineProps<{
  modelValue: boolean
  instrument: Instrument
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const {
  isListening,
  detectedChord,
  detectedNotes,
  availableDevices,
  selectedDeviceId,
  error,
  signalLevel,
  start,
  stop,
  refreshDevices,
} = useAudioChordDetection(toRef(props, 'instrument'))

const instrumentTitle = computed(() => (props.instrument === 'ukulele' ? 'Ukulele' : 'Guitar'))

const close = (): void => {
  stop()
  emit('update:modelValue', false)
}

function toggleListening(): void {
  if (isListening.value) {
    stop()
  } else {
    start()
  }
}

// Refresh device list when modal opens
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      refreshDevices()
    } else {
      stop()
    }
  }
)
</script>

<style scoped>
.chord-detector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.chord-detector {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 700px;
  max-height: 92vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}

.chord-detector__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--bg-secondary);
}

.chord-detector__header-left {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.chord-detector__title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
  font-weight: 700;
}

.chord-detector__subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.chord-detector__close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.chord-detector__close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.chord-detector__close:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.chord-detector__controls {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--bg-secondary);
  background: rgba(0, 0, 0, 0.08);
}

.chord-detector__control {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.chord-detector__control--action {
  flex: 0 0 auto;
}

.chord-detector__label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

.chord-detector__select {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 2px solid var(--text-secondary);
  border-radius: 10px;
  padding: 0.55rem 0.6rem;
  font-size: 0.95rem;
  font-weight: 650;
  cursor: pointer;
}

.chord-detector__select:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.chord-detector__select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chord-detector__listen-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 2px solid var(--accent-primary);
  padding: 0.55rem 1.2rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chord-detector__listen-btn:hover {
  background: var(--accent-primary);
  color: var(--bg-primary);
  transform: translateY(-1px);
}

.chord-detector__listen-btn:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.chord-detector__listen-btn--active {
  background: #c0392b;
  border-color: #c0392b;
  color: #fff;
}

.chord-detector__listen-btn--active:hover {
  background: #e74c3c;
  border-color: #e74c3c;
  color: #fff;
}

.chord-detector__listen-icon--pulse {
  animation: pulse-icon 1.2s ease-in-out infinite;
}

@keyframes pulse-icon {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.chord-detector__content {
  padding: 2rem 1.5rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  min-height: 220px;
}

.chord-detector__error {
  background: rgba(192, 57, 43, 0.15);
  border: 1px solid rgba(192, 57, 43, 0.4);
  color: #e74c3c;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  font-size: 0.95rem;
  width: 100%;
  text-align: center;
}

.chord-detector__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-secondary);
  text-align: center;
}

.chord-detector__placeholder-icon {
  font-size: 3rem;
}

.chord-detector__placeholder-hint {
  font-size: 0.85rem;
  opacity: 0.7;
}

.chord-detector__result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  width: 100%;
}

.chord-detector__visualizer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  min-height: 2.5rem;
  align-items: center;
}

.chord-detector__note-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  border: 2px solid rgba(212, 165, 116, 0.5);
  background: rgba(212, 165, 116, 0.12);
  color: var(--text-primary);
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.02em;
  animation: note-in 0.15s ease-out;
}

@keyframes note-in {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.chord-detector__listening-text {
  color: var(--text-secondary);
  font-size: 1rem;
  animation: pulse-icon 1.5s ease-in-out infinite;
}

.chord-detector__detected-chord {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.chord-detector__chord-name {
  font-size: 4rem;
  font-weight: 900;
  color: var(--accent-primary);
  letter-spacing: -0.02em;
  line-height: 1.1;
  transition: all 0.2s ease;
}

.chord-detector__chord-name--empty {
  color: var(--muted);
}

.chord-detector__confidence {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.chord-detector__level-meter {
  width: 100%;
  max-width: 400px;
  height: 4px;
  background: var(--bg-secondary);
  border-radius: 999px;
  overflow: hidden;
}

.chord-detector__level-bar {
  height: 100%;
  width: 0%;
  background: var(--accent-primary);
  border-radius: 999px;
  transition: width 0.1s ease;
}

.chord-detector__footer {
  margin: 0;
  padding: 0.9rem 1.5rem;
  border-top: 1px solid var(--bg-secondary);
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.9rem;
}

.chord-detector__footer kbd {
  display: inline-block;
  background: var(--bg-secondary);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  padding: 0.15rem 0.4rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.85em;
  color: var(--text-primary);
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.28s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .chord-detector,
.modal-leave-active .chord-detector {
  transition: transform 0.28s ease;
}

.modal-enter-from .chord-detector,
.modal-leave-to .chord-detector {
  transform: scale(0.94);
}

@media (max-width: 640px) {
  .chord-detector-overlay {
    padding: 1rem;
  }

  .chord-detector__header {
    padding: 1rem 1.1rem;
  }

  .chord-detector__controls {
    flex-direction: column;
    align-items: stretch;
  }

  .chord-detector__chord-name {
    font-size: 3rem;
  }

  .chord-detector__content {
    padding: 1.5rem 1rem;
  }
}
</style>
