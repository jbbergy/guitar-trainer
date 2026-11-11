import { describe, it, expect, beforeEach } from 'vitest'
import { useTabEditor } from '@/renderer/composables/useTabEditor'
import { useTabLibrary } from '@/renderer/composables/useTabLibrary'
import { createEmptyTablature, normalizeDocument, parseCell, sanitizeCell } from '@/utils/tab/model'
import { getTuningById } from '@/utils/tab/tunings'
import { collectTabEvents, decomposeTicks, measureTimeSignature, measureToBeats } from '@/utils/tab/rhythm'
import type { TabTuning } from '@/types/tablature'

const tuning = (id: string) => getTuningById(id) as TabTuning
const newEditor = (id = 'guitar-standard') =>
    useTabEditor(createEmptyTablature(tuning(id), { measureCount: 2, columnsPerMeasure: 4 }))

describe('cells', () => {
    it('sanitises free input', () => {
        expect(sanitizeCell(' 07 ')).toBe('7')
        expect(sanitizeCell('5H')).toBe('5h')
        expect(sanitizeCell('X')).toBe('x')
        expect(sanitizeCell('25')).toBe('')
        expect(sanitizeCell('abc')).toBe('')
        expect(parseCell('12/')).toEqual({ fret: 12, technique: '/' })
        expect(parseCell('x')).toEqual({ fret: null, technique: '' })
    })

    it('upgrades drafts of the previous editor', () => {
        const doc = normalizeDocument({
            title: 'Old', instrument: 'ukulele', columnsPerMeasure: 4, bpm: 100,
            measures: [{ rows: [['3', '', '', ''], ['', 'x', '', ''], ['', '', '', ''], ['', '', '', '12']] }],
        })
        expect(doc.tuning.id).toBe('ukulele-standard')
        expect(doc.quantization).toBe(4)
        expect(doc.measures[0].rows[3][3]).toBe('12')
    })
})

describe('useTabEditor', () => {
    it('types one and two digit frets and techniques', () => {
        const editor = newEditor()
        editor.typeDigit(1)
        editor.typeDigit(2)
        expect(editor.getCell(5, 0)).toBe('12')
        editor.applyTechnique('h')
        expect(editor.getCell(5, 0)).toBe('12h')
        editor.moveCursor(0, 1)
        editor.typeDigit(3)
        editor.typeDigit(4)
        expect(editor.getCell(5, 1)).toBe('4')
        expect(editor.applyTechnique('p')).toBe(true)
        editor.moveCursor(0, 1)
        expect(editor.applyTechnique('p')).toBe(false)
    })

    it('undoes and redoes', () => {
        const editor = newEditor()
        editor.typeDigit(5)
        editor.moveCursor(0, 1)
        editor.typeDead()
        expect(editor.undo()).toBe(true)
        expect(editor.getCell(5, 1)).toBe('')
        expect(editor.getCell(5, 0)).toBe('5')
        expect(editor.redo()).toBe(true)
        expect(editor.getCell(5, 1)).toBe('x')
        editor.undo()
        editor.undo()
        expect(editor.canUndo.value).toBe(false)
    })

    it('copies a block and pastes it, adding measures when needed', () => {
        const editor = newEditor()
        editor.setCell(5, 0, '3')
        editor.setCell(4, 1, '5')
        editor.setCursor(5, 0)
        editor.setCursor(4, 1, true)
        editor.copy()
        editor.setCursor(5, 7)
        expect(editor.paste()).toBe(true)
        expect(editor.document.value.measures).toHaveLength(3)
        expect(editor.getCell(5, 7)).toBe('3')
        expect(editor.getCell(4, 8)).toBe('5')
    })

    it('adds a measure when walking past the end', () => {
        const editor = newEditor()
        editor.moveToDocumentEdge('end')
        editor.moveCursor(0, 1)
        expect(editor.document.value.measures).toHaveLength(3)
        expect(editor.cursor.value.column).toBe(8)
    })

    it('inserts and removes steps and measures', () => {
        const editor = newEditor()
        editor.setCell(0, 1, '2')
        editor.setCursor(0, 1)
        editor.insertColumn()
        expect(editor.document.value.measures[0].rows[0]).toEqual(['', '', '2', '', ''])
        editor.deleteColumn()
        expect(editor.document.value.measures[0].rows[0]).toEqual(['', '2', '', ''])
        editor.duplicateMeasures()
        expect(editor.document.value.measures).toHaveLength(3)
        expect(editor.document.value.measures[1].rows[0][1]).toBe('2')
        editor.deleteMeasures()
        expect(editor.document.value.measures).toHaveLength(2)
        editor.selectAll()
        editor.deleteMeasures()
        expect(editor.document.value.measures).toHaveLength(1)
    })

    it('splits and merges the grid without changing the music', () => {
        const editor = newEditor()
        editor.setCell(0, 1, '2')
        expect(editor.refineGrid()).toBe(true)
        expect(editor.document.value.quantization).toBe(16)
        expect(editor.document.value.measures[0].rows[0][2]).toBe('2')
        expect(editor.coarsenGrid()).toBe(true)
        expect(editor.document.value.quantization).toBe(8)
        expect(editor.document.value.measures[0].rows[0][1]).toBe('2')
    })

    it('stamps chords on the cursor column', () => {
        const editor = newEditor('ukulele-standard')
        expect(editor.insertChord([0, 0, 0, 3])).toBe(true)
        expect([0, 1, 2, 3].map((s) => editor.getCell(s, 0))).toEqual(['0', '0', '0', '3'])
        expect(editor.insertChord([0, 0, 0])).toBe(false)
    })
})

describe('rhythm', () => {
    it('treats the note after a bend as its target', () => {
        const doc = createEmptyTablature(tuning('guitar-standard'), { measureCount: 1, columnsPerMeasure: 8 })
        doc.measures[0].rows[5] = ['7b', '9r', '7', '', '5h', '', '7', '']
        const [events] = collectTabEvents(doc.measures)
        expect(events.onsets.map((onset) => onset.column)).toEqual([0, 4, 6])
        expect(events.onsets[0].notes[0]).toMatchObject({ fret: 7, bend: 2, bendRelease: true })
        expect(events.onsets[2].notes[0].legato).toBe(true)
    })

    it('fills measures with standard note values', () => {
        expect(decomposeTicks(1200, 240).map((value) => value.ticks)).toEqual([960, 240])
        expect(decomposeTicks(640, 320)[0]).toMatchObject({ base: 4, triplet: true })
        const beats = measureToBeats({ columns: 8, onsets: [{ column: 2, notes: [] }] }, 8)
        expect(beats.reduce((sum, beat) => sum + beat.value.ticks, 0)).toBe(3840)
        expect(measureTimeSignature(6, 8)).toEqual([3, 4])
        expect(measureTimeSignature(6, 8, [6, 8])).toEqual([6, 8])
    })
})

describe('useTabLibrary', () => {
    beforeEach(() => globalThis.localStorage.clear())

    it('stores, lists, duplicates and deletes tablatures', () => {
        const library = useTabLibrary()
        const doc = createEmptyTablature(tuning('ukulele-baritone'), { title: 'Mine' })
        doc.measures[0].rows[0][0] = '5h'
        expect(library.save(doc)).not.toBeNull()

        expect(library.entries.value).toHaveLength(1)
        expect(library.entries.value[0]).toMatchObject({ title: 'Mine', tuningId: 'ukulele-baritone', noteCount: 1 })
        expect(library.load(doc.id)?.measures).toEqual(doc.measures)

        const copy = library.duplicate(doc.id)
        expect(copy?.title).toBe('Mine (copy)')
        expect(useTabLibrary().entries.value).toHaveLength(2)

        library.remove(doc.id)
        expect(library.entries.value.map((entry) => entry.id)).toEqual([copy?.id])
        expect(library.load(doc.id)).toBeNull()
    })

    it('brings old per-instrument drafts into the library once', () => {
        globalThis.localStorage.setItem('compose-document-v1:guitar', JSON.stringify({
            title: 'Old riff', instrument: 'guitar', columnsPerMeasure: 4,
            measures: [{ rows: [['3', '', '', ''], [], [], [], [], []] }],
        }))
        globalThis.localStorage.setItem('compose-document-v1:ukulele', JSON.stringify({ title: 'Empty', instrument: 'ukulele', measures: [] }))

        expect(useTabLibrary().entries.value.map((entry) => entry.title)).toEqual(['Old riff'])
        expect(useTabLibrary().entries.value).toHaveLength(1)
        expect(globalThis.localStorage.getItem('compose-document-v1:guitar')).not.toBeNull()
    })
})
