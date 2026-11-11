<template>
  <div class="tab-measure" role="rowgroup" :aria-label="`Measure ${index + 1}`" :data-measure="index">
    <div class="tab-measure__head">
      <button class="tab-measure__number" type="button" tabindex="-1" :title="`Select measure ${index + 1}`"
        :aria-label="`Select measure ${index + 1}`" @mousedown.prevent.stop @click="emit('select', index, $event.shiftKey)">
        {{ index + 1 }}
      </button>
      <button class="tab-measure__play" type="button" tabindex="-1" :title="`Play from measure ${index + 1}`"
        :aria-label="`Play from measure ${index + 1}`" @mousedown.prevent.stop @click="emit('play', index)">
        ▶
      </button>
    </div>

    <div class="tab-measure__ruler" aria-hidden="true">
      <span v-for="column in columns" :key="column" class="tab-measure__tick" :class="{
        'tab-measure__tick--beat': isBeat(column - 1),
        'tab-measure__tick--playing': playingColumn === column - 1,
      }" />
    </div>

    <div class="tab-measure__rows">
      <!-- Highest string on the first line, as on paper -->
      <div v-for="line in stringCount" :key="line" class="tab-measure__row" role="row">
        <div v-for="(cell, column) in measure.rows[stringCount - line]" :id="`tab-cell-${stringCount - line}-${startColumn + column}`"
          :key="column" class="tab-cell" :class="cellClass(stringCount - line, column)" role="gridcell"
          :data-s="stringCount - line" :data-c="startColumn + column">
          <span v-if="cell" class="tab-cell__text">{{ cell }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TabMeasure } from '@/types/tablature'

const props = withDefaults(defineProps<{
  measure: TabMeasure
  index: number
  /** Global column of the first step of the measure */
  startColumn: number
  stringCount: number
  /** Number of steps in a beat; 0 hides the beat marks */
  beatEvery?: number
  /** Cursor position inside the measure, -1 when the cursor is elsewhere */
  cursorString?: number
  cursorColumn?: number
  /** Selected block inside the measure (local columns), -1 when nothing is selected here */
  selectionFromString?: number
  selectionToString?: number
  selectionFromColumn?: number
  selectionToColumn?: number
  /** Step being played inside the measure, -1 when playback is elsewhere */
  playingColumn?: number
}>(), {
  beatEvery: 0,
  cursorString: -1,
  cursorColumn: -1,
  selectionFromString: -1,
  selectionToString: -1,
  selectionFromColumn: -1,
  selectionToColumn: -1,
  playingColumn: -1,
})

const emit = defineEmits<{
  select: [index: number, extend: boolean]
  play: [index: number]
}>()

const columns = computed(() => props.measure.rows[0]?.length ?? 0)

const isBeat = (column: number): boolean => props.beatEvery >= 1 && column % props.beatEvery === 0

const cellClass = (string: number, column: number) => ({
  'tab-cell--beat': isBeat(column),
  'tab-cell--playing': props.playingColumn === column,
  'tab-cell--selected':
    props.selectionFromColumn >= 0 &&
    column >= props.selectionFromColumn && column <= props.selectionToColumn &&
    string >= props.selectionFromString && string <= props.selectionToString,
  'tab-cell--cursor': props.cursorColumn === column && props.cursorString === string,
})
</script>

<style scoped>
.tab-measure {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.tab-measure__head {
  height: 22px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding-left: 4px;
}

.tab-measure__number,
.tab-measure__play {
  height: 18px;
  min-width: 18px;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.tab-measure__play {
  opacity: 0;
  font-size: 0.55rem;
}

.tab-measure:hover .tab-measure__play {
  opacity: 1;
}

.tab-measure__number:hover {
  border-color: var(--glass-border-strong);
  color: var(--accent-primary);
}

.tab-measure__play:hover {
  border-color: var(--tab-success);
  color: var(--tab-success);
}

.tab-measure__ruler {
  display: flex;
  height: 8px;
  padding: 0 3px 0 5px;
}

.tab-measure__tick {
  width: var(--tab-cell-w);
  flex-shrink: 0;
  position: relative;
}

.tab-measure__tick--beat::before {
  content: '';
  position: absolute;
  left: calc(50% - 1px);
  bottom: 1px;
  width: 2px;
  height: 5px;
  border-radius: 1px;
  background: var(--muted);
}

.tab-measure__tick--playing::after {
  content: '';
  position: absolute;
  left: calc(50% - 4px);
  bottom: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-yellow);
}

.tab-measure__rows {
  padding: 0 3px;
  border-left: 2px solid var(--tab-bar);
}

.tab-measure__row {
  display: flex;
  height: var(--tab-cell-h);
  background: linear-gradient(var(--tab-line), var(--tab-line)) center / 100% 1px no-repeat;
}

.tab-cell {
  width: var(--tab-cell-w);
  height: 100%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--tab-font-size);
  font-weight: 600;
  color: var(--text-primary);
  cursor: cell;
  user-select: none;
}

.tab-cell--beat {
  box-shadow: inset 1px 0 0 var(--tab-beat);
}

.tab-cell--playing {
  background: var(--tab-playing);
}

.tab-cell--selected {
  background: var(--tab-select);
  border-radius: 0;
}

.tab-cell--cursor {
  box-shadow: inset 0 0 0 2px var(--accent-primary);
  border-radius: 4px;
}

.tab-cell__text {
  padding: 0 1px;
  border-radius: 3px;
  background: var(--tab-note-bg);
  line-height: 1.15;
  letter-spacing: -0.02em;
  pointer-events: none;
}

.tab-cell--selected .tab-cell__text,
.tab-cell--playing .tab-cell__text {
  background: transparent;
}

@media (forced-colors: active) {
  .tab-cell--cursor {
    outline: 2px solid Highlight;
    outline-offset: -2px;
  }

  .tab-cell--selected {
    background: Highlight;
    color: HighlightText;
  }
}
</style>
