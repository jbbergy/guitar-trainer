import type { TabInstrumentFamily, TabMeasure, TabTuning, TablatureDocument } from '@/types/tablature'
import { looksLikeAsciiTab, parseAsciiTab, TabImportError } from './asciiImport'
import { createEmptyTablature } from './model'
import { layoutPdfPage, pageTextLines, type PdfPageGeometry, type PdfSegment } from './pdfLayout'
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

/** Straight strokes of a page (staff lines, bar lines), in page coordinates. */
function extractSegments(pdfjs: PdfJsModule, operators: { fnArray: number[]; argsArray: unknown[] }): PdfSegment[] {
    const { OPS } = pdfjs
    const segments: PdfSegment[] = []
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
            const push = (a: [number, number], b: [number, number]) => segments.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] })

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
                } else if (op === OPS.curveTo) {
                    k += 6
                    current = null
                } else if (op === OPS.curveTo2 || op === OPS.curveTo3) {
                    k += 4
                    current = null
                }
            }
        }
    })
    return segments
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
    return { width: viewport.width, height: viewport.height, texts, segments: extractSegments(pdfjs, await page.getOperatorList()) }
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
    const measures: TabMeasure[] = []
    let stringCount: number | undefined
    for (const page of pages) {
        const layout = layoutPdfPage(page, stringCount)
        if (!layout) continue
        stringCount = layout.stringCount
        measures.push(...layout.measures)
    }

    if (!stringCount || measures.length === 0) {
        throw new TabImportError(
            'No tablature could be read in this PDF: its fret numbers are drawings or a scanned image, not text. ' +
            'Scanned tablatures cannot be imported yet.'
        )
    }

    const tuning =
        options.tuning && options.tuning.strings.length === stringCount
            ? options.tuning
            : detectTuningFromLabels(Array.from({ length: stringCount }, () => null), options.preferredFamily ?? 'guitar')
    const { title, artist } = findTitle(pages)
    const widths = measures.map((measure) => measure.rows[0].length).sort((a, b) => a - b)
    const document = createEmptyTablature(tuning, {
        title: title ?? options.fallbackTitle ?? 'Imported tablature',
        artist,
        quantization: 8,
        columnsPerMeasure: widths[Math.floor(widths.length / 2)],
    })
    document.measures = measures

    return {
        kind: 'engraved',
        documents: [document],
        warnings: [
            'Note lengths are estimated from the spacing of the numbers: check the rhythm.',
            `The tuning is not written in the file: ${tuning.name} was assumed.`,
        ],
    }
}
