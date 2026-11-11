import type { TabInstrumentFamily, TabMeasure, TabTuning, TablatureDocument } from '@/types/tablature'
import { looksLikeAsciiTab, parseAsciiTab, TabImportError } from './asciiImport'
import { createEmptyTablature } from './model'
import {
    buildPdfMeasures,
    pageTextLines,
    readPdfPage,
    type PdfDot,
    type PdfPageGeometry,
    type PdfRawMeasure,
    type PdfSegment,
    type PdfShape,
} from './pdfLayout'
import { detectTuningFromLabels } from './tunings'

/** Minimal view of pdf.js used here, so that tests can inject the Node build. */
interface PdfJsModule {
    getDocument: (source: { data: Uint8Array; verbosity?: number }) => { promise: Promise<PdfJsDocument> }
    OPS: Record<string, number>
    GlobalWorkerOptions?: { workerSrc: string }
}

interface PdfJsDocument {
    numPages: number
    getPage: (pageNumber: number) => Promise<PdfJsPage>
}

interface PdfJsPage {
    getViewport: (options: { scale: number }) => { width: number; height: number }
    getTextContent: () => Promise<{ items: unknown[] }>
    getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[] }>
}

export type PdfJsLoader = () => Promise<PdfJsModule>

/** pdf.js is only loaded when a PDF is imported. */
const loadPdfJs: PdfJsLoader = async () => {
    const [pdfjs, worker] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs as unknown as PdfJsModule
}

export interface PdfImportOptions {
    preferredFamily?: TabInstrumentFamily
    tuning?: TabTuning
    fallbackTitle?: string
}

export interface PdfImportResult {
    documents: TablatureDocument[]
    warnings: string[]
    /** How the tablature was found in the file */
    kind: 'text' | 'engraved'
}

type Matrix = [number, number, number, number, number, number]

const multiply = (m: Matrix, n: number[]): Matrix => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
]

const apply = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

/** Straight strokes (staff lines, bar lines) and small circles (repeat dots) of a page, in page coordinates. */
function extractShapes(
    pdfjs: PdfJsModule,
    operators: { fnArray: number[]; argsArray: unknown[] }
): { segments: PdfSegment[]; dots: PdfDot[]; shapes: PdfShape[] } {
    const { OPS } = pdfjs
    const segments: PdfSegment[] = []
    const dots: PdfDot[] = []
    const shapes: PdfShape[] = []
    const stack: Matrix[] = []
    let matrix: Matrix = [1, 0, 0, 1, 0, 0]

    operators.fnArray.forEach((fn, index) => {
        const args = operators.argsArray[index] as unknown[]
        if (fn === OPS.save) stack.push(matrix)
        else if (fn === OPS.restore) matrix = stack.pop() ?? matrix
        else if (fn === OPS.transform) matrix = multiply(matrix, args as number[])
        else if (fn === OPS.constructPath) {
            const [subOps, coords] = args as [number[], number[]]
            let k = 0
            let current: [number, number] | null = null
            // Bounding box of the curved parts: a tiny round path is a dot.
            let curves = 0
            const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
            const grow = (count: number) => {
                for (let c = k; c < k + count; c += 2) {
                    const [x, y] = apply(matrix, coords[c], coords[c + 1])
                    box.minX = Math.min(box.minX, x)
                    box.maxX = Math.max(box.maxX, x)
                    box.minY = Math.min(box.minY, y)
                    box.maxY = Math.max(box.maxY, y)
                }
            }
            const whole = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
            const cover = (point: [number, number]) => {
                whole.minX = Math.min(whole.minX, point[0])
                whole.maxX = Math.max(whole.maxX, point[0])
                whole.minY = Math.min(whole.minY, point[1])
                whole.maxY = Math.max(whole.maxY, point[1])
            }
            const push = (a: [number, number], b: [number, number]) => {
                cover(a)
                cover(b)
                segments.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] })
            }

            for (const op of subOps) {
                if (op === OPS.moveTo) {
                    current = apply(matrix, coords[k], coords[k + 1])
                    k += 2
                } else if (op === OPS.lineTo) {
                    const next = apply(matrix, coords[k], coords[k + 1])
                    k += 2
                    if (current) push(current, next)
                    current = next
                } else if (op === OPS.rectangle) {
                    const [x, y, w, h] = coords.slice(k, k + 4)
                    k += 4
                    const a = apply(matrix, x, y)
                    const b = apply(matrix, x + w, y + h)
                    // Thin filled rectangles are how many engravers draw lines.
                    if (Math.abs(b[1] - a[1]) < 2) push([a[0], (a[1] + b[1]) / 2], [b[0], (a[1] + b[1]) / 2])
                    else if (Math.abs(b[0] - a[0]) < 2) push([(a[0] + b[0]) / 2, a[1]], [(a[0] + b[0]) / 2, b[1]])
                    cover(a)
                    cover(b)
                } else if (op === OPS.curveTo) {
                    grow(6)
                    curves++
                    k += 6
                    current = null
                } else if (op === OPS.curveTo2 || op === OPS.curveTo3) {
                    grow(4)
                    curves++
                    k += 4
                    current = null
                }
            }

            const width = box.maxX - box.minX
            const height = box.maxY - box.minY
            if (curves >= 2 && width > 0.8 && width < 5 && Math.abs(width - height) < 1) {
                dots.push({ x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 })
            }

            // Small closed shapes: beams (straight edges) and flags drawn as outlines (curved).
            const all = {
                minX: Math.min(whole.minX, box.minX), maxX: Math.max(whole.maxX, box.maxX),
                minY: Math.min(whole.minY, box.minY), maxY: Math.max(whole.maxY, box.maxY),
            }
            if (subOps.length >= 4 && all.maxX - all.minX > 1 && all.maxX - all.minX < 150 && all.maxY - all.minY > 1 && all.maxY - all.minY < 60) {
                shapes.push({ ...all, curved: curves > 0 })
            }
        }
    })
    return { segments, dots, shapes }
}

async function readPage(pdfjs: PdfJsModule, page: PdfJsPage): Promise<PdfPageGeometry> {
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    const texts = (content.items as { str?: string; transform?: number[]; width?: number; height?: number }[])
        .filter((item) => typeof item.str === 'string' && Array.isArray(item.transform))
        .map((item) => ({
            str: item.str as string,
            x: (item.transform as number[])[4],
            y: (item.transform as number[])[5],
            width: item.width ?? 0,
            height: item.height ?? 0,
        }))
    return { width: viewport.width, height: viewport.height, texts, ...extractShapes(pdfjs, await page.getOperatorList()) }
}

/** Title: the largest text of the first page that is not part of the music. */
function findTitle(pages: PdfPageGeometry[]): { title: string | null; artist: string } {
    const lines = pageTextLines(pages[0])
        .filter((line) => /[A-Za-zÀ-ÿ]{3,}/.test(line.text) && !/https?:|www\./i.test(line.text))
        .slice(0, 8)
    const sorted = [...lines].sort((a, b) => b.height - a.height)
    const title = sorted[0]?.text.trim() ?? null
    const artist = lines.find((line) => line !== sorted[0] && line.height < (sorted[0]?.height ?? 0))?.text.trim() ?? ''
    return { title, artist: artist.length <= 80 ? artist : '' }
}

/**
 * Reads a PDF holding a tablature: either typed as text (ASCII tab saved as PDF) or
 * engraved with real text for the fret numbers (Guitar Pro, MuseScore, TuxGuitar exports).
 * Scanned pages and PDFs whose numbers were turned into drawings cannot be read.
 */
export async function importPdfBytes(
    bytes: Uint8Array,
    options: PdfImportOptions = {},
    loader: PdfJsLoader = loadPdfJs
): Promise<PdfImportResult> {
    const pdfjs = await loader()
    let pages: PdfPageGeometry[]
    try {
        // pdf.js takes ownership of the buffer: give it a copy.
        const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise
        pages = []
        for (let number = 1; number <= pdf.numPages; number++) {
            pages.push(await readPage(pdfjs, await pdf.getPage(number)))
        }
    } catch (error) {
        throw new TabImportError('This PDF could not be opened (it may be damaged or protected).')
    }

    // 1. Text tablature saved as PDF. Pages with their own heading are separate tablatures.
    const pageTexts = pages.map((page) => pageTextLines(page).map((line) => line.text).join('\n'))
    const textPages = pageTexts.filter(looksLikeAsciiTab)
    if (textPages.length > 0) {
        const parsed = textPages.map((text) => parseAsciiTab(text, options))
        const titles = parsed.map((result) => result.document.title)
        const separate = parsed.length > 1 && new Set(titles).size === parsed.length && !titles.includes('Imported tablature')
        const results = separate ? parsed : [parseAsciiTab(textPages.join('\n\n'), options)]
        return {
            kind: 'text',
            documents: results.map((result) => result.document),
            warnings: [...new Set(results.flatMap((result) => result.warnings))],
        }
    }

    // 2. Engraved tablature: fret numbers placed on staff lines.
    const raw: PdfRawMeasure[] = []
    let stringCount: number | undefined
    let signature: [number, number] | null = null
    let bpm: number | null = null
    for (const page of pages) {
        const reading = readPdfPage(page, stringCount)
        if (!reading) continue
        stringCount = reading.stringCount
        signature ??= reading.timeSignature
        bpm ??= reading.bpm
        raw.push(...reading.measures)
    }

    if (!stringCount || raw.length === 0) {
        throw new TabImportError(
            'No tablature could be read in this PDF: its fret numbers are drawings or a scanned image, not text. ' +
            'Scanned tablatures cannot be imported yet.'
        )
    }
    const built = buildPdfMeasures(raw, stringCount, signature)
    const measures: TabMeasure[] = built.measures

    const tuning =
        options.tuning && options.tuning.strings.length === stringCount
            ? options.tuning
            : detectTuningFromLabels(Array.from({ length: stringCount }, () => null), options.preferredFamily ?? 'guitar')
    const { title, artist } = findTitle(pages)
    const widths = measures.map((measure) => measure.rows[0].length).sort((a, b) => a - b)
    const document = createEmptyTablature(tuning, {
        title: title ?? options.fallbackTitle ?? 'Imported tablature',
        artist,
        quantization: built.quantization,
        columnsPerMeasure: widths[Math.floor(widths.length / 2)],
        bpm: bpm ?? undefined,
    })
    document.measures = measures
    if (built.timeSignature) document.timeSignature = built.timeSignature

    const rhythm =
        built.readMeasures === measures.length
            ? null
            : built.readMeasures === 0
                ? 'Note lengths are estimated from the spacing of the numbers: check the rhythm.'
                : `The rhythm was read for ${built.readMeasures} of ${measures.length} measures; the others are estimated from the spacing: check them.`

    return {
        kind: 'engraved',
        documents: [document],
        warnings: [...(rhythm ? [rhythm] : []), `The tuning is not written in the file: ${tuning.name} was assumed.`],
    }
}
