import type * as AlphaTab from '@coderline/alphatab'
import {
    MAX_TAB_COLUMNS_PER_MEASURE,
    MAX_TAB_FRET,
    MAX_TAB_MEASURES,
    type Quantization,
    type TabInstrumentFamily,
    type TabMeasure,
    type TabTechnique,
    type TabTuning,
    type TablatureDocument,
} from '@/types/tablature'
import { tablatureToAlphaTex } from './alphaTex'
import type { PitchedMeasure } from './arrange'
import { TabImportError } from './asciiImport'
import { layOutPitches } from './convert'
import { createEmptyMeasure, createEmptyTablature, formatCell } from './model'
import { createTuningFromStrings, getDefaultTuning } from './tunings'

type AlphaTabModule = typeof AlphaTab
type Score = AlphaTab.model.Score
type Staff = AlphaTab.model.Staff
type Note = AlphaTab.model.Note

let alphaTabPromise: Promise<AlphaTabModule> | null = null

/** alphaTab is large: it is only loaded when a Guitar Pro / MusicXML file is read or written. */
export const loadAlphaTab = (): Promise<AlphaTabModule> => {
    alphaTabPromise ??= import('@coderline/alphatab')
    return alphaTabPromise
}

export interface ScoreImportOptions {
    preferredFamily?: TabInstrumentFamily
    fallbackTitle?: string
    /** Instrument used for staves written in standard notation only (no tablature) */
    notationTuning?: TabTuning
}

export interface ScoreImportResult {
    documents: TablatureDocument[]
    warnings: string[]
}

const TICKS_PER_WHOLE = 3840
const GRID_CANDIDATES: Quantization[] = [8, 12, 16, 24, 32]
const FALLBACK_GRID: Quantization = 16

interface RawNote {
    bar: number
    tick: number
    note: Note
}

/** Coarsest grid on which every note onset and every bar line falls exactly. */
function chooseGrid(onsets: number[], barTicks: number[]): { quantization: Quantization; exact: boolean } {
    for (const quantization of GRID_CANDIDATES) {
        const step = TICKS_PER_WHOLE / quantization
        if (onsets.every((tick) => tick % step === 0) && barTicks.every((ticks) => ticks % step === 0)) {
            return { quantization, exact: true }
        }
    }
    return { quantization: FALLBACK_GRID, exact: false }
}

function techniqueOf(note: Note): TabTechnique | '' {
    if (note.isHammerPullOrigin && note.hammerPullDestination) {
        return note.hammerPullDestination.fret >= note.fret ? 'h' : 'p'
    }
    // SlideOutType: 1 shift, 2 legato, 3 out up, 4 out down
    const slide = note.slideOutType as number
    if ((slide === 1 || slide === 2) && note.slideTarget) return note.slideTarget.fret >= note.fret ? '/' : '\\'
    if (slide === 3) return '/'
    if (slide === 4) return '\\'
    if (note.hasBend) return 'b'
    if ((note.vibrato as number) !== 0) return '~'
    return ''
}

/** alphaTab hands some titles back with non-breaking spaces. */
const cleanText = (text: string | null | undefined): string => (text ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()

const mostCommon = (values: number[]): number => {
    const counts = new Map<number, number>()
    values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0
}

function staffToDocument(
    score: Score,
    staff: Staff,
    options: ScoreImportOptions,
    warnings: string[]
): TablatureDocument | null {
    const trackName = cleanText(staff.track.name) || `Track ${staff.track.index + 1}`
    const masterBars = score.masterBars.slice(0, MAX_TAB_MEASURES)
    if (score.masterBars.length > MAX_TAB_MEASURES) {
        warnings.push(`${trackName}: only the first ${MAX_TAB_MEASURES} measures were imported.`)
    }

    const raw: RawNote[] = []
    staff.bars.slice(0, masterBars.length).forEach((bar, barIndex) => {
        for (const voice of bar.voices) {
            for (const beat of voice.beats) {
                if (beat.isRest || beat.isEmpty || (beat.graceType as number) !== 0) continue
                for (const note of beat.notes) {
                    if (!note.isTieDestination) raw.push({ bar: barIndex, tick: beat.displayStart, note })
                }
            }
        }
    })
    if (raw.length === 0) return null

    const barTicks = masterBars.map((masterBar) => masterBar.calculateDuration())
    const { quantization, exact } = chooseGrid(raw.map((entry) => entry.tick), barTicks)
    if (!exact) warnings.push(`${trackName}: the rhythm was rounded to a 16th-note grid.`)
    const step = TICKS_PER_WHOLE / quantization

    const widths = barTicks.map((ticks) => Math.max(1, Math.min(MAX_TAB_COLUMNS_PER_MEASURE, Math.round(ticks / step))))
    const columnOf = (entry: RawNote) => Math.min(widths[entry.bar] - 1, Math.max(0, Math.round(entry.tick / step)))

    const strings = [...staff.tuning].reverse()
    const stringed = strings.length > 0 && !staff.isPercussion
    let tuning: TabTuning
    let measures: TabMeasure[]
    let collisions = 0

    if (stringed) {
        tuning = createTuningFromStrings(strings)
        measures = widths.map((width) => createEmptyMeasure(strings.length, width))
        const bendTargets: { bar: number; string: number; column: number; fret: number }[] = []

        for (const entry of raw) {
            const stringIndex = entry.note.string - 1
            const row = measures[entry.bar].rows[stringIndex]
            const column = columnOf(entry)
            if (!row) continue
            if (row[column] !== '') {
                collisions++
                continue
            }
            if (entry.note.isDead) {
                row[column] = 'x'
                continue
            }
            const fret = Math.max(0, Math.min(MAX_TAB_FRET, entry.note.fret))
            const technique = techniqueOf(entry.note)
            row[column] = formatCell(fret, technique)

            if (technique === 'b') {
                const quarterTones = Math.max(0, ...(entry.note.bendPoints ?? []).map((point) => point.value))
                const semitones = Math.round(quarterTones / 2)
                if (semitones > 0) bendTargets.push({ bar: entry.bar, string: stringIndex, column: column + 1, fret: fret + semitones })
            }
        }

        // "7b9": write the pitch reached by a bend in the next free step.
        for (const target of bendTargets) {
            const row = measures[target.bar].rows[target.string]
            if (target.column < row.length && row[target.column] === '' && target.fret <= MAX_TAB_FRET) {
                row[target.column] = formatCell(target.fret)
            }
        }
    } else {
        // Standard notation only: choose strings and frets for the requested instrument.
        tuning = options.notationTuning ?? getDefaultTuning(options.preferredFamily ?? 'guitar')
        const pitched: PitchedMeasure[] = widths.map((width) => Array.from({ length: width }, () => []))
        for (const entry of raw) {
            if (staff.isPercussion) continue
            pitched[entry.bar][columnOf(entry)].push({ pitch: entry.note.realValue, dead: false, technique: '' })
        }
        const laidOut = layOutPitches(pitched, tuning)
        measures = laidOut.measures
        if (laidOut.report.totalNotes === 0) return null
        const moved = laidOut.report.octaveShifted + (laidOut.octave !== 0 ? 1 : 0)
        warnings.push(
            `${trackName}: written in standard notation, fingerings were generated for ${tuning.name}` +
            (moved > 0 ? ' (some notes were moved by an octave).' : '.')
        )
    }

    if (collisions > 0) warnings.push(`${trackName}: ${collisions} note(s) overlapped another note and were dropped.`)

    const first = masterBars[0]
    const document = createEmptyTablature(tuning, {
        title: cleanText(score.title) || options.fallbackTitle || 'Imported tablature',
        artist: cleanText(score.artist),
        bpm: score.tempo,
        capo: stringed ? staff.capo : 0,
        quantization,
        columnsPerMeasure: mostCommon(widths),
    })
    document.measures = measures
    if (first) document.timeSignature = [first.timeSignatureNumerator, first.timeSignatureDenominator]
    return document
}

/** Converts a score loaded by alphaTab into one tablature per playable track. */
export function scoreToDocuments(score: Score, options: ScoreImportOptions = {}): ScoreImportResult {
    const warnings: string[] = []
    const documents: { document: TablatureDocument; trackName: string }[] = []

    for (const track of score.tracks) {
        const staff = track.staves.find((candidate) => !candidate.isPercussion)
        if (!staff) continue
        const document = staffToDocument(score, staff, options, warnings)
        if (document) documents.push({ document, trackName: cleanText(track.name) })
    }

    if (documents.length > 1) {
        documents.forEach(({ document, trackName }, index) => {
            document.title = `${document.title} — ${trackName || `Track ${index + 1}`}`.slice(0, 120)
        })
    }
    return { documents: documents.map((entry) => entry.document), warnings }
}

/**
 * Reads a Guitar Pro (3 to 8), MusicXML, Capella or alphaTex file.
 * Throws a TabImportError when alphaTab does not recognise the data.
 */
export async function importScoreBytes(bytes: Uint8Array, options: ScoreImportOptions = {}): Promise<ScoreImportResult> {
    const alphaTab = await loadAlphaTab()
    let score: Score
    try {
        score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(bytes, new alphaTab.Settings())
    } catch (error) {
        throw new TabImportError(
            error instanceof Error && error.message ? `This file could not be read: ${error.message}` : 'This file format is not supported.'
        )
    }

    const result = scoreToDocuments(score, options)
    if (result.documents.length === 0) {
        throw new TabImportError('This file does not contain any guitar or ukulele track with notes.')
    }
    return result
}

/** Writes a Guitar Pro 7+ (.gp) file. */
export async function tablatureToGuitarPro(doc: TablatureDocument): Promise<Uint8Array> {
    const alphaTab = await loadAlphaTab()
    const settings = new alphaTab.Settings()
    const score = alphaTab.importer.ScoreLoader.loadAlphaTex(tablatureToAlphaTex(doc), settings)
    return new alphaTab.exporter.Gp7Exporter().export(score, settings)
}
