import type { TabInstrumentFamily, TabTuning, TablatureDocument } from '@/types/tablature'
import { tablatureToAlphaTex } from './alphaTex'
import { tablatureToAscii } from './asciiExport'
import { looksLikeAsciiTab, parseAsciiTab, TabImportError } from './asciiImport'
import { tablatureToMidi } from './midi'
import { cloneAsNewTablature, normalizeDocument, serializeTablature, TAB_JSON_FORMAT } from './model'
import { tablatureToMusicXml } from './musicXml'
import { importPdfBytes } from './pdfImport'
import { importScoreBytes, tablatureToGuitarPro } from './scoreBridge'

export type TabFormatId = 'ascii' | 'guitarpro' | 'musicxml' | 'midi' | 'alphatex' | 'json' | 'pdf'

export interface TabExportFormat {
    id: TabFormatId
    label: string
    description: string
    extension: string
    mimeType: string
    /** Text formats can be previewed and copied to the clipboard */
    isText: boolean
}

export const TAB_EXPORT_FORMATS: TabExportFormat[] = [
    {
        id: 'ascii', label: 'Text tab', extension: 'txt', mimeType: 'text/plain', isText: true,
        description: 'Plain ASCII tablature, readable anywhere (forums, Ultimate Guitar, e-mail).',
    },
    {
        id: 'guitarpro', label: 'Guitar Pro', extension: 'gp', mimeType: 'application/octet-stream', isText: false,
        description: 'Guitar Pro 7/8 file, also opened by TuxGuitar, MuseScore 4 and Songsterr.',
    },
    {
        id: 'musicxml', label: 'MusicXML', extension: 'musicxml', mimeType: 'application/vnd.recordare.musicxml+xml', isText: true,
        description: 'Universal score exchange format (MuseScore, Sibelius, Finale, Dorico…).',
    },
    {
        id: 'midi', label: 'MIDI', extension: 'mid', mimeType: 'audio/midi', isText: false,
        description: 'Standard MIDI file for sequencers and DAWs (notes and tempo only).',
    },
    {
        id: 'alphatex', label: 'alphaTex', extension: 'atex', mimeType: 'text/plain', isText: true,
        description: 'Text notation of alphaTab, handy to embed a tab in a web page.',
    },
    {
        id: 'json', label: 'Guitare Trainer', extension: 'json', mimeType: 'application/json', isText: true,
        description: 'Native format of this app: lossless backup of the tablature.',
    },
]

/** File extensions offered by the import file picker. */
export const TAB_IMPORT_ACCEPT =
    '.txt,.tab,.crd,.text,.pdf,.gp,.gp3,.gp4,.gp5,.gpx,.gp7,.gp8,.musicxml,.xml,.mxl,.cap,.capx,.atex,.alphatex,.json'

export const TAB_IMPORT_FORMATS_LABEL = 'Text / ASCII, PDF (text or engraved, not scanned), Guitar Pro (GP3–GP8), MusicXML, alphaTex, Guitare Trainer JSON'

export interface ExportedFile {
    fileName: string
    mimeType: string
    data: string | Uint8Array
}

export const TAB_LIBRARY_JSON_FORMAT = 'guitare-trainer-library'

export function safeFileName(title: string): string {
    const cleaned = title
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9 _.-]+/g, ' ')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 80)
    return cleaned || 'tablature'
}

/** Produces the content of a file in the requested format. */
export async function exportTablature(doc: TablatureDocument, formatId: TabFormatId): Promise<ExportedFile> {
    const format = TAB_EXPORT_FORMATS.find((candidate) => candidate.id === formatId)
    if (!format) throw new Error(`Unknown export format: ${formatId}`)

    let data: string | Uint8Array
    switch (formatId) {
        case 'ascii': data = tablatureToAscii(doc); break
        case 'guitarpro': data = await tablatureToGuitarPro(doc); break
        case 'musicxml': data = tablatureToMusicXml(doc); break
        case 'midi': data = tablatureToMidi(doc); break
        case 'alphatex': data = tablatureToAlphaTex(doc); break
        case 'json': data = `${JSON.stringify(serializeTablature(doc), null, 2)}\n`; break
        default: throw new Error(`Unknown export format: ${formatId}`)
    }

    return { fileName: `${safeFileName(doc.title)}.${format.extension}`, mimeType: format.mimeType, data }
}

/** Backup of several tablatures in a single JSON file. */
export function exportLibraryBackup(docs: TablatureDocument[]): ExportedFile {
    const payload = { format: TAB_LIBRARY_JSON_FORMAT, version: 1, exportedAt: new Date().toISOString(), tabs: docs.map(serializeTablature) }
    return {
        fileName: `guitare-trainer-library-${new Date().toISOString().slice(0, 10)}.json`,
        mimeType: 'application/json',
        data: `${JSON.stringify(payload)}\n`,
    }
}

export interface TabImportOptions {
    /** Instrument family preferred when the file does not say which instrument it is for */
    preferredFamily?: TabInstrumentFamily
    /** Tuning forced on text tabs / used for scores without tablature */
    tuning?: TabTuning
    fallbackTitle?: string
}

export interface TabImportResult {
    format: TabFormatId
    formatLabel: string
    /** One tablature per track found in the file; all of them have a fresh identity */
    documents: TablatureDocument[]
    warnings: string[]
}

const startsWith = (bytes: Uint8Array, text: string, offset = 0): boolean =>
    [...text].every((char, index) => bytes[offset + index] === char.charCodeAt(0))

export function decodeText(bytes: Uint8Array): string {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2))
    if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2))
    try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
        return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
    } catch {
        // Not valid UTF-8: older Windows text files use Latin-1 / Windows-1252.
        return new TextDecoder('windows-1252').decode(bytes)
    }
}

const titleFromFileName = (fileName: string | undefined): string | undefined => {
    if (!fileName) return undefined
    const base = fileName.replace(/^.*[\\/]/, '').replace(/\.[a-z0-9]{1,8}$/i, '').replace(/[_]+/g, ' ').trim()
    return base || undefined
}

function importJson(text: string): TablatureDocument[] | null {
    let parsed: unknown
    try {
        parsed = JSON.parse(text)
    } catch {
        return null
    }
    if (!parsed || typeof parsed !== 'object') return null
    const record = parsed as Record<string, unknown>

    if (record.format === TAB_LIBRARY_JSON_FORMAT && Array.isArray(record.tabs)) {
        return record.tabs.map((tab) => cloneAsNewTablature(normalizeDocument(tab)))
    }
    if (record.format === TAB_JSON_FORMAT || Array.isArray(record.measures)) {
        return [cloneAsNewTablature(normalizeDocument(record))]
    }
    return null
}

const looksLikeAlphaTex = (text: string): boolean =>
    /\\(title|tempo|track|staff|tuning|ts)\b/.test(text) || /(^|\s)\(?\d{1,2}\.\d\.\d{1,2}\b/.test(text)

async function importScore(
    bytes: Uint8Array,
    format: TabFormatId,
    formatLabel: string,
    options: TabImportOptions
): Promise<TabImportResult> {
    const { documents, warnings } = await importScoreBytes(bytes, {
        preferredFamily: options.preferredFamily,
        fallbackTitle: options.fallbackTitle,
        notationTuning: options.tuning,
    })
    return { format, formatLabel, documents, warnings }
}

/**
 * Reads a tablature file whatever its format: the content is sniffed first and the
 * file name is only used to find a title.
 */
export async function importTablatureBytes(
    bytes: Uint8Array,
    fileName?: string,
    options: TabImportOptions = {}
): Promise<TabImportResult> {
    const withTitle: TabImportOptions = { ...options, fallbackTitle: options.fallbackTitle ?? titleFromFileName(fileName) }
    const extension = (/\.([a-z0-9]+)$/i.exec(fileName ?? '')?.[1] ?? '').toLowerCase()

    if (bytes.length === 0) throw new TabImportError('This file is empty.')

    if (startsWith(bytes, 'MThd')) {
        throw new TabImportError('MIDI files cannot be imported: they do not say which string plays each note. Export is supported.')
    }
    if (startsWith(bytes, '%PDF')) {
        const { documents, warnings, kind } = await importPdfBytes(bytes, withTitle)
        return { format: 'pdf', formatLabel: kind === 'text' ? 'PDF (text tab)' : 'PDF (engraved tab)', documents, warnings }
    }
    if ((bytes[0] === 0xff && bytes[1] === 0xd8) || startsWith(bytes, 'PNG', 1) || startsWith(bytes, 'GIF8')) {
        throw new TabImportError('Images and scans cannot be imported yet: the tablature has to be text, a PDF with real text, or a music file.')
    }
    if (startsWith(bytes, 'PK')) {
        const isMxl = extension === 'mxl'
        return importScore(bytes, isMxl ? 'musicxml' : 'guitarpro', isMxl ? 'MusicXML (compressed)' : 'Guitar Pro 7/8', withTitle)
    }
    if (startsWith(bytes, 'BCFZ') || startsWith(bytes, 'BCFS')) {
        return importScore(bytes, 'guitarpro', 'Guitar Pro 6', withTitle)
    }
    if (startsWith(bytes, 'FICHIER GUITAR', 1) || /^gp[345]$/.test(extension)) {
        return importScore(bytes, 'guitarpro', 'Guitar Pro 3–5', withTitle)
    }

    return importTablatureText(decodeText(bytes), withTitle, bytes)
}

/** Reads a tablature pasted or typed as text (ASCII tab, MusicXML, alphaTex or JSON). */
export async function importTablatureText(
    text: string,
    options: TabImportOptions = {},
    originalBytes?: Uint8Array
): Promise<TabImportResult> {
    const trimmed = text.trim()
    if (trimmed === '') throw new TabImportError('There is nothing to import.')
    const bytes = originalBytes ?? new TextEncoder().encode(text)

    if (trimmed.startsWith('{')) {
        const documents = importJson(trimmed)
        if (documents && documents.length > 0) {
            return { format: 'json', formatLabel: 'Guitare Trainer JSON', documents, warnings: [] }
        }
    }
    if (trimmed.startsWith('<')) {
        return importScore(bytes, 'musicxml', 'MusicXML', options)
    }
    if (looksLikeAsciiTab(text)) {
        const { document, warnings } = parseAsciiTab(text, options)
        return { format: 'ascii', formatLabel: 'Text tab (ASCII)', documents: [document], warnings }
    }
    if (looksLikeAlphaTex(text)) {
        return importScore(bytes, 'alphatex', 'alphaTex', options)
    }
    throw new TabImportError(
        'No tablature was recognised. Supported formats: text (ASCII) tabs, Guitar Pro, MusicXML, alphaTex and Guitare Trainer JSON.'
    )
}
