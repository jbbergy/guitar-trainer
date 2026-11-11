<template>
  <TabModal :model-value="modelValue" title="Tablature settings" @update:model-value="emit('update:modelValue', $event)">
    <div class="tab-settings__grid">
      <div class="tab-field">
        <label class="tab-label" for="tab-settings-title">Title</label>
        <input id="tab-settings-title" class="tab-input" :value="doc.title" maxlength="120" data-autofocus
          @input="editor.setTitle(inputValue($event))">
      </div>
      <div class="tab-field">
        <label class="tab-label" for="tab-settings-artist">Artist</label>
        <input id="tab-settings-artist" class="tab-input" :value="doc.artist" maxlength="120"
          @input="editor.setArtist(inputValue($event))">
      </div>

      <div class="tab-field">
        <label class="tab-label" for="tab-settings-tuning">Tuning</label>
        <TabTuningSelect id="tab-settings-tuning" :model-value="doc.tuning.id" :string-count="doc.tuning.strings.length"
          :custom-label="doc.tuning.id === 'custom' ? doc.tuning.name : undefined" @update:model-value="retune" />
        <span class="tab-help">
          Renames the strings and keeps the fret numbers. To rewrite the notes for another
          instrument, use <button class="tab-settings__link" type="button" @click="emit('convert')">Convert</button>.
        </span>
      </div>
      <div class="tab-field">
        <label class="tab-label" for="tab-settings-capo">Capo</label>
        <select id="tab-settings-capo" class="tab-select" :value="doc.capo" @change="editor.setCapo(Number(inputValue($event)))">
          <option v-for="fret in CAPO_OPTIONS" :key="fret" :value="fret">
            {{ fret === 0 ? 'No capo' : `Fret ${fret}` }}
          </option>
        </select>
      </div>

      <div class="tab-field">
        <label class="tab-label" for="tab-settings-bpm">Tempo (BPM)</label>
        <input id="tab-settings-bpm" class="tab-input tab-input--number" type="number" min="20" max="300" :value="doc.bpm"
          @change="editor.setBpm(Number(inputValue($event)))">
      </div>
      <div class="tab-field">
        <label class="tab-label" for="tab-settings-columns">Steps per measure</label>
        <input id="tab-settings-columns" class="tab-input tab-input--number" type="number" min="1" max="64"
          :value="doc.columnsPerMeasure" @change="editor.setColumnsPerMeasure(Number(inputValue($event)))">
        <span class="tab-help">Applies to new measures and to measures of the current default length ({{ signature }}).</span>
      </div>
    </div>

    <div class="tab-field">
      <span class="tab-label">Grid resolution — one step is a {{ TAB_QUANTIZATION_LABELS[doc.quantization].toLowerCase() }} note</span>
      <div class="tab-settings__resolution">
        <button class="tab-btn" type="button" :disabled="editor.refinedQuantization.value === null" @click="editor.refineGrid()">
          Split every step in two
        </button>
        <button class="tab-btn" type="button" :disabled="editor.coarsenedQuantization.value === null"
          @click="editor.coarsenGrid()">
          Merge steps two by two
        </button>
      </div>
      <span class="tab-help">
        Both keep the music unchanged: splitting gives room for faster notes, merging is possible when every
        second step is empty.
      </span>
    </div>

    <template #footer>
      <button class="tab-btn tab-btn--primary" type="button" @click="emit('update:modelValue', false)">
        Done
      </button>
    </template>
  </TabModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MAX_TAB_CAPO, TAB_QUANTIZATION_LABELS } from '@/types/tablature'
import type { TabEditor } from '@/renderer/composables/useTabEditor'
import { measureTimeSignature } from '@/utils/tab/rhythm'
import { getTuningById } from '@/utils/tab/tunings'
import TabModal from './TabModal.vue'
import TabTuningSelect from './TabTuningSelect.vue'

const CAPO_OPTIONS = Array.from({ length: MAX_TAB_CAPO + 1 }, (_unused, index) => index)

const props = defineProps<{
  modelValue: boolean
  editor: TabEditor
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  convert: []
}>()

const doc = computed(() => props.editor.document.value)

const signature = computed(() => {
  const [numerator, denominator] = measureTimeSignature(doc.value.columnsPerMeasure, doc.value.quantization, doc.value.timeSignature)
  return `${numerator}/${denominator}`
})

const inputValue = (event: Event): string => (event.target as HTMLInputElement | HTMLSelectElement).value

const retune = (tuningId: string): void => {
  const tuning = getTuningById(tuningId)
  if (tuning) props.editor.setTuning(tuning)
}
</script>

<style scoped>
.tab-settings__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.9rem 1rem;
}

.tab-settings__resolution {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-settings__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent-primary);
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}
</style>
