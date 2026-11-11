// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
    exportLibraryBackup,
    exportTablature,
    importTablatureBytes,
    importTablatureText,
    safeFileName,
    TAB_EXPORT_FORMATS,
} from '@/utils/tab/formats'
import { TabImportError } from '@/utils/tab/asciiImport'
import { tablatureToAlphaTex } from '@/utils/tab/alphaTex'
import { tablatureToMidi, variableLength } from '@/utils/tab/midi'
import { tablatureToMusicXml } from '@/utils/tab/musicXml'
import { createEmptyTablature } from '@/utils/tab/model'
import { getTuningById } from '@/utils/tab/tunings'
import type { TabTuning, TablatureDocument } from '@/types/tablature'

const tuning = (id: string) => getTuningById(id) as TabTuning

const sample = (tuningId = 'guitar-standard'): TablatureDocument => {
    const doc = createEmptyTablature(tuning(tuningId), {
        title: 'Format test', artist: 'Unit', bpm: 90, quantization: 16, measureCount: 2, columnsPerMeasure: 16,
    })
    const top = doc.tuning.strings.length - 1
    doc.measures[0].rows[top][0] = '3'
    doc.measures[0].rows[top - 1][0] = '0'
    doc.measures[0].rows[top][4] = '5h'
    doc.measures[0].rows[top][6] = '7'
    doc.measures[0].rows[top - 1][8] = '10'
    doc.measures[0].rows[0][12] = 'x'
    doc.measures[1].rows[1][0] = '2/'
    doc.measures[1].rows[1][3] = '4'
    doc.measures[1].rows[top][8] = '12~'
    return doc
}

const asBytes = (data: string | Uint8Array): Uint8Array => (typeof data === 'string' ? new TextEncoder().encode(data) : data)

describe('export formats', () => {
    it('lists the popular formats with distinct extensions', () => {
        expect(TAB_EXPORT_FORMATS.map((format) => format.id)).toEqual(['ascii', 'guitarpro', 'musicxml', 'midi', 'alphatex', 'json'])
        expect(new Set(TAB_EXPORT_FORMATS.map((format) => format.extension)).size).toBe(TAB_EXPORT_FORMATS.length)
    })

    it('builds safe file names', () => {
        expect(safeFileName('Été à la plage / démo?')).toBe('Ete-a-la-plage-demo')
        expect(safeFileName('   ')).toBe('tablature')
    })

    it('names exported files after the title', async () => {
        const file = await exportTablature(sample(), 'ascii')
        expect(file.fileName).toBe('Format-test.txt')
        expect(typeof file.data).toBe('string')
    })
})

describe('Guitare Trainer JSON', () => {
    it('round-trips a tablature under a new identity', async () => {
        const doc = sample('ukulele-baritone')
        const file = await exportTablature(doc, 'json')
        const result = await importTablatureBytes(asBytes(file.data), file.fileName)

        expect(result.format).toBe('json')
        expect(result.documents).toHaveLength(1)
        expect(result.documents[0].id).not.toBe(doc.id)
        expect(result.documents[0].measures).toEqual(doc.measures)
        expect(result.documents[0].tuning.id).toBe('ukulele-baritone')
        expect(result.documents[0].title).toBe('Format test')
    })

    it('restores every tablature of a library backup', async () => {
        const backup = exportLibraryBackup([sample(), sample('ukulele-standard')])
        const result = await importTablatureText(backup.data as string)
        expect(result.documents.map((doc) => doc.tuning.id)).toEqual(['guitar-standard', 'ukulele-standard'])
    })
})

describe('text import', () => {
    it('detects ASCII tabs', async () => {
        const result = await importTablatureText(['A|-0-2-3-|', 'E|-------|', 'C|-------|', 'G|-------|'].join('\n'))
        expect(result.format).toBe('ascii')
        expect(result.documents[0].tuning.id).toBe('ukulele-standard')
    })

    it('uses the file name as a title when the text has none', async () => {
        const bytes = asBytes(['e|-0-2-3-|', 'B|-------|', 'G|-------|', 'D|-------|', 'A|-------|', 'E|-------|'].join('\n'))
        const result = await importTablatureBytes(bytes, '/somewhere/My_Song.tab')
        expect(result.documents[0].title).toBe('My Song')
    })

    it('reads .txt files with Windows line endings and Latin-1 accents', async () => {
        const text = ['Été indien', '', 'A|-0-2-3-|', 'E|-------|', 'C|-------|', 'G|-------|', ''].join('\r\n')
        const latin1 = Uint8Array.from([...text].map((char) => char.charCodeAt(0)))
        const result = await importTablatureBytes(latin1, 'ete.txt')
        expect(result.format).toBe('ascii')
        expect(result.documents[0].title).toBe('Été indien')
        expect(result.documents[0].measures[0].rows[3].filter(Boolean)).toEqual(['0', '2', '3'])
    })

    it('rejects unknown content and MIDI files with a clear message', async () => {
        await expect(importTablatureText('just some prose')).rejects.toBeInstanceOf(TabImportError)
        await expect(importTablatureBytes(tablatureToMidi(sample()), 'song.mid')).rejects.toThrow(/MIDI/)
        await expect(importTablatureBytes(new Uint8Array(), 'empty.gp')).rejects.toThrow(/empty/)
    })
})

describe('Guitar Pro (through alphaTab)', () => {
    it('exports a .gp archive and reads it back', async () => {
        const doc = sample()
        const file = await exportTablature(doc, 'guitarpro')
        const bytes = file.data as Uint8Array

        expect(file.fileName).toBe('Format-test.gp')
        expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK')

        const result = await importTablatureBytes(bytes, file.fileName)
        const imported = result.documents[0]

        expect(result.format).toBe('guitarpro')
        expect(imported.title).toBe('Format test')
        expect(imported.artist).toBe('Unit')
        expect(imported.bpm).toBe(90)
        expect(imported.tuning.id).toBe('guitar-standard')
        expect(imported.quantization).toBe(16)
        expect(imported.measures).toEqual(doc.measures)
    })

    it('keeps the ukulele tuning, the capo and odd measures', async () => {
        const doc = createEmptyTablature(tuning('ukulele-baritone'), {
            title: 'Six eight', capo: 2, quantization: 8, measureCount: 2, columnsPerMeasure: 6,
        })
        doc.timeSignature = [6, 8]
        doc.measures[0].rows[3][0] = '3'
        doc.measures[0].rows[2][0] = '0'
        doc.measures[0].rows[3][2] = '5p'
        doc.measures[0].rows[3][3] = '3'
        doc.measures[1].rows[0][1] = '2\\'
        doc.measures[1].rows[0][4] = '0'

        const file = await exportTablature(doc, 'guitarpro')
        const imported = (await importTablatureBytes(file.data as Uint8Array, file.fileName)).documents[0]

        expect(imported.tuning.id).toBe('ukulele-baritone')
        expect(imported.capo).toBe(2)
        expect(imported.timeSignature).toEqual([6, 8])
        expect(imported.measures).toEqual(doc.measures)
    })

    it('keeps a triplet grid', async () => {
        const doc = createEmptyTablature(tuning('guitar-standard'), { quantization: 12, measureCount: 1, columnsPerMeasure: 12 })
        ;[0, 1, 2, 3, 6, 8].forEach((column, index) => { doc.measures[0].rows[5][column] = String(index) })

        const file = await exportTablature(doc, 'guitarpro')
        const imported = (await importTablatureBytes(file.data as Uint8Array, file.fileName)).documents[0]

        expect(imported.quantization).toBe(12)
        expect(imported.measures).toEqual(doc.measures)
    })
})

describe('alphaTex', () => {
    it('writes notes, chords, rests and effects', () => {
        const tex = tablatureToAlphaTex(sample())
        expect(tex).toContain('\\title "Format test"')
        expect(tex).toContain('\\tuning E4 B3 G3 D3 A2 E2')
        expect(tex).toContain('(0.2 3.1).4')
        expect(tex).toContain('5.1{h}.8')
        expect(tex).toContain('x.6.4')
        expect(tex).toContain('12.1{v}.2')
    })

    it('is read back by the importer', async () => {
        const doc = sample('ukulele-standard')
        const result = await importTablatureText(tablatureToAlphaTex(doc))
        expect(result.format).toBe('alphatex')
        expect(result.documents[0].tuning.id).toBe('ukulele-standard')
        expect(result.documents[0].measures).toEqual(doc.measures)
    })
})

describe('MusicXML', () => {
    it('writes a TAB staff with string and fret numbers', () => {
        const xml = tablatureToMusicXml(sample())
        expect(xml).toContain('<score-partwise version="4.0">')
        expect(xml).toContain('<sign>TAB</sign>')
        expect(xml).toContain('<staff-lines>6</staff-lines>')
        expect(xml).toContain('<string>1</string><fret>3</fret>')
        expect(xml).toContain('<hammer-on type="start">H</hammer-on>')
        expect(xml).toContain('<work-title>Format test</work-title>')
    })

    it('escapes special characters', () => {
        const doc = sample()
        doc.title = 'Rock & <Roll>'
        expect(tablatureToMusicXml(doc)).toContain('<work-title>Rock &amp; &lt;Roll&gt;</work-title>')
    })

    it('is read back by the importer', async () => {
        const doc = sample()
        const result = await importTablatureText(tablatureToMusicXml(doc))
        const imported = result.documents[0]

        expect(result.format).toBe('musicxml')
        expect(imported.title).toBe('Format test')
        expect(imported.tuning.id).toBe('guitar-standard')
        expect(imported.measures).toEqual(doc.measures)
    })
})

describe('MIDI', () => {
    it('encodes variable-length quantities', () => {
        expect(variableLength(0)).toEqual([0])
        expect(variableLength(127)).toEqual([0x7f])
        expect(variableLength(128)).toEqual([0x81, 0x00])
        expect(variableLength(960)).toEqual([0x87, 0x40])
    })

    it('writes a format 1 file with a tempo track and the notes', () => {
        const doc = sample()
        const bytes = tablatureToMidi(doc)
        const text = String.fromCharCode(...bytes)

        expect(text.startsWith('MThd')).toBe(true)
        expect([...bytes.slice(8, 14)]).toEqual([0, 1, 0, 2, 0x03, 0xc0])
        expect(text.split('MTrk')).toHaveLength(3)

        // Tempo meta event: 90 BPM = 666 667 µs per quarter note.
        const tempo = text.indexOf('ÿQ\u0003')
        expect((bytes[tempo + 3] << 16) | (bytes[tempo + 4] << 8) | bytes[tempo + 5]).toBe(666667)

        // One note-on per sounding note (the muted note included).
        const noteOns = [...bytes].filter((byte, index) => byte === 0x90 && bytes[index + 2] > 0 && bytes[index + 1] < 128)
        expect(noteOns.length).toBeGreaterThanOrEqual(9)
    })
})

describe('repeats and alternate endings', () => {
    const withRepeats = (): TablatureDocument => {
        const doc = createEmptyTablature(tuning('guitar-standard'), { title: 'Repeats', quantization: 8, measureCount: 5, columnsPerMeasure: 8 })
        doc.measures.forEach((measure, index) => { measure.rows[5][0] = String(index) })
        doc.measures[0].repeatStart = true
        doc.measures[1].ending = 1
        doc.measures[1].repeatEnd = 2
        doc.measures[2].ending = 2
        doc.measures[3].repeatStart = true
        doc.measures[4].repeatEnd = 3
        return doc
    }
    const marksOf = (doc: TablatureDocument) =>
        doc.measures.map(({ repeatStart, repeatEnd, ending }) => ({ repeatStart, repeatEnd, ending }))

    it.each(['guitarpro', 'alphatex', 'musicxml', 'json'] as const)('survive a round trip through %s', async (format) => {
        const doc = withRepeats()
        const file = await exportTablature(doc, format)
        const imported = (await importTablatureBytes(asBytes(file.data), file.fileName)).documents[0]
        expect(marksOf(imported)).toEqual(marksOf(doc))
        expect(imported.measures.map((measure) => measure.rows[5][0])).toEqual(['0', '1', '2', '3', '4'])
    })

    it('are written out in full in MIDI files', () => {
        const doc = withRepeats()
        const plain = createEmptyTablature(tuning('guitar-standard'), { quantization: 8, measureCount: 5, columnsPerMeasure: 8 })
        plain.measures.forEach((measure, index) => { measure.rows[5][0] = String(index) })
        const noteOns = (bytes: Uint8Array) => [...bytes].filter((byte, index) => byte === 0x90 && bytes[index + 2] === 96).length
        // 0 1 | 0 2 | 3 4 ×3 → 10 notes instead of 5.
        expect(noteOns(tablatureToMidi(plain))).toBe(5)
        expect(noteOns(tablatureToMidi(doc))).toBe(10)
    })
})
