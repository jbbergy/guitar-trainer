<template>
  <TabModal :model-value="modelValue" title="Convert to another instrument" size="large"
    @update:model-value="emit('update:modelValue', $event)">
    <p class="tab-help">
      A converted copy of “{{ document?.title }}” is added to the library; the original
      ({{ document?.tuning.name }}) is kept as it is.
    </p>

    <div class="tab-convert__options">
      <div class="tab-field">
        <label class="tab-label" for="tab-convert-target">Convert to</label>
        <TabTuningSelect id="tab-convert-target" v-model="targetId" data-autofocus data-testid="convert-target" />
      </div>

      <fieldset class="tab-convert__mode">
        <legend class="tab-label">
          What to keep
        </legend>
        <label class="tab-convert__radio">
          <input v-model="mode" type="radio" name="tab-convert-mode" value="key" data-testid="convert-mode-key">
          <span>The notes — same key<span v-if="shapeInterval === 0">, same fingerings</span></span>
        </label>
        <label v-if="shapeInterval !== null && shapeInterval !== 0" class="tab-convert__radio">
          <input v-model="mode" type="radio" name="tab-convert-mode" value="shapes" data-testid="convert-mode-shapes">
          <span>The fingerings — sounds {{ intervalLabel }}</span>
        </label>
      </fieldset>

      <div class="tab-field">
        <label class="tab-label" for="tab-convert-transpose">Transpose (semitones)</label>
        <input id="tab-convert-transpose" v-model.number="transpose" class="tab-input tab-input--number" type="number"
          min="-12" max="12" step="1" :disabled="mode === 'shapes'">
      </div>

      <div class="tab-field">
        <label class="tab-label" for="tab-convert-max-fret">Highest fret</label>
        <select id="tab-convert-max-fret" v-model.number="maxFret" class="tab-select">
          <option v-for="fret in MAX_FRET_OPTIONS" :key="fret" :value="fret">
            {{ fret }}
          </option>
        </select>
      </div>
    </div>

    <p v-if="result" class="tab-help" role="status" data-testid="convert-report">
      {{ reportText }}
    </p>
    <pre v-if="result" class="tab-preview" aria-label="Preview of the converted tablature"
      data-testid="convert-preview">{{ previewText }}</pre>

    <template #footer>
      <button class="tab-btn" type="button" @click="emit('update:modelValue', false)">
        Cancel
      </button>
      <button class="tab-btn tab-btn--primary" type="button" :disabled="!result" data-testid="convert-confirm" @click="confirm">
        Create converted copy
      </button>
    </template>
  </TabModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TablatureDocument } from '@/types/tablature'
import { tablatureToAscii } from '@/utils/tab/asciiExport'
import { convertTablature, defaultMaxFret, shapePreservingTranspose, type ConvertResult } from '@/utils/tab/convert'
import {
  BARITONE_UKULELE_TUNING_ID,
  DEFAULT_GUITAR_TUNING_ID,
  DEFAULT_UKULELE_TUNING_ID,
  getTuningById,
} from '@/utils/tab/tunings'
import TabModal from './TabModal.vue'
import TabTuningSelect from './TabTuningSelect.vue'

const MAX_FRET_OPTIONS = [5, 7, 9, 12, 15, 17, 19, 22, 24]

const props = defineProps<{
  modelValue: boolean
  document: TablatureDocument | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  converted: [document: TablatureDocument]
}>()

const targetId = ref(DEFAULT_UKULELE_TUNING_ID)
const mode = ref<'key' | 'shapes'>('key')
const transpose = ref(0)
const maxFret = ref(15)

const target = computed(() => getTuningById(targetId.value))

/** Interval at which fingerings carry over unchanged, null when they cannot. */
const shapeInterval = computed(() =>
  props.document && target.value ? shapePreservingTranspose(props.document.tuning, target.value) : null
)

const intervalLabel = computed(() => {
  const interval = shapeInterval.value ?? 0
  const size = Math.abs(interval)
  return `${size} semitone${size === 1 ? '' : 's'} ${interval > 0 ? 'higher' : 'lower'}`
})

/** Most useful destination for the instrument being converted. */
const suggestTarget = (document: TablatureDocument): string => {
  if (document.tuning.family === 'ukulele') {
    return document.tuning.id === BARITONE_UKULELE_TUNING_ID ? DEFAULT_UKULELE_TUNING_ID : DEFAULT_GUITAR_TUNING_ID
  }
  return DEFAULT_UKULELE_TUNING_ID
}

watch(() => props.modelValue, (open) => {
  if (open && props.document) {
    targetId.value = suggestTarget(props.document)
    mode.value = 'key'
    transpose.value = 0
  }
}, { immediate: true })

watch(target, (tuning) => {
  if (tuning) maxFret.value = MAX_FRET_OPTIONS.includes(defaultMaxFret(tuning)) ? defaultMaxFret(tuning) : 15
  if (shapeInterval.value === null || shapeInterval.value === 0) mode.value = 'key'
}, { immediate: true })

const result = computed<ConvertResult | null>(() => {
  if (!props.modelValue || !props.document || !target.value) return null
  const semitones = Math.max(-12, Math.min(12, Math.round(Number(transpose.value) || 0)))
  return convertTablature(props.document, target.value, mode.value === 'shapes'
    ? { keepShapes: true, maxFret: maxFret.value }
    : { transpose: semitones, maxFret: maxFret.value, keepShapes: semitones === 0 ? undefined : false })
})

const reportText = computed(() => {
  const report = result.value?.report
  if (!report) return ''
  const parts = [`${report.totalNotes} notes`]
  if (report.semitones !== 0) {
    parts.push(`transposed ${report.semitones > 0 ? '+' : ''}${report.semitones} semitones`)
  }
  if (report.octaveShifted > 0) parts.push(`${report.octaveShifted} moved by an octave to fit`)
  if (report.merged > 0) parts.push(`${report.merged} doubled notes merged`)
  if (report.dropped > 0) parts.push(`${report.dropped} left out (not enough strings)`)
  if (report.octaveShifted === 0 && report.dropped === 0) parts.push('everything fits')
  return parts.join(' · ')
})

const previewText = computed(() => {
  if (!result.value) return ''
  const systems = tablatureToAscii(result.value.document, { includeHeader: false, lineWidth: 100 }).split('\n\n')
  return systems.length > 3 ? `${systems.slice(0, 3).join('\n\n')}\n\n…` : systems.join('\n\n')
})

const confirm = (): void => {
  if (!result.value || !target.value) return
  const shortName = target.value.name.replace(/\s*\(.*\)$/, '')
  emit('converted', {
    ...result.value.document,
    title: `${result.value.document.title} — ${shortName}`.slice(0, 120),
  })
  emit('update:modelValue', false)
}
</script>

<style scoped>
.tab-convert__options {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.tab-convert__mode {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
  border: 0;
}

.tab-convert__radio {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-primary);
  cursor: pointer;
}
</style>
