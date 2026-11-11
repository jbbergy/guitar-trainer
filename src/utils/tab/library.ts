import type { TabInstrumentFamily, TablatureDocument } from '@/types/tablature'
import { countNotes, isMeasureEmpty, normalizeDocument, serializeTablature } from './model'

/**
 * Persistent tablature library, kept in localStorage:
 *   tab-library-v1:index       → metadata of every tablature (fast listing)
 *   tab-library-v1:doc:<id>    → one tablature in its compact storage form
 *   tab-library-v1:current     → id of the tablature opened in the editor
 */
const INDEX_KEY = 'tab-library-v1:index'
const DOC_KEY_PREFIX = 'tab-library-v1:doc:'
const CURRENT_KEY = 'tab-library-v1:current'
const MIGRATION_KEY = 'tab-library-v1:migrated-compose-v1'
const LEGACY_DRAFT_KEYS = ['compose-document-v1:guitar', 'compose-document-v1:ukulele']

export interface TabLibraryEntry {
    id: string
    title: string
    artist: string
    tuningId: string
    tuningName: string
    family: TabInstrumentFamily
    stringCount: number
    measureCount: number
    noteCount: number
    createdAt: number
    updatedAt: number
}

const storage = (): Storage | null => {
    try {
        return globalThis.localStorage ?? null
    } catch {
        return null
    }
}

export function toLibraryEntry(doc: TablatureDocument): TabLibraryEntry {
    return {
        id: doc.id,
        title: doc.title,
        artist: doc.artist,
        tuningId: doc.tuning.id,
        tuningName: doc.tuning.name,
        family: doc.tuning.family,
        stringCount: doc.tuning.strings.length,
        measureCount: doc.measures.length,
        noteCount: countNotes(doc.measures),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    }
}

const isEntry = (value: unknown): value is TabLibraryEntry => {
    const entry = value as TabLibraryEntry | null
    return Boolean(entry) && typeof entry?.id === 'string' && typeof entry.title === 'string' && typeof entry.updatedAt === 'number'
}

/** Metadata of every stored tablature, most recently edited first. */
export function loadLibraryIndex(): TabLibraryEntry[] {
    try {
        const raw = storage()?.getItem(INDEX_KEY)
        const parsed: unknown = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed.filter(isEntry).sort((a, b) => b.updatedAt - a.updatedAt) : []
    } catch (error) {
        console.warn('Failed to read the tablature library index:', error)
        return []
    }
}

const writeIndex = (entries: TabLibraryEntry[]): boolean => {
    try {
        storage()?.setItem(INDEX_KEY, JSON.stringify(entries))
        return true
    } catch (error) {
        console.warn('Failed to write the tablature library index:', error)
        return false
    }
}

export function loadLibraryTab(id: string): TablatureDocument | null {
    try {
        const raw = storage()?.getItem(DOC_KEY_PREFIX + id)
        if (!raw) return null
        const document = normalizeDocument(JSON.parse(raw))
        return document.id === id ? document : { ...document, id }
    } catch (error) {
        console.warn('Failed to read a tablature from the library:', error)
        return null
    }
}

/**
 * Stores a tablature and refreshes its index entry.
 * Returns false when the storage is unavailable or full; nothing is changed in that case.
 */
export function saveLibraryTab(doc: TablatureDocument): boolean {
    const store = storage()
    if (!store) return false
    try {
        store.setItem(DOC_KEY_PREFIX + doc.id, JSON.stringify(serializeTablature(doc)))
    } catch (error) {
        console.warn('Failed to save a tablature to the library:', error)
        return false
    }
    const entries = loadLibraryIndex().filter((entry) => entry.id !== doc.id)
    return writeIndex([toLibraryEntry(doc), ...entries])
}

export function deleteLibraryTab(id: string): void {
    try {
        storage()?.removeItem(DOC_KEY_PREFIX + id)
    } catch (error) {
        console.warn('Failed to delete a tablature from the library:', error)
    }
    writeIndex(loadLibraryIndex().filter((entry) => entry.id !== id))
    if (getCurrentTabId() === id) setCurrentTabId(null)
}

export function getCurrentTabId(): string | null {
    try {
        return storage()?.getItem(CURRENT_KEY) ?? null
    } catch {
        return null
    }
}

export function setCurrentTabId(id: string | null): void {
    try {
        if (id === null) storage()?.removeItem(CURRENT_KEY)
        else storage()?.setItem(CURRENT_KEY, id)
    } catch {
        // The editor still works without remembering the last opened tablature.
    }
}

/**
 * Brings the per-instrument drafts of the previous editor into the library, once.
 * The old keys are left in place so nothing is lost if the app is downgraded.
 */
export function migrateLegacyDrafts(): number {
    const store = storage()
    if (!store) return 0
    try {
        if (store.getItem(MIGRATION_KEY)) return 0
        store.setItem(MIGRATION_KEY, new Date().toISOString())
    } catch {
        return 0
    }

    let migrated = 0
    for (const key of LEGACY_DRAFT_KEYS) {
        try {
            const raw = store.getItem(key)
            if (!raw) continue
            const document = normalizeDocument(JSON.parse(raw))
            if (document.measures.every(isMeasureEmpty)) continue
            if (saveLibraryTab(document)) migrated++
        } catch (error) {
            console.warn('Failed to migrate a legacy tablature draft:', error)
        }
    }
    return migrated
}
