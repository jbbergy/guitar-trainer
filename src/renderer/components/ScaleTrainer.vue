<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="scale-trainer-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scale-trainer-title"
        @click.self="close"
      >
        <div class="scale-trainer">
          <div class="scale-trainer__header">
            <div class="scale-trainer__header-left">
              <h2 id="scale-trainer-title" class="scale-trainer__title">
                Scale trainer
              </h2>
              <p class="scale-trainer__subtitle">
                {{ instrumentTitle }} ({{ tuningLabel }})
              </p>
            </div>

            <button
              class="scale-trainer__close"
              @click="close"
              aria-label="Close scale trainer"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          <div class="scale-trainer__controls" role="region" aria-label="Scale settings">
            <div class="scale-trainer__control">
              <label for="scale-root" class="scale-trainer__label">Root</label>
              <select
                id="scale-root"
                class="scale-trainer__select"
                v-model="root"
                aria-label="Scale root note"
              >
                <option v-for="note in NOTE_NAME_OPTIONS" :key="note" :value="note">
                  {{ note }}
                </option>
              </select>
            </div>

            <div class="scale-trainer__control">
              <label for="scale-mode" class="scale-trainer__label">Mode</label>
              <select
                id="scale-mode"
                class="scale-trainer__select"
                v-model="scaleId"
                aria-label="Scale mode"
              >
                <option v-for="def in SCALE_DEFINITIONS" :key="def.id" :value="def.id">
                  {{ def.label }}
                </option>
              </select>
            </div>

            <div class="scale-trainer__control">
              <label for="accidental-pref" class="scale-trainer__label">Accidentals</label>
              <select
                id="accidental-pref"
                class="scale-trainer__select"
                v-model="preference"
                aria-label="Accidental preference"
              >
                <option value="sharps">Sharps (#)</option>
                <option value="flats">Flats (b)</option>
              </select>
            </div>

            <div class="scale-trainer__control">
              <label for="max-fret" class="scale-trainer__label">Frets</label>
              <select
                id="max-fret"
                class="scale-trainer__select"
                v-model.number="maxFret"
                aria-label="Maximum fret to display"
              >
                <option :value="12">0–12</option>
                <option :value="15">0–15</option>
                <option :value="17">0–17</option>
              </select>
            </div>
          </div>

          <div class="scale-trainer__content">
            <div class="scale-trainer__chips" aria-label="Scale notes">
              <button
                v-for="pc in scalePitchClasses"
                :key="pc"
                type="button"
                class="scale-trainer__chip"
                :class="{ 'scale-trainer__chip--root': pc === rootPitchClass }"
                :aria-label="`Transpose: set root to ${pitchClassToNoteName(pc, preference)}`"
                :title="`Set root to ${pitchClassToNoteName(pc, preference)}`"
                @click="setRootFromPitchClass(pc)"
              >
                {{ pitchClassToNoteName(pc, preference) }}
              </button>
            </div>

            <FretboardDiagram
              :instrument="instrument"
              :root="root"
              :preference="preference"
              :scale-pitch-classes="scalePitchClasses"
              :max-fret="maxFret"
            />
          </div>

          <p class="scale-trainer__footer">
            Tip: press <kbd>S</kbd> to open/close, <kbd>Esc</kbd> to close.
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Instrument } from '@/types/chord'
import type { AccidentalPreference, NoteName, PitchClass } from '@/utils/music/pitchClass'
import { NOTE_NAME_OPTIONS, noteNameToPitchClass, pitchClassToNoteName } from '@/utils/music/pitchClass'
import type { ScaleId } from '@/utils/music/scales'
import { SCALE_DEFINITIONS, getScalePitchClasses } from '@/utils/music/scales'
import { getTuning } from '@/utils/music/tunings'
import FretboardDiagram from './FretboardDiagram.vue'

const props = defineProps<{
  modelValue: boolean
  instrument: Instrument
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const root = ref<NoteName>('C')
const scaleId = ref<ScaleId>('ionian')
const preference = ref<AccidentalPreference>('sharps')
const maxFret = ref<number>(12)

const close = () => emit('update:modelValue', false)

const instrumentTitle = computed(() => (props.instrument === 'ukulele' ? 'Ukulele' : 'Guitar'))
const tuningLabel = computed(() => getTuning(props.instrument).label)

const scalePitchClasses = computed<PitchClass[]>(() => getScalePitchClasses(root.value, scaleId.value))
const rootPitchClass = computed(() => noteNameToPitchClass(root.value))

const setRootFromPitchClass = (pitchClass: PitchClass) => {
  root.value = pitchClassToNoteName(pitchClass, preference.value)
}

// Keep root selection consistent with accidental preference when possible
watch(preference, pref => {
  if (pref === 'sharps') {
    if (root.value === 'Db') root.value = 'C#'
    if (root.value === 'Eb') root.value = 'D#'
    if (root.value === 'Gb') root.value = 'F#'
    if (root.value === 'Ab') root.value = 'G#'
    if (root.value === 'Bb') root.value = 'A#'
  } else {
    if (root.value === 'C#') root.value = 'Db'
    if (root.value === 'D#') root.value = 'Eb'
    if (root.value === 'F#') root.value = 'Gb'
    if (root.value === 'G#') root.value = 'Ab'
    if (root.value === 'A#') root.value = 'Bb'
  }
})
</script>

<style scoped>
.scale-trainer-overlay {
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

.scale-trainer {
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--glass-border-strong);
  border-radius: var(--glass-radius);
  max-width: 1200px;
  max-height: 92vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: var(--glass-shadow), var(--glass-inset-highlight);
  overflow: hidden;
}

.scale-trainer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--glass-border);
}

.scale-trainer__header-left {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.scale-trainer__title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
  font-weight: 700;
}

.scale-trainer__subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.scale-trainer__close {
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

.scale-trainer__close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.scale-trainer__close:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.scale-trainer__controls {
  display: grid;
  grid-template-columns: repeat(4, minmax(170px, 1fr));
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.03);
}

.scale-trainer__control {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.scale-trainer__label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

.scale-trainer__select {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-sm);
  padding: 0.55rem 0.6rem;
  font-size: 0.95rem;
  font-weight: 650;
  cursor: pointer;
}

.scale-trainer__select:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.scale-trainer__content {
  padding: 1.25rem 1.5rem 1.5rem 1.5rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.scale-trainer__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.scale-trainer__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: rgba(212, 165, 116, 0.12);
  color: var(--text-primary);
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
}

.scale-trainer__chip:hover {
  transform: translateY(-1px);
  border-color: rgba(212, 165, 116, 0.7);
}

.scale-trainer__chip:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.scale-trainer__chip:active {
  transform: translateY(0);
}

.scale-trainer__chip--root {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--bg-primary);
}

.scale-trainer__footer {
  margin: 0;
  padding: 0.9rem 1.5rem;
  border-top: 1px solid var(--glass-border);
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.9rem;
}

.scale-trainer__footer kbd {
  display: inline-block;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  padding: 0.15rem 0.4rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.85em;
  color: var(--text-primary);
}

/* Transitions (same naming as other modals) */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.28s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .scale-trainer,
.modal-leave-active .scale-trainer {
  transition: transform 0.28s ease;
}

.modal-enter-from .scale-trainer,
.modal-leave-to .scale-trainer {
  transform: scale(0.94);
}

@media (max-width: 900px) {
  .scale-trainer__controls {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }
}

@media (max-width: 640px) {
  .scale-trainer-overlay {
    padding: 1rem;
  }

  .scale-trainer__header {
    padding: 1rem 1.1rem;
  }

  .scale-trainer__controls {
    padding: 0.85rem 1.1rem;
    gap: 0.6rem;
  }

  .scale-trainer__content {
    padding: 1rem 1.1rem 1.25rem 1.1rem;
  }
}
</style>

