import type { Instrument } from './chord'

export interface TabMeasure {
    rows: string[][]
}

/**
 * Rhythmic value of one grid column expressed as a subdivision of a whole note.
 *   1  → ronde        (whole note)
 *   2  → blanche      (half note)
 *   4  → noire        (quarter note)
 *   8  → croche       (eighth note)
 *  16  → double croche (sixteenth note)
 *  32  → triple croche (thirty-second note)
 */
export type Quantization = 1 | 2 | 4 | 8 | 16 | 32

export interface TablatureDocument {
    title: string
    instrument: Instrument
    columnsPerMeasure: number
    measuresPerLine: number
    bpm: number
    quantization: Quantization
    measures: TabMeasure[]
}

export const DEFAULT_TAB_COLUMNS_PER_MEASURE = 4
export const DEFAULT_TAB_MEASURE_COUNT = 4
export const DEFAULT_TAB_MEASURES_PER_LINE = 4
export const DEFAULT_TAB_BPM = 120
export const DEFAULT_TAB_QUANTIZATION: Quantization = 4
