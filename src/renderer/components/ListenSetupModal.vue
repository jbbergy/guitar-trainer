<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="listen-setup-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="listen-setup-title"
        @click.self="close"
      >
        <div class="listen-setup">
          <div class="listen-setup__header">
            <div class="listen-setup__header-left">
              <h2
                id="listen-setup-title"
                class="listen-setup__title"
              >
                Listen Mode Setup
              </h2>
              <p class="listen-setup__subtitle">
                Select your audio input and verify it captures sound before starting.
              </p>
            </div>
            <button
              class="listen-setup__close"
              aria-label="Close"
              title="Close (Esc)"
              @click="close"
            >
              ✕
            </button>
          </div>

          <div class="listen-setup__body">
            <div
              v-if="error"
              class="listen-setup__error"
              role="alert"
            >
              {{ error }}
            </div>

            <div class="listen-setup__device">
              <label
                for="listen-device-select"
                class="listen-setup__label"
              >
                Audio Input
              </label>
              <select
                id="listen-device-select"
                class="listen-setup__select"
                :value="selectedDeviceId"
                :disabled="isListening"
                aria-label="Select audio input device"
                @change="handleDeviceChange"
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

            <div class="listen-setup__preview">
              <button
                class="listen-setup__test-btn"
                :class="{ 'listen-setup__test-btn--active': isListening }"
                @click="toggleTest"
              >
                <span class="listen-setup__test-icon">
                  {{ isListening ? '⏹' : '🎤' }}
                </span>
                {{ isListening ? 'Stop Test' : 'Test Input' }}
              </button>

              <div
                v-if="isListening"
                class="listen-setup__vu"
              >
                <label class="listen-setup__label">
                  Signal Level
                </label>
                <div class="listen-setup__vu-track">
                  <div
                    class="listen-setup__vu-bar"
                    :style="{ width: signalLevel + '%' }"
                    :class="{
                      'listen-setup__vu-bar--low': signalLevel < 20,
                      'listen-setup__vu-bar--mid': signalLevel >= 20 && signalLevel < 60,
                      'listen-setup__vu-bar--hot': signalLevel >= 60
                    }"
                  />
                </div>
                <div class="listen-setup__vu-notes">
                  <span
                    v-if="detectedNotes.length > 0"
                    class="listen-setup__detected-notes"
                  >
                    Detected: {{ detectedNotes.join(', ') }}
                  </span>
                  <span
                    v-else
                    class="listen-setup__no-signal"
                  >
                    Play something…
                  </span>
                </div>
                <div
                  v-if="detectedChord"
                  class="listen-setup__detected-chord"
                >
                  {{ detectedChord.fullName }}
                  <span class="listen-setup__confidence">
                    {{ detectedChord.confidence }}%
                  </span>
                </div>
              </div>
            </div>

            <details
              class="listen-setup__advanced"
              :open="isAdvancedOpen"
              @toggle="handleAdvancedToggle"
            >
              <summary class="listen-setup__advanced-summary">
                Advanced options
              </summary>

              <div class="listen-setup__advanced-content">
                <div class="listen-setup__field">
                  <label
                    for="listen-profile-select"
                    class="listen-setup__label"
                  >
                    Preset profile
                  </label>
                  <select
                    id="listen-profile-select"
                    class="listen-setup__select"
                    :value="detectionProfileId"
                    @change="handleProfileChange"
                  >
                    <option
                      v-for="profile in detectionProfiles"
                      :key="profile.id"
                      :value="profile.id"
                    >
                      {{ profile.label }}
                    </option>
                    <option value="custom">
                      Custom
                    </option>
                  </select>
                </div>

                <div class="listen-setup__field">
                  <label
                    for="listen-rms-threshold"
                    class="listen-setup__label"
                  >
                    RMS threshold
                  </label>
                  <div class="listen-setup__number-input-row">
                    <input
                      id="listen-rms-threshold"
                      class="listen-setup__number-input"
                      type="number"
                      min="0.0005"
                      max="0.02"
                      step="0.0001"
                      :value="rmsThreshold"
                      @input="handleRmsThresholdChange"
                    >
                    <span class="listen-setup__hint">
                      Current: {{ rmsThreshold.toFixed(4) }}
                    </span>
                  </div>
                </div>

                <div class="listen-setup__field">
                  <label class="listen-setup__label">
                    Useful frequency range (Hz)
                  </label>
                  <div class="listen-setup__frequency-grid">
                    <div class="listen-setup__frequency-col">
                      <span class="listen-setup__sub-label">Min</span>
                      <input
                        class="listen-setup__number-input"
                        type="number"
                        min="20"
                        max="3000"
                        step="1"
                        :value="minFrequency"
                        @input="handleMinFrequencyChange"
                      >
                    </div>
                    <div class="listen-setup__frequency-col">
                      <span class="listen-setup__sub-label">Max</span>
                      <input
                        class="listen-setup__number-input"
                        type="number"
                        min="40"
                        max="4000"
                        step="1"
                        :value="maxFrequency"
                        @input="handleMaxFrequencyChange"
                      >
                    </div>
                  </div>
                  <span class="listen-setup__hint">
                    Active range: {{ Math.round(minFrequency) }}-{{ Math.round(maxFrequency) }} Hz
                  </span>
                </div>
              </div>
            </details>
          </div>

          <div class="listen-setup__footer">
            <button
              class="listen-setup__cancel-btn"
              @click="close"
            >
              Cancel
            </button>
            <button
              class="listen-setup__validate-btn"
              :disabled="availableDevices.length === 0"
              @click="validate"
            >
              ✓ Start Listen Mode
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, toRef } from 'vue'
import type { Instrument } from '@/types/chord'
import type { AudioDetectionProfileId } from '../composables/useAudioChordDetection'
import { useAudioChordDetection } from '../composables/useAudioChordDetection'

const STORAGE_KEY_ADVANCED_OPEN = 'listen-advanced-options-open-v1'

const props = defineProps<{
  modelValue: boolean
  instrument: Instrument
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  validate: [deviceId: string]
}>()

const {
  isListening,
  detectedChord,
  detectedNotes,
  availableDevices,
  selectedDeviceId,
  error,
  signalLevel,
  detectionProfileId,
  rmsThreshold,
  minFrequency,
  maxFrequency,
  detectionProfiles,
  applyDetectionProfile,
  setRmsThreshold,
  setFrequencyRange,
  start,
  stop,
  refreshDevices,
} = useAudioChordDetection(toRef(props, 'instrument'))

const isAdvancedOpen = ref(globalThis.localStorage.getItem(STORAGE_KEY_ADVANCED_OPEN) === '1')

function close(): void {
  stop()
  emit('update:modelValue', false)
}

function toggleTest(): void {
  if (isListening.value) {
    stop()
  } else {
    start()
  }
}

function handleDeviceChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  stop()
  selectedDeviceId.value = target.value
}

function handleProfileChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  const profileId = target.value as AudioDetectionProfileId
  applyDetectionProfile(profileId)
}

function handleRmsThresholdChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const nextThreshold = Number(target.value)
  if (!Number.isFinite(nextThreshold)) return
  setRmsThreshold(nextThreshold)
}

function handleMinFrequencyChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const nextMinFrequency = Number(target.value)
  if (!Number.isFinite(nextMinFrequency)) return
  setFrequencyRange(nextMinFrequency, maxFrequency.value)
}

function handleMaxFrequencyChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const nextMaxFrequency = Number(target.value)
  if (!Number.isFinite(nextMaxFrequency)) return
  setFrequencyRange(minFrequency.value, nextMaxFrequency)
}

function handleAdvancedToggle(event: Event): void {
  const target = event.target as HTMLDetailsElement
  isAdvancedOpen.value = target.open
  globalThis.localStorage.setItem(STORAGE_KEY_ADVANCED_OPEN, target.open ? '1' : '0')
}

function validate(): void {
  const deviceId = selectedDeviceId.value
  stop()
  emit('validate', deviceId)
  emit('update:modelValue', false)
}

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
.listen-setup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.listen-setup {
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--glass-border-strong);
  border-radius: var(--glass-radius);
  max-width: 520px;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: var(--glass-shadow), var(--glass-inset-highlight);
  overflow: hidden;
}

.listen-setup__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--glass-border);
}

.listen-setup__header-left {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.listen-setup__title {
  margin: 0;
  font-size: 1.3rem;
  color: var(--text-primary);
  font-weight: 700;
}

.listen-setup__subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.listen-setup__close {
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

.listen-setup__close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.listen-setup__body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.listen-setup__error {
  background: rgba(192, 57, 43, 0.15);
  border: 1px solid rgba(192, 57, 43, 0.4);
  color: #e74c3c;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  text-align: center;
}

.listen-setup__device {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.listen-setup__label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

.listen-setup__select {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-sm);
  padding: 0.55rem 0.6rem;
  font-size: 0.95rem;
  font-weight: 650;
  cursor: pointer;
}

.listen-setup__select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.listen-setup__preview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
}

.listen-setup__advanced {
  width: 100%;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
}

.listen-setup__advanced-summary {
  cursor: pointer;
  list-style: none;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid transparent;
}

.listen-setup__advanced[open] .listen-setup__advanced-summary {
  border-bottom-color: var(--glass-border);
}

.listen-setup__advanced-summary::-webkit-details-marker {
  display: none;
}

.listen-setup__advanced-content {
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.listen-setup__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.listen-setup__number-input-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.listen-setup__number-input {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-sm);
  padding: 0.5rem 0.55rem;
  font-size: 0.92rem;
  font-weight: 600;
  width: 130px;
}

.listen-setup__frequency-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.listen-setup__frequency-col {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.listen-setup__sub-label {
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.listen-setup__hint {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.listen-setup__test-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  border: 1px solid var(--accent-primary);
  padding: 0.5rem 1.1rem;
  border-radius: var(--glass-radius-sm);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.listen-setup__test-btn:hover {
  background: var(--accent-primary);
  color: var(--bg-primary);
  transform: translateY(-1px);
}

.listen-setup__test-btn--active {
  background: #c0392b;
  border-color: #c0392b;
  color: #fff;
}

.listen-setup__test-btn--active:hover {
  background: #e74c3c;
  border-color: #e74c3c;
}

.listen-setup__test-icon {
  font-size: 1.1rem;
}

.listen-setup__vu {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.listen-setup__vu-track {
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
}

.listen-setup__vu-bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.08s ease;
}

.listen-setup__vu-bar--low {
  background: #2ecc71;
}

.listen-setup__vu-bar--mid {
  background: #f1c40f;
}

.listen-setup__vu-bar--hot {
  background: #e74c3c;
}

.listen-setup__vu-notes {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.listen-setup__detected-notes {
  color: var(--accent-primary);
  font-weight: 600;
}

.listen-setup__no-signal {
  animation: pulse-text 1.5s ease-in-out infinite;
}

@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.listen-setup__detected-chord {
  font-size: 2rem;
  font-weight: 900;
  color: var(--accent-primary);
  text-align: center;
  width: 100%;
}

.listen-setup__confidence {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 0.5rem;
}

.listen-setup__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--glass-border);
}

.listen-setup__cancel-btn {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  padding: 0.5rem 1.2rem;
  border-radius: var(--glass-radius-sm);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.listen-setup__cancel-btn:hover {
  border-color: var(--text-primary);
}

.listen-setup__validate-btn {
  background: #2ecc71;
  color: #fff;
  border: 1px solid #27ae60;
  padding: 0.5rem 1.5rem;
  border-radius: var(--glass-radius-sm);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.listen-setup__validate-btn:hover {
  background: #27ae60;
  transform: translateY(-1px);
}

.listen-setup__validate-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
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

.modal-enter-active .listen-setup,
.modal-leave-active .listen-setup {
  transition: transform 0.28s ease;
}

.modal-enter-from .listen-setup {
  transform: translateY(30px);
}

.modal-leave-to .listen-setup {
  transform: translateY(30px);
}
</style>
