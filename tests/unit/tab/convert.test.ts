import { describe, it, expect } from 'vitest'
import { convertTablature, shapePreservingTranspose, toPitchedMeasures } from '@/utils/tab/convert'
import { arrangePitchedMeasures, foldPitch } from '@/utils/tab/arrange'
import { createEmptyTablature, parseCell } from '@/utils/tab/model'
import { getTuningById } from '@/utils/tab/tunings'
import type { TabTuning, TablatureDocument } from '@/types/tablature'

const tuning = (id: string) => getTuningById(id) as TabTuning
const GUITAR = tuning('guitar-standard')
const UKULELE = tuning('ukulele-standard')
const LOW_G = tuning('ukulele-low-g')
const BARITONE = tuning('ukulele-baritone')

/** One-measure tablature whose columns are chords given as fret arrays (lowest string first, null = silent). */
const tabOf = (source: TabTuning, ...chords: (number | string | null)[][]): TablatureDocument => {
    const doc = createEmptyTablature(source, { measureCount: 1, columnsPerMeasure: chords.length })
    chords.forEach((chord, column) => {
        chord.forEach((fret, stringIndex) => {
            if (fret !== null) doc.measures[0].rows[stringIndex][column] = String(fret)
        })
    })
    return doc
}

const column = (doc: TablatureDocument, index: number): string[] => doc.measures[0].rows.map((row) => row[index])

/** Sorted sounding pitches of one column. */
const pitches = (doc: TablatureDocument, index: number): number[] =>
    doc.measures[0].rows
        .flatMap((row, stringIndex) => {
            const parsed = parseCell(row[index])
            return parsed && parsed.fret !== null ? [doc.tuning.strings[stringIndex] + doc.capo + parsed.fret] : []
        })
        .sort((a, b) => a - b)

const pitchClasses = (doc: TablatureDocument, index: number): number[] =>
    [...new Set(pitches(doc, index).map((pitch) => pitch % 12))].sort((a, b) => a - b)

describe('shapePreservingTranspose', () => {
    it('is a fourth up from guitar to ukulele', () => {
        expect(shapePreservingTranspose(GUITAR, UKULELE)).toBe(5)
        expect(shapePreservingTranspose(GUITAR, LOW_G)).toBe(5)
    })

    it('is zero from guitar to baritone ukulele', () => {
        expect(shapePreservingTranspose(GUITAR, BARITONE)).toBe(0)
    })

    it('is a fourth down from ukulele to guitar or baritone', () => {
        expect(shapePreservingTranspose(UKULELE, GUITAR)).toBe(-5)
        expect(shapePreservingTranspose(UKULELE, BARITONE)).toBe(-5)
    })

    it('is null when string intervals differ', () => {
        expect(shapePreservingTranspose(GUITAR, tuning('guitar-dadgad'))).toBeNull()
    })
})

describe('foldPitch', () => {
    it('moves notes by octaves into the range', () => {
        expect(foldPitch(40, 60, 84)).toEqual({ pitch: 64, octaves: 2 })
        expect(foldPitch(96, 60, 84)).toEqual({ pitch: 84, octaves: -1 })
        expect(foldPitch(70, 60, 84)).toEqual({ pitch: 70, octaves: 0 })
    })
})

describe('convertTablature — guitar to baritone ukulele', () => {
    it('keeps fingerings on the four high strings', () => {
        // D chord (xx0232) then a melody on the B and high E strings.
        const source = tabOf(GUITAR, [null, null, 0, 2, 3, 2], [null, null, null, null, 1, null], [null, null, null, null, null, 3])
        const { document, report } = convertTablature(source, BARITONE)

        expect(document.tuning.id).toBe('ukulele-baritone')
        expect(column(document, 0)).toEqual(['0', '2', '3', '2'])
        expect(column(document, 1)).toEqual(['', '', '1', ''])
        expect(column(document, 2)).toEqual(['', '', '', '3'])
        expect(report.semitones).toBe(0)
        expect(report.octaveShifted).toBe(0)
    })

    it('moves bass notes up an octave and keeps the harmony', () => {
        // G major (320003): the low strings do not exist on a baritone.
        const source = tabOf(GUITAR, [3, 2, 0, 0, 0, 3])
        const { document, report } = convertTablature(source, BARITONE)

        expect(column(document, 0)).toEqual(['0', '0', '0', '3'])
        expect(pitchClasses(document, 0)).toEqual([2, 7, 11])
        expect(report.merged).toBe(2)
        expect(report.dropped).toBe(0)
        expect(document.measures[0].rows).toHaveLength(4)
    })
})

describe('convertTablature — guitar to ukulele', () => {
    it('keeps the key by default', () => {
        const source = tabOf(GUITAR, [null, 3, 2, 0, 1, 0]) // C major
        const { document } = convertTablature(source, UKULELE)

        expect(pitchClasses(document, 0)).toEqual([0, 4, 7])
        const [low, high] = [Math.min(...pitches(document, 0)), Math.max(...pitches(document, 0))]
        expect(low).toBeGreaterThanOrEqual(60)
        expect(high).toBeLessThanOrEqual(69 + 15)
    })

    it('turns guitar shapes into the same ukulele shapes a fourth higher', () => {
        // Guitar G (320003) played with ukulele strings gives the C shape 0003.
        const source = tabOf(GUITAR, [3, 2, 0, 0, 0, 3])
        const { document, report } = convertTablature(source, UKULELE, { keepShapes: true })

        expect(column(document, 0)).toEqual(['0', '0', '0', '3'])
        expect(report.semitones).toBe(5)
        expect(report.dropped).toBe(0)
    })

    it('keeps a melody playable and in order', () => {
        const source = tabOf(GUITAR, [null, null, null, 0, null, null], [null, null, null, 2, null, null], [null, null, null, null, 0, null], [null, null, null, null, 1, null])
        const { document } = convertTablature(source, UKULELE)

        const melody = [0, 1, 2, 3].map((index) => pitches(document, index)[0])
        expect(melody).toHaveLength(4)
        // Intervals of the melody (G A B C) are preserved.
        expect(melody.map((pitch) => pitch - melody[0])).toEqual([0, 2, 4, 5])
    })
})

describe('convertTablature — ukulele to guitar', () => {
    it('keeps the same notes', () => {
        const source = tabOf(UKULELE, [0, 0, 0, 3], [2, 0, 1, 0]) // C then F
        const { document, report } = convertTablature(source, GUITAR)

        expect(document.tuning.id).toBe('guitar-standard')
        expect(pitches(document, 0)).toEqual(pitches(source, 0))
        // The re-entrant G string doubles the open A: both become a single note.
        expect(pitches(document, 1)).toEqual([...new Set(pitches(source, 1))])
        expect(report.merged).toBe(1)
        expect(report.dropped).toBe(0)
        expect(document.measures[0].rows).toHaveLength(6)
    })

    it('gives guitar shapes a fourth lower when asked to keep fingerings', () => {
        const source = tabOf(UKULELE, [0, 0, 0, 3])
        const { document, report } = convertTablature(source, GUITAR, { keepShapes: true })
        expect(column(document, 0)).toEqual(['', '', '0', '0', '0', '3'])
        expect(report.semitones).toBe(-5)
    })

    it('keeps doubled notes of a re-entrant tuning when fingerings are copied', () => {
        const source = tabOf(UKULELE, [2, 0, 1, 0])
        const { document } = convertTablature(source, LOW_G, { keepShapes: true })
        expect(column(document, 0)).toEqual(['2', '0', '1', '0'])
    })
})

describe('convertTablature — details', () => {
    it('does not modify the source and gives the copy a new identity', () => {
        const source = tabOf(GUITAR, [3, 2, 0, 0, 0, 3])
        const snapshot = JSON.stringify(source)
        const { document } = convertTablature(source, UKULELE)

        expect(JSON.stringify(source)).toBe(snapshot)
        expect(document.id).not.toBe(source.id)
        expect(document.title).toBe(source.title)
    })

    it('carries techniques and keeps linked notes on one string', () => {
        const source = tabOf(GUITAR, [null, null, null, null, '5h', null], [null, null, null, null, 7, null])
        const { document } = convertTablature(source, BARITONE)

        expect(column(document, 0)).toEqual(['', '', '5h', ''])
        expect(column(document, 1)).toEqual(['', '', '7', ''])
    })

    it('keeps muted notes when a string is available', () => {
        const source = tabOf(GUITAR, [null, null, null, 'x', 'x', 'x'])
        const { document } = convertTablature(source, UKULELE)
        expect(column(document, 0).filter((cell) => cell === 'x')).toHaveLength(3)
    })

    it('takes the capo of the source into account', () => {
        const source = tabOf(GUITAR, [null, null, null, null, null, 0])
        source.capo = 2
        const { document } = convertTablature(source, BARITONE)
        expect(pitches(document, 0)).toEqual([66])
    })

    it('respects the maximum fret', () => {
        const source = tabOf(GUITAR, [null, null, null, null, null, 19])
        const { document } = convertTablature(source, UKULELE, { maxFret: 12 })
        const frets = column(document, 0).filter(Boolean).map(Number)
        expect(frets.every((fret) => fret <= 12)).toBe(true)
    })

    it('thins out chords larger than the instrument', () => {
        const source = tabOf(GUITAR, [0, 2, 2, 1, 0, 0]) // E major, six notes
        const { document, report } = convertTablature(source, UKULELE)
        expect(column(document, 0).filter(Boolean).length).toBeLessThanOrEqual(4)
        expect(pitchClasses(document, 0)).toEqual([4, 8, 11])
        expect(report.totalNotes).toBe(6)
    })
})

describe('arrangePitchedMeasures', () => {
    it('lays plain pitches out on an instrument', () => {
        const source = tabOf(GUITAR, [null, 3, null, null, null, null])
        const { measures } = arrangePitchedMeasures(toPitchedMeasures(source).map((cols) =>
            cols.map((notes) => notes.map(({ pitch, dead, technique }) => ({ pitch, dead, technique })))
        ), { openStrings: GUITAR.strings, maxFret: 19 })

        expect(measures[0].rows.map((row) => row[0])).toEqual(['', '3', '', '', '', ''])
    })
})
