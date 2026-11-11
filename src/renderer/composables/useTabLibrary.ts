import { ref } from 'vue'
import type { TablatureDocument } from '@/types/tablature'
import {
    deleteLibraryTab,
    getCurrentTabId,
    loadLibraryIndex,
    loadLibraryTab,
    migrateLegacyDrafts,
    saveLibraryTab,
    setCurrentTabId,
    type TabLibraryEntry,
} from '@/utils/tab/library'
import { cloneAsNewTablature } from '@/utils/tab/model'

// Shared by every component: the library dialog and the editor see the same list.
const entries = ref<TabLibraryEntry[]>([])
const lastSaveFailed = ref(false)

/** Reactive access to the tablature library stored on this device. */
export function useTabLibrary() {
    const refresh = (): void => {
        entries.value = loadLibraryIndex()
    }

    /** Saves a tablature (new or existing) and returns the stored copy, or null when storage failed. */
    const save = (doc: TablatureDocument): TablatureDocument | null => {
        const stamped: TablatureDocument = { ...doc, updatedAt: Date.now() }
        const saved = saveLibraryTab(stamped)
        lastSaveFailed.value = !saved
        refresh()
        return saved ? stamped : null
    }

    const load = (id: string): TablatureDocument | null => loadLibraryTab(id)

    const remove = (id: string): void => {
        deleteLibraryTab(id)
        refresh()
    }

    const duplicate = (id: string): TablatureDocument | null => {
        const source = loadLibraryTab(id)
        if (!source) return null
        return save(cloneAsNewTablature(source, { title: `${source.title} (copy)`.slice(0, 120) }))
    }

    const loadAll = (): TablatureDocument[] =>
        entries.value.map((entry) => loadLibraryTab(entry.id)).filter((doc): doc is TablatureDocument => doc !== null)

    migrateLegacyDrafts()
    refresh()

    return {
        entries,
        lastSaveFailed,
        refresh,
        save,
        load,
        remove,
        duplicate,
        loadAll,
        getCurrentId: getCurrentTabId,
        setCurrentId: setCurrentTabId,
    }
}
