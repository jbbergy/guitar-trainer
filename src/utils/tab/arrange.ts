import type { TabMeasure, TabTechnique } from '@/types/tablature'
import { formatCell, LINKING_TECHNIQUES } from './model'

/**
 * A note described by its sounding pitch instead of a string / fret position.
 * The arranger turns columns of such notes into a playable fingering for any tuning.
 */
export interface PitchedNote {
    /** Sounding MIDI pitch (ignored for dead notes) */
    pitch: number
    dead: boolean
    technique: TabTechnique | ''
    /** Position in the source tablature, when the note comes from one */
    sourceString?: number
    sourceFret?: number
    /** Forces the position of the note (used to copy fingerings as they are) */
    fixed?: { string: number; fret: number }
}

/** measures[measureIndex][column] = notes sounding together */
export type PitchedMeasure = PitchedNote[][]

export interface ArrangeOptions {
    /** Open-string MIDI pitches of the target instrument (capo included), lowest tab line first */
    openStrings: number[]
    maxFret: number
    /** String count of the source tablature, used to keep fingerings on matching strings */
    sourceStringCount?: number
}

export interface ArrangeReport {
    totalNotes: number
    /** Notes moved by one or more octaves to fit the instrument */
    octaveShifted: number
    /** Notes that became the same pitch as another note of their chord and were merged */
    merged: number
    /** Notes left out because the instrument has too few strings */
    dropped: number
}

export interface ArrangeResult {
    measures: TabMeasure[]
    report: ArrangeReport
}

interface Placement {
    string: number
    fret: number
}

interface Context {
    /** Average fretted position of the previous chord, null before the first one */
    position: number | null
    /** Target string last used by each source string, with whether it expects a linked note */
    lastBySource: Map<number, { string: number; linked: boolean }>
}

const MAX_SPAN = 4
const COST_DROP = 400
const COST_OCTAVE = 15
const COST_BROKEN_LINK = 30
const COST_SHAPE_BONUS = -4

/** Moves a pitch by octaves until it fits the instrument range. Returns the number of octaves moved. */
export function foldPitch(pitch: number, lowest: number, highest: number): { pitch: number; octaves: number } {
    let folded = pitch
    let octaves = 0
    while (folded < lowest) {
        folded += 12
        octaves++
    }
    while (folded > highest) {
        folded -= 12
        octaves--
    }
    // A range narrower than an octave may not contain the pitch class at all.
    return folded < lowest ? { pitch, octaves: 0 } : { pitch: folded, octaves }
}

/** Keeps at most `limit` notes: the melody, the bass, then as many different pitch classes as possible. */
function reduceChord(notes: PitchedNote[], limit: number): PitchedNote[] {
    if (notes.length <= limit) return notes
    if (limit <= 0) return []
    const sorted = [...notes].sort((a, b) => b.pitch - a.pitch)
    const kept: PitchedNote[] = [sorted[0]]
    if (limit > 1) kept.push(sorted[sorted.length - 1])

    const middle = sorted.slice(1, -1)
    const pitchClasses = new Set(kept.map((note) => note.pitch % 12))
    for (const fresh of [true, false]) {
        for (const note of middle) {
            if (kept.length >= limit) break
            if (kept.includes(note)) continue
            if (fresh && pitchClasses.has(note.pitch % 12)) continue
            kept.push(note)
            pitchClasses.add(note.pitch % 12)
        }
    }
    return kept
}

/** Index of the target string facing a source string when both instruments are aligned on their highest string. */
const alignedString = (sourceString: number, sourceCount: number, targetCount: number): number =>
    sourceString - (sourceCount - targetCount)

function arrangeChord(
    notes: PitchedNote[],
    options: ArrangeOptions,
    context: Context,
    report: ArrangeReport
): (Placement | null)[] {
    const { openStrings, maxFret } = options
    const stringCount = openStrings.length
    const sourceCount = options.sourceStringCount ?? stringCount

    // Fixed notes first, then the melody: the highest notes get the first choice of strings.
    const order = notes
        .map((_note, index) => index)
        .sort((a, b) => Number(Boolean(notes[b].fixed)) - Number(Boolean(notes[a].fixed)) || notes[b].pitch - notes[a].pitch)

    const candidatesFor = (note: PitchedNote): { placement: Placement | null; cost: number }[] => {
        if (note.fixed) return [{ placement: note.fixed, cost: 0 }]
        const list: { placement: Placement | null; cost: number }[] = []
        for (const octave of [0, 12, -12]) {
            for (let string = 0; string < stringCount; string++) {
                const fret = note.pitch + octave - openStrings[string]
                if (fret < 0 || fret > maxFret) continue

                let cost = octave === 0 ? 0 : COST_OCTAVE
                // Low positions and open strings are easier to play.
                cost += fret * 0.35
                if (note.sourceString !== undefined) {
                    const facing = alignedString(note.sourceString, sourceCount, stringCount)
                    if (facing === string && note.sourceFret === fret) cost += COST_SHAPE_BONUS
                    const previous = context.lastBySource.get(note.sourceString)
                    if (previous?.linked && previous.string !== string) cost += COST_BROKEN_LINK
                }
                list.push({ placement: { string, fret }, cost })
            }
        }
        list.push({ placement: null, cost: COST_DROP })
        return list.sort((a, b) => a.cost - b.cost)
    }

    const candidates = order.map((index) => candidatesFor(notes[index]))
    let best: { placements: (Placement | null)[]; cost: number } | null = null
    const current: (Placement | null)[] = []
    const used = new Set<number>()

    const chordCost = (): number => {
        const fretted = current.filter((p): p is Placement => p !== null && p.fret > 0).map((p) => p.fret)
        if (fretted.length === 0) return 0
        const low = Math.min(...fretted)
        const high = Math.max(...fretted)
        const span = high - low
        const average = fretted.reduce((sum, fret) => sum + fret, 0) / fretted.length
        let cost = span > MAX_SPAN ? 40 + (span - MAX_SPAN) * 25 : span * 1.5
        if (context.position !== null) cost += Math.abs(average - context.position) * 0.6
        return cost
    }

    const search = (depth: number, cost: number) => {
        if (best && cost >= best.cost) return
        if (depth === candidates.length) {
            const total = cost + chordCost()
            if (!best || total < best.cost) best = { placements: [...current], cost: total }
            return
        }
        for (const candidate of candidates[depth]) {
            if (candidate.placement && used.has(candidate.placement.string)) continue
            if (candidate.placement) used.add(candidate.placement.string)
            current.push(candidate.placement)
            search(depth + 1, cost + candidate.cost)
            current.pop()
            if (candidate.placement) used.delete(candidate.placement.string)
        }
    }
    search(0, 0)

    const placements: (Placement | null)[] = notes.map(() => null)
    const found = best as { placements: (Placement | null)[]; cost: number } | null
    order.forEach((noteIndex, depth) => {
        const placement = found?.placements[depth] ?? null
        placements[noteIndex] = placement
        if (!placement) report.dropped++
        else if (!notes[noteIndex].fixed && placement.fret + openStrings[placement.string] !== notes[noteIndex].pitch) {
            report.octaveShifted++
        }
    })
    return placements
}

/**
 * Lays pitched notes out on an instrument.
 * Out-of-range notes are moved by octaves, chords too large for the instrument are
 * thinned out, and each chord gets the fingering with the smallest stretch that stays
 * close to the previous hand position.
 */
export function arrangePitchedMeasures(measures: PitchedMeasure[], options: ArrangeOptions): ArrangeResult {
    const { openStrings, maxFret } = options
    const stringCount = openStrings.length
    const sourceCount = options.sourceStringCount ?? stringCount
    const lowest = Math.min(...openStrings)
    const highest = Math.max(...openStrings) + maxFret
    const report: ArrangeReport = { totalNotes: 0, octaveShifted: 0, merged: 0, dropped: 0 }
    const context: Context = { position: null, lastBySource: new Map() }

    const result: TabMeasure[] = measures.map((columns) => {
        const rows: string[][] = Array.from({ length: stringCount }, () => Array.from({ length: columns.length }, () => ''))

        columns.forEach((column, columnIndex) => {
            if (column.length === 0) return
            report.totalNotes += column.length

            // 1. Fixed notes keep their place; the others are folded into range and unisons
            //    are merged (the note coming from the highest source string wins).
            const pinned = column
                .filter((entry) => !entry.dead && entry.fixed)
                .map((note) => ({ ...note, pitch: openStrings[note.fixed!.string] + note.fixed!.fret }))
            const pinnedPitches = new Set(pinned.map((note) => note.pitch))
            const byPitch = new Map<number, PitchedNote>()
            for (const note of column.filter((entry) => !entry.dead && !entry.fixed)) {
                const folded = foldPitch(note.pitch, lowest, highest)
                const existing = byPitch.get(folded.pitch)
                if (pinnedPitches.has(folded.pitch) || existing) report.merged++
                else if (folded.octaves !== 0) report.octaveShifted++
                if (pinnedPitches.has(folded.pitch)) continue
                if (!existing || (note.sourceString ?? -1) > (existing.sourceString ?? -1)) {
                    byPitch.set(folded.pitch, { ...note, pitch: folded.pitch })
                }
            }

            // 2. Thin out chords that have more notes than the instrument has strings.
            const unique = [...byPitch.values()]
            const free = reduceChord(unique, Math.max(0, stringCount - pinned.length))
            const notes = [...pinned, ...free]
            report.dropped += unique.length - free.length

            // 3. Choose strings and frets.
            const placements = arrangeChord(notes, options, context, report)
            const fretted: number[] = []
            notes.forEach((note, index) => {
                const placement = placements[index]
                if (!placement) return
                rows[placement.string][columnIndex] = formatCell(placement.fret, note.technique)
                if (placement.fret > 0) fretted.push(placement.fret)
                if (note.sourceString !== undefined) {
                    context.lastBySource.set(note.sourceString, {
                        string: placement.string,
                        linked: LINKING_TECHNIQUES.has(note.technique),
                    })
                }
            })
            if (fretted.length > 0) {
                context.position = fretted.reduce((sum, fret) => sum + fret, 0) / fretted.length
            }

            // 4. Muted notes keep their place relative to the highest string when it is free.
            for (const note of column.filter((entry) => entry.dead)) {
                const facing = Math.max(0, alignedString(note.sourceString ?? stringCount - 1, sourceCount, stringCount))
                if (facing < stringCount && rows[facing][columnIndex] === '') rows[facing][columnIndex] = 'x'
                else report.dropped++
            }
        })

        return { rows }
    })

    return { measures: result, report }
}
