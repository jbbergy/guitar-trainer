import type { Instrument } from './chord'

export interface TabMeasure {
    rows: string[][]
}

export interface TablatureDocument {
    title: string
    instrument: Instrument
    columnsPerMeasure: number
    measuresPerLine: number
    measures: TabMeasure[]
}

export const DEFAULT_TAB_COLUMNS_PER_MEASURE = 4
export const DEFAULT_TAB_MEASURE_COUNT = 4
export const DEFAULT_TAB_MEASURES_PER_LINE = 4
