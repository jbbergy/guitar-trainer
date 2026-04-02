<template>
  <!-- Top bar -->
  <nav
    class="compose-toolbar"
    role="region"
    aria-label="Compose toolbar"
  >
    <!-- Section 1: New + Title -->
    <div class="compose-toolbar__section compose-toolbar__section--title">
      <button
        class="compose-toolbar__btn"
        type="button"
        @click="handleNewTablature"
      >
        New Tab
      </button>
      <label
        for="compose-title"
        class="compose-toolbar__label"
      >Title</label>
      <input
        id="compose-title"
        class="compose-toolbar__title-input"
        :value="document.title"
        maxlength="80"
        aria-label="Tablature title"
        @input="onTitleInput"
      >
    </div>

    <!-- Section 2: Document controls -->
    <div class="compose-toolbar__section">
      <span class="compose-toolbar__label">Per line</span>
      <button
        class="compose-toolbar__btn compose-toolbar__btn--stepper"
        type="button"
        :disabled="document.measuresPerLine <= 1"
        aria-label="Fewer measures per line"
        @click="setMeasuresPerLine(document.measuresPerLine - 1)"
      >−</button>
      <span class="compose-toolbar__stepper-val">{{ document.measuresPerLine }}</span>
      <button
        class="compose-toolbar__btn compose-toolbar__btn--stepper"
        type="button"
        :disabled="document.measuresPerLine >= 16"
        aria-label="More measures per line"
        @click="setMeasuresPerLine(document.measuresPerLine + 1)"
      >+</button>

      <span class="compose-toolbar__label">Notes/bar</span>
      <button
        class="compose-toolbar__btn compose-toolbar__btn--stepper"
        type="button"
        :disabled="document.columnsPerMeasure <= 1"
        aria-label="Fewer notes per measure"
        @click="setColumnsPerMeasure(document.columnsPerMeasure - 1)"
      >−</button>
      <span class="compose-toolbar__stepper-val">{{ document.columnsPerMeasure }}</span>
      <button
        class="compose-toolbar__btn compose-toolbar__btn--stepper"
        type="button"
        :disabled="document.columnsPerMeasure >= 16"
        aria-label="More notes per measure"
        @click="setColumnsPerMeasure(document.columnsPerMeasure + 1)"
      >+</button>
    </div>

    <!-- Section 3: Preview + Mode switch -->
    <div class="compose-toolbar__section compose-toolbar__section--end">
      <button
        class="compose-toolbar__btn compose-toolbar__btn--primary"
        type="button"
        @click="openPreviewModal"
      >
        Preview
      </button>

      <div
        class="compose-toolbar__view-switch"
        role="group"
        aria-label="Main view"
      >
        <button
          class="compose-toolbar__view-switch-btn"
          :class="{ 'compose-toolbar__view-switch-btn--active': currentView === 'trainer' }"
          :aria-pressed="currentView === 'trainer'"
          @click="emit('switchView', 'trainer')"
        >
          Trainer
        </button>
        <button
          class="compose-toolbar__view-switch-btn"
          :class="{ 'compose-toolbar__view-switch-btn--active': currentView === 'compose' }"
          :aria-pressed="currentView === 'compose'"
          @click="emit('switchView', 'compose')"
        >
          Compose
        </button>
      </div>
    </div>
  </nav>

  <!-- Main content area -->
  <main
    class="compose-content"
    role="region"
    aria-label="Tablature editor"
  >
    <p class="compose-content__hint">
      Arrow keys to navigate · 0–24 for frets · X for muted
    </p>

    <div class="compose-content__lines">
      <div
        v-for="(line, lineIdx) in tabLines"
        :key="lineIdx"
        class="compose-content__line"
        role="grid"
        :aria-label="`Tablature line ${lineIdx + 1}`"
      >
        <!-- String labels column -->
        <div class="compose-content__labels-col" aria-hidden="true">
          <div class="compose-content__row-spacer" />
          <div
            v-for="row in displayRows"
            :key="row.label"
            class="compose-content__label"
          >{{ row.label }}|</div>
        </div>

        <!-- One column per measure in this line + trailing separator -->
        <template v-for="(_, mLocalIdx) in line.measures" :key="line.startIdx + mLocalIdx">
          <div class="compose-content__measure-col">
            <!-- Measure header: delete button -->
            <div class="compose-content__measure-hd">
              <button
                class="compose-content__del"
                :aria-label="`Delete measure ${line.startIdx + mLocalIdx + 1}`"
                :title="`Delete measure ${line.startIdx + mLocalIdx + 1}`"
                :disabled="document.measures.length <= 1"
                @click="removeMeasureAt(line.startIdx + mLocalIdx)"
              >×</button>
            </div>
            <!-- Cell rows: one per string -->
            <div
              v-for="(row, rIdx) in displayRows"
              :key="row.label"
              class="compose-content__cells-row"
            >
              <input
                v-for="lc in document.columnsPerMeasure"
                :key="lc"
                :data-row="rIdx"
                :data-col="(line.startIdx + mLocalIdx) * document.columnsPerMeasure + lc - 1"
                class="compose-content__cell"
                :value="getCell(row.dataIndex, (line.startIdx + mLocalIdx) * document.columnsPerMeasure + lc - 1)"
                inputmode="numeric"
                maxlength="2"
                :aria-label="`String ${row.label}, measure ${line.startIdx + mLocalIdx + 1}, beat ${lc}`"
                @input="onCellInput(row.dataIndex, (line.startIdx + mLocalIdx) * document.columnsPerMeasure + lc - 1, $event)"
                @keydown="onCellKeydown($event, rIdx, (line.startIdx + mLocalIdx) * document.columnsPerMeasure + lc - 1)"
              >
            </div>
          </div>
          <!-- Measure separator -->
          <div class="compose-content__sep-col" aria-hidden="true">
            <div class="compose-content__row-spacer" />
            <div
              v-for="row in displayRows"
              :key="row.label"
              class="compose-content__sep-cell"
            >|</div>
          </div>
        </template>

        <!-- Append measure button: only on last line -->
        <div
          v-if="lineIdx === tabLines.length - 1"
          class="compose-content__add-col"
        >
          <button
            class="compose-content__add"
            aria-label="Add measure"
            title="Add measure"
            @click="addMeasure"
          >+</button>
        </div>
      </div>
    </div>

  </main>

  <div
    v-if="isPreviewModalOpen"
    class="compose-preview-modal"
    role="dialog"
    aria-modal="true"
    aria-label="Tablature text preview"
    @click.self="closePreviewModal"
  >
    <div class="compose-preview-modal__panel">
      <header class="compose-preview-modal__header">
        <h2 class="compose-preview-modal__title">Text preview</h2>
        <button
          class="compose-preview-modal__close"
          type="button"
          aria-label="Close preview"
          @click="closePreviewModal"
        >
          ×
        </button>
      </header>

      <pre class="compose-preview-modal__content">{{ asText }}</pre>

      <footer class="compose-preview-modal__footer">
        <button
          class="compose-toolbar__btn compose-toolbar__btn--primary"
          type="button"
          @click="copyPreviewText"
        >
          {{ previewCopyStatus }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, onMounted, onUnmounted } from 'vue'
import type { Instrument } from '@/types/chord'
import { useComposeTab } from '@/renderer/composables/useComposeTab'

type AppView = 'trainer' | 'compose'

const props = defineProps<{
  instrument: Instrument
  currentView?: AppView
}>()

const emit = defineEmits<{
  updateInstrument: [value: Instrument]
  switchView: [value: AppView]
}>()

const instrumentRef = toRef(props, 'instrument')
const {
  document,
  totalColumns,
  setTitle,
  setCell,
  getCell,
  addMeasure,
  removeMeasureAt,
  setMeasuresPerLine,
  setColumnsPerMeasure,
  newTablature,
  asText,
  copyToClipboard,
} = useComposeTab(instrumentRef)

const isPreviewModalOpen = ref(false)
const previewCopyStatus = ref('Copy text')

const displayRows = computed(() => {
  const labels = props.instrument === 'ukulele' ? ['A', 'E', 'C', 'G'] : ['e', 'B', 'G', 'D', 'A', 'E']

  return labels.map((label, displayIndex) => ({
    label,
    dataIndex: labels.length - 1 - displayIndex,
  }))
})

const tabLines = computed(() => {
  const mpl = document.value.measuresPerLine
  const lines: { startIdx: number; measures: (typeof document.value.measures)[number][] }[] = []
  for (let i = 0; i < document.value.measures.length; i += mpl) {
    lines.push({ startIdx: i, measures: document.value.measures.slice(i, i + mpl) })
  }
  return lines
})

const onTitleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  setTitle(target.value)
}

const onCellInput = (stringIndex: number, columnIndex: number, event: Event) => {
  const target = event.target as HTMLInputElement
  setCell(stringIndex, columnIndex, target.value)
}

const focusCell = (rowIndex: number, columnIndex: number) => {
  if (rowIndex < 0 || rowIndex >= displayRows.value.length) {
    return
  }

  if (columnIndex < 0 || columnIndex >= totalColumns.value) {
    return
  }

  const input = globalThis.document.querySelector<HTMLInputElement>(
    `.compose-content__cell[data-row="${rowIndex}"][data-col="${columnIndex}"]`
  )

  input?.focus()
  input?.select()
}

const onCellKeydown = (event: KeyboardEvent, rowIndex: number, columnIndex: number) => {
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    focusCell(rowIndex, columnIndex + 1)
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    focusCell(rowIndex, columnIndex - 1)
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    focusCell(rowIndex + 1, columnIndex)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    focusCell(rowIndex - 1, columnIndex)
  }
}

const handleNewTablature = () => {
  newTablature()
  previewCopyStatus.value = 'Copy text'
}

const openPreviewModal = () => {
  isPreviewModalOpen.value = true
}

const closePreviewModal = () => {
  isPreviewModalOpen.value = false
  previewCopyStatus.value = 'Copy text'
}

const copyPreviewText = async () => {
  const copied = await copyToClipboard()
  previewCopyStatus.value = copied ? 'Copied' : 'Copy failed'

  globalThis.setTimeout(() => {
    previewCopyStatus.value = 'Copy text'
  }, 1200)
}

const toggleInstrument = () => {
  emit('updateInstrument', props.instrument === 'guitar' ? 'ukulele' : 'guitar')
}

const isTextEntryTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || target.isContentEditable
}

const handleComposeShortcuts = (event: KeyboardEvent) => {
  // Keep typing flow natural in editable fields unless a modifier shortcut is used.
  if (!event.metaKey && !event.ctrlKey && isTextEntryTarget(event.target)) {
    return
  }

  const hasPrimaryModifier = event.metaKey || event.ctrlKey

  if (hasPrimaryModifier && event.key.toLowerCase() === 'n') {
    event.preventDefault()
    handleNewTablature()
    return
  }

  if (hasPrimaryModifier && event.key.toLowerCase() === 'p') {
    event.preventDefault()

    if (isPreviewModalOpen.value) {
      closePreviewModal()
    } else {
      openPreviewModal()
    }
    return
  }

  if (hasPrimaryModifier && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void copyPreviewText()
    return
  }

  if (hasPrimaryModifier && event.key.toLowerCase() === 'b') {
    event.preventDefault()
    emit('switchView', 'trainer')
    return
  }

  if (hasPrimaryModifier && event.key.toLowerCase() === 'i') {
    event.preventDefault()
    toggleInstrument()
    return
  }

  if (event.key === 'Escape' && isPreviewModalOpen.value) {
    event.preventDefault()
    closePreviewModal()
  }
}

onMounted(() => {
  globalThis.window.addEventListener('keydown', handleComposeShortcuts)
})

onUnmounted(() => {
  globalThis.window.removeEventListener('keydown', handleComposeShortcuts)
})
</script>

<style scoped>
/* ── Top bar — mirrors .toolbar in AutoCycleControls ── */
.compose-toolbar {
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
  gap: 0;
}

.compose-toolbar:hover {
  box-shadow: var(--glass-shadow-hover), var(--glass-inset-highlight);
  background: var(--glass-bg-hover);
}

.compose-toolbar__section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem;
}

.compose-toolbar__section:first-of-type {
  padding-left: 0;
}

.compose-toolbar__section + .compose-toolbar__section {
  border-left: 1px solid var(--glass-border);
}

.compose-toolbar__section--title {
  flex: 1;
  min-width: 0;
}

.compose-toolbar__section--end {
  margin-left: auto;
  padding-right: 0;
  border-left: none !important;
  gap: 0.6rem;
}

.compose-toolbar__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.compose-toolbar__title-input {
  height: 30px;
  flex: 1;
  min-width: 0;
  padding: 0 0.6rem;
  border-radius: var(--glass-radius-sm);
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.07);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.compose-toolbar__btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  height: 30px;
  padding: 0 0.7rem;
  border-radius: var(--glass-radius-sm);
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s;
}

.compose-toolbar__btn:hover:not(:disabled) {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.compose-toolbar__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.compose-toolbar__btn--primary {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.compose-toolbar__btn--stepper {
  width: 28px;
  padding: 0;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
}

.compose-toolbar__stepper-val {
  min-width: 18px;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
}

.compose-toolbar__view-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.06);
}

.compose-toolbar__view-switch-btn {
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text-primary);
  border-radius: 999px;
  padding: 0.22rem 0.6rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.compose-toolbar__view-switch-btn--active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

/* ── Main content area — mirrors .chord-display ── */
.compose-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: calc(100vh - 140px);
  margin-top: 72px;
  margin-bottom: 68px;
  padding: 0.75rem 2rem 1.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  gap: 1.5rem;
}

.compose-content__hint {
  color: var(--text-secondary);
  font-size: 0.82rem;
  text-align: center;
}

/* Grid: column-first layout for natural per-measure alignment */
.compose-content__lines {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: flex-start;
}

.compose-content__line {
  display: flex;
  align-items: flex-start;
  overflow-x: auto;
  max-width: calc(100vw - 4rem);
}

.compose-content__labels-col {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.compose-content__row-spacer {
  height: 28px;
  flex-shrink: 0;
}

.compose-content__label {
  height: 38px;
  width: 32px;
  display: flex;
  align-items: center;
  font-family: monospace;
  font-size: 1rem;
  color: var(--accent-primary);
  user-select: none;
}

.compose-content__measure-col {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.compose-content__measure-hd {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compose-content__del {
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted);
  border-radius: 4px;
  width: 20px;
  height: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.compose-content__del:hover:not(:disabled) {
  background: rgba(220, 80, 60, 0.18);
  color: #e05a50;
  border-color: rgba(220, 80, 60, 0.35);
}

.compose-content__del:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.compose-content__cells-row {
  height: 38px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.compose-content__sep-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 14px;
}

.compose-content__sep-cell {
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-family: monospace;
  user-select: none;
}

.compose-content__add-col {
  display: flex;
  align-items: flex-start;
  flex-shrink: 0;
  padding-left: 2px;
}

.compose-content__add {
  height: 28px;
  padding: 0 0.55rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-sm);
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.compose-content__add:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.compose-content__cells {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.compose-content__cell {
  width: 42px;
  height: 32px;
  text-align: center;
  font-size: 0.9rem;
  font-family: monospace;
  border-radius: 6px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.07);
  color: var(--text-primary);
  transition: border-color 0.15s, background 0.15s;
}

.compose-content__cell:focus {
  border-color: var(--accent-primary);
  background: rgba(212, 165, 116, 0.12);
  outline: none;
}

.compose-preview-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.52);
}

.compose-preview-modal__panel {
  width: min(900px, 100%);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border-radius: var(--glass-radius);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--glass-shadow), var(--glass-inset-highlight);
}

.compose-preview-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  border-bottom: 1px solid var(--glass-border);
}

.compose-preview-modal__title {
  margin: 0;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 700;
}

.compose-preview-modal__close {
  width: 28px;
  height: 28px;
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-sm);
  background: transparent;
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
}

.compose-preview-modal__content {
  margin: 0;
  padding: 1rem;
  overflow: auto;
  color: var(--text-primary);
  font-size: 0.85rem;
  line-height: 1.45;
}

.compose-preview-modal__footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.8rem 1rem;
  border-top: 1px solid var(--glass-border);
}

/* ── Responsive ── */
@media (max-width: 820px) {
  .compose-toolbar {
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .compose-toolbar__section {
    padding: 0.25rem 0.5rem;
  }

  .compose-toolbar__section + .compose-toolbar__section {
    border-left: none;
  }

  .compose-toolbar__section--end {
    width: 100%;
    justify-content: flex-end;
  }

  .compose-content {
    height: calc(100vh - 168px);
    margin-top: 96px;
    padding: 0.6rem 1rem 1rem;
  }
}
</style>
