<template>
  <div ref="root" class="tab-grid" :style="gridStyle" tabindex="0" role="grid"
    aria-label="Tablature grid. Arrow keys move, digits enter frets." :aria-activedescendant="activeCellId"
    data-tab-grid @keydown="onKeydown" @mousedown="onMouseDown" @mousemove="onMouseMove">
    <div v-for="(line, lineIndex) in lines" :key="lineIndex" class="tab-grid__line">
      <div class="tab-grid__labels" aria-hidden="true">
        <span v-for="label in displayLabels" :key="label.index" class="tab-grid__label"
          :class="{ 'tab-grid__label--active': label.index === editor.cursor.value.string }">{{ label.text }}</span>
      </div>

      <TabMeasureBlock v-for="measureIndex in line" :key="measureIndex"
        :measure="editor.document.value.measures[measureIndex]" :index="measureIndex"
        :start-column="editor.starts.value[measureIndex]" :string-count="stringCount" :beat-every="beatEvery"
        :cursor-string="cursorIn(measureIndex) ? editor.cursor.value.string : -1"
        :cursor-column="cursorIn(measureIndex) ? editor.cursor.value.column - editor.starts.value[measureIndex] : -1"
        :selection-from-string="selectionIn(measureIndex) ? editor.selection.value.fromString : -1"
        :selection-to-string="selectionIn(measureIndex) ? editor.selection.value.toString : -1"
        :selection-from-column="selectionIn(measureIndex) ? localStart(measureIndex) : -1"
        :selection-to-column="selectionIn(measureIndex) ? localEnd(measureIndex) : -1"
        :playing-column="playingIn(measureIndex)" @select="onSelectMeasure" @play="emit('playFrom', $event)" />

      <div class="tab-grid__end" aria-hidden="true" />

      <button v-if="lineIndex === lines.length - 1" class="tab-grid__add" type="button" tabindex="-1"
        title="Add a measure at the end" aria-label="Add a measure at the end" @mousedown.prevent.stop
        @click="editor.appendMeasure()">
        +
      </button>
    </div>

    <div class="sr-only" aria-live="polite">
      {{ announcement }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { TabTechnique } from '@/types/tablature'
import type { TabEditor } from '@/renderer/composables/useTabEditor'
import { measureColumns, parseCell, TAB_TECHNIQUE_LABELS } from '@/utils/tab/model'
import { columnsPerBeat } from '@/utils/tab/rhythm'
import { getStringLabels } from '@/utils/tab/tunings'
import { copyText } from '@/utils/tab/files'
import TabMeasureBlock from './TabMeasureBlock.vue'

const props = withDefaults(defineProps<{
  editor: TabEditor
  /** Global column being played, null when playback is stopped */
  playingColumn?: number | null
  /** Zoom in percent (50–200) */
  zoom?: number
}>(), {
  playingColumn: null,
  zoom: 100,
})

const emit = defineEmits<{
  playFrom: [measureIndex: number]
  status: [message: string]
}>()

const BASE_CELL_WIDTH = 26
const BASE_CELL_HEIGHT = 26
const LABEL_WIDTH = 30
const MEASURE_CHROME = 8
const LINE_CHROME = 48

const root = ref<HTMLElement | null>(null)
const { width: rootWidth } = useElementSize(root)

const scale = computed(() => Math.max(0.5, Math.min(2, props.zoom / 100)))
const cellWidth = computed(() => Math.round(BASE_CELL_WIDTH * scale.value))
const cellHeight = computed(() => Math.round(BASE_CELL_HEIGHT * scale.value))

const gridStyle = computed(() => ({
  '--tab-cell-w': `${cellWidth.value}px`,
  '--tab-cell-h': `${cellHeight.value}px`,
  '--tab-font-size': `${Math.max(9, Math.round(13 * scale.value))}px`,
}))

const stringCount = computed(() => props.editor.document.value.tuning.strings.length)

const displayLabels = computed(() => {
  const labels = getStringLabels(props.editor.document.value.tuning)
  return labels.map((text, index) => ({ text, index })).reverse()
})

/** Steps per quarter-note beat; beat marks are hidden when a step is longer than a beat. */
const beatEvery = computed(() => {
  const perBeat = columnsPerBeat(props.editor.document.value.quantization)
  return Number.isInteger(perBeat) && perBeat >= 1 ? perBeat : 0
})

/** Measures of each line, filled greedily to the available width. */
const lines = computed<number[][]>(() => {
  const available = Math.max(240, (rootWidth.value || 960) - LABEL_WIDTH - LINE_CHROME)
  const result: number[][] = []
  let current: number[] = []
  let used = 0

  props.editor.document.value.measures.forEach((measure, index) => {
    const width = measureColumns(measure) * cellWidth.value + MEASURE_CHROME
    if (current.length > 0 && used + width > available) {
      result.push(current)
      current = []
      used = 0
    }
    current.push(index)
    used += width
  })
  if (current.length > 0) result.push(current)
  return result
})

const starts = computed(() => props.editor.starts.value)

const cursorIn = (measureIndex: number): boolean => props.editor.cursorMeasure.value === measureIndex

const selectionIn = (measureIndex: number): boolean => {
  if (!props.editor.hasRangeSelection.value) return false
  const range = props.editor.selection.value
  return range.fromColumn < starts.value[measureIndex + 1] && range.toColumn >= starts.value[measureIndex]
}

const localStart = (measureIndex: number): number =>
  Math.max(0, props.editor.selection.value.fromColumn - starts.value[measureIndex])

const localEnd = (measureIndex: number): number =>
  Math.min(starts.value[measureIndex + 1], props.editor.selection.value.toColumn + 1) - starts.value[measureIndex] - 1

const playingIn = (measureIndex: number): number => {
  const column = props.playingColumn
  if (column === null || column < starts.value[measureIndex] || column >= starts.value[measureIndex + 1]) return -1
  return column - starts.value[measureIndex]
}

const activeCellId = computed(() => `tab-cell-${props.editor.cursor.value.string}-${props.editor.cursor.value.column}`)

const announcement = computed(() => {
  const { string, column } = props.editor.cursor.value
  const measureIndex = props.editor.cursorMeasure.value
  const label = getStringLabels(props.editor.document.value.tuning)[string] ?? ''
  const parsed = parseCell(props.editor.getCell(string, column))
  const content = !parsed
    ? 'empty'
    : parsed.fret === null
      ? 'muted note'
      : `fret ${parsed.fret}${parsed.technique ? `, ${TAB_TECHNIQUE_LABELS[parsed.technique].toLowerCase()}` : ''}`
  return `String ${label}, measure ${measureIndex + 1}, step ${column - starts.value[measureIndex] + 1}: ${content}`
})

// ── Keyboard ──────────────────────────────────────────────────────────────

const TECHNIQUE_KEYS: Record<string, TabTechnique> = {
  h: 'h', H: 'h', p: 'p', P: 'p', b: 'b', B: 'b', r: 'r', R: 'r',
  '/': '/', s: '/', '\\': '\\', S: '\\', '~': '~', v: '~', V: '~',
}

const digitFromEvent = (event: KeyboardEvent): number | null => {
  if (/^\d$/.test(event.key)) return Number(event.key)
  // Top-row digits need Shift on AZERTY keyboards: read the physical key instead.
  const match = /^(?:Digit|Numpad)(\d)$/.exec(event.code ?? '')
  return match ? Number(match[1]) : null
}

const applyTechnique = (technique: TabTechnique): void => {
  if (!props.editor.applyTechnique(technique)) emit('status', 'Select a note first')
}

const handleModifierKey = (event: KeyboardEvent): boolean => {
  const editor = props.editor
  const shift = event.shiftKey

  switch (event.key.toLowerCase()) {
    case 'z': if (shift) editor.redo(); else editor.undo(); return true
    case 'y': editor.redo(); return true
    case 'c': void copyText(editor.copy()); emit('status', 'Copied'); return true
    case 'x': void copyText(editor.cut()); emit('status', 'Cut'); return true
    case 'v':
      if (!editor.paste()) emit('status', 'Nothing to paste')
      return true
    case 'a': editor.selectAll(); return true
    case 'd': editor.duplicateMeasures(); emit('status', 'Measure duplicated'); return true
    case 'arrowleft': editor.moveToMeasure(-1, shift); return true
    case 'arrowright': editor.moveToMeasure(1, shift); return true
    case 'home': editor.moveToDocumentEdge('start', shift); return true
    case 'end': editor.moveToDocumentEdge('end', shift); return true
    case 'enter': editor.insertMeasure(shift ? 'before' : 'after'); return true
    case 'backspace':
    case 'delete': editor.deleteMeasures(); return true
    default: return false
  }
}

const handleAltKey = (event: KeyboardEvent): boolean => {
  if (event.key === 'ArrowRight') {
    if (!props.editor.insertColumn()) emit('status', 'This measure cannot get longer')
    return true
  }
  if (event.key === 'ArrowLeft') {
    if (!props.editor.deleteColumn()) emit('status', 'A measure needs at least one step')
    return true
  }
  return false
}

const handlePlainKey = (event: KeyboardEvent): boolean => {
  const editor = props.editor
  const shift = event.shiftKey

  switch (event.key) {
    case 'ArrowLeft': editor.moveCursor(0, -1, shift); return true
    case 'ArrowRight': editor.moveCursor(0, 1, shift); return true
    // The highest string is drawn on top: moving up means a higher string index.
    case 'ArrowUp': editor.moveCursor(1, 0, shift); return true
    case 'ArrowDown': editor.moveCursor(-1, 0, shift); return true
    case 'Home': editor.moveToMeasureEdge('start', shift); return true
    case 'End': editor.moveToMeasureEdge('end', shift); return true
    case 'Enter': editor.moveCursor(0, shift ? -1 : 1); return true
    case 'Delete': editor.clearSelection(); return true
    case 'Backspace': {
      const single = !editor.hasRangeSelection.value
      editor.clearSelection()
      if (single) editor.moveCursor(0, -1)
      return true
    }
    case 'Escape':
      if (!editor.hasRangeSelection.value) return false
      editor.setCursor(editor.cursor.value.string, editor.cursor.value.column)
      return true
    case 'x':
    case 'X': editor.typeDead(); return true
  }

  const technique = TECHNIQUE_KEYS[event.key]
  if (technique) {
    applyTechnique(technique)
    return true
  }

  const digit = digitFromEvent(event)
  if (digit !== null) {
    editor.typeDigit(digit)
    return true
  }
  return false
}

const onKeydown = (event: KeyboardEvent): void => {
  if (event.isComposing) return
  const handled = event.metaKey || event.ctrlKey
    ? !event.altKey && handleModifierKey(event)
    : event.altKey
      ? handleAltKey(event)
      : handlePlainKey(event)

  if (handled) {
    event.preventDefault()
  }
}

// ── Mouse ─────────────────────────────────────────────────────────────────

let dragging = false

const cellFromEvent = (event: MouseEvent): { string: number; column: number } | null => {
  const element = (event.target as HTMLElement | null)?.closest?.<HTMLElement>('[data-c]')
  if (!element) return null
  return { string: Number(element.dataset.s), column: Number(element.dataset.c) }
}

const onMouseDown = (event: MouseEvent): void => {
  if (event.button !== 0) return
  root.value?.focus({ preventScroll: true })
  const cell = cellFromEvent(event)
  if (!cell) return
  event.preventDefault()
  props.editor.setCursor(cell.string, cell.column, event.shiftKey)
  dragging = true
}

const onMouseMove = (event: MouseEvent): void => {
  if (!dragging) return
  if ((event.buttons & 1) === 0) {
    dragging = false
    return
  }
  const cell = cellFromEvent(event)
  const cursor = props.editor.cursor.value
  if (cell && (cell.string !== cursor.string || cell.column !== cursor.column)) {
    props.editor.setCursor(cell.string, cell.column, true)
  }
}

const stopDragging = (): void => {
  dragging = false
}

const onSelectMeasure = (measureIndex: number, extend: boolean): void => {
  root.value?.focus({ preventScroll: true })
  props.editor.selectMeasures(extend ? props.editor.cursorMeasure.value : measureIndex, measureIndex)
}

// ── Scrolling ─────────────────────────────────────────────────────────────

const scrollTo = (selector: string): void => {
  const element = root.value?.querySelector<HTMLElement>(selector)
  element?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
}

watch(() => props.editor.cursor.value, async () => {
  await nextTick()
  scrollTo(`#${activeCellId.value}`)
})

const playingMeasure = computed(() => {
  const column = props.playingColumn
  if (column === null) return -1
  let index = props.editor.cursorMeasure.value
  if (column < starts.value[index] || column >= starts.value[index + 1]) {
    index = starts.value.findIndex((start, i) => column >= start && column < (starts.value[i + 1] ?? -1))
  }
  return index
})

watch(playingMeasure, (index) => {
  if (index >= 0) scrollTo(`[data-measure="${index}"]`)
})

onMounted(() => globalThis.window.addEventListener('mouseup', stopDragging))
onUnmounted(() => globalThis.window.removeEventListener('mouseup', stopDragging))

defineExpose({
  focus: () => root.value?.focus({ preventScroll: true }),
})
</script>

<style scoped>
.tab-grid {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  width: 100%;
  padding: 0.25rem 0.25rem 1rem;
  border-radius: var(--glass-radius-sm);
}

.tab-grid:focus-visible {
  outline: none;
}

.tab-grid__line {
  display: flex;
  align-items: flex-start;
}

.tab-grid__labels {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 30px;
  padding-top: 30px;
}

.tab-grid__label {
  height: var(--tab-cell-h);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--tab-font-size);
  font-weight: 700;
  color: var(--muted);
  user-select: none;
}

.tab-grid__label--active {
  color: var(--accent-primary);
}

.tab-grid__end {
  flex-shrink: 0;
  width: 2px;
  margin-top: 30px;
  height: calc(var(--tab-cell-h) * v-bind(stringCount));
  background: var(--tab-bar);
}

.tab-grid__add {
  flex-shrink: 0;
  margin: 30px 0 0 8px;
  width: 26px;
  height: calc(var(--tab-cell-h) * v-bind(stringCount));
  border: 1px dashed var(--glass-border-strong);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.tab-grid__add:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

/* The grid shows its own cursor: dim it when keyboard focus is elsewhere. */
.tab-grid:not(:focus) :deep(.tab-cell--cursor) {
  box-shadow: inset 0 0 0 2px var(--muted);
}
</style>
