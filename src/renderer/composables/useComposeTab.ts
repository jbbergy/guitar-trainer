import { computed, ref, watch, type Ref } from 'vue'
import type { Instrument } from '@/types/chord'
import {
    DEFAULT_TAB_COLUMNS_PER_MEASURE,
    DEFAULT_TAB_MEASURE_COUNT,
    DEFAULT_TAB_MEASURES_PER_LINE,
    type TabMeasure,
    type TablatureDocument,
} from '@/types/tablature'

const STORAGE_KEY_COMPOSE_DOCUMENT_PREFIX = 'compose-document-v1'

const getStorageKeyForInstrument = (instrument: Instrument): string => {
    return `${STORAGE_KEY_COMPOSE_DOCUMENT_PREFIX}:${instrument}`
}

const STRING_COUNT_BY_INSTRUMENT: Record<Instrument, number> = {
    guitar: 6,
    ukulele: 4,
}

const sanitizeCell = (value: string): string => {
    const trimmed = value.trim()

    if (trimmed === '') {
        return ''
    }

    if (/^x$/i.test(trimmed)) {
        return 'x'
    }

    if (!/^\d{1,2}$/.test(trimmed)) {
        return ''
    }

    const fret = Number(trimmed)
    if (Number.isNaN(fret) || fret < 0 || fret > 24) {
        return ''
    }

    return String(fret)
}

const createEmptyMeasure = (stringCount: number, columnsPerMeasure: number): TabMeasure => ({
    rows: Array.from({ length: stringCount }, () =>
        Array.from({ length: columnsPerMeasure }, () => '')
    ),
})

export const createEmptyTablature = (instrument: Instrument): TablatureDocument => {
    const stringCount = STRING_COUNT_BY_INSTRUMENT[instrument]
    const columnsPerMeasure = DEFAULT_TAB_COLUMNS_PER_MEASURE

    return {
        title: 'Untitled tablature',
        instrument,
        columnsPerMeasure,
        measuresPerLine: DEFAULT_TAB_MEASURES_PER_LINE,
        measures: Array.from({ length: DEFAULT_TAB_MEASURE_COUNT }, () =>
            createEmptyMeasure(stringCount, columnsPerMeasure)
        ),
    }
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object') {
        return null
    }

    return value as Record<string, unknown>
}

const toSafeMeasure = (
    input: unknown,
    stringCount: number,
    columnsPerMeasure: number
): TabMeasure => {
    const record = asRecord(input)
    const maybeRows = Array.isArray(record?.rows) ? record.rows : []

    const rows = Array.from({ length: stringCount }, (_unused, rowIndex) => {
        const existingRow = Array.isArray(maybeRows[rowIndex]) ? maybeRows[rowIndex] : []

        return Array.from({ length: columnsPerMeasure }, (_unusedCol, colIndex) => {
            const cell = existingRow[colIndex]
            return sanitizeCell(typeof cell === 'string' ? cell : '')
        })
    })

    return { rows }
}

const toSafeDocument = (raw: unknown, instrument: Instrument): TablatureDocument => {
    const record = asRecord(raw)

    const stringCount = STRING_COUNT_BY_INSTRUMENT[instrument]

    const columnsPerMeasureRaw = Number(record?.columnsPerMeasure)
    const columnsPerMeasure =
        Number.isFinite(columnsPerMeasureRaw) && columnsPerMeasureRaw >= 1 && columnsPerMeasureRaw <= 16
            ? Math.floor(columnsPerMeasureRaw)
            : DEFAULT_TAB_COLUMNS_PER_MEASURE

    const title =
        typeof record?.title === 'string' && record.title.trim().length > 0
            ? record.title.trim().slice(0, 80)
            : 'Untitled tablature'

    const rawMeasures = Array.isArray(record?.measures) ? record.measures : []
    const measures = (rawMeasures.length > 0 ? rawMeasures : Array.from({ length: DEFAULT_TAB_MEASURE_COUNT }))
        .slice(0, 64)
        .map((measure) => toSafeMeasure(measure, stringCount, columnsPerMeasure))

    const measuresPerLineRaw = Number(record?.measuresPerLine)
    const measuresPerLine =
        Number.isFinite(measuresPerLineRaw) && measuresPerLineRaw >= 1 && measuresPerLineRaw <= 16
            ? Math.floor(measuresPerLineRaw)
            : DEFAULT_TAB_MEASURES_PER_LINE

    return {
        title,
        instrument,
        columnsPerMeasure,
        measuresPerLine,
        measures,
    }
}

const getStringLabels = (instrument: Instrument): string[] => {
    if (instrument === 'ukulele') {
        return ['A', 'E', 'C', 'G']
    }

    return ['e', 'B', 'G', 'D', 'A', 'E']
}

export function useComposeTab(activeInstrument: Ref<Instrument>) {
    const document = ref<TablatureDocument>(createEmptyTablature(activeInstrument.value))

    const loadFromStorage = (instrument: Instrument) => {
        try {
            const raw = globalThis.localStorage.getItem(getStorageKeyForInstrument(instrument))
            if (!raw) {
                document.value = createEmptyTablature(instrument)
                return
            }

            const parsed = JSON.parse(raw)
            document.value = toSafeDocument(parsed, instrument)
        } catch (error) {
            console.warn('Failed to restore compose document from storage:', error)
            document.value = createEmptyTablature(instrument)
        }
    }

    const persistToStorage = () => {
        try {
            globalThis.localStorage.setItem(
                getStorageKeyForInstrument(document.value.instrument),
                JSON.stringify(document.value)
            )
        } catch (error) {
            console.warn('Failed to persist compose document to storage:', error)
        }
    }

    const totalColumns = computed(() => document.value.measures.length * document.value.columnsPerMeasure)

    const setTitle = (value: string) => {
        document.value = {
            ...document.value,
            title: value.slice(0, 80),
        }
    }

    const setCell = (stringIndex: number, globalColumn: number, value: string) => {
        if (stringIndex < 0 || stringIndex >= STRING_COUNT_BY_INSTRUMENT[document.value.instrument]) {
            return
        }

        if (globalColumn < 0 || globalColumn >= totalColumns.value) {
            return
        }

        const normalized = sanitizeCell(value)
        const measureIndex = Math.floor(globalColumn / document.value.columnsPerMeasure)
        const localColumn = globalColumn % document.value.columnsPerMeasure

        const nextMeasures = document.value.measures.map((measure, idx) => {
            if (idx !== measureIndex) {
                return measure
            }

            const nextRows = measure.rows.map((row, rowIndex) => {
                if (rowIndex !== stringIndex) {
                    return row
                }

                return row.map((cell, colIndex) => (colIndex === localColumn ? normalized : cell))
            })

            return { rows: nextRows }
        })

        document.value = {
            ...document.value,
            measures: nextMeasures,
        }
    }

    const getCell = (stringIndex: number, globalColumn: number): string => {
        const measureIndex = Math.floor(globalColumn / document.value.columnsPerMeasure)
        const localColumn = globalColumn % document.value.columnsPerMeasure

        return document.value.measures[measureIndex]?.rows[stringIndex]?.[localColumn] ?? ''
    }

    const addMeasure = () => {
        if (document.value.measures.length >= 64) {
            return
        }

        const measure = createEmptyMeasure(
            STRING_COUNT_BY_INSTRUMENT[document.value.instrument],
            document.value.columnsPerMeasure
        )

        document.value = {
            ...document.value,
            measures: [...document.value.measures, measure],
        }
    }

    const removeMeasure = () => {
        if (document.value.measures.length <= 1) {
            return
        }

        document.value = {
            ...document.value,
            measures: document.value.measures.slice(0, -1),
        }
    }

    const removeMeasureAt = (index: number) => {
        if (document.value.measures.length <= 1) {
            return
        }
        if (index < 0 || index >= document.value.measures.length) {
            return
        }
        document.value = {
            ...document.value,
            measures: document.value.measures.filter((_unused, i) => i !== index),
        }
    }

    const setMeasuresPerLine = (value: number) => {
        const clamped = Math.max(1, Math.min(16, Math.floor(value)))
        document.value = { ...document.value, measuresPerLine: clamped }
    }

    const setColumnsPerMeasure = (value: number) => {
        const clamped = Math.max(1, Math.min(16, Math.floor(value)))

        if (clamped === document.value.columnsPerMeasure) {
            return
        }

        const stringCount = STRING_COUNT_BY_INSTRUMENT[document.value.instrument]
        const nextMeasures = document.value.measures.map((measure) =>
            toSafeMeasure(measure, stringCount, clamped)
        )

        document.value = {
            ...document.value,
            columnsPerMeasure: clamped,
            measures: nextMeasures,
        }
    }

    const newTablature = () => {
        document.value = createEmptyTablature(activeInstrument.value)
    }

    const asText = computed(() => {
        const labels = getStringLabels(document.value.instrument)
        const dataIndices = Array.from({ length: labels.length }, (_unused, index) => labels.length - 1 - index)
        const mpl = document.value.measuresPerLine
        const lineCount = Math.ceil(document.value.measures.length / mpl)

        const parts: string[] = [document.value.title]

        for (let lineIdx = 0; lineIdx < lineCount; lineIdx++) {
            const startM = lineIdx * mpl
            const endM = Math.min(startM + mpl, document.value.measures.length)

            const stringLines = labels.map((label, displayRowIndex) => {
                const dataRowIndex = dataIndices[displayRowIndex]
                const chunks: string[] = []

                for (let measureIndex = startM; measureIndex < endM; measureIndex++) {
                    const measure = document.value.measures[measureIndex]
                    const row = measure.rows[dataRowIndex] ?? []
                    const renderedCells = row.map((cell) => (cell === '' ? '--' : cell.padEnd(2, '-')))
                    chunks.push(renderedCells.join('-'))
                }

                return `${label}|${chunks.join('|')}|`
            })

            parts.push(stringLines.join('\n'))
        }

        return parts.join('\n\n')
    })

    const copyToClipboard = async (): Promise<boolean> => {
        try {
            if (!globalThis.navigator?.clipboard?.writeText) {
                return false
            }

            await globalThis.navigator.clipboard.writeText(asText.value)
            return true
        } catch (error) {
            console.warn('Clipboard write failed:', error)
            return false
        }
    }

    loadFromStorage(activeInstrument.value)

    watch(activeInstrument, (nextInstrument) => {
        persistToStorage()
        loadFromStorage(nextInstrument)
    })

    watch(document, persistToStorage, { deep: true })

    return {
        document,
        totalColumns,
        setTitle,
        setCell,
        getCell,
        addMeasure,
        removeMeasure,
        removeMeasureAt,
        setMeasuresPerLine,
        setColumnsPerMeasure,
        newTablature,
        asText,
        copyToClipboard,
    }
}
