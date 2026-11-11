import {
    DEFAULT_TAB_BPM,
    DEFAULT_TAB_COLUMNS_PER_MEASURE,
    DEFAULT_TAB_MEASURE_COUNT,
    DEFAULT_TAB_QUANTIZATION,
    DEFAULT_TAB_TITLE,
    MAX_TAB_BPM,
    MAX_TAB_CAPO,
    MAX_TAB_COLUMNS_PER_MEASURE,
    MAX_TAB_FRET,
    MAX_TAB_MEASURES,
    MIN_TAB_BPM,
    TAB_QUANTIZATIONS,
    type Quantization,
    type TabCell,
    type TabInstrumentFamily,
    type TabMeasure,
    type TabTechnique,
    type TabTuning,
    type TablatureDocument,
} from '@/types/tablature'
import { createTuningFromStrings, getDefaultTuning, getTuningById } from './tunings'

export const TAB_TECHNIQUES: TabTechnique[] = ['h', 'p', '/', '\\', 'b', 'r', '~']

export const TAB_TECHNIQUE_LABELS: Record<TabTechnique, string> = {
    h: 'Hammer-on',
    p: 'Pull-off',
    '/': 'Slide up',
    '\\': 'Slide down',
    b: 'Bend',
    r: 'Release',
    '~': 'Vibrato',
}

/** Techniques that tie a note to the next note played on the same string. */
export const LINKING_TECHNIQUES: ReadonlySet<string> = new Set(['h', 'p', '/', '\\', 'b', 'r'])

export interface ParsedCell {
    /** Fret number, or null for a muted (dead) note */
    fret: number | null
    technique: TabTechnique | ''
}

const CELL_PATTERN = /^(x|\d{1,2})([hp/\\br~]?)$/

/** Reads a canonical cell. Returns null for an empty or invalid cell. */
export function parseCell(cell: TabCell | undefined | null): ParsedCell | null {
    if (!cell) return null
    const match = CELL_PATTERN.exec(cell)
    if (!match) return null
    if (match[1] === 'x') return { fret: null, technique: '' }
    const fret = Number(match[1])
    if (fret > MAX_TAB_FRET) return null
    return { fret, technique: match[2] as TabTechnique | '' }
}

export function formatCell(fret: number | null, technique: TabTechnique | '' = ''): TabCell {
    if (fret === null) return 'x'
    if (!Number.isInteger(fret) || fret < 0 || fret > MAX_TAB_FRET) return ''
    return `${fret}${technique}`
}

/** Normalises free input ("X", " 07 ", "5H") into a canonical cell, or '' when invalid. */
export function sanitizeCell(value: unknown): TabCell {
    if (typeof value !== 'string') return ''
    const trimmed = value.trim().toLowerCase()
    if (trimmed === '') return ''
    const match = CELL_PATTERN.exec(trimmed)
    if (!match) return ''
    if (match[1] === 'x') return 'x'
    return formatCell(Number(match[1]), match[2] as TabTechnique | '')
}

// ── Measures ────────────────────────────────────────────────────────────────

export const clampColumns = (value: number): number =>
    Math.max(1, Math.min(MAX_TAB_COLUMNS_PER_MEASURE, Math.floor(Number.isFinite(value) ? value : 1)))

export function createEmptyMeasure(stringCount: number, columns: number): TabMeasure {
    const width = clampColumns(columns)
    return { rows: Array.from({ length: stringCount }, () => Array.from({ length: width }, () => '')) }
}

export function measureColumns(measure: TabMeasure): number {
    return measure.rows[0]?.length ?? 0
}

export function isMeasureEmpty(measure: TabMeasure): boolean {
    return measure.rows.every((row) => row.every((cell) => cell === ''))
}

export function cloneMeasure(measure: TabMeasure): TabMeasure {
    return { rows: measure.rows.map((row) => [...row]) }
}

/** Pads or truncates a measure to an exact shape, sanitising every cell on the way. */
export function resizeMeasure(measure: TabMeasure, stringCount: number, columns: number): TabMeasure {
    const width = clampColumns(columns)
    return {
        rows: Array.from({ length: stringCount }, (_unused, rowIndex) => {
            const source = measure.rows[rowIndex] ?? []
            return Array.from({ length: width }, (_unusedCol, colIndex) => sanitizeCell(source[colIndex] ?? ''))
        }),
    }
}

/** Global column index at which each measure starts, plus the total as last element. */
export function measureStartColumns(measures: TabMeasure[]): number[] {
    const starts: number[] = [0]
    for (const measure of measures) {
        starts.push(starts[starts.length - 1] + measureColumns(measure))
    }
    return starts
}

export function totalColumns(measures: TabMeasure[]): number {
    return measures.reduce((sum, measure) => sum + measureColumns(measure), 0)
}

export interface ColumnLocation {
    measureIndex: number
    localColumn: number
}

/** Maps a global column to its measure. Returns null when the column is out of range. */
export function locateColumn(starts: number[], globalColumn: number): ColumnLocation | null {
    const total = starts[starts.length - 1]
    if (globalColumn < 0 || globalColumn >= total) return null
    let low = 0
    let high = starts.length - 2
    while (low < high) {
        const mid = (low + high + 1) >> 1
        if (starts[mid] <= globalColumn) low = mid
        else high = mid - 1
    }
    return { measureIndex: low, localColumn: globalColumn - starts[low] }
}

export function countNotes(measures: TabMeasure[]): number {
    let count = 0
    for (const measure of measures) {
        for (const row of measure.rows) {
            for (const cell of row) if (cell !== '') count++
        }
    }
    return count
}

// ── Documents ───────────────────────────────────────────────────────────────

export function createTabId(): string {
    const cryptoApi = globalThis.crypto
    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
        return cryptoApi.randomUUID()
    }
    return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const toSafeBpm = (value: unknown): number => {
    const n = Number(value)
    return Number.isFinite(n) && n >= MIN_TAB_BPM && n <= MAX_TAB_BPM ? Math.round(n) : DEFAULT_TAB_BPM
}

export const toSafeQuantization = (value: unknown): Quantization => {
    const n = Number(value) as Quantization
    return TAB_QUANTIZATIONS.includes(n) ? n : DEFAULT_TAB_QUANTIZATION
}

export const toSafeCapo = (value: unknown): number => {
    const n = Number(value)
    return Number.isFinite(n) ? Math.max(0, Math.min(MAX_TAB_CAPO, Math.round(n))) : 0
}

export const toSafeTitle = (value: unknown, fallback = DEFAULT_TAB_TITLE): string => {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, 120) : fallback
}

export interface NewTablatureOptions {
    title?: string
    artist?: string
    measureCount?: number
    columnsPerMeasure?: number
    quantization?: Quantization
    bpm?: number
    capo?: number
}

export function createEmptyTablature(tuning: TabTuning = getDefaultTuning('guitar'), options: NewTablatureOptions = {}): TablatureDocument {
    const columnsPerMeasure = clampColumns(options.columnsPerMeasure ?? DEFAULT_TAB_COLUMNS_PER_MEASURE)
    const measureCount = Math.max(1, Math.min(MAX_TAB_MEASURES, options.measureCount ?? DEFAULT_TAB_MEASURE_COUNT))
    const now = Date.now()

    return {
        id: createTabId(),
        title: toSafeTitle(options.title),
        artist: (options.artist ?? '').trim().slice(0, 120),
        tuning: { ...tuning, strings: [...tuning.strings] },
        capo: toSafeCapo(options.capo ?? 0),
        bpm: toSafeBpm(options.bpm ?? DEFAULT_TAB_BPM),
        quantization: toSafeQuantization(options.quantization ?? DEFAULT_TAB_QUANTIZATION),
        columnsPerMeasure,
        measures: Array.from({ length: measureCount }, () => createEmptyMeasure(tuning.strings.length, columnsPerMeasure)),
        createdAt: now,
        updatedAt: now,
    }
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : null

const FAMILIES: TabInstrumentFamily[] = ['guitar', 'ukulele', 'bass', 'other']

const toSafeTuning = (raw: unknown, legacyInstrument: unknown): TabTuning => {
    const record = asRecord(raw)
    const strings = Array.isArray(record?.strings)
        ? record.strings.map(Number).filter((pitch) => Number.isFinite(pitch) && pitch >= 0 && pitch <= 127)
        : []

    if (record && strings.length >= 1 && strings.length <= 12 && strings.length === (record.strings as unknown[]).length) {
        const preset = typeof record.id === 'string' ? getTuningById(record.id) : null
        if (preset && preset.strings.length === strings.length && preset.strings.every((pitch, i) => pitch === strings[i])) {
            return preset
        }
        const family = FAMILIES.includes(record.family as TabInstrumentFamily) ? (record.family as TabInstrumentFamily) : undefined
        const tuning = createTuningFromStrings(strings, family)
        if (tuning.id === 'custom' && typeof record.name === 'string' && record.name.trim()) {
            tuning.name = record.name.trim().slice(0, 80)
        }
        return tuning
    }

    return getDefaultTuning(legacyInstrument === 'ukulele' ? 'ukulele' : 'guitar')
}

/** Sparse measure used by the storage format: column count + [string, column, cell] triples. */
interface StoredMeasure {
    c: number
    n: [number, number, string][]
}

const toSafeMeasure = (raw: unknown, stringCount: number, fallbackColumns: number): TabMeasure => {
    const record = asRecord(raw)

    // Dense form (legacy drafts and in-memory documents): { rows: string[][] }
    if (Array.isArray(record?.rows)) {
        const rows = record.rows as unknown[]
        const widest = rows.reduce<number>((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0)
        return resizeMeasure({ rows: rows.map((row) => (Array.isArray(row) ? (row as string[]) : [])) }, stringCount, widest || fallbackColumns)
    }

    // Sparse form: { c, n }
    const columns = clampColumns(Number(record?.c) || fallbackColumns)
    const measure = createEmptyMeasure(stringCount, columns)
    if (Array.isArray(record?.n)) {
        for (const entry of record.n as unknown[]) {
            if (!Array.isArray(entry)) continue
            const [stringIndex, column, cell] = entry as [number, number, string]
            if (Number.isInteger(stringIndex) && Number.isInteger(column) && measure.rows[stringIndex]?.[column] !== undefined) {
                measure.rows[stringIndex][column] = sanitizeCell(cell)
            }
        }
    }
    return measure
}

/**
 * Turns unknown data (storage, imported JSON, legacy v1 drafts) into a valid document.
 * Never throws: anything unusable falls back to a sane default.
 */
export function normalizeDocument(raw: unknown): TablatureDocument {
    const record = asRecord(raw) ?? {}
    const tuning = toSafeTuning(record.tuning, record.instrument)
    const stringCount = tuning.strings.length
    const columnsPerMeasure = clampColumns(Number(record.columnsPerMeasure) || DEFAULT_TAB_COLUMNS_PER_MEASURE)

    const rawMeasures = Array.isArray(record.measures) ? record.measures.slice(0, MAX_TAB_MEASURES) : []
    const measures = rawMeasures.map((measure) => toSafeMeasure(measure, stringCount, columnsPerMeasure))
    if (measures.length === 0) {
        measures.push(...Array.from({ length: DEFAULT_TAB_MEASURE_COUNT }, () => createEmptyMeasure(stringCount, columnsPerMeasure)))
    }

    const now = Date.now()
    const createdAt = Number(record.createdAt)
    const updatedAt = Number(record.updatedAt)
    const signature = Array.isArray(record.timeSignature) ? record.timeSignature.map(Number) : null
    const hasSignature =
        signature !== null && signature.length === 2 && signature.every((n) => Number.isInteger(n) && n > 0 && n <= 64)

    return {
        id: typeof record.id === 'string' && record.id ? record.id : createTabId(),
        title: toSafeTitle(record.title),
        artist: typeof record.artist === 'string' ? record.artist.trim().slice(0, 120) : '',
        tuning,
        capo: toSafeCapo(record.capo),
        bpm: toSafeBpm(record.bpm),
        // Legacy drafts used a quarter-note grid by default.
        quantization: toSafeQuantization(record.quantization ?? 4),
        columnsPerMeasure,
        ...(hasSignature ? { timeSignature: [signature[0], signature[1]] as [number, number] } : {}),
        measures,
        createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : now,
        updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : now,
    }
}

export const TAB_JSON_FORMAT = 'guitare-trainer-tab'
export const TAB_JSON_VERSION = 1

export interface StoredTablature {
    format: typeof TAB_JSON_FORMAT
    version: number
    id: string
    title: string
    artist: string
    tuning: TabTuning
    capo: number
    bpm: number
    quantization: Quantization
    columnsPerMeasure: number
    timeSignature?: [number, number]
    measures: StoredMeasure[]
    createdAt: number
    updatedAt: number
}

/** Compact, versioned representation used for storage and for the JSON export. */
export function serializeTablature(doc: TablatureDocument): StoredTablature {
    return {
        format: TAB_JSON_FORMAT,
        version: TAB_JSON_VERSION,
        id: doc.id,
        title: doc.title,
        artist: doc.artist,
        tuning: { ...doc.tuning, strings: [...doc.tuning.strings] },
        capo: doc.capo,
        bpm: doc.bpm,
        quantization: doc.quantization,
        columnsPerMeasure: doc.columnsPerMeasure,
        ...(doc.timeSignature ? { timeSignature: doc.timeSignature } : {}),
        measures: doc.measures.map((measure) => {
            const notes: [number, number, string][] = []
            measure.rows.forEach((row, stringIndex) => {
                row.forEach((cell, column) => {
                    if (cell !== '') notes.push([stringIndex, column, cell])
                })
            })
            return { c: measureColumns(measure), n: notes }
        }),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    }
}

/** Copy of a document under a new identity (used by "duplicate" and by imports). */
export function cloneAsNewTablature(doc: TablatureDocument, overrides: Partial<TablatureDocument> = {}): TablatureDocument {
    const now = Date.now()
    return {
        ...doc,
        tuning: { ...doc.tuning, strings: [...doc.tuning.strings] },
        measures: doc.measures.map(cloneMeasure),
        ...overrides,
        id: createTabId(),
        createdAt: now,
        updatedAt: now,
    }
}
