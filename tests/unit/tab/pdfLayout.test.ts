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
