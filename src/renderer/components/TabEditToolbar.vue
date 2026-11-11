<template>
  <div class="tab-tools" role="toolbar" aria-label="Editing tools">
    <div class="tab-tools__group" role="group" aria-label="Techniques">
      <button v-for="tool in TECHNIQUE_TOOLS" :key="tool.technique" class="tab-btn tab-btn--mono" type="button"
        :class="{ 'tab-btn--active': activeTechnique === tool.technique }" :title="`${tool.label} (${tool.keys})`"
        :aria-label="tool.label" :aria-pressed="activeTechnique === tool.technique" @mousedown.prevent
        @click="applyTechnique(tool.technique)">
        {{ tool.technique }}
      </button>
      <button class="tab-btn tab-btn--mono" type="button" title="Muted note (X)" aria-label="Muted note" @mousedown.prevent
        @click="editor.typeDead()">
        x
      </button>
      <button class="tab-btn tab-btn--icon" type="button" title="Clear the selection (Delete)" aria-label="Clear the selection"
        @mousedown.prevent @click="editor.clearSelection()">
        ⌫
      </button>
    </div>

    <div class="tab-tools__group" role="group" aria-label="Steps">
      <button class="tab-btn" type="button" title="Insert a step before the cursor (Alt + →)" @mousedown.prevent
        @click="insertColumn">
        + Step
      </button>
      <button class="tab-btn" type="button" title="Remove the step under the cursor (Alt + ←)" @mousedown.prevent
        @click="deleteColumn">
        − Step
      </button>
    </div>

    <div class="tab-tools__group" role="group" aria-label="Measures">
      <button class="tab-btn" type="button" title="Insert a measure after the cursor (⌘/Ctrl + Enter)" @mousedown.prevent
        @click="editor.insertMeasure('after')">
        + Measure
      </button>
      <button class="tab-btn" type="button" title="Duplicate the selected measures (⌘/Ctrl + D)" @mousedown.prevent
        @click="editor.duplicateMeasures()">
        Duplicate
      </button>
      <button class="tab-btn tab-btn--danger" type="button" title="Delete the selected measures (⌘/Ctrl + Backspace)"
        @mousedown.prevent @click="editor.deleteMeasures()">
        Delete
      </button>
    </div>

    <div v-if="chords.length > 0" class="tab-tools__group">
      <select class="tab-select" aria-label="Insert a chord at the cursor" title="Insert a chord at the cursor"
        data-testid="chord-select" @change="insertChord">
        <option value="">
          Chord…
        </option>
        <option v-for="chord in chords" :key="chord.name" :value="chord.name">
          {{ chord.name }}
        </option>
      </select>
    </div>

    <p class="tab-tools__status" role="status" aria-live="polite" data-testid="compose-status">
      <span v-if="saveFailed" class="tab-error">Not saved: the storage of this device is full.</span>
      <span v-else>{{ status || position }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TabTechnique } from '@/types/tablature'
import type { TabEditor } from '@/renderer/composables/useTabEditor'
import { chordShapesForTuning } from '@/utils/tab/chords'
import { parseCell, TAB_TECHNIQUE_LABELS } from '@/utils/tab/model'
import { getStringLabels } from '@/utils/tab/tunings'

const TECHNIQUE_KEYS: Record<TabTechnique, string> = {
  h: 'H', p: 'P', '/': 'S or /', '\\': 'Shift + S or \\', b: 'B', r: 'R', '~': 'V or ~',
}

const TECHNIQUE_TOOLS = (Object.keys(TECHNIQUE_KEYS) as TabTechnique[]).map((technique) => ({
  technique,
  label: TAB_TECHNIQUE_LABELS[technique],
  keys: TECHNIQUE_KEYS[technique],
}))

const props = withDefaults(defineProps<{
  editor: TabEditor
  /** Transient message shown instead of the cursor position */
  status?: string
  saveFailed?: boolean
}>(), {
  status: '',
  saveFailed: false,
})

const emit = defineEmits<{
  status: [message: string]
}>()

const chords = computed(() => chordShapesForTuning(props.editor.document.value.tuning))

const activeTechnique = computed(() => {
  const { string, column } = props.editor.cursor.value
  return parseCell(props.editor.getCell(string, column))?.technique ?? ''
})

const position = computed(() => {
  const { string, column } = props.editor.cursor.value
  const measure = props.editor.cursorMeasure.value
  const label = getStringLabels(props.editor.document.value.tuning)[string] ?? ''
  const step = column - props.editor.starts.value[measure] + 1
  return `Measure ${measure + 1} of ${props.editor.document.value.measures.length} · step ${step} · string ${label}`
})

const applyTechnique = (technique: TabTechnique): void => {
  if (!props.editor.applyTechnique(technique)) emit('status', 'Put the cursor on a note first')
}

const insertColumn = (): void => {
  if (!props.editor.insertColumn()) emit('status', 'This measure cannot get longer')
}

const deleteColumn = (): void => {
  if (!props.editor.deleteColumn()) emit('status', 'A measure needs at least one step')
}

const insertChord = (event: Event): void => {
  const select = event.target as HTMLSelectElement
  const chord = chords.value.find((candidate) => candidate.name === select.value)
  select.value = ''
  if (chord && props.editor.insertChord(chord.frets)) emit('status', `${chord.name} inserted`)
}
</script>

<style scoped>
.tab-tools {
  display: flex;
  align-items: center;
  gap: 0.4rem 0.9rem;
  flex-wrap: wrap;
}

.tab-tools__group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.tab-tools__status {
  margin-left: auto;
  font-size: 0.78rem;
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>
