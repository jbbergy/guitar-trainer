import { describe, it, expect } from 'vitest'
import { looksLikeAsciiTab, parseAsciiTab, TabImportError } from '@/utils/tab/asciiImport'
import { tablatureToAscii } from '@/utils/tab/asciiExport'
import { createEmptyTablature } from '@/utils/tab/model'
import { getTuningById } from '@/utils/tab/tunings'
import type { TabTuning } from '@/types/tablature'

const tuning = (id: string) => getTuningById(id) as TabTuning

/** Notes of a measure as "string:column:cell" strings, for compact assertions. */
const notesOf = (rows: string[][]): string[] =>
    rows.flatMap((row, stringIndex) => row.flatMap((cell, column) => (cell ? [`${stringIndex}:${column}:${cell}`] : [])))

describe('parseAsciiTab — guitar', () => {
    const text = [
        'Smoke Test',
        'Artist: Somebody',
        'Capo 2nd fret',
        'Tempo: 96 bpm',
        '',
        '[Intro]',
        'e|-0---2---3---5---|-----------------|',
        'B|-----------------|-1---1---3---3---|',
        'G|-----------------|-----------------|',
        'D|-----------------|-----------------|',
        'A|-----------------|-----------------|',
        'E|-3---------------|-----------------|',
        '',
        'some lyrics that are not a tab',
    ].join('\n')

    it('detects text tablatures', () => {
        expect(looksLikeAsciiTab(text)).toBe(true)
        expect(looksLikeAsciiTab('Just a few words\nand a second line')).toBe(false)
    })

    it('reads metadata, tuning and measures', () => {
        const { document, warnings } = parseAsciiTab(text)

        expect(warnings).toEqual([])
        expect(document.title).toBe('Smoke Test')
        expect(document.artist).toBe('Somebody')
        expect(document.capo).toBe(2)
        expect(document.bpm).toBe(96)
        expect(document.tuning.id).toBe('guitar-standard')
        expect(document.measures).toHaveLength(2)
    })

    it('reduces regular spacing to one column per time step', () => {
        const { document } = parseAsciiTab(text)

        // 16 characters per measure, notes every 4 characters → 4 columns.
        expect(document.measures[0].rows[0]).toHaveLength(4)
        expect(notesOf(document.measures[0].rows)).toEqual(['0:0:3', '5:0:0', '5:1:2', '5:2:3', '5:3:5'])
        expect(notesOf(document.measures[1].rows)).toEqual(['4:0:1', '4:1:1', '4:2:3', '4:3:3'])
        expect(document.quantization).toBe(4)
    })

    it('throws a readable error when the text holds no tablature', () => {
        expect(() => parseAsciiTab('hello world')).toThrow(TabImportError)
    })
})

describe('parseAsciiTab — notation details', () => {
    it('reads two-digit frets, techniques and muted notes', () => {
        const { document } = parseAsciiTab([
            'e|-10-12-x--7~-|',
            'B|-5h7-7p5-5/7-|',
            'G|-7b9-9r7-----|',
            'D|-------------|',
            'A|-------------|',
            'E|-------------|',
        ].join('\n'))

        const cells = document.measures.flatMap((measure) => measure.rows.flatMap((row) => row.filter(Boolean)))
        expect(cells).toEqual(expect.arrayContaining(['10', '12', 'x', '7~', '5h', '7p', '5/', '7b', '9r']))
    })

    it('resolves "s" slides from the direction of the next note', () => {
        const { document } = parseAsciiTab(['e|-5s7---7s5---|', 'B|-------------|', 'G|-------------|'].join('\n'))
        const cells = document.measures[0].rows[2].filter(Boolean)
        expect(cells).toEqual(['5/', '7', '7\\', '5'])
    })

    it('keeps a chord on one column when digits are right-aligned', () => {
        const { document } = parseAsciiTab([
            'e|-10--12--|',
            'B|--8--10--|',
            'G|--9--11--|',
        ].join('\n'))

        const columns = document.measures[0].rows[2].map((cell, column) => (cell ? column : -1)).filter((c) => c >= 0)
        expect(columns).toHaveLength(2)
        expect(document.measures[0].rows[1][columns[0]]).toBe('8')
        expect(document.measures[0].rows[0][columns[0]]).toBe('9')
    })

    it('handles tabs without labels or bar lines', () => {
        const { document } = parseAsciiTab([
            '---0---2---3---5---0---2---3---5---0---2---',
            '-------------------------------------------',
            '-------------------------------------------',
            '-------------------------------------------',
        ].join('\n'), { preferredFamily: 'ukulele' })

        expect(document.tuning.id).toBe('ukulele-standard')
        expect(document.measures.length).toBeGreaterThanOrEqual(1)
        expect(document.measures.flatMap((m) => m.rows[3]).filter(Boolean)).toEqual(['0', '2', '3', '5', '0', '2', '3', '5', '0', '2'])
    })

    it('reads several staves and ignores text between them', () => {
        const { document } = parseAsciiTab([
            'A|-0-2-|', 'E|-----|', 'C|-----|', 'G|-----|',
            '   C        G',
            'la la la',
            'A|-3-5-|', 'E|-----|', 'C|-----|', 'G|-----|',
        ].join('\n'))

        expect(document.measures).toHaveLength(2)
        expect(document.measures[1].rows[3].filter(Boolean)).toEqual(['3', '5'])
    })

    it('splits staves stacked without blank lines', () => {
        const stave = ['e|-0---0-|', 'B|-1---1-|', 'G|-0---0-|', 'D|-2---2-|', 'A|-3---3-|', 'E|-------|']
        const { document } = parseAsciiTab([...stave, ...stave].join('\n'))
        expect(document.tuning.strings).toHaveLength(6)
        expect(document.measures).toHaveLength(2)
    })

    it('skips annotations after the last bar line', () => {
        const { document } = parseAsciiTab(['e|-0-2-|  x2', 'B|-----|', 'G|-----|'].join('\n'))
        expect(document.measures).toHaveLength(1)
        expect(document.measures[0].rows[2].filter(Boolean)).toEqual(['0', '2'])
    })
})

describe('parseAsciiTab — tuning detection', () => {
    const lines = (labels: string[]) => labels.map((label) => `${label}|-0---2---|`).join('\n')

    it('recognises the ukulele from its string labels', () => {
        expect(parseAsciiTab(lines(['A', 'E', 'C', 'G'])).document.tuning.id).toBe('ukulele-standard')
    })

    it('recognises the baritone ukulele (DGBE)', () => {
        expect(parseAsciiTab(lines(['E', 'B', 'G', 'D'])).document.tuning.id).toBe('ukulele-baritone')
    })

    it('recognises drop D on the guitar', () => {
        expect(parseAsciiTab(lines(['e', 'B', 'G', 'D', 'A', 'D'])).document.tuning.id).toBe('guitar-drop-d')
    })

    it('builds a custom tuning for unknown labels', () => {
        const { document } = parseAsciiTab(lines(['e', 'B', 'G', 'D', 'A', 'C']))
        expect(document.tuning.id).toBe('custom')
        expect(document.tuning.strings[0]).toBe(36)
    })

    it('honours an explicit tuning when the string count matches', () => {
        const { document } = parseAsciiTab(lines(['A', 'E', 'C', 'G']), { tuning: tuning('ukulele-low-g') })
        expect(document.tuning.id).toBe('ukulele-low-g')
    })
})

describe('tablatureToAscii', () => {
    it('renders the highest string first with labels and bar lines', () => {
        const doc = createEmptyTablature(tuning('ukulele-standard'), { title: 'Uke', measureCount: 1, columnsPerMeasure: 4 })
        doc.measures[0].rows[3][0] = '3'
        doc.measures[0].rows[0][2] = '0'

        const text = tablatureToAscii(doc, { includeHeader: false })
        expect(text.split('\n')).toEqual([
            'A|-3-------|',
            'E|---------|',
            'C|---------|',
            'G|-----0---|',
        ])
    })

    it('wraps long tablatures into several staves', () => {
        const doc = createEmptyTablature(tuning('guitar-standard'), { measureCount: 12, columnsPerMeasure: 16 })
        const text = tablatureToAscii(doc, { includeHeader: false, lineWidth: 80 })
        const staves = text.split('\n\n')
        expect(staves.length).toBeGreaterThan(1)
        staves.forEach((stave) => stave.split('\n').forEach((line) => expect(line.length).toBeLessThanOrEqual(80)))
    })

    it('round-trips through the importer without losing anything', () => {
        const doc = createEmptyTablature(tuning('ukulele-baritone'), {
            title: 'Round trip', artist: 'Tester', bpm: 132, quantization: 16, capo: 3, measureCount: 3, columnsPerMeasure: 16,
        })
        doc.measures[0].rows[3][0] = '12'
        doc.measures[0].rows[2][4] = '5h'
        doc.measures[0].rows[2][6] = '7'
        doc.measures[1].rows[0][15] = 'x'
        doc.measures[2].rows[1][8] = '10/'
        doc.measures[2].rows[1][10] = '12~'

        const { document, warnings } = parseAsciiTab(tablatureToAscii(doc))

        expect(warnings).toEqual([])
        expect(document.title).toBe('Round trip')
        expect(document.artist).toBe('Tester')
        expect(document.bpm).toBe(132)
        expect(document.capo).toBe(3)
        expect(document.quantization).toBe(16)
        expect(document.tuning.id).toBe('ukulele-baritone')
        expect(document.measures).toEqual(doc.measures)
    })

    it('round-trips a sparse tablature thanks to the grid header', () => {
        const doc = createEmptyTablature(tuning('guitar-standard'), { measureCount: 2, columnsPerMeasure: 8, quantization: 8 })
        doc.measures[0].rows[5][0] = '3'
        doc.measures[1].rows[5][4] = '5'

        const { document } = parseAsciiTab(tablatureToAscii(doc))
        expect(document.measures).toEqual(doc.measures)
    })
})

describe('repeat signs', () => {
    const marks = (text: string) =>
        parseAsciiTab(text).document.measures.map((m) => `${m.repeatStart ? '|:' : ''}${m.repeatEnd ?? ''}`)

    it('reads |: and :| around measures', () => {
        expect(marks([
            'e|:-0---2---|-3---5---:|-0---0---|',
            'B|:---------|---------:|---------|',
            'G|:---------|---------:|---------|',
        ].join('\n'))).toEqual(['|:', '2', ''])
    })

    it('reads repeat dots written with stars and a play count', () => {
        expect(marks([
            'e||--0---2---|-3---5---||  x3',
            'B||*---------|--------*||',
            'G||*---------|--------*||',
            'D||----------|---------||',
        ].join('\n'))).toEqual(['|:', '3'])
    })

    it('repeats the whole staff when only "x2" is written', () => {
        expect(marks(['e|-0---2---|-3---5---| x2', 'B|---------|---------|', 'G|---------|---------|'].join('\n'))).toEqual(['|:', '2'])
    })

    it('keeps the notes next to the dots', () => {
        const { document } = parseAsciiTab(['e|:0---2---|-3---5:|', 'B|:--------|------:|', 'G|:--------|------:|'].join('\n'))
        expect(document.measures.map((m) => m.rows[2].filter(Boolean))).toEqual([['0', '2'], ['3', '5']])
    })

    it('round-trips repeats through the text export', () => {
        const doc = createEmptyTablature(tuning('guitar-standard'), { measureCount: 4, columnsPerMeasure: 4, quantization: 8 })
        doc.measures[0].rows[5][0] = '3'
        doc.measures[0].repeatStart = true
        doc.measures[1].rows[5][3] = '5'
        doc.measures[1].repeatEnd = 3
        doc.measures[2].repeatStart = true
        doc.measures[3].repeatEnd = 2

        const text = tablatureToAscii(doc)
        expect(text).toContain('|:3-------|-------5:| x3')
        expect(parseAsciiTab(text).document.measures).toEqual(doc.measures)
    })
})
