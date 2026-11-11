<template>
  <TabModal :model-value="modelValue" :title="`Export “${document?.title || 'Untitled tablature'}”`" size="large"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="tab-export__formats" role="radiogroup" aria-label="File format">
      <label v-for="format in TAB_EXPORT_FORMATS" :key="format.id" class="tab-export__format"
        :class="{ 'tab-export__format--active': formatId === format.id }">
        <input v-model="formatId" class="sr-only" type="radio" name="tab-export-format" :value="format.id"
          :data-autofocus="format.id === formatId ? '' : undefined">
        <span class="tab-export__format-name">{{ format.label }} <span class="tab-chip">.{{ format.extension }}</span></span>
        <span class="tab-help">{{ format.description }}</span>
      </label>
      <label class="tab-export__format" :class="{ 'tab-export__format--active': formatId === 'print' }">
        <input v-model="formatId" class="sr-only" type="radio" name="tab-export-format" value="print">
        <span class="tab-export__format-name">PDF / Print <span class="tab-chip">.pdf</span></span>
        <span class="tab-help">Engraved score: tab staff, repeats and rhythm. Choose “Save as PDF” in the print dialog.</span>
      </label>
    </div>

    <p v-if="error" class="tab-error" role="alert">
      {{ error }}
    </p>
    <iframe v-else-if="formatId === 'print'" class="tab-export__page" :srcdoc="printHtml" title="Preview of the printed score"
      sandbox="" data-testid="export-print-preview" />
    <pre v-else-if="previewText !== null" class="tab-preview tab-export__preview" aria-label="Preview"
      data-testid="export-preview">{{ previewText }}</pre>
    <p v-else class="tab-help tab-export__binary">
      {{ busy ? 'Preparing the file…' : `Binary file ready: ${file?.fileName ?? ''} (${sizeLabel}).` }}
    </p>

    <template #footer>
      <span class="tab-modal__footer-note" role="status">{{ status }}</span>
      <button v-if="formatId === 'print'" class="tab-btn tab-btn--primary" type="button" :disabled="!document"
        data-testid="export-print" @click="print">
        🖨 Print / Save as PDF
      </button>
      <template v-else>
        <button class="tab-btn" type="button" :disabled="previewText === null" data-testid="export-copy" @click="copy">
          Copy
        </button>
        <button class="tab-btn tab-btn--primary" type="button" :disabled="!file" data-testid="export-download" @click="download">
          Save file
        </button>
      </template>
    </template>
  </TabModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TablatureDocument } from '@/types/tablature'
import { copyText, printTablature, saveFile } from '@/utils/tab/files'
import { exportTablature, TAB_EXPORT_FORMATS, type ExportedFile, type TabFormatId } from '@/utils/tab/formats'
import { tablatureToPrintHtml } from '@/utils/tab/printLayout'
import TabModal from './TabModal.vue'

const PREVIEW_LIMIT = 6000

const props = defineProps<{
  modelValue: boolean
  document: TablatureDocument | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const formatId = ref<TabFormatId | 'print'>('ascii')
const file = ref<ExportedFile | null>(null)
const error = ref('')
const busy = ref(false)
const status = ref('')
let generation = 0

const printHtml = computed(() => (props.modelValue && props.document && formatId.value === 'print' ? tablatureToPrintHtml(props.document) : ''))

const previewText = computed<string | null>(() => {
  const data = file.value?.data
  if (typeof data !== 'string') return null
  return data.length > PREVIEW_LIMIT ? `${data.slice(0, PREVIEW_LIMIT)}\n…` : data
})

const sizeLabel = computed(() => {
  const data = file.value?.data
  const bytes = !data ? 0 : typeof data === 'string' ? data.length : data.byteLength
  return bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB`
})

const build = async (): Promise<void> => {
  const current = ++generation
  file.value = null
  error.value = ''
  status.value = ''
  if (!props.modelValue || !props.document || formatId.value === 'print') return

  busy.value = true
  try {
    const result = await exportTablature(props.document, formatId.value as TabFormatId)
    if (current === generation) file.value = result
  } catch (reason) {
    console.warn('Export failed:', reason)
    if (current === generation) error.value = 'This tablature could not be exported to this format.'
  }
  if (current === generation) busy.value = false
}

watch([() => props.modelValue, () => props.document, formatId], build, { immediate: true })

const download = (): void => {
  if (!file.value) return
  saveFile(file.value)
  status.value = `${file.value.fileName} saved`
}

const copy = async (): Promise<void> => {
  const data = file.value?.data
  if (typeof data !== 'string') return
  status.value = (await copyText(data)) ? 'Copied to the clipboard' : 'Copy failed'
}

const print = (): void => {
  if (props.document) printTablature(props.document)
}
</script>

<style scoped>
.tab-export__formats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.5rem;
}

.tab-export__format {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-sm);
  background: var(--glass-bg);
  cursor: pointer;
}

.tab-export__format:hover {
  border-color: var(--glass-border-strong);
}

.tab-export__format--active {
  border-color: var(--accent-primary);
  box-shadow: inset 0 0 0 1px var(--accent-primary);
}

.tab-export__format:focus-within {
  outline: var(--focus-outline);
  outline-offset: 2px;
}

.tab-export__format-name {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
}

.tab-export__page {
  width: 100%;
  height: 340px;
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-sm);
  background: #fff;
}

.tab-export__preview {
  max-height: 300px;
}

.tab-export__binary {
  padding: 1.5rem 0;
  text-align: center;
}
</style>
