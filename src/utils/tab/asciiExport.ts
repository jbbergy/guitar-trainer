import type { TablatureDocument } from '@/types/tablature'
import { getStringLabels, midiToScientific } from './tunings'

export interface AsciiExportOptions {
    /** Maximum width of a tab line in characters (default 96) */
    lineWidth?: number
    /** Emit the title / tuning / tempo header (default true) */
    includeHeader?: boolean
}

/** Width in characters of every grid column: the longest cell of the document. */
export function asciiCellWidth(doc: TablatureDocument): number {
    let width = 1
    for (const measure of doc.measures) {
        for (const row of measure.rows) {
            for (const cell of row) if (cell.length > width) width = cell.length
        }
    }
    return width
}

/**
 * Renders a tablature as plain text, highest string on the first line.
 * Every column takes the same number of characters so the text can be re-imported
 * without losing the rhythm grid.
 */
export function tablatureToAscii(doc: TablatureDocument, options: AsciiExportOptions = {}): string {
    const lineWidth = options.lineWidth ?? 96
    const includeHeader = options.includeHeader ?? true
    const cellWidth = asciiCellWidth(doc)
    const step = cellWidth + 1

    const labels = getStringLabels(doc.tuning)
    const labelWidth = labels.reduce((max, label) => Math.max(max, label.length), 1)
    // Display order: highest tab line first.
    const displayStrings = labels.map((_label, index) => labels.length - 1 - index)

    const renderMeasure = (measureIndex: number, stringIndex: number): string => {
        const row = doc.measures[measureIndex].rows[stringIndex] ?? []
        return `-${row.map((cell) => `${cell.padEnd(cellWidth, '-')}-`).join('')}`
    }

    const measureWidth = (measureIndex: number): number => 1 + (doc.measures[measureIndex].rows[0]?.length ?? 0) * step + 1

    const systems: string[] = []
    let start = 0
    while (start < doc.measures.length) {
        let end = start
        let width = labelWidth + 1
        while (end < doc.measures.length && (end === start || width + measureWidth(end) <= lineWidth)) {
            width += measureWidth(end)
            end++
        }

        const lines = displayStrings.map((stringIndex) => {
            const chunks: string[] = []
            for (let measureIndex = start; measureIndex < end; measureIndex++) {
                chunks.push(renderMeasure(measureIndex, stringIndex))
            }
            return `${labels[stringIndex].padEnd(labelWidth, ' ')}|${chunks.join('|')}|`
        })
        systems.push(lines.join('\n'))
        start = end
    }

    if (!includeHeader) {
        return systems.join('\n\n')
    }

    const header: string[] = [doc.title]
    if (doc.artist) header.push(`Artist: ${doc.artist}`)
    header.push(`Tuning: ${doc.tuning.strings.map(midiToScientific).join(' ')} (${doc.tuning.name})`)
    if (doc.capo > 0) header.push(`Capo: ${doc.capo}`)
    header.push(`Tempo: ${doc.bpm} BPM`)
    header.push(`Grid: 1/${doc.quantization}, ${step} chars per step`)

    return `${header.join('\n')}\n\n${systems.join('\n\n')}\n`
}
