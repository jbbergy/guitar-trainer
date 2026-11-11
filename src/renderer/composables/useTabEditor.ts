import { computed, ref, shallowRef } from 'vue'
import {
    MAX_TAB_COLUMNS_PER_MEASURE,
    MAX_TAB_FRET,
    MAX_TAB_MEASURES,
    TAB_QUANTIZATIONS,
    type Quantization,
    type TabMeasure,
    type TabTechnique,
    type TabTuning,
    type TablatureDocument,
} from '@/types/tablature'
import {
    clampColumns,
    cloneMeasure,
    createEmptyMeasure,
    formatCell,
    locateColumn,
    measureColumns,
    measureStartColumns,
    parseCell,
    resizeMeasure,
    sanitizeCell,
    toSafeBpm,
    toSafeCapo,
} from '@/utils/tab/model'

export interface TabCursor {
    /** String index, 0 = lowest tab line */
    string: number
    /** Global column index across all measures */
    column: number
}

export interface TabSelection {
    fromString: number
    toString: number
    fromColumn: number
    toColumn: number
}

interface CellChange {
    string: number
    column: number
    value: string
}

const HISTORY_LIMIT = 200
const TWO_DIGIT_WINDOW_MS = 1200
const COALESCE_WINDOW_MS = 1500

/** Cells copied with the last copy / cut, highest string first. Shared between tablatures. */
let clipboard: string[][] | null = null

/**
 * Editing state of one tablature: document, cursor, selection, undo history and every
 * mutation the editor offers. All updates are immutable so undo is a simple stack.
 */
export function useTabEditor(initial: TablatureDocument, onChange?: (doc: TablatureDocument) => void) {
    const document = shallowRef<TablatureDocument>(initial)
    const cursor = ref<TabCursor>({ string: initial.tuning.strings.length - 1, column: 0 })
    const anchor = ref<TabCursor | null>(null)
    const canUndo = ref(false)
    const canRedo = ref(false)

    let undoStack: TablatureDocument[] = []
    let redoStack: TablatureDocument[] = []
    let lastCommit: { key: string; at: number } | null = null
    let pendingDigit: { string: number; column: number; at: number } | null = null

    const stringCount = computed(() => document.value.tuning.strings.length)
    const starts = computed(() => measureStartColumns(document.value.measures))
    const totalColumns = computed(() => starts.value[starts.value.length - 1])

    const selection = computed<TabSelection>(() => {
        const other = anchor.value ?? cursor.value
        return {
            fromString: Math.min(cursor.value.string, other.string),
            toString: Math.max(cursor.value.string, other.string),
            fromColumn: Math.min(cursor.value.column, other.column),
            toColumn: Math.max(cursor.value.column, other.column),
        }
    })

    const hasRangeSelection = computed(() => {
        const range = selection.value
        return range.fromString !== range.toString || range.fromColumn !== range.toColumn
    })

    const locate = (column: number) => locateColumn(starts.value, column)
    const cursorMeasure = computed(() => locate(cursor.value.column)?.measureIndex ?? 0)

    /** Measures touched by the selection, as an inclusive index range. */
    const selectedMeasures = computed(() => ({
        from: locate(selection.value.fromColumn)?.measureIndex ?? 0,
        to: locate(selection.value.toColumn)?.measureIndex ?? 0,
    }))

    const syncHistoryFlags = () => {
        canUndo.value = undoStack.length > 0
        canRedo.value = redoStack.length > 0
    }

    const clampCursor = () => {
        const maxString = stringCount.value - 1
        const maxColumn = Math.max(0, totalColumns.value - 1)
        cursor.value = {
            string: Math.max(0, Math.min(maxString, cursor.value.string)),
            column: Math.max(0, Math.min(maxColumn, cursor.value.column)),
        }
        if (anchor.value) {
            anchor.value = {
                string: Math.max(0, Math.min(maxString, anchor.value.string)),
                column: Math.max(0, Math.min(maxColumn, anchor.value.column)),
            }
        }
    }

    /**
     * Applies a new document state. Consecutive commits sharing a `coalesceKey`
     * (typing a title, a two-digit fret) are merged into a single undo step.
     */
    const commit = (next: TablatureDocument, coalesceKey?: string) => {
        const now = Date.now()
        const merge = coalesceKey !== undefined && lastCommit?.key === coalesceKey && now - lastCommit.at < COALESCE_WINDOW_MS
        if (!merge) {
            undoStack.push(document.value)
            if (undoStack.length > HISTORY_LIMIT) undoStack.shift()
        }
        redoStack = []
        lastCommit = coalesceKey !== undefined ? { key: coalesceKey, at: now } : null
        document.value = next
        clampCursor()
        syncHistoryFlags()
        onChange?.(next)
    }

    const load = (doc: TablatureDocument) => {
        document.value = doc
        undoStack = []
        redoStack = []
        lastCommit = null
        pendingDigit = null
        anchor.value = null
        cursor.value = { string: doc.tuning.strings.length - 1, column: 0 }
        syncHistoryFlags()
    }

    const undo = (): boolean => {
        const previous = undoStack.pop()
        if (!previous) return false
        redoStack.push(document.value)
        document.value = previous
        lastCommit = null
        pendingDigit = null
        anchor.value = null
        clampCursor()
        syncHistoryFlags()
        onChange?.(previous)
        return true
    }

    const redo = (): boolean => {
        const next = redoStack.pop()
        if (!next) return false
        undoStack.push(document.value)
        document.value = next
        lastCommit = null
        pendingDigit = null
        anchor.value = null
        clampCursor()
        syncHistoryFlags()
        onChange?.(next)
        return true
    }

    // ── Cells ───────────────────────────────────────────────────────────────

    const getCell = (string: number, column: number): string => {
        const location = locate(column)
        if (!location) return ''
        return document.value.measures[location.measureIndex].rows[string]?.[location.localColumn] ?? ''
    }

    /** Writes several cells at once, copying only the measures that change. */
    const writeCells = (changes: CellChange[], coalesceKey?: string): boolean => {
        const touched = new Map<number, TabMeasure>()
        let changed = false

        for (const change of changes) {
            const location = locate(change.column)
            if (!location || change.string < 0 || change.string >= stringCount.value) continue
            const value = sanitizeCell(change.value)
            const source = touched.get(location.measureIndex) ?? document.value.measures[location.measureIndex]
            if (source.rows[change.string][location.localColumn] === value) continue

            const measure = touched.get(location.measureIndex) ?? cloneMeasure(source)
            measure.rows[change.string][location.localColumn] = value
            touched.set(location.measureIndex, measure)
            changed = true
        }

        if (!changed) return false
        commit(
            { ...document.value, measures: document.value.measures.map((measure, index) => touched.get(index) ?? measure) },
            coalesceKey
        )
        return true
    }

    const setCell = (string: number, column: number, value: string): boolean => writeCells([{ string, column, value }])

    const selectedCells = (): TabCursor[] => {
        const range = selection.value
        const cells: TabCursor[] = []
        for (let string = range.fromString; string <= range.toString; string++) {
            for (let column = range.fromColumn; column <= range.toColumn; column++) cells.push({ string, column })
        }
        return cells
    }

    /** Types one digit; a second digit typed right after turns "1" into "12". */
    const typeDigit = (digit: number): void => {
        if (!Number.isInteger(digit) || digit < 0 || digit > 9) return
        anchor.value = null
        const { string, column } = cursor.value
        const current = parseCell(getCell(string, column))
        const now = Date.now()
        const key = `cell:${string}:${column}`

        const continues =
            pendingDigit !== null && pendingDigit.string === string && pendingDigit.column === column &&
            now - pendingDigit.at < TWO_DIGIT_WINDOW_MS && current !== null && current.fret !== null && current.fret < 10
        if (continues && current.fret !== null && current.fret * 10 + digit <= MAX_TAB_FRET) {
            pendingDigit = null
            writeCells([{ string, column, value: formatCell(current.fret * 10 + digit, current.technique) }], key)
            return
        }

        writeCells([{ string, column, value: formatCell(digit, current?.fret != null ? current.technique : '') }], key)
        pendingDigit = digit === 1 || digit === 2 ? { string, column, at: now } : null
    }

    const typeDead = (): void => {
        pendingDigit = null
        writeCells(selectedCells().map((cell) => ({ ...cell, value: 'x' })))
    }

    /** Toggles a technique on every selected note. Returns false when no note is selected. */
    const applyTechnique = (technique: TabTechnique): boolean => {
        pendingDigit = null
        const notes = selectedCells()
            .map((cell) => ({ cell, parsed: parseCell(getCell(cell.string, cell.column)) }))
            .filter((entry) => entry.parsed !== null && entry.parsed.fret !== null)
        if (notes.length === 0) return false

        const allSet = notes.every((entry) => entry.parsed?.technique === technique)
        return writeCells(
            notes.map(({ cell, parsed }) => ({ ...cell, value: formatCell(parsed?.fret ?? 0, allSet ? '' : technique) }))
        )
    }

    const clearSelection = (): boolean => {
        pendingDigit = null
        return writeCells(selectedCells().map((cell) => ({ ...cell, value: '' })))
    }

    /** Writes a chord (one fret per string, lowest string first) on the cursor column. */
    const insertChord = (frets: (number | 'X')[]): boolean => {
        if (frets.length !== stringCount.value) return false
        pendingDigit = null
        anchor.value = null
        return writeCells(
            frets.map((fret, string) => ({ string, column: cursor.value.column, value: fret === 'X' ? '' : String(fret) }))
        )
    }

    // ── Cursor and selection ────────────────────────────────────────────────

    const setCursor = (string: number, column: number, extend = false): void => {
        pendingDigit = null
        if (extend && !anchor.value) anchor.value = { ...cursor.value }
        if (!extend) anchor.value = null
        cursor.value = { string, column }
        clampCursor()
    }

    const appendMeasure = (): boolean => {
        if (document.value.measures.length >= MAX_TAB_MEASURES) return false
        const measure = createEmptyMeasure(stringCount.value, document.value.columnsPerMeasure)
        commit({ ...document.value, measures: [...document.value.measures, measure] })
        return true
    }

    /** Moves the cursor. Walking past the last column adds a measure, like on paper. */
    const moveCursor = (stringDelta: number, columnDelta: number, extend = false): void => {
        let column = cursor.value.column + columnDelta
        if (column >= totalColumns.value && !extend && columnDelta > 0 && appendMeasure()) {
            column = Math.min(column, totalColumns.value - 1)
        }
        setCursor(cursor.value.string + stringDelta, column, extend)
    }

    const moveToMeasure = (delta: number, extend = false): void => {
        const current = cursorMeasure.value
        const atStart = cursor.value.column === starts.value[current]
        const target = delta < 0 && !atStart ? current : Math.max(0, Math.min(document.value.measures.length - 1, current + delta))
        setCursor(cursor.value.string, starts.value[target], extend)
    }

    const moveToMeasureEdge = (edge: 'start' | 'end', extend = false): void => {
        const index = cursorMeasure.value
        setCursor(cursor.value.string, edge === 'start' ? starts.value[index] : starts.value[index + 1] - 1, extend)
    }

    const moveToDocumentEdge = (edge: 'start' | 'end', extend = false): void => {
        setCursor(cursor.value.string, edge === 'start' ? 0 : totalColumns.value - 1, extend)
    }

    const selectMeasures = (from: number, to: number = from): void => {
        const first = Math.max(0, Math.min(from, to))
        const last = Math.min(document.value.measures.length - 1, Math.max(from, to))
        pendingDigit = null
        anchor.value = { string: 0, column: starts.value[first] }
        cursor.value = { string: stringCount.value - 1, column: starts.value[last + 1] - 1 }
    }

    const selectAll = (): void => selectMeasures(0, document.value.measures.length - 1)

    // ── Clipboard ───────────────────────────────────────────────────────────

    const copy = (): string => {
        const range = selection.value
        const rows: string[][] = []
        for (let string = range.toString; string >= range.fromString; string--) {
            const row: string[] = []
            for (let column = range.fromColumn; column <= range.toColumn; column++) row.push(getCell(string, column))
            rows.push(row)
        }
        clipboard = rows
        const width = rows.reduce((max, row) => row.reduce((m, cell) => Math.max(m, cell.length), max), 1)
        return rows.map((row) => `-${row.map((cell) => `${cell.padEnd(width, '-')}-`).join('')}`).join('\n')
    }

    const cut = (): string => {
        const text = copy()
        clearSelection()
        return text
    }

    const canPaste = (): boolean => clipboard !== null

    /** Pastes the copied block with its top-left corner on the cursor, adding measures when needed. */
    const paste = (): boolean => {
        if (!clipboard) return false
        pendingDigit = null
        const block = clipboard
        const origin = { string: Math.max(cursor.value.string, anchor.value?.string ?? 0), column: selection.value.fromColumn }
        const width = block[0]?.length ?? 0

        let next = document.value
        let total = totalColumns.value
        while (origin.column + width > total && next.measures.length < MAX_TAB_MEASURES) {
            next = { ...next, measures: [...next.measures, createEmptyMeasure(stringCount.value, next.columnsPerMeasure)] }
            total += next.columnsPerMeasure
        }

        const nextStarts = measureStartColumns(next.measures)
        const touched = new Map<number, TabMeasure>()
        block.forEach((row, rowIndex) => {
            const string = origin.string - rowIndex
            if (string < 0) return
            row.forEach((cell, offset) => {
                const location = locateColumn(nextStarts, origin.column + offset)
                if (!location) return
                const measure = touched.get(location.measureIndex) ?? cloneMeasure(next.measures[location.measureIndex])
                measure.rows[string][location.localColumn] = sanitizeCell(cell)
                touched.set(location.measureIndex, measure)
            })
        })

        commit({ ...next, measures: next.measures.map((measure, index) => touched.get(index) ?? measure) })
        anchor.value = null
        setCursor(origin.string, Math.min(origin.column + width, totalColumns.value - 1))
        return true
    }

    // ── Structure ───────────────────────────────────────────────────────────

    const replaceMeasures = (measures: TabMeasure[], extra: Partial<TablatureDocument> = {}) => {
        commit({ ...document.value, ...extra, measures })
    }

    /** Inserts an empty step before the cursor: the measure becomes one step longer. */
    const insertColumn = (): boolean => {
        const location = locate(cursor.value.column)
        if (!location) return false
        const measure = document.value.measures[location.measureIndex]
        if (measureColumns(measure) >= MAX_TAB_COLUMNS_PER_MEASURE) return false
        pendingDigit = null
        anchor.value = null
        const widened: TabMeasure = {
            ...measure,
            rows: measure.rows.map((row) => [...row.slice(0, location.localColumn), '', ...row.slice(location.localColumn)]),
        }
        replaceMeasures(document.value.measures.map((item, index) => (index === location.measureIndex ? widened : item)))
        return true
    }

    /** Removes the step under the cursor: the measure becomes one step shorter. */
    const deleteColumn = (): boolean => {
        const location = locate(cursor.value.column)
        if (!location) return false
        const measure = document.value.measures[location.measureIndex]
        if (measureColumns(measure) <= 1) return false
        pendingDigit = null
        anchor.value = null
        const narrowed: TabMeasure = { ...measure, rows: measure.rows.map((row) => row.filter((_cell, index) => index !== location.localColumn)) }
        replaceMeasures(document.value.measures.map((item, index) => (index === location.measureIndex ? narrowed : item)))
        return true
    }

    const insertMeasure = (position: 'before' | 'after'): boolean => {
        if (document.value.measures.length >= MAX_TAB_MEASURES) return false
        const index = position === 'before' ? selectedMeasures.value.from : selectedMeasures.value.to + 1
        const reference = document.value.measures[Math.min(index, document.value.measures.length - 1)]
        const measure = createEmptyMeasure(stringCount.value, measureColumns(reference) || document.value.columnsPerMeasure)
        const measures = [...document.value.measures.slice(0, index), measure, ...document.value.measures.slice(index)]
        const string = cursor.value.string
        replaceMeasures(measures)
        setCursor(string, measureStartColumns(measures)[index])
        return true
    }

    const duplicateMeasures = (): boolean => {
        const { from, to } = selectedMeasures.value
        const copies = document.value.measures.slice(from, to + 1).map(cloneMeasure)
        if (document.value.measures.length + copies.length > MAX_TAB_MEASURES) return false
        const measures = [...document.value.measures.slice(0, to + 1), ...copies, ...document.value.measures.slice(to + 1)]
        const string = cursor.value.string
        replaceMeasures(measures)
        setCursor(string, measureStartColumns(measures)[to + 1])
        return true
    }

    /** Deletes the selected measures; the last remaining measure is emptied instead. */
    const deleteMeasures = (): boolean => {
        const { from, to } = selectedMeasures.value
        const string = cursor.value.string
        const remaining = document.value.measures.filter((_measure, index) => index < from || index > to)
        const measures =
            remaining.length > 0 ? remaining : [createEmptyMeasure(stringCount.value, document.value.columnsPerMeasure)]
        replaceMeasures(measures)
        setCursor(string, measureStartColumns(measures)[Math.min(from, measures.length - 1)])
        return true
    }

    // ── Repeats ─────────────────────────────────────────────────────────────

    const updateMeasure = (index: number, change: Partial<TabMeasure>): void => {
        replaceMeasures(document.value.measures.map((measure, i) => (i === index ? { ...measure, ...change } : measure)))
    }

    /** Puts or removes a "|:" in front of the first selected measure. */
    const toggleRepeatStart = (): boolean => {
        const index = selectedMeasures.value.from
        const next = !document.value.measures[index].repeatStart
        updateMeasure(index, { repeatStart: next || undefined })
        return next
    }

    /** Cycles the ":|" after the last selected measure: none → ×2 → ×3 → ×4 → none. Returns the play count (0 = none). */
    const cycleRepeatEnd = (): number => {
        const index = selectedMeasures.value.to
        const current = document.value.measures[index].repeatEnd ?? 0
        const next = current === 0 ? 2 : current >= 4 ? 0 : current + 1
        updateMeasure(index, { repeatEnd: next || undefined })
        return next
    }

    /** Cycles the alternate ending of the selected measures: none → 1st → 2nd → 3rd → none. */
    const cycleEnding = (): number => {
        const { from, to } = selectedMeasures.value
        const current = document.value.measures[from].ending ?? 0
        const next = current >= 3 ? 0 : current + 1
        replaceMeasures(
            document.value.measures.map((measure, i) => (i >= from && i <= to ? { ...measure, ending: next || undefined } : measure))
        )
        return next
    }

    // ── Document settings ───────────────────────────────────────────────────

    const setTitle = (value: string) => commit({ ...document.value, title: value.slice(0, 120) }, 'title')

    const setArtist = (value: string) => commit({ ...document.value, artist: value.slice(0, 120) }, 'artist')

    const setBpm = (value: number) => {
        const bpm = toSafeBpm(Math.max(20, Math.min(300, Math.round(Number(value) || 0))))
        if (bpm !== document.value.bpm) commit({ ...document.value, bpm }, 'bpm')
    }

    const setCapo = (value: number) => {
        const capo = toSafeCapo(value)
        if (capo !== document.value.capo) commit({ ...document.value, capo }, 'capo')
    }

    /** Changes the note value of one step without touching the notes (playback speed changes). */
    const setQuantization = (value: Quantization) => {
        if (TAB_QUANTIZATIONS.includes(value) && value !== document.value.quantization) {
            commit({ ...document.value, quantization: value, timeSignature: undefined })
        }
    }

    /** Sets the length of new measures and resizes the measures that had the previous default length. */
    const setColumnsPerMeasure = (value: number) => {
        const next = clampColumns(value)
        const previous = document.value.columnsPerMeasure
        if (next === previous) return
        const measures = document.value.measures.map((measure) =>
            measureColumns(measure) === previous ? resizeMeasure(measure, stringCount.value, next) : measure
        )
        commit({ ...document.value, columnsPerMeasure: next, measures, timeSignature: undefined }, 'columns')
    }

    /** Renames the strings without touching fret numbers (fixes a wrongly detected tuning). */
    const setTuning = (tuning: TabTuning): boolean => {
        if (tuning.strings.length !== stringCount.value) return false
        commit({ ...document.value, tuning: { ...tuning, strings: [...tuning.strings] } })
        return true
    }

    const refinedQuantization = computed<Quantization | null>(() => {
        const doubled = (document.value.quantization * 2) as Quantization
        const fits = document.value.measures.every((measure) => measureColumns(measure) * 2 <= MAX_TAB_COLUMNS_PER_MEASURE)
        return TAB_QUANTIZATIONS.includes(doubled) && fits ? doubled : null
    })

    const coarsenedQuantization = computed<Quantization | null>(() => {
        const halved = (document.value.quantization / 2) as Quantization
        if (!TAB_QUANTIZATIONS.includes(halved)) return null
        const reducible = document.value.measures.every(
            (measure) =>
                measureColumns(measure) % 2 === 0 &&
                measure.rows.every((row) => row.every((cell, column) => column % 2 === 0 || cell === ''))
        )
        return reducible ? halved : null
    })

    /** Doubles the grid resolution: every step is split in two and the music sounds the same. */
    const refineGrid = (): boolean => {
        const quantization = refinedQuantization.value
        if (quantization === null) return false
        const column = cursor.value.column
        const location = locate(column)
        const measures = document.value.measures.map((measure) => ({
            ...measure,
            rows: measure.rows.map((row) => row.flatMap((cell) => [cell, ''])),
        }))
        anchor.value = null
        commit({
            ...document.value,
            quantization,
            columnsPerMeasure: clampColumns(document.value.columnsPerMeasure * 2),
            measures,
        })
        if (location) setCursor(cursor.value.string, measureStartColumns(measures)[location.measureIndex] + location.localColumn * 2)
        return true
    }

    /** Halves the grid resolution; only possible when every second step is empty. */
    const coarsenGrid = (): boolean => {
        const quantization = coarsenedQuantization.value
        if (quantization === null) return false
        const location = locate(cursor.value.column)
        const measures = document.value.measures.map((measure) => ({
            ...measure,
            rows: measure.rows.map((row) => row.filter((_cell, column) => column % 2 === 0)),
        }))
        anchor.value = null
        commit({
            ...document.value,
            quantization,
            columnsPerMeasure: clampColumns(Math.ceil(document.value.columnsPerMeasure / 2)),
            measures,
        })
        if (location) {
            setCursor(cursor.value.string, measureStartColumns(measures)[location.measureIndex] + Math.floor(location.localColumn / 2))
        }
        return true
    }

    return {
        document,
        cursor,
        anchor,
        selection,
        hasRangeSelection,
        starts,
        totalColumns,
        cursorMeasure,
        selectedMeasures,
        canUndo,
        canRedo,
        load,
        undo,
        redo,
        getCell,
        setCell,
        typeDigit,
        typeDead,
        applyTechnique,
        clearSelection,
        insertChord,
        setCursor,
        moveCursor,
        moveToMeasure,
        moveToMeasureEdge,
        moveToDocumentEdge,
        selectMeasures,
        selectAll,
        copy,
        cut,
        canPaste,
        paste,
        insertColumn,
        deleteColumn,
        insertMeasure,
        appendMeasure,
        duplicateMeasures,
        deleteMeasures,
        toggleRepeatStart,
        cycleRepeatEnd,
        cycleEnding,
        setTitle,
        setArtist,
        setBpm,
        setCapo,
        setQuantization,
        setColumnsPerMeasure,
        setTuning,
        refinedQuantization,
        coarsenedQuantization,
        refineGrid,
        coarsenGrid,
    }
}

export type TabEditor = ReturnType<typeof useTabEditor>
