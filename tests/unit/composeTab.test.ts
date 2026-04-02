import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { createEmptyTablature, useComposeTab } from '@/renderer/composables/useComposeTab'
import type { Instrument } from '@/types/chord'

describe('useComposeTab', () => {
    beforeEach(() => {
        globalThis.localStorage.clear()
    })

    it('creates a default tablature based on instrument', () => {
        const guitarDoc = createEmptyTablature('guitar')
        const ukuleleDoc = createEmptyTablature('ukulele')

        expect(guitarDoc.instrument).toBe('guitar')
        expect(guitarDoc.measures).toHaveLength(4)
        expect(guitarDoc.measures[0].rows).toHaveLength(6)

        expect(ukuleleDoc.instrument).toBe('ukulele')
        expect(ukuleleDoc.measures[0].rows).toHaveLength(4)
    })

    it('auto-saves edits and restores them from localStorage', async () => {
        const instrument = ref<Instrument>('guitar')
        const compose = useComposeTab(instrument)

        compose.setTitle('My Draft')
        compose.setCell(0, 0, '3')
        compose.addMeasure()
        await nextTick()

        const restored = useComposeTab(instrument)

        expect(restored.document.value.title).toBe('My Draft')
        expect(restored.document.value.measures.length).toBe(5)
        expect(restored.getCell(0, 0)).toBe('3')
    })

    it('adapts tablature when instrument changes globally', async () => {
        const instrument = ref<Instrument>('guitar')
        const compose = useComposeTab(instrument)

        expect(compose.document.value.measures[0].rows).toHaveLength(6)

        instrument.value = 'ukulele'
        await nextTick()

        expect(compose.document.value.instrument).toBe('ukulele')
        expect(compose.document.value.measures[0].rows).toHaveLength(4)
    })

    it('resets persistent draft when creating a new tablature', async () => {
        const instrument = ref<Instrument>('guitar')
        const compose = useComposeTab(instrument)

        compose.setTitle('To Reset')
        compose.setCell(0, 0, '5')
        compose.newTablature()
        await nextTick()

        const restored = useComposeTab(instrument)

        expect(restored.document.value.title).toBe('Untitled tablature')
        expect(restored.getCell(0, 0)).toBe('')
    })

    it('updates notes per measure while preserving existing cells', () => {
        const instrument = ref<Instrument>('guitar')
        const compose = useComposeTab(instrument)

        compose.setCell(0, 0, '3')
        compose.setCell(0, 1, '5')
        compose.setCell(0, 3, '7')

        compose.setColumnsPerMeasure(2)

        expect(compose.document.value.columnsPerMeasure).toBe(2)
        expect(compose.getCell(0, 0)).toBe('3')
        expect(compose.getCell(0, 1)).toBe('5')

        compose.setColumnsPerMeasure(5)

        expect(compose.document.value.columnsPerMeasure).toBe(5)
        expect(compose.getCell(0, 0)).toBe('3')
        expect(compose.getCell(0, 1)).toBe('5')
        expect(compose.getCell(0, 2)).toBe('')
    })

    it('clamps notes per measure range', () => {
        const instrument = ref<Instrument>('guitar')
        const compose = useComposeTab(instrument)

        compose.setColumnsPerMeasure(0)
        expect(compose.document.value.columnsPerMeasure).toBe(1)

        compose.setColumnsPerMeasure(99)
        expect(compose.document.value.columnsPerMeasure).toBe(16)
    })

    it('persists separate drafts per instrument and restores each on switch', async () => {
        const instrument = ref<Instrument>('guitar')
        const compose = useComposeTab(instrument)

        compose.setTitle('Guitar Draft')
        compose.setCell(0, 0, '3')
        await nextTick()

        instrument.value = 'ukulele'
        await nextTick()

        expect(compose.document.value.instrument).toBe('ukulele')
        expect(compose.document.value.title).toBe('Untitled tablature')
        expect(compose.getCell(0, 0)).toBe('')

        compose.setTitle('Ukulele Draft')
        compose.setCell(0, 0, '2')
        await nextTick()

        instrument.value = 'guitar'
        await nextTick()

        expect(compose.document.value.instrument).toBe('guitar')
        expect(compose.document.value.title).toBe('Guitar Draft')
        expect(compose.getCell(0, 0)).toBe('3')

        instrument.value = 'ukulele'
        await nextTick()

        expect(compose.document.value.instrument).toBe('ukulele')
        expect(compose.document.value.title).toBe('Ukulele Draft')
        expect(compose.getCell(0, 0)).toBe('2')
    })

    it('new tablature resets only the current instrument draft', async () => {
        const instrument = ref<Instrument>('guitar')
        const compose = useComposeTab(instrument)

        compose.setTitle('Guitar Keep')
        compose.setCell(0, 0, '5')
        await nextTick()

        instrument.value = 'ukulele'
        await nextTick()
        compose.setTitle('Ukulele Keep')
        compose.setCell(0, 0, '7')
        await nextTick()

        compose.newTablature()
        await nextTick()

        expect(compose.document.value.instrument).toBe('ukulele')
        expect(compose.document.value.title).toBe('Untitled tablature')
        expect(compose.getCell(0, 0)).toBe('')

        instrument.value = 'guitar'
        await nextTick()

        expect(compose.document.value.instrument).toBe('guitar')
        expect(compose.document.value.title).toBe('Guitar Keep')
        expect(compose.getCell(0, 0)).toBe('5')
    })
})
