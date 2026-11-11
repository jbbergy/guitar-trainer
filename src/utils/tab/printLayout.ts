import type { TabMeasure, TablatureDocument } from '@/types/tablature'
import { measureColumns } from './model'
import { collectTabEvents, columnTicks, measureTimeSignature, measureToBeats, type TabMeasureEvents } from './rhythm'
import { getStringLabels } from './tunings'

/**
 * Printable score: the tablature is drawn as a real tab staff (SVG) with bar lines,
 * repeat signs, alternate endings and the rhythm written under the numbers.
 * All lengths are in SVG user units; a system is PAGE_WIDTH units wide and scales to the paper.
 */
const PAGE_WIDTH = 720
const LABEL_WIDTH = 20
const STRING_GAP = 11
const MIN_COLUMN_WIDTH = 13
const MEASURE_PADDING = 7
const REPEAT_WIDTH = 9
const HEAD_HEIGHT = 22
const FOOT_HEIGHT = 30
const MAX_STRETCH = 1.7

const escapeHtml = (text: string): string =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const round = (value: number): string => (Math.round(value * 10) / 10).toString()

/** Narrowest step that keeps neighbouring cells apart ("10h" needs more room than "3"). */
const baseColumnWidth = (measures: TabMeasure[]): number => {
    const longest = measures.reduce((max, measure) => measure.rows.reduce((m, row) => row.reduce((n, cell) => Math.max(n, cell.length), m), max), 1)
    return Math.max(MIN_COLUMN_WIDTH, longest * 6.2 + 4.5)
}

const naturalWidth = (measure: TabMeasure, columnWidth: number): number =>
    measureColumns(measure) * columnWidth + MEASURE_PADDING * 2 + (measure.repeatStart ? REPEAT_WIDTH : 0) + (measure.repeatEnd ? REPEAT_WIDTH : 0)

/** Measures of each system, filled greedily to the page width. */
function packSystems(measures: TabMeasure[], columnWidth: number): number[][] {
    const available = PAGE_WIDTH - LABEL_WIDTH - 2
    const systems: number[][] = []
    let current: number[] = []
    let used = 0
    measures.forEach((measure, index) => {
        const width = naturalWidth(measure, columnWidth)
        if (current.length > 0 && used + width > available) {
            systems.push(current)
            current = []
            used = 0
        }
        current.push(index)
        used += width
    })
    if (current.length > 0) systems.push(current)
    return systems
}

/**
 * Rhythm written under the staff: one stem per note, eighths and shorter notes beamed
 * together inside a beat (or flagged when alone), dots and triplet marks.
 */
function drawRhythm(events: TabMeasureEvents, doc: TablatureDocument, columnX: (column: number) => number, bottom: number, beatTicks: number): string {
    const grid = columnTicks(doc.quantization)
    const top = bottom + 7
    const tip = top + 17
    const parts: string[] = []

    const stems = measureToBeats(events, doc.quantization)
        .filter((beat) => beat.notes.length > 0 && beat.value.base > 1)
        .map((beat) => ({
            x: columnX(beat.startTicks / grid),
            start: beat.startTicks,
            end: beat.startTicks + beat.value.ticks,
            levels: Math.max(0, Math.log2(beat.value.base) - 2),
            beat,
        }))

    stems.forEach((stem, index) => {
        // Half notes get a short stem so they stand apart from quarters.
        const stemTip = stem.beat.value.base === 2 ? top + 9 : tip
        parts.push(`<line class="stem" x1="${round(stem.x)}" y1="${top}" x2="${round(stem.x)}" y2="${stemTip}"/>`)
        if (stem.beat.value.dots > 0) parts.push(`<circle class="ink" cx="${round(stem.x + 4)}" cy="${top + 2}" r="1.1"/>`)
        if (stem.beat.value.triplet) parts.push(`<text class="small" x="${round(stem.x)}" y="${tip + 9}" text-anchor="middle">3</text>`)
        if (stem.levels === 0) return

        const sameBeat = (other: typeof stem | undefined) =>
            other !== undefined && other.levels > 0 && Math.floor(other.start / beatTicks) === Math.floor(stem.start / beatTicks)
        const previous = stems[index - 1]
        const next = stems[index + 1]
        const joinsNext = sameBeat(next) && next.start === stem.end
        const joinsPrevious = sameBeat(previous) && previous.end === stem.start

        for (let level = 0; level < stem.levels; level++) {
            const y = tip - level * 3.6
            if (joinsNext && next.levels > level) {
                parts.push(`<line class="beam" x1="${round(stem.x)}" y1="${y}" x2="${round(next.x)}" y2="${y}"/>`)
            } else if (joinsNext || joinsPrevious) {
                // A shorter note inside a group: a stub towards its neighbour.
                if (!(joinsPrevious && previous.levels > level)) {
                    const direction = joinsNext ? 1 : -1
                    parts.push(`<line class="beam" x1="${round(stem.x)}" y1="${y}" x2="${round(stem.x + direction * 4.5)}" y2="${y}"/>`)
                }
            } else {
                parts.push(`<line class="flag" x1="${round(stem.x)}" y1="${y}" x2="${round(stem.x + 5.5)}" y2="${y - 4.5}"/>`)
            }
        }
    })
    return parts.join('')
}

function drawSystem(
    doc: TablatureDocument,
    indices: number[],
    events: TabMeasureEvents[],
    isLast: boolean,
    base: number,
    beatTicks: number
): string {
    const stringCount = doc.tuning.strings.length
    const staffHeight = (stringCount - 1) * STRING_GAP
    const top = HEAD_HEIGHT
    const bottom = top + staffHeight
    const height = bottom + FOOT_HEIGHT
    const lineY = (stringIndex: number) => top + (stringCount - 1 - stringIndex) * STRING_GAP

    // Justify the system: only the steps stretch, never the padding or the signs.
    const available = PAGE_WIDTH - LABEL_WIDTH - 2
    const natural = indices.reduce((sum, index) => sum + naturalWidth(doc.measures[index], base), 0)
    const columns = indices.reduce((sum, index) => sum + measureColumns(doc.measures[index]), 0)
    const fixed = natural - columns * base
    const stretch = Math.min(MAX_STRETCH, (available - fixed) / (columns * base))
    // A short last line keeps its natural spacing instead of being spread over the page.
    const columnWidth = base * (isLast && natural < available * 0.7 ? 1 : Math.max(1, stretch))

    const parts: string[] = []
    const labels = getStringLabels(doc.tuning)
    labels.forEach((label, stringIndex) => {
        parts.push(`<text class="label" x="${LABEL_WIDTH - 7}" y="${lineY(stringIndex) + 3.2}" text-anchor="end">${escapeHtml(label)}</text>`)
    })

    let x = LABEL_WIDTH
    const staffStart = x
    const notes: string[] = []
    const dotsAt = (dotX: number) =>
        [-1, 1].map((side) => `<circle class="ink" cx="${round(dotX)}" cy="${round(top + staffHeight / 2 + side * STRING_GAP * (stringCount % 2 === 0 ? 1 : 0.5))}" r="1.5"/>`).join('')

    indices.forEach((measureIndex, position) => {
        const measure = doc.measures[measureIndex]
        const width = measureColumns(measure) * columnWidth + MEASURE_PADDING * 2 + (measure.repeatStart ? REPEAT_WIDTH : 0) + (measure.repeatEnd ? REPEAT_WIDTH : 0)
        const inner = x + MEASURE_PADDING + (measure.repeatStart ? REPEAT_WIDTH : 0)
        const columnX = (column: number) => inner + (column + 0.5) * columnWidth
        const end = x + width

        // Left edge: plain bar line or repeat start.
        if (measure.repeatStart) {
            parts.push(`<rect class="ink" x="${round(x)}" y="${top}" width="3" height="${staffHeight}"/>`)
            parts.push(`<line class="bar" x1="${round(x + 5.5)}" y1="${top}" x2="${round(x + 5.5)}" y2="${bottom}"/>`)
            parts.push(dotsAt(x + 9.5))
        } else {
            parts.push(`<line class="bar" x1="${round(x)}" y1="${top}" x2="${round(x)}" y2="${bottom}"/>`)
        }

        // Right edge of a repeated section.
        if (measure.repeatEnd) {
            parts.push(dotsAt(end - 9.5))
            parts.push(`<line class="bar" x1="${round(end - 5.5)}" y1="${top}" x2="${round(end - 5.5)}" y2="${bottom}"/>`)
            parts.push(`<rect class="ink" x="${round(end - 3)}" y="${top}" width="3" height="${staffHeight}"/>`)
            if (measure.repeatEnd > 2) {
                parts.push(`<text class="small bold" x="${round(end - 2)}" y="${top - 5}" text-anchor="end">×${measure.repeatEnd}</text>`)
            }
        }

        // Alternate ending bracket, or the measure number at the start of a system.
        if (measure.ending) {
            parts.push(`<path class="bracket" d="M${round(x + 2)} ${top - 3} V${top - 14} H${round(end - 3)}"/>`)
            parts.push(`<text class="small bold" x="${round(x + 6)}" y="${top - 5}">${measure.ending}.</text>`)
        } else if (position === 0) {
            parts.push(`<text class="number" x="${round(x + 2)}" y="${top - 5}">${measureIndex + 1}</text>`)
        }

        measure.rows.forEach((row, stringIndex) => {
            row.forEach((cell, column) => {
                if (cell === '') return
                const cx = columnX(column)
                const half = cell.length * 3.1 + 1.4
                notes.push(`<rect class="paper" x="${round(cx - half)}" y="${lineY(stringIndex) - 5}" width="${round(half * 2)}" height="10"/>`)
                notes.push(`<text class="fret" x="${round(cx)}" y="${lineY(stringIndex) + 3.6}" text-anchor="middle">${escapeHtml(cell)}</text>`)
            })
        })
        notes.push(drawRhythm(events[measureIndex], doc, columnX, bottom, beatTicks))
        x = end
    })

    // Closing bar line: a final double bar at the very end of the piece.
    const lastMeasure = doc.measures[indices[indices.length - 1]]
    if (!lastMeasure.repeatEnd) {
        if (indices[indices.length - 1] === doc.measures.length - 1) {
            parts.push(`<line class="bar" x1="${round(x - 4.5)}" y1="${top}" x2="${round(x - 4.5)}" y2="${bottom}"/>`)
            parts.push(`<rect class="ink" x="${round(x - 2.5)}" y="${top}" width="2.5" height="${staffHeight}"/>`)
        } else {
            parts.push(`<line class="bar" x1="${round(x)}" y1="${top}" x2="${round(x)}" y2="${bottom}"/>`)
        }
    }

    const lines = labels.map((_label, stringIndex) =>
        `<line class="string" x1="${staffStart}" y1="${lineY(stringIndex)}" x2="${round(x)}" y2="${lineY(stringIndex)}"/>`
    )

    return `<svg class="system" viewBox="0 0 ${PAGE_WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Measures ${indices[0] + 1} to ${indices[indices.length - 1] + 1}">${lines.join('')}${parts.join('')}${notes.join('')}</svg>`
}

const PRINT_STYLES = `
  @page { size: A4; margin: 15mm 14mm 16mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; color: #111; background: #fff; font-family: "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif; }
  header { margin-bottom: 7mm; text-align: center; }
  h1 { margin: 0; font-size: 22pt; font-weight: 700; letter-spacing: 0.01em; }
  .artist { margin: 1.5mm 0 0; font-size: 12pt; color: #333; }
  .meta { display: flex; justify-content: space-between; gap: 8mm; margin-top: 5mm; padding-top: 2mm; border-top: 0.3mm solid #111; font-size: 9.5pt; color: #222; text-align: left; }
  .meta span:last-child { text-align: right; }
  .system { display: block; width: 100%; height: auto; margin-bottom: 4mm; break-inside: avoid; page-break-inside: avoid; }
  .string { stroke: #555; stroke-width: 0.6; }
  .bar { stroke: #111; stroke-width: 0.9; }
  .stem { stroke: #111; stroke-width: 0.9; }
  .flag { stroke: #111; stroke-width: 1.4; stroke-linecap: round; }
  .beam { stroke: #111; stroke-width: 2.2; }
  .bracket { fill: none; stroke: #111; stroke-width: 0.8; }
  .ink { fill: #111; }
  .paper { fill: #fff; }
  .fret { font-size: 9.6px; font-weight: 700; fill: #111; }
  .label { font-size: 8.5px; font-weight: 700; fill: #444; }
  .number { font-size: 7px; fill: #666; }
  .small { font-size: 7.5px; fill: #111; }
  .bold { font-weight: 700; }
  footer { margin-top: 3mm; font-size: 7.5pt; color: #777; text-align: center; }
`

/** Complete HTML page of a tablature, ready to be printed or saved as PDF. */
export function tablatureToPrintHtml(doc: TablatureDocument): string {
    const events = collectTabEvents(doc.measures)
    const base = baseColumnWidth(doc.measures)
    const systems = packSystems(doc.measures, base)
    const [numerator, denominator] = measureTimeSignature(doc.columnsPerMeasure, doc.quantization, doc.timeSignature)
    // Beams group notes by beat: a dotted quarter in 6/8, 9/8, 12/8, a quarter otherwise.
    const beatTicks = denominator === 8 && numerator % 3 === 0 ? 1440 : 960

    const left = [doc.tuning.name, doc.capo > 0 ? `Capo ${doc.capo}` : ''].filter(Boolean).join(' · ')
    const right = [`${numerator}/${denominator}`, `♩ = ${doc.bpm}`].join(' · ')
    const techniques = doc.measures.some((measure) => measure.rows.some((row) => row.some((cell) => /[hp/\\br~x]/.test(cell))))

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(doc.title)}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
<header>
<h1>${escapeHtml(doc.title)}</h1>
${doc.artist ? `<p class="artist">${escapeHtml(doc.artist)}</p>` : ''}
<div class="meta"><span>${escapeHtml(left)}</span><span>${escapeHtml(right)}</span></div>
</header>
<main>
${systems.map((indices, index) => drawSystem(doc, indices, events, index === systems.length - 1, base, beatTicks)).join('\n')}
</main>
${techniques ? '<footer>h hammer-on · p pull-off · / \\ slide · b bend · r release · ~ vibrato · x muted</footer>' : ''}
</body>
</html>`
}
