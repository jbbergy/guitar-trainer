import { describe, it, expect } from 'vitest'
import { findStaves, layoutPdfPage, pageTextLines, type PdfPageGeometry, type PdfText } from '@/utils/tab/pdfLayout'
import { parseAsciiTab } from '@/utils/tab/asciiImport'

/** A 4-line tab staff (lines at y 100…124) with two bars, plus a 5-line notation staff above it. */
const page = (texts: PdfText[]): PdfPageGeometry => ({
    width: 600,
    height: 800,
    texts,
    segments: [
        ...[100, 108, 116, 124].map((y) => ({ x1: 50, y1: y, x2: 550, y2: y })),
        ...[200, 205, 210, 215, 220].map((y) => ({ x1: 50, y1: y, x2: 550, y2: y })),
        ...[50, 300, 550].map((x) => ({ x1: x, y1: 100, x2: x, y2: 124 })),
        // A note stem: too short to be a bar line.
        { x1: 120, y1: 90, x2: 120, y2: 110 },
        // Page frame.
        { x1: 0, y1: 0, x2: 600, y2: 0 },
    ],
})

/** A fret number centred on a string (0 = lowest line) at a given x. */
const digit = (str: string, string: number, x: number, height = 9): PdfText =>
    ({ str, x: x - 2.5 * str.length, y: 100 + string * 8 - height * 0.35, width: 5 * str.length, height })

describe('findStaves', () => {
    it('finds evenly spaced groups of long lines and ignores the page frame', () => {
        const staves = findStaves(page([]))
        expect(staves.map((staff) => staff.lines.length)).toEqual([5, 4])
        expect(staves[1]).toMatchObject({ left: 50, right: 550 })
    })
})

describe('layoutPdfPage', () => {
    it('reads numbers on the tab staff and splits measures at bar lines', () => {
        const layout = layoutPdfPage(page([
            digit('0', 3, 80), digit('2', 1, 110), digit('1', 2, 140), digit('12', 1, 170),
            digit('3', 3, 330), digit('0', 0, 330), digit('5', 2, 390),
            // Not on the staff: a measure number and a title.
            digit('7', 5, 60), { str: 'My tune', x: 200, y: 700, width: 120, height: 24 },
        ]))

        expect(layout?.stringCount).toBe(4)
        expect(layout?.measures).toHaveLength(2)
        const [first, second] = layout?.measures ?? []
        expect(first.rows[3][0]).toBe('0')
        expect(first.rows[1].filter(Boolean)).toEqual(['2', '12'])
        expect(first.rows[2].filter(Boolean)).toEqual(['1'])
        // A chord shares one column.
        expect(second.rows[3][0]).toBe('3')
        expect(second.rows[0][0]).toBe('0')
        expect(second.rows[2].indexOf('5')).toBeGreaterThan(0)
    })

    it('gives longer gaps more steps', () => {
        const layout = layoutPdfPage(page([digit('0', 3, 80), digit('1', 3, 100), digit('2', 3, 120), digit('3', 3, 160), digit('4', 3, 180)]))
        expect(layout?.measures[0].rows[3].slice(0, 6)).toEqual(['0', '1', '2', '', '3', '4'])
    })

    it('ignores small numbers such as grace notes and joins split two-digit frets', () => {
        const layout = layoutPdfPage(page([
            digit('0', 3, 80), digit('3', 3, 110), digit('5', 3, 140), digit('1', 3, 95, 6),
            { ...digit('1', 2, 200), x: 197.5 }, { ...digit('0', 2, 200), x: 202.6 },
        ]))
        expect(layout?.measures[0].rows[3].filter(Boolean)).toEqual(['0', '3', '5'])
        expect(layout?.measures[0].rows[2].filter(Boolean)).toEqual(['10'])
    })

    it('returns null when the page has no number on a staff', () => {
        expect(layoutPdfPage(page([{ str: 'Lyrics only', x: 60, y: 400, width: 80, height: 10 }]))).toBeNull()
    })
})

describe('repeat signs in engraved PDFs', () => {
    const notes = [digit('0', 3, 80), digit('2', 3, 140), digit('3', 3, 330), digit('5', 3, 390)]
    const dotPair = (x: number) => [{ x, y: 108 }, { x, y: 116 }]

    it('reads dots after a bar line as a repeat start and before one as a repeat end', () => {
        const layout = layoutPdfPage({ ...page(notes), dots: [...dotPair(56), ...dotPair(544)] })
        expect(layout?.measures.map((m) => [m.repeatStart ?? false, m.repeatEnd ?? 0])).toEqual([[true, 0], [false, 2]])
    })

    it('reads a back-to-back sign and ignores single dots such as dotted notes', () => {
        const layout = layoutPdfPage({ ...page(notes), dots: [...dotPair(294), ...dotPair(306), { x: 400, y: 112 }] })
        expect(layout?.measures.map((m) => [m.repeatStart ?? false, m.repeatEnd ?? 0])).toEqual([[false, 2], [true, 0]])
    })

    it('reads first and second endings written above the staff', () => {
        const layout = layoutPdfPage({
            ...page([...notes, { str: '1.', x: 56, y: 134, width: 6, height: 7 }, { str: '2.', x: 306, y: 134, width: 6, height: 7 }]),
            dots: dotPair(294),
        })
        expect(layout?.measures.map((m) => [m.ending, m.repeatEnd])).toEqual([[1, 2], [2, undefined]])
    })
})

describe('pageTextLines', () => {
    it('rebuilds lines top to bottom so text tabs saved as PDF can be parsed', () => {
        const rows = ['Ukulélé low-G (GCEA, sol grave)', 'A|-0---2---3---|', 'E|-------------|', 'C|-0-----------|', 'G|-------------|']
        const texts = rows.map((str, index) => ({ str, x: 40, y: 700 - index * 10, width: 300, height: index === 0 ? 14 : 9 }))
        const text = pageTextLines({ width: 600, height: 800, texts: [...texts].reverse(), segments: [] }).map((line) => line.text).join('\n')

        const { document } = parseAsciiTab(text)
        expect(document.title).toBe('Ukulélé low-G (GCEA, sol grave)')
        expect(document.tuning.id).toBe('ukulele-low-g')
        expect(document.measures[0].rows[3].filter(Boolean)).toEqual(['0', '2', '3'])
    })
})

describe('rhythm of engraved PDFs', () => {
    /** A stem under a number of the tab staff, from below the staff up to its string. */
    const stem = (x: number) => ({ x1: x, y1: 80, x2: x, y2: 110 })
    const flag = (x: number) => ({ minX: x, maxX: x + 6, minY: 80, maxY: 96, curved: true })
    const beam = (fromX: number, toX: number) => ({ minX: fromX - 0.3, maxX: toX + 0.3, minY: 80, maxY: 82.5, curved: false })

    it('reads quarters, flagged eighths, beamed eighths and dotted notes from stems under the tab', () => {
        // First measure (x 50…300): quarter, eighth (flag), two beamed eighths, dotted quarter → 8 eighths.
        const xs = [80, 110, 150, 180, 220]
        const base = page(xs.map((x, index) => digit(String(index), 3, x)))
        const layout = layoutPdfPage({
            ...base,
            segments: [...base.segments, ...xs.map(stem)],
            shapes: [flag(110), beam(150, 180)],
            dots: [{ x: 223, y: 82 }],
        })

        expect(layout?.measures[0].rows[3]).toEqual(['0', '', '1', '2', '3', '4', '', ''])
    })

    it('reads note lengths from a notation staff written above the tab', async () => {
        const { readPdfPage, buildPdfMeasures } = await import('@/utils/tab/pdfLayout')
        const glyph = (code: number, x: number, y: number): PdfText => ({ str: String.fromCharCode(code), x, y, width: 6, height: 20 })
        // Quarter, two eighths (flags), half — in 4/4, with the time signature and a tempo mark.
        const xs = [80, 130, 160, 200]
        const base = page(xs.map((x, index) => digit(String(index), 3, x)))
        const reading = readPdfPage({
            ...base,
            texts: [
                ...base.texts,
                ...xs.map((x, index) => glyph(index === 3 ? 0xe0a3 : 0xe0a4, x - 3, 205)),
                glyph(0xe240, 133, 228), glyph(0xe240, 163, 228),
                glyph(0xe084, 60, 214), glyph(0xe084, 60, 204),
                glyph(0xeca5, 60, 240), { str: '= 96', x: 70, y: 240, width: 20, height: 8 },
            ],
            segments: [...base.segments, ...xs.map((x) => ({ x1: x + 3, y1: 205, x2: x + 3, y2: 230 }))],
        })

        expect(reading?.timeSignature).toEqual([4, 4])
        expect(reading?.bpm).toBe(96)
        const built = buildPdfMeasures(reading?.measures ?? [], 4, reading?.timeSignature)
        expect(built.quantization).toBe(8)
        expect(built.readMeasures).toBe(1)
        expect(built.measures[0].rows[3]).toEqual(['0', '', '1', '2', '3', '', '', ''])
    })

    it('shares the measure length along the spacing when the rhythm cannot be read', async () => {
        const { readPdfPage, buildPdfMeasures } = await import('@/utils/tab/pdfLayout')
        const reading = readPdfPage(page([digit('0', 3, 80), digit('1', 3, 160), digit('2', 3, 200), digit('3', 3, 240)]))
        const built = buildPdfMeasures(reading?.measures ?? [], 4, [4, 4])
        expect(built.readMeasures).toBe(0)
        expect(built.measures[0].rows[3]).toHaveLength(8)
        expect(built.measures[0].rows[3].filter(Boolean)).toEqual(['0', '1', '2', '3'])
        // The widest gap gets the longest note.
        expect(built.measures[0].rows[3].indexOf('1')).toBeGreaterThanOrEqual(2)
    })
})
