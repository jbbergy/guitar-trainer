import type { Quantization, TabMeasure, TabTechnique } from '@/types/tablature'
import { measureColumns, parseCell } from './model'

/** MIDI resolution used everywhere: 960 ticks per quarter note. */
export const TICKS_PER_QUARTER = 960
const TICKS_PER_WHOLE = TICKS_PER_QUARTER * 4

/** Maximum distance (in columns) between a bend / release and the note it targets. */
const BEND_TARGET_MAX_DISTANCE = 2
const DEFAULT_BEND_SEMITONES = 2

export const columnTicks = (quantization: Quantization): number => TICKS_PER_WHOLE / quantization

/** Number of grid columns in one quarter-note beat (may be fractional for coarse grids). */
export const columnsPerBeat = (quantization: Quantization): number => quantization / 4

export interface TabNoteEvent {
    string: number
    /** Fret number, or null for a muted (dead) note */
    fret: number | null
    technique: TabTechnique | ''
    /** Bend amount in semitones (0 when the note is not bent) */
    bend: number
    bendRelease: boolean
    /** True when the note is reached by a hammer-on, pull-off or slide (soft attack) */
    legato: boolean
}

export interface TabOnset {
    column: number
    notes: TabNoteEvent[]
}

export interface TabMeasureEvents {
    columns: number
    onsets: TabOnset[]
}

/**
 * Turns the grid into playable events.
 * A note that follows a bend ("7b" then "9") or a release is the target of that bend:
 * it changes the pitch of the previous note and is not plucked again.
 */
export function collectTabEvents(measures: TabMeasure[]): TabMeasureEvents[] {
    const result: TabMeasureEvents[] = measures.map((measure) => ({ columns: measureColumns(measure), onsets: [] }))
    const onsetByColumn: Map<number, TabOnset>[] = measures.map(() => new Map())
    const stringCount = measures.reduce((max, measure) => Math.max(max, measure.rows.length), 0)

    for (let stringIndex = 0; stringIndex < stringCount; stringIndex++) {
        let link: { origin: TabNoteEvent; technique: TabTechnique; column: number } | null = null
        let globalColumn = 0

        measures.forEach((measure, measureIndex) => {
            const row = measure.rows[stringIndex] ?? []
            const width = measureColumns(measure)

            for (let column = 0; column < width; column++, globalColumn++) {
                const parsed = parseCell(row[column])
                if (!parsed) continue

                const activeLink = link
                link = null

                if (parsed.fret !== null && activeLink && (activeLink.technique === 'b' || activeLink.technique === 'r')) {
                    if (globalColumn - activeLink.column <= BEND_TARGET_MAX_DISTANCE) {
                        const origin = activeLink.origin
                        if (activeLink.technique === 'b') {
                            const delta = parsed.fret - (origin.fret ?? parsed.fret)
                            origin.bend = delta > 0 ? Math.min(delta, 5) : DEFAULT_BEND_SEMITONES
                        } else {
                            origin.bendRelease = true
                        }
                        if (parsed.technique === 'b' || parsed.technique === 'r') {
                            link = { origin, technique: parsed.technique, column: globalColumn }
                        }
                        continue
                    }
                }

                const event: TabNoteEvent = {
                    string: stringIndex,
                    fret: parsed.fret,
                    technique: parsed.technique,
                    bend: parsed.technique === 'b' ? DEFAULT_BEND_SEMITONES : 0,
                    bendRelease: false,
                    legato:
                        parsed.fret !== null &&
                        activeLink !== null &&
                        (activeLink.technique === 'h' || activeLink.technique === 'p' ||
                            activeLink.technique === '/' || activeLink.technique === '\\'),
                }

                let onset = onsetByColumn[measureIndex].get(column)
                if (!onset) {
                    onset = { column, notes: [] }
                    onsetByColumn[measureIndex].set(column, onset)
                }
                onset.notes.push(event)

                if (parsed.fret !== null && parsed.technique !== '' && parsed.technique !== '~') {
                    link = { origin: event, technique: parsed.technique, column: globalColumn }
                }
            }
        })
    }

    onsetByColumn.forEach((map, measureIndex) => {
        result[measureIndex].onsets = [...map.values()].sort((a, b) => a.column - b.column)
    })
    return result
}

// ── Notation ────────────────────────────────────────────────────────────────

export interface RhythmValue {
    ticks: number
    /** 1 = whole, 2 = half, 4 = quarter … 64 */
    base: number
    dots: 0 | 1
    /** True for a 3:2 tuplet member */
    triplet: boolean
}

const ALL_RHYTHM_VALUES: RhythmValue[] = [1, 2, 4, 8, 16, 32, 64]
    .flatMap((base): RhythmValue[] => {
        const plain = TICKS_PER_WHOLE / base
        return [
            { ticks: plain, base, dots: 0, triplet: false },
            { ticks: plain * 1.5, base, dots: 1, triplet: false },
            { ticks: (plain * 2) / 3, base, dots: 0, triplet: true },
        ]
    })
    .filter((value) => Number.isInteger(value.ticks))
    .sort((a, b) => b.ticks - a.ticks)

/**
 * Splits a duration into standard note values that all fall on the grid.
 * The first value is the longest one, so a note keeps as much of its length as possible.
 */
export function decomposeTicks(ticks: number, gridTicks: number): RhythmValue[] {
    const allowed = ALL_RHYTHM_VALUES.filter((value) => value.ticks % gridTicks === 0)
    const values: RhythmValue[] = []
    let remaining = ticks

    while (remaining > 0) {
        const exact = allowed.find((value) => value.ticks === remaining)
        const next = exact ?? allowed.find((value) => value.ticks <= remaining)
        if (!next) break
        values.push(next)
        remaining -= next.ticks
    }
    return values
}

export interface NotatedBeat {
    /** Start of the beat inside the measure, in ticks */
    startTicks: number
    value: RhythmValue
    /** Empty array for a rest */
    notes: TabNoteEvent[]
}

/** Converts one measure into a sequence of beats and rests that fills it exactly. */
export function measureToBeats(events: TabMeasureEvents, quantization: Quantization): NotatedBeat[] {
    const grid = columnTicks(quantization)
    const beats: NotatedBeat[] = []
    const boundaries = events.onsets.map((onset) => onset.column)

    const pushSegment = (startColumn: number, endColumn: number, notes: TabNoteEvent[]) => {
        let cursor = startColumn * grid
        decomposeTicks((endColumn - startColumn) * grid, grid).forEach((value, index) => {
            beats.push({ startTicks: cursor, value, notes: index === 0 ? notes : [] })
            cursor += value.ticks
        })
    }

    if (boundaries.length === 0 || boundaries[0] > 0) {
        pushSegment(0, boundaries[0] ?? events.columns, [])
    }
    events.onsets.forEach((onset, index) => {
        pushSegment(onset.column, boundaries[index + 1] ?? events.columns, onset.notes)
    })
    return beats
}

/**
 * Time signature of a measure deduced from its length.
 * The optional hint (kept from an import) wins when it describes the same duration.
 */
export function measureTimeSignature(
    columns: number,
    quantization: Quantization,
    hint?: [number, number]
): [number, number] {
    const total = columns * columnTicks(quantization)
    if (hint && hint[0] * (TICKS_PER_WHOLE / hint[1]) === total) {
        return hint
    }
    for (const denominator of [4, 8, 16, 32]) {
        const unit = TICKS_PER_WHOLE / denominator
        if (total % unit === 0) return [total / unit, denominator]
    }
    return [Math.max(1, Math.round(total / (TICKS_PER_WHOLE / 32))), 32]
}

/** Sounding MIDI pitch of a fretted note. */
export function notePitch(openStrings: number[], capo: number, stringIndex: number, fret: number): number {
    return (openStrings[stringIndex] ?? 0) + capo + fret
}
