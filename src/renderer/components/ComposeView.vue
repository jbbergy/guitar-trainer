<template>
  <section class="compose" aria-label="Tablature workspace" @dragover.prevent @drop.prevent="onDropFiles">
    <nav class="compose-toolbar" role="region" aria-label="Compose toolbar">
      <div class="compose-toolbar__section">
        <button class="tab-btn" type="button" title="Tablature library (⌘/Ctrl + O)" data-testid="open-library"
          @click="showLibrary = true">
          📚 Library
        </button>
        <button class="tab-btn tab-btn--icon" type="button" title="New tablature (⌘/Ctrl + N)" aria-label="New tablature"
          data-testid="new-tab" @click="createTab()">
          ＋
        </button>
      </div>

      <div class="compose-toolbar__section compose-toolbar__section--title">
        <input id="compose-title" class="tab-input compose-toolbar__title" :value="doc.title" maxlength="120"
          placeholder="Untitled tablature" aria-label="Tablature title" @input="onTitleInput">
        <button class="tab-btn compose-toolbar__tuning" type="button" title="Tuning, capo and other settings"
          data-testid="open-settings" @click="showSettings = true">
          {{ tuningLabel }}
        </button>
      </div>

      <div class="compose-toolbar__section">
        <button class="tab-btn tab-btn--icon" type="button" title="Undo (⌘/Ctrl + Z)" aria-label="Undo"
          :disabled="!editor.canUndo.value" data-testid="undo" @click="editor.undo()">
          ↶
        </button>
        <button class="tab-btn tab-btn--icon" type="button" title="Redo (⌘/Ctrl + Shift + Z)" aria-label="Redo"
          :disabled="!editor.canRedo.value" data-testid="redo" @click="editor.redo()">
          ↷
        </button>
      </div>

      <div class="compose-toolbar__section">
        <label class="tab-label" for="compose-bpm">BPM</label>
        <input id="compose-bpm" class="tab-input tab-input--number" type="number" min="20" max="300" :value="doc.bpm"
          aria-label="Tempo in BPM" @change="onBpmChange">

        <label class="tab-label" for="compose-quant">Step</label>
        <select id="compose-quant" class="tab-select" :value="doc.quantization" aria-label="Note value of one step"
          @change="onQuantizationChange">
          <option v-for="value in TAB_QUANTIZATIONS" :key="value" :value="value">
            {{ TAB_QUANTIZATION_LABELS[value] }}
          </option>
        </select>

        <button class="tab-btn tab-btn--icon compose-toolbar__play" :class="{ 'compose-toolbar__play--on': isPlaying }"
          type="button" :aria-label="isPlaying ? 'Stop playback' : 'Play from the cursor'"
          :title="isPlaying ? 'Stop (Space)' : 'Play from the cursor (Space) · from the start (Shift + Space)'"
          data-testid="play" @click="togglePlay(false)">
          {{ isPlaying ? '■' : '▶' }}
        </button>
        <button class="tab-btn tab-btn--icon" :class="{ 'tab-btn--active': loopEnabled }" type="button"
          :aria-pressed="loopEnabled" aria-label="Loop playback" title="Loop the selection or the whole tablature"
          @click="loopEnabled = !loopEnabled">
          ⟲
        </button>
      </div>

      <div class="compose-toolbar__section">
        <button class="tab-btn" type="button" title="Import tablatures (⌘/Ctrl + I)" data-testid="open-import"
          @click="showImport = true">
          ⇩ Import
        </button>
        <button class="tab-btn" type="button" title="Rewrite for another instrument or tuning" data-testid="open-convert"
          @click="openConvert()">
          ⇄ Convert
        </button>
        <button class="tab-btn" type="button" title="Export this tablature (⌘/Ctrl + E)" data-testid="open-export"
          @click="openExport()">
          ⇧ Export
        </button>
      </div>

      <div class="compose-toolbar__section compose-toolbar__section--end">
        <div class="compose-toolbar__view-switch" role="group" aria-label="Main view">
          <button class="compose-toolbar__view-switch-btn"
            :class="{ 'compose-toolbar__view-switch-btn--active': currentView === 'trainer' }"
            :aria-pressed="currentView === 'trainer'" @click="emit('switchView', 'trainer')">
            Trainer
          </button>
          <button class="compose-toolbar__view-switch-btn"
            :class="{ 'compose-toolbar__view-switch-btn--active': currentView === 'compose' }"
            :aria-pressed="currentView === 'compose'" @click="emit('switchView', 'compose')">
            Compose
          </button>
        </div>
      </div>
    </nav>

    <main class="compose-content" role="region" aria-label="Tablature editor">
      <TabEditToolbar class="compose-content__tools" :editor="editor" :status="status"
        :save-failed="library.lastSaveFailed.value" @status="flash" />

      <div class="compose-content__scroll">
        <TabEditorGrid ref="grid" :editor="editor" :playing-column="playingColumn" :zoom="zoomLevel"
          @play-from="playFromMeasure" @status="flash" />
        <p class="compose-content__hint">
          Arrows move · 0–9 frets · X muted · H P S B R V techniques · Shift + arrows select · ⌘/Ctrl + C/X/V/Z ·
          press <kbd>?</kbd> for every shortcut
        </p>
      </div>
    </main>

    <TabLibraryDialog v-model="showLibrary" :entries="library.entries.value" :current-id="doc.id"
      :default-tuning-id="defaultTuningId" @open="onOpenFromLibrary" @create="onCreateFromLibrary"
      @duplicate="duplicateTab" @delete="deleteTab" @convert="openConvert" @export="openExport"
      @import="showImport = true" @backup="backupLibrary" />
    <TabImportDialog ref="importDialog" v-model="showImport" :preferred-family="preferredFamily" @imported="onImported" />
    <TabExportDialog v-model="showExport" :document="dialogDocument" />
    <TabConvertDialog v-model="showConvert" :document="dialogDocument" @converted="onConverted" />
    <TabSettingsDialog v-model="showSettings" :editor="editor" @convert="openConvertFromSettings" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import type { Instrument } from '@/types/chord'
import {
  TAB_QUANTIZATIONS,
  TAB_QUANTIZATION_LABELS,
  type Quantization,
  type TabInstrumentFamily,
  type TablatureDocument,
} from '@/types/tablature'
import { useTabEditor } from '@/renderer/composables/useTabEditor'
import { useTabLibrary } from '@/renderer/composables/useTabLibrary'
import { useTablaturePlayback } from '@/renderer/composables/useTablaturePlayback'
import { printTablature, saveFile } from '@/utils/tab/files'
import { exportLibraryBackup } from '@/utils/tab/formats'
import { createEmptyTablature } from '@/utils/tab/model'
import { getTuningById, getTuningForInstrument } from '@/utils/tab/tunings'
import TabConvertDialog from './TabConvertDialog.vue'
import TabEditToolbar from './TabEditToolbar.vue'
import TabEditorGrid from './TabEditorGrid.vue'
import TabExportDialog from './TabExportDialog.vue'
import TabImportDialog from './TabImportDialog.vue'
import TabLibraryDialog from './TabLibraryDialog.vue'
import TabSettingsDialog from './TabSettingsDialog.vue'

type AppView = 'trainer' | 'compose'

const props = withDefaults(defineProps<{
  /** App-wide instrument: decides the instrument of new tablatures */
  instrument: Instrument
  currentView?: AppView
  zoomLevel?: number
}>(), {
  currentView: 'compose',
  zoomLevel: 100,
})

const emit = defineEmits<{
  switchView: [value: AppView]
}>()

const library = useTabLibrary()

const preferredFamily = computed<TabInstrumentFamily>(() => (props.instrument === 'ukulele' ? 'ukulele' : 'guitar'))
const defaultTuningId = computed(() => getTuningForInstrument(props.instrument).id)

/** Last opened tablature, else the most recent one, else a new empty tablature. */
const loadInitialDocument = (): TablatureDocument => {
  const currentId = library.getCurrentId()
  const candidates = [currentId, library.entries.value[0]?.id].filter((id): id is string => Boolean(id))
  for (const id of candidates) {
    const stored = library.load(id)
    if (stored) return stored
  }
  const fresh = createEmptyTablature(getTuningForInstrument(props.instrument))
  return library.save(fresh) ?? fresh
}

// Every change is saved straight away: there is no "save" step to forget.
const editor = useTabEditor(loadInitialDocument(), (changed) => {
  library.save(changed)
})
library.setCurrentId(editor.document.value.id)

const doc = computed(() => editor.document.value)
const tuningLabel = computed(() => `${doc.value.tuning.name}${doc.value.capo > 0 ? ` · Capo ${doc.value.capo}` : ''}`)

const { isPlaying, playingColumn, play, stop } = useTablaturePlayback()
const loopEnabled = ref(false)

const grid = ref<InstanceType<typeof TabEditorGrid> | null>(null)
const importDialog = ref<InstanceType<typeof TabImportDialog> | null>(null)

const showLibrary = ref(false)
const showImport = ref(false)
const showExport = ref(false)
const showConvert = ref(false)
const showSettings = ref(false)
/** Tablature the export / convert dialogs work on (the open one, or one picked in the library). */
const dialogDocument = shallowRef<TablatureDocument | null>(null)

const anyDialogOpen = computed(
  () => showLibrary.value || showImport.value || showExport.value || showConvert.value || showSettings.value
)

const status = ref('')
let statusTimer: ReturnType<typeof setTimeout> | null = null

const flash = (message: string): void => {
  status.value = message
  if (statusTimer !== null) globalThis.clearTimeout(statusTimer)
  statusTimer = globalThis.setTimeout(() => {
    status.value = ''
  }, 2600)
}

const focusGrid = async (): Promise<void> => {
  await nextTick()
  grid.value?.focus()
}

// ── Library actions ─────────────────────────────────────────────────────────

const openTab = (id: string): boolean => {
  const stored = library.load(id)
  if (!stored) {
    library.refresh()
    flash('This tablature could not be opened')
    return false
  }
  stop()
  editor.load(stored)
  library.setCurrentId(id)
  return true
}

const createTab = (tuningId?: string): void => {
  const tuning = (tuningId ? getTuningById(tuningId) : null) ?? getTuningForInstrument(props.instrument)
  const fresh = createEmptyTablature(tuning)
  const saved = library.save(fresh) ?? fresh
  stop()
  editor.load(saved)
  library.setCurrentId(saved.id)
  flash(`New tablature · ${tuning.name}`)
  void focusGrid()
}

const onOpenFromLibrary = (id: string): void => {
  if (openTab(id)) {
    showLibrary.value = false
    void focusGrid()
  }
}

const onCreateFromLibrary = (tuningId: string): void => {
  showLibrary.value = false
  createTab(tuningId)
}

const duplicateTab = (id: string): void => {
  const copy = library.duplicate(id)
  flash(copy ? `“${copy.title}” added to the library` : 'The copy could not be saved')
}

const deleteTab = (id: string): void => {
  const wasOpen = id === doc.value.id
  library.remove(id)
  if (!wasOpen) return
  const next = library.entries.value[0]
  if (!next || !openTab(next.id)) createTab()
}

const backupLibrary = (): void => {
  saveFile(exportLibraryBackup(library.loadAll()))
}

const documentFor = (id?: string): TablatureDocument | null =>
  !id || id === doc.value.id ? doc.value : library.load(id)

const openExport = (id?: string): void => {
  dialogDocument.value = documentFor(id)
  showExport.value = dialogDocument.value !== null
}

const openConvert = (id?: string): void => {
  dialogDocument.value = documentFor(id)
  showConvert.value = dialogDocument.value !== null
}

const openConvertFromSettings = (): void => {
  showSettings.value = false
  openConvert()
}

const onImported = (documents: TablatureDocument[], open: boolean): void => {
  const saved = documents.map((document) => library.save(document)).filter((item): item is TablatureDocument => item !== null)
  if (saved.length < documents.length) {
    flash('Some tablatures could not be saved: the storage is full')
  } else {
    flash(`${saved.length} ${saved.length === 1 ? 'tablature' : 'tablatures'} added to the library`)
  }
  if (open && saved[0] && openTab(saved[0].id)) {
    showLibrary.value = false
    void focusGrid()
  }
}

const onConverted = (converted: TablatureDocument): void => {
  const saved = library.save(converted)
  if (!saved) {
    flash('The converted tablature could not be saved')
    return
  }
  showLibrary.value = false
  if (openTab(saved.id)) {
    flash(`Converted to ${saved.tuning.name}`)
    void focusGrid()
  }
}

const onDropFiles = async (event: DragEvent): Promise<void> => {
  const files = Array.from(event.dataTransfer?.files ?? [])
  if (files.length === 0 || showImport.value) return
  showImport.value = true
  await nextTick()
  await importDialog.value?.loadFiles(files)
}

// ── Toolbar ─────────────────────────────────────────────────────────────────

const onTitleInput = (event: Event): void => {
  editor.setTitle((event.target as HTMLInputElement).value)
}

const onBpmChange = (event: Event): void => {
  const input = event.target as HTMLInputElement
  editor.setBpm(Number(input.value))
  input.value = String(doc.value.bpm)
}

const onQuantizationChange = (event: Event): void => {
  editor.setQuantization(Number((event.target as HTMLSelectElement).value) as Quantization)
}

// ── Playback ────────────────────────────────────────────────────────────────

/** Plays the selected measures when several steps are selected, else from the cursor to the end. */
const startPlayback = (fromStart: boolean): void => {
  const starts = editor.starts.value
  if (editor.hasRangeSelection.value && !fromStart) {
    const { from, to } = editor.selectedMeasures.value
    play(doc.value, { startColumn: starts[from], endColumn: starts[to + 1], loop: loopEnabled.value })
    return
  }
  const startColumn = fromStart ? 0 : starts[editor.cursorMeasure.value]
  play(doc.value, { startColumn, loop: loopEnabled.value })
}

const togglePlay = (fromStart: boolean): void => {
  if (isPlaying.value) stop()
  else startPlayback(fromStart)
}

const playFromMeasure = (measureIndex: number): void => {
  play(doc.value, { startColumn: editor.starts.value[measureIndex], loop: loopEnabled.value })
}

// ── Keyboard shortcuts ──────────────────────────────────────────────────────

const isTextEntryTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}

const isButtonTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && ['button', 'a', 'summary'].includes(target.tagName.toLowerCase())

const handleComposeShortcuts = (event: KeyboardEvent): void => {
  // The grid and the dialogs handle their own keys first.
  if (event.defaultPrevented || anyDialogOpen.value) return

  const hasPrimaryModifier = event.metaKey || event.ctrlKey
  if (!hasPrimaryModifier && isTextEntryTarget(event.target)) return

  if (!hasPrimaryModifier) {
    if (event.key === ' ' && !isButtonTarget(event.target)) {
      event.preventDefault()
      togglePlay(event.shiftKey)
    }
    return
  }

  const actions: Record<string, () => void> = {
    n: () => createTab(),
    o: () => { showLibrary.value = true },
    i: () => { showImport.value = true },
    e: () => openExport(),
    p: () => printTablature(doc.value),
    s: () => flash('Saved — every change is stored automatically'),
    b: () => emit('switchView', 'trainer'),
  }
  const key = event.key.toLowerCase()

  // Undo / redo also work when the focus is on a toolbar button rather than in the grid.
  if ((key === 'z' || key === 'y') && !isTextEntryTarget(event.target)) {
    event.preventDefault()
    if (key === 'y' || event.shiftKey) editor.redo()
    else editor.undo()
    return
  }

  if (!event.altKey && !event.shiftKey && actions[key]) {
    event.preventDefault()
    actions[key]()
  }
}

onMounted(() => {
  globalThis.window.addEventListener('keydown', handleComposeShortcuts)
})

onUnmounted(() => {
  globalThis.window.removeEventListener('keydown', handleComposeShortcuts)
  if (statusTimer !== null) globalThis.clearTimeout(statusTimer)
})
</script>

<style scoped>
/* The workspace fills the window between its edges and the bottom status bar. */
.compose {
  position: fixed;
  top: 12px;
  left: 16px;
  right: 16px;
  bottom: 80px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Top bar — mirrors .toolbar in AutoCycleControls ── */
.compose-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 0.4rem;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), var(--glass-inset-highlight);
  border-radius: var(--glass-radius);
  padding: 0.5rem 1rem;
  z-index: 100;
}

.compose-toolbar__section {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.75rem;
}

.compose-toolbar__section:first-of-type {
  padding-left: 0;
}

.compose-toolbar__section + .compose-toolbar__section {
  border-left: 1px solid var(--glass-border);
}

.compose-toolbar__section--title {
  flex: 1 1 260px;
  min-width: 0;
}

.compose-toolbar__section--end {
  margin-left: auto;
  padding-right: 0;
}

.compose-toolbar__title {
  flex: 1;
  min-width: 80px;
  font-weight: 600;
}

.compose-toolbar__tuning {
  flex-shrink: 1;
  min-width: 0;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  color: var(--accent-primary);
}

.compose-toolbar__play {
  width: 36px;
}

.compose-toolbar__play--on {
  border-color: var(--tab-danger);
  color: var(--tab-danger);
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
  color: #1a1a1a;
}

/* ── Editor area ── */
.compose-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.6rem 0.9rem 0;
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  background: var(--glass-bg);
}

.compose-content__tools {
  flex-shrink: 0;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid var(--glass-border);
}

.compose-content__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-bottom: 0.75rem;
}

.compose-content__hint {
  margin-top: 0.5rem;
  color: var(--muted);
  font-size: 0.76rem;
  text-align: center;
}

.compose-content__hint kbd {
  padding: 0 0.3rem;
  border: 1px solid var(--glass-border-strong);
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--accent-primary);
}

@media (max-width: 1100px) {
  .compose-toolbar__section + .compose-toolbar__section {
    border-left: none;
  }

  .compose-toolbar__section {
    padding: 0 0.4rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .compose-toolbar {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
