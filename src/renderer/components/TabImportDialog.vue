<template>
  <TabModal :model-value="modelValue" title="Import tablatures" size="large" @update:model-value="emit('update:modelValue', $event)">
    <div class="tab-import__drop" :class="{ 'tab-import__drop--over': dragOver }" @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false" @drop.prevent="onDrop">
      <input ref="fileInput" class="sr-only" type="file" multiple :accept="TAB_IMPORT_ACCEPT" tabindex="-1"
        aria-hidden="true" data-testid="import-file-input" @change="onFilesChosen">
      <button class="tab-btn tab-btn--primary" type="button" data-autofocus @click="fileInput?.click()">
        Choose files…
      </button>
      <span class="tab-help">or drop files here — {{ TAB_IMPORT_FORMATS_LABEL }}</span>
    </div>

    <div class="tab-field">
      <label class="tab-label" for="tab-import-text">…or paste a text tablature (from a website, an e-mail, a .txt file)</label>
      <textarea id="tab-import-text" v-model="text" class="tab-textarea" rows="7" spellcheck="false"
        :placeholder="PLACEHOLDER" data-testid="import-text" />
      <div class="tab-import__text-actions">
        <button class="tab-btn" type="button" :disabled="text.trim() === '' || busy" data-testid="import-read-text"
          @click="readText">
          Read this text
        </button>
        <span class="tab-help">Lyrics and chord names around the tab lines are ignored.</span>
      </div>
    </div>

    <p v-if="busy" class="tab-help" role="status">
      Reading…
    </p>
    <p v-for="(error, index) in errors" :key="`error-${index}`" class="tab-error" role="alert">
      {{ error }}
    </p>

    <section v-if="candidates.length > 0" class="tab-import__results" aria-label="Tablatures found">
      <article v-for="candidate in candidates" :key="candidate.key" class="tab-import__candidate"
        :class="{ 'tab-import__candidate--off': !candidate.selected }" data-testid="import-candidate">
        <div class="tab-import__candidate-head">
          <input :id="`tab-import-pick-${candidate.key}`" v-model="candidate.selected" type="checkbox"
            :aria-label="`Import ${candidate.document.title}`">
          <input class="tab-input tab-import__title" :value="candidate.document.title" maxlength="120"
            aria-label="Title" @input="rename(candidate, $event)">
          <TabTuningSelect class="tab-import__tuning" :model-value="candidate.document.tuning.id"
            :string-count="candidate.document.tuning.strings.length"
            :custom-label="candidate.document.tuning.id === 'custom' ? candidate.document.tuning.name : undefined"
            aria-label="Tuning" @update:model-value="retune(candidate, $event)" />
        </div>
        <p class="tab-help">
          {{ candidate.formatLabel }} · {{ candidate.source }} · {{ candidate.document.measures.length }} measures ·
          {{ countNotes(candidate.document.measures) }} notes · {{ candidate.document.bpm }} BPM
        </p>
        <p v-for="(warning, index) in candidate.warnings" :key="index" class="tab-warning">
          ⚠ {{ warning }}
        </p>
        <pre class="tab-preview" aria-label="Preview">{{ preview(candidate.document) }}</pre>
      </article>
    </section>

    <template #footer>
      <span v-if="candidates.length > 0" class="tab-modal__footer-note">
        {{ selectedCount }} of {{ candidates.length }} selected
      </span>
      <button class="tab-btn" type="button" @click="emit('update:modelValue', false)">
        Cancel
      </button>
      <button class="tab-btn" type="button" :disabled="selectedCount === 0" data-testid="import-add" @click="confirm(false)">
        Add to library
      </button>
      <button class="tab-btn tab-btn--primary" type="button" :disabled="selectedCount === 0" data-testid="import-add-open"
        @click="confirm(true)">
        Add and open
      </button>
    </template>
  </TabModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TabInstrumentFamily, TablatureDocument } from '@/types/tablature'
import { tablatureToAscii } from '@/utils/tab/asciiExport'
import {
  importTablatureBytes,
  importTablatureText,
  TAB_IMPORT_ACCEPT,
  TAB_IMPORT_FORMATS_LABEL,
  type TabImportResult,
} from '@/utils/tab/formats'
import { countNotes } from '@/utils/tab/model'
import { getTuningById } from '@/utils/tab/tunings'
import TabModal from './TabModal.vue'
import TabTuningSelect from './TabTuningSelect.vue'

interface Candidate {
  key: string
  document: TablatureDocument
  selected: boolean
  source: string
  formatLabel: string
  warnings: string[]
}

const PLACEHOLDER = [
  'e|-----0-----0---|',
  'B|---1-----1-----|',
  'G|-0-----0-------|',
  'D|---------------|',
  'A|-3-------------|',
  'E|---------------|',
].join('\n')

const props = defineProps<{
  modelValue: boolean
  /** Instrument assumed when a file does not name its instrument */
  preferredFamily: TabInstrumentFamily
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  imported: [documents: TablatureDocument[], open: boolean]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const text = ref('')
const candidates = ref<Candidate[]>([])
const errors = ref<string[]>([])
const busy = ref(false)
const dragOver = ref(false)
let nextKey = 0

const selectedCount = computed(() => candidates.value.filter((candidate) => candidate.selected).length)

const addResult = (result: TabImportResult, source: string): void => {
  result.documents.forEach((document, index) => {
    candidates.value.push({
      key: `c${++nextKey}`,
      document,
      // Multi-track files: only the first track is ticked by default.
      selected: index === 0,
      source,
      formatLabel: result.formatLabel,
      warnings: result.warnings,
    })
  })
}

const describeError = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : 'This file could not be read.'

/** Reads files chosen, dropped on the dialog or handed over by the editor. */
const loadFiles = async (files: File[]): Promise<void> => {
  if (files.length === 0) return
  busy.value = true
  for (const file of files) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      addResult(await importTablatureBytes(bytes, file.name, { preferredFamily: props.preferredFamily }), file.name)
    } catch (error) {
      errors.value.push(`${file.name}: ${describeError(error)}`)
    }
  }
  busy.value = false
}

const readText = async (): Promise<void> => {
  busy.value = true
  try {
    addResult(await importTablatureText(text.value, { preferredFamily: props.preferredFamily }), 'pasted text')
    text.value = ''
  } catch (error) {
    errors.value.push(describeError(error))
  }
  busy.value = false
}

const onFilesChosen = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  void loadFiles(files)
}

const onDrop = (event: DragEvent): void => {
  dragOver.value = false
  void loadFiles(Array.from(event.dataTransfer?.files ?? []))
}

const rename = (candidate: Candidate, event: Event): void => {
  candidate.document = { ...candidate.document, title: (event.target as HTMLInputElement).value.slice(0, 120) }
}

/** Relabels the strings: fret numbers stay as written in the file. */
const retune = (candidate: Candidate, tuningId: string): void => {
  const tuning = getTuningById(tuningId)
  if (tuning && tuning.strings.length === candidate.document.tuning.strings.length) {
    candidate.document = { ...candidate.document, tuning }
  }
}

const preview = (document: TablatureDocument): string => {
  const systems = tablatureToAscii(document, { includeHeader: false, lineWidth: 100 }).split('\n\n')
  return systems.length > 2 ? `${systems.slice(0, 2).join('\n\n')}\n\n…` : systems.join('\n\n')
}

const confirm = (open: boolean): void => {
  const documents = candidates.value
    .filter((candidate) => candidate.selected)
    .map((candidate) => ({ ...candidate.document, title: candidate.document.title.trim() || 'Imported tablature' }))
  if (documents.length === 0) return
  emit('imported', documents, open)
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (open) => {
  if (open) {
    text.value = ''
    candidates.value = []
    errors.value = []
    busy.value = false
    dragOver.value = false
  }
})

defineExpose({ loadFiles })
</script>

<style scoped>
.tab-import__drop {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.9rem;
  border: 1px dashed var(--glass-border-strong);
  border-radius: var(--glass-radius-sm);
}

.tab-import__drop--over {
  border-color: var(--accent-primary);
  background: var(--tab-select);
}

.tab-import__text-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.tab-import__results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tab-import__candidate {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.7rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-sm);
  background: var(--glass-bg);
}

.tab-import__candidate--off {
  opacity: 0.55;
}

.tab-import__candidate-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-import__title {
  flex: 1;
  min-width: 160px;
  font-weight: 600;
}

.tab-import__tuning {
  max-width: 280px;
}
</style>
