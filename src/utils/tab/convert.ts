import type { TabMeasure, TabTuning, TablatureDocument } from '@/types/tablature'
import { arrangePitchedMeasures, type ArrangeReport, type PitchedMeasure, type PitchedNote } from './arrange'
import { cloneAsNewTablature, measureColumns, parseCell, repeatMarks } from './model'

export interface ConvertOptions {
    /** Transposition in semitones applied before the notes are laid out (default 0 = same key) */
    transpose?: number
    /**
     * Copy fingerings as they are onto the strings shared by both instruments instead of
     * keeping the key (guitar shapes on a ukulele sound a fourth higher). Only possible
     * when the tunings share their string intervals; `transpose` is then ignored.
     */
    keepShapes?: boolean
    /**
     * Shift everything by whole octaves so that as many notes as possible fall in the
     * range of the target instrument (default true). Notes still out of range afterwards
     * are moved one by one.
     */
    autoOctave?: boolean
    /** Highest fret the arrangement may use (default depends on the instrument) */
    maxFret?: number
    /** Capo of the converted tablature (default 0) */
    capo?: number
}

export interface ConvertReport extends ArrangeReport {
    /** Total transposition actually applied, octave shift included */
    semitones: number
}

export interface ConvertResult {
    document: TablatureDocument
    report: ConvertReport
}

export function defaultMaxFret(tuning: TabTuning): number {
    if (tuning.family === 'ukulele') return tuning.id === 'ukulele-baritone' ? 17 : 15
    if (tuning.family === 'bass') return 20
    return 19
}

/**
 * Transposition that lets fingerings carry over unchanged between two instruments:
 * the interval separating their strings once both are aligned on the highest string
 * (guitar → ukulele: +5 semitones; guitar → baritone ukulele: 0).
 * Returns null when the two tunings do not share the same string intervals.
 */
export function shapePreservingTranspose(source: TabTuning, target: TabTuning): number | null {
    const shared = Math.min(source.strings.length, target.strings.length)
    const sourceTop = source.strings.slice(-shared)
    const targetTop = target.strings.slice(-shared)
    const mod = (value: number) => ((value % 12) + 12) % 12

    const interval = mod(targetTop[shared - 1] - sourceTop[shared - 1])
    const consistent = sourceTop.every((pitch, index) => mod(targetTop[index] - pitch) === interval)
    if (!consistent) return null
    return interval > 6 ? interval - 12 : interval
}

/**
 * Reads a tablature as pitches, independently of the instrument it was written for.
 * With `fixedStringOffset`, notes whose string exists on the target instrument
 * (source string + offset ≥ 0) keep their exact string and fret.
 */
export function toPitchedMeasures(doc: TablatureDocument, transpose = 0, fixedStringOffset?: number): PitchedMeasure[] {
    return doc.measures.map((measure) =>
        Array.from({ length: measureColumns(measure) }, (_unused, column) =>
            measure.rows.flatMap((row, stringIndex) => {
                const parsed = parseCell(row[column])
                if (!parsed) return []
                const note: PitchedNote = {
                    pitch: parsed.fret === null ? 0 : doc.tuning.strings[stringIndex] + doc.capo + parsed.fret + transpose,
                    dead: parsed.fret === null,
                    technique: parsed.technique,
                    sourceString: stringIndex,
                    sourceFret: parsed.fret ?? undefined,
                }
                if (fixedStringOffset !== undefined && parsed.fret !== null && stringIndex + fixedStringOffset >= 0) {
                    note.fixed = { string: stringIndex + fixedStringOffset, fret: parsed.fret }
                }
                return [note]
            })
        )
    )
}

/**
 * Octave shift (in semitones) that keeps the melody — the highest note of each chord —
 * inside [lowest, highest] as often as possible. The smallest shift wins ties, so the
 * accompaniment is folded note by note rather than pushed up as a whole.
 */
function bestOctaveShift(measures: PitchedMeasure[], lowest: number, highest: number): number {
    const melody = measures.flatMap((columns) =>
        columns.flatMap((notes) => {
            const pitches = notes.filter((note) => !note.dead).map((note) => note.pitch)
            return pitches.length > 0 ? [Math.max(...pitches)] : []
        })
    )
    let best = 0
    let bestCount = -1
    for (const shift of [0, 12, -12, 24, -24]) {
        const count = melody.filter((pitch) => pitch + shift >= lowest && pitch + shift <= highest).length
        if (count > bestCount) {
            best = shift
            bestCount = count
        }
    }
    return best
}

export interface LayOutOptions {
    capo?: number
    maxFret?: number
    autoOctave?: boolean
    sourceStringCount?: number
}

/**
 * Lays pitches out on an instrument, first moving everything by whole octaves when
 * that keeps more of the melody in range. Used by conversions and by imports of
 * scores written in standard notation only.
 */
export function layOutPitches(
    pitched: PitchedMeasure[],
    target: TabTuning,
    options: LayOutOptions = {}
): { measures: TabMeasure[]; report: ArrangeReport; octave: number } {
    const capo = options.capo ?? 0
    const maxFret = options.maxFret ?? defaultMaxFret(target)
    const openStrings = target.strings.map((pitch) => pitch + capo)
    const octave =
        options.autoOctave === false ? 0 : bestOctaveShift(pitched, Math.min(...openStrings), Math.max(...openStrings) + maxFret)
    const shifted =
        octave === 0
            ? pitched
            : pitched.map((columns) => columns.map((notes) => notes.map((note) => ({ ...note, pitch: note.pitch + octave }))))

    return { ...arrangePitchedMeasures(shifted, { openStrings, maxFret, sourceStringCount: options.sourceStringCount }), octave }
}

/**
 * Rewrites a tablature for another instrument or tuning (guitar ↔ ukulele ↔ baritone
 * ukulele, alternate tunings…). The original document is left untouched.
 */
export function convertTablature(doc: TablatureDocument, target: TabTuning, options: ConvertOptions = {}): ConvertResult {
    const capo = options.capo ?? 0
    const maxFret = options.maxFret ?? defaultMaxFret(target)
    const openStrings = target.strings.map((pitch) => pitch + capo)

    // Same string intervals and no transposition asked: fingerings can simply be copied.
    const shapeInterval = shapePreservingTranspose(doc.tuning, target)
    const keepShapes =
        shapeInterval !== null && (options.keepShapes ?? (shapeInterval === 0 && (options.transpose ?? 0) === 0 && doc.capo === capo))

    let measures: TabMeasure[]
    let report: ArrangeReport
    let semitones: number
    if (keepShapes) {
        // Real interval between the highest strings (re-entrant strings may sit an octave off).
        const top = target.strings.length - 1
        semitones = target.strings[top] + capo - (doc.tuning.strings[doc.tuning.strings.length - 1] + doc.capo)
        const pitched = toPitchedMeasures(doc, semitones, target.strings.length - doc.tuning.strings.length)
        ;({ measures, report } = arrangePitchedMeasures(pitched, { openStrings, maxFret, sourceStringCount: doc.tuning.strings.length }))
    } else {
        const laidOut = layOutPitches(toPitchedMeasures(doc, options.transpose ?? 0), target, {
            capo,
            maxFret,
            autoOctave: options.autoOctave,
            sourceStringCount: doc.tuning.strings.length,
        })
        measures = laidOut.measures
        report = laidOut.report
        semitones = (options.transpose ?? 0) + laidOut.octave
    }

    // Repeat signs belong to the measures, whatever the instrument.
    measures = measures.map((measure, index) => ({ ...measure, ...repeatMarks(doc.measures[index] ?? {}) }))

    return {
        document: cloneAsNewTablature(doc, { tuning: { ...target, strings: [...target.strings] }, capo, measures }),
        report: { ...report, semitones },
    }
}
