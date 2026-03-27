<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="modelValue"
        class="chord-library-overlay"
        @click.self="close"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chord-library-title"
      >
        <div class="chord-library">
          <div class="chord-library__header">
            <h2 id="chord-library-title" class="chord-library__title">
              {{ instrumentTitle }} Chords
            </h2>
            <button
              class="chord-library__close"
              @click="close"
              aria-label="Close chord library"
            >
              ✕
            </button>
          </div>
          
          <div class="chord-library__content">
            <div class="chord-library__list">
              <div
                v-for="chord in chords"
                :key="chord.name"
                class="chord-library__item"
              >
                <ChordCard :chord="chord" :instrument="instrument" :size="350" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getAllChords } from '@/utils/randomChord'
import type { Instrument } from '@/types/chord'
import ChordCard from './ChordCard.vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  instrument?: Instrument
}>(), {
  instrument: 'guitar'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const chords = computed(() => getAllChords(props.instrument))
const instrumentTitle = computed(() => props.instrument === 'ukulele' ? 'Ukulele' : 'Guitar')

const close = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.chord-library-overlay {
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

.chord-library {
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--glass-border-strong);
  border-radius: var(--glass-radius);
  max-width: 900px;
  max-height: 90vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: var(--glass-shadow), var(--glass-inset-highlight);
}

.chord-library__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--glass-border);
}

.chord-library__title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
  font-weight: 600;
}

.chord-library__close {
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

.chord-library__close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.chord-library__close:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.chord-library__content {
  padding: 2rem;
  overflow-y: auto;
}

.chord-library__list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rem;
  max-width: 500px;
  margin: 0 auto;
}

.chord-library__item {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .chord-library,
.modal-leave-active .chord-library {
  transition: transform 0.3s ease;
}

.modal-enter-from .chord-library,
.modal-leave-to .chord-library {
  transform: scale(0.9);
}

/* Responsive */
@media (max-width: 640px) {
  .chord-library-overlay {
    padding: 1rem;
  }

  .chord-library__list {
    gap: 2rem;
    max-width: 100%;
  }

  .chord-library__header {
    padding: 1rem 1.5rem;
  }

  .chord-library__content {
    padding: 1.5rem;
  }

  .chord-library__title {
    font-size: 1.25rem;
  }
}
</style>
