/**
 * Tablature data model shared by the editor, the library and every importer / exporter.
 *
 * A tablature is a grid: each measure holds one row per string and one cell per time step.
 * Row index 0 is always the lowest tab line (guitar low E, ukulele G string).
 */

export type TabInstrumentFamily = 'guitar' | 'ukulele' | 'bass' | 'other'

export interface TabTuning {
    /** Preset identifier, or 'custom' for tunings read from a file */
    id: string
    family: TabInstrumentFamily
    /** Human readable name, e.g. "Baritone ukulele (DGBE)" */
    name: string
    /** Open-string MIDI pitches, index 0 = lowest tab line */
    strings: number[]
}

/**
 * One cell of the grid, stored as a short canonical string:
 *   ''      empty step
 *   'x'     muted / dead note
 *   '7'     fret number (0–24)
 *   '5h'    fret followed by a technique suffix (see TabTechnique)
 */
export type TabCell = string

/**
 * Technique suffix attached to a note.
 *   h  hammer-on to the next note of the string
 *   p  pull-off to the next note of the string
 *   /  slide up to the next note      \  slide down to the next note
 *   b  bend (the next note of the string is the bend target, not a new pluck)
 *   r  release (same rule as the bend)
 *   ~  vibrato
 */
export type TabTechnique = 'h' | 'p' | '/' | '\\' | 'b' | 'r' | '~'

export interface TabMeasure {
    /** rows[stringIndex][column] — every row of a measure has the same length */
    rows: TabCell[][]
}

/**
 * Rhythmic value of one grid column expressed as a subdivision of a whole note.
 *   1  → ronde        (whole note)
 *   2  → blanche      (half note)
 *   4  → noire        (quarter note)
 *   8  → croche       (eighth note)
 *  12  → triolet de croches (eighth-note triplet)
 *  16  → double croche (sixteenth note)
 *  24  → triolet de doubles croches (sixteenth-note triplet)
 *  32  → triple croche (thirty-second note)
 */
export type Quantization = 1 | 2 | 4 | 8 | 12 | 16 | 24 | 32

export interface TablatureDocument {
    id: string
    title: string
    artist: string
    tuning: TabTuning
    capo: number
    bpm: number
    quantization: Quantization
    /** Number of columns given to newly created measures */
    columnsPerMeasure: number
    /** Optional time-signature hint kept from an import, e.g. [6, 8] */
    timeSignature?: [number, number]
    measures: TabMeasure[]
    createdAt: number
    updatedAt: number
}

export const DEFAULT_TAB_COLUMNS_PER_MEASURE = 8
export const DEFAULT_TAB_MEASURE_COUNT = 4
export const DEFAULT_TAB_BPM = 120
export const DEFAULT_TAB_QUANTIZATION: Quantization = 8
export const DEFAULT_TAB_TITLE = 'Untitled tablature'

export const MAX_TAB_FRET = 24
export const MAX_TAB_COLUMNS_PER_MEASURE = 64
export const MAX_TAB_MEASURES = 999
export const MAX_TAB_CAPO = 12
export const MIN_TAB_BPM = 20
export const MAX_TAB_BPM = 300

export const TAB_QUANTIZATIONS: Quantization[] = [1, 2, 4, 8, 12, 16, 24, 32]

export const TAB_QUANTIZATION_LABELS: Record<Quantization, string> = {
    1: 'Whole',
    2: 'Half',
    4: 'Quarter',
    8: 'Eighth',
    12: '8th triplet',
    16: '16th',
    24: '16th triplet',
    32: '32nd',
}
